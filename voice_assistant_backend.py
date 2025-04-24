"""
Smart Helmet Python-based Voice Assistant Backend
Uses speech_recognition for input and pyttsx3 for output
"""
import speech_recognition as sr
import pyttsx3
import threading
import time
import json
import socketio
from flask import Flask, request
from flask_socketio import SocketIO

# Flask app will be imported/initialized in actual integration
# app = Flask(__name__)
# socketio = SocketIO(app)

class BackendVoiceAssistant:
    def __init__(self):
        # Initialize the recognizer
        self.recognizer = sr.Recognizer()
        
        # Initialize the TTS engine
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 150)
        
        # Running state
        self.is_listening = False
        self.wake_word = "helmet"
        
        # For communication with frontend
        self.sio = socketio
        
        print("Backend Voice Assistant initialized")
    
    def start_listening(self):
        """Start the voice recognition loop in a separate thread"""
        if not self.is_listening:
            self.is_listening = True
            threading.Thread(target=self.recognition_loop, daemon=True).start()
            return {"status": "started", "message": "Voice recognition started"}
        return {"status": "already_running", "message": "Voice recognition is already running"}
    
    def stop_listening(self):
        """Stop the voice recognition loop"""
        self.is_listening = False
        return {"status": "stopped", "message": "Voice recognition stopped"}
    
    def recognition_loop(self):
        """Main loop to continuously listen for voice commands"""
        while self.is_listening:
            try:
                with sr.Microphone() as source:
                    # Adjust for ambient noise and set timeout
                    self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    print("Listening for audio...")
                    
                    # Send status to frontend
                    self.sio.emit('voice_status', {'status': 'listening'})
                    
                    # Listen for audio
                    audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=5)
                    
                    # Send status to frontend
                    self.sio.emit('voice_status', {'status': 'processing'})
                    
                    try:
                        # Recognize speech using Google Speech Recognition
                        text = self.recognizer.recognize_google(audio)
                        print(f"Recognized: {text}")
                        
                        # Send the recognized text to the frontend
                        self.sio.emit('voice_transcript', {'text': text})
                        
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
                                self.sio.emit('voice_response', {'command': command, 'response': response})
                            else:
                                self.speak("How can I help you?")
                                self.sio.emit('voice_response', {'command': '', 'response': "How can I help you?"})
                    
                    except sr.UnknownValueError:
                        print("Could not understand audio")
                    except sr.RequestError as e:
                        print(f"Could not request results; {e}")
                        self.sio.emit('voice_error', {'error': f"API error: {e}"})
            
            except Exception as e:
                print(f"Error in recognition loop: {e}")
                self.sio.emit('voice_error', {'error': f"Recognition error: {e}"})
                # Brief pause before retrying
                time.sleep(2)
    
    def process_command(self, command):
        """Process the voice command and return a response"""
        # This would connect to your existing command processing logic
        # For now, just return a simple response
        return f"I heard your command: {command}"
    
    def speak(self, text):
        """Speak the given text using pyttsx3"""
        print(f"Speaking: {text}")
        self.engine.say(text)
        self.engine.runAndWait()

# Routes to control the voice assistant
def create_routes(app, assistant):
    @app.route('/api/voice/start', methods=['POST'])
    def start_voice():
        return assistant.start_listening()
    
    @app.route('/api/voice/stop', methods=['POST'])
    def stop_voice():
        return assistant.stop_listening()
    
    @app.route('/api/voice/status', methods=['GET'])
    def voice_status():
        return {"status": "listening" if assistant.is_listening else "stopped"}

# Socket.IO event handlers
def register_socketio_events(socketio, assistant):
    @socketio.on('start_listening')
    def handle_start():
        return assistant.start_listening()
    
    @socketio.on('stop_listening')
    def handle_stop():
        return assistant.stop_listening()
    
    @socketio.on('send_command')
    def handle_command(data):
        command = data.get('command', '')
        if command:
            response = assistant.process_command(command)
            assistant.speak(response)
            return {'response': response}
        return {'error': 'Empty command'}

# This would be initialized in your main application
# assistant = BackendVoiceAssistant()
# create_routes(app, assistant)
# register_socketio_events(socketio, assistant)
