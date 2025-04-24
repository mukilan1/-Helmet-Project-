"""
Socket.IO integration for Helmet Voice Assistant with improved network error handling
"""
from flask_socketio import SocketIO
from flask import Flask, request, jsonify
import threading
import speech_recognition as sr
import pyttsx3
import time
import requests
import json
import socket
import errno

class HelmetVoiceAssistantBackend:
    def __init__(self, app, socketio):
        self.app = app
        self.socketio = socketio
        
        # Initialize the recognizer with robust settings
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300  # Adjust for ambient noise
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.8  # More tolerant pause detection
        
        # Initialize the TTS engine
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 150)
        
        # Running state
        self.is_listening = False
        self.wake_word = "helmet"
        self.recognition_thread = None
        
        # Error handling parameters
        self.network_error_count = 0
        self.max_network_retries = 5
        self.retry_delay = 2  # seconds
        self.last_error_time = 0
        
        # Register socket events
        self.register_socketio_events()
        
        # Add routes to the Flask app
        self.register_routes()
        
        print("Helmet Voice Assistant Backend initialized successfully")
    
    def register_socketio_events(self):
        """Register all Socket.IO event handlers"""
        
        @self.socketio.on('connect')
        def handle_connect():
            print("Client connected to voice assistant")
            return {'status': 'connected'}
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            print("Client disconnected from voice assistant")
        
        @self.socketio.on('start_listening')
        def handle_start_listening():
            result = self.start_listening()
            return result
        
        @self.socketio.on('stop_listening')
        def handle_stop_listening():
            result = self.stop_listening()
            return result
        
        @self.socketio.on('send_command')
        def handle_send_command(data):
            command = data.get('command', '')
            if command:
                response = self.process_command(command)
                self.speak(response)
                return {'response': response}
            return {'error': 'Empty command'}
        
        @self.socketio.on('check_network')
        def handle_check_network():
            """Check network connectivity and send status"""
            is_connected = self.check_internet_connection()
            return {'connected': is_connected}
    
    def register_routes(self):
        """Add HTTP routes to the Flask app"""
        
        @self.app.route('/api/voice/start', methods=['POST'])
        def start_voice():
            return jsonify(self.start_listening())
        
        @self.app.route('/api/voice/stop', methods=['POST'])
        def stop_voice():
            return jsonify(self.stop_listening())
        
        @self.app.route('/api/voice/status', methods=['GET'])
        def voice_status():
            return jsonify({"status": "listening" if self.is_listening else "stopped"})
        
        @self.app.route('/api/voice/network_check', methods=['GET'])
        def network_check():
            is_connected = self.check_internet_connection()
            return jsonify({"connected": is_connected})
    
    def check_internet_connection(self):
        """Test internet connectivity by trying to connect to Google's DNS"""
        try:
            # Try to create a socket connection to Google's DNS server
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            return True
        except OSError:
            return False
    
    def start_listening(self):
        """Start the voice recognition loop in a separate thread"""
        # Check network connectivity first
        if not self.check_internet_connection():
            self.socketio.emit('voice_status', {'status': 'network_error'})
            return {"status": "network_error", "message": "No internet connection. Voice recognition requires internet."}
        
        if not self.is_listening:
            self.is_listening = True
            self.network_error_count = 0  # Reset error count
            self.recognition_thread = threading.Thread(target=self.recognition_loop, daemon=True)
            self.recognition_thread.start()
            self.socketio.emit('voice_status', {'status': 'started'})
            print("Voice recognition started")
            return {"status": "started", "message": "Voice recognition started"}
        return {"status": "already_running", "message": "Voice recognition is already running"}
    
    def stop_listening(self):
        """Stop the voice recognition loop"""
        if self.is_listening:
            self.is_listening = False
            if self.recognition_thread and self.recognition_thread.is_alive():
                # We can't directly stop the thread, but setting is_listening to False
                # will cause it to exit gracefully on the next iteration
                self.recognition_thread.join(timeout=1.0)
            
            self.socketio.emit('voice_status', {'status': 'stopped'})
            print("Voice recognition stopped")
            return {"status": "stopped", "message": "Voice recognition stopped"}
        return {"status": "not_running", "message": "Voice recognition was not running"}
    
    def recognition_loop(self):
        """Main loop to continuously listen for voice commands"""
        while self.is_listening:
            try:
                # Verify internet connection before trying to use the microphone
                if not self.check_internet_connection():
                    self.network_error_count += 1
                    print(f"Network error detected, count: {self.network_error_count}")
                    
                    # Notify client
                    self.socketio.emit('voice_error', {
                        'error': "Network connection lost", 
                        'error_count': self.network_error_count
                    })
                    
                    # If we've had too many network errors, stop trying
                    if self.network_error_count >= self.max_network_retries:
                        self.socketio.emit('voice_status', {'status': 'network_error'})
                        print("Too many network errors, stopping recognition")
                        self.is_listening = False
                        break
                    
                    # Wait before retrying
                    time.sleep(self.retry_delay)
                    continue
                
                # Reset network error count if we get here
                self.network_error_count = 0
                
                with sr.Microphone() as source:
                    # Adjust for ambient noise and set timeout
                    self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    print("Listening for audio...")
                    
                    # Send status to frontend
                    self.socketio.emit('voice_status', {'status': 'listening'})
                    
                    # Listen for audio with robust error handling
                    try:
                        audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=5)
                    except Exception as listen_error:
                        print(f"Error during listen: {listen_error}")
                        # Specific handling for timeout errors which may be common
                        if "timed out" in str(listen_error).lower():
                            continue  # Just try again
                        else:
                            # For other errors, wait a bit
                            time.sleep(1)
                            continue
                    
                    # Send status to frontend
                    self.socketio.emit('voice_status', {'status': 'processing'})
                    
                    try:
                        # Recognize speech using Google Speech Recognition
                        text = self.recognizer.recognize_google(audio)
                        print(f"Recognized: {text}")
                        
                        # Send the recognized text to the frontend
                        self.socketio.emit('voice_transcript', {'text': text})
                        
                        # Check for wake word
                        if self.wake_word.lower() in text.lower():
                            # Extract command after wake word
                            command = text.lower().split(self.wake_word.lower(), 1)[-1].strip()
                            if command:
                                # Process the command
                                response = self.process_command(command)
                                
                                # Speak the response
                                self.speak(response)
                                
                                # Send response to frontend
                                self.socketio.emit('voice_response', {'command': command, 'response': response})
                            else:
                                self.speak("How can I help you?")
                                self.socketio.emit('voice_response', {'command': '', 'response': "How can I help you?"})
                    
                    except sr.UnknownValueError:
                        print("Could not understand audio")
                    except sr.RequestError as e:
                        print(f"Could not request results; {e}")
                        self.socketio.emit('voice_error', {'error': f"API error: {e}"})
                        
                        # Check if it's a network error
                        if "network" in str(e).lower():
                            self.network_error_count += 1
                            print(f"Network error during recognition, count: {self.network_error_count}")
                            time.sleep(self.retry_delay)  # Wait before retrying
            
            except Exception as e:
                print(f"Error in recognition loop: {e}")
                self.socketio.emit('voice_error', {'error': f"Recognition error: {e}"})
                
                # Brief pause before retrying
                time.sleep(2)
    
    def process_command(self, command):
        """Process the voice command and return a response"""
        try:
            # Verify network connection before trying to make a request
            if not self.check_internet_connection():
                return "Sorry, I can't process commands without an internet connection."
            
            # Send the command to our existing API endpoint
            print(f"Sending command to API: {command}")
            response = requests.post(
                'http://localhost:5000/api/voice_command',  # Assuming this runs on localhost
                json={'command': command},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('response', f"I heard your command: {command}")
            else:
                return f"Error processing command: {response.status_code}"
                
        except requests.exceptions.ConnectionError:
            return "Network error. Please check your internet connection."
        except requests.exceptions.Timeout:
            return "Request timed out. The server might be busy."
        except Exception as e:
            print(f"Error processing command: {e}")
            return f"Sorry, there was an error processing your command"
    
    def speak(self, text):
        """Speak the given text using pyttsx3"""
        print(f"Speaking: {text}")
        
        try:
            # Run in a separate thread to avoid blocking
            def _speak():
                self.engine.say(text)
                self.engine.runAndWait()
            
            threading.Thread(target=_speak, daemon=True).start()
            
        except Exception as e:
            print(f"Error while speaking: {e}")

def create_socket_app():
    """Create and configure the Flask app with Socket.IO"""
    app = Flask(__name__)
    socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=30, ping_interval=15)
    
    # Initialize the voice assistant
    voice_assistant = HelmetVoiceAssistantBackend(app, socketio)
    
    return app, socketio, voice_assistant

# If this file is run directly, start the server
if __name__ == "__main__":
    app, socketio, voice_assistant = create_socket_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5001)