"""
Direct integration of voice assistant functionality into main Flask app
"""
import threading
import time
import pyttsx3
import speech_recognition as sr
from flask import jsonify

class IntegratedVoiceAssistant:
    def __init__(self, app):
        self.app = app
        self.is_running = False
        self.thread = None
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        self.wake_word = "helmet"
        
        # Initialize text-to-speech engine
        try:
            self.engine = pyttsx3.init()
            self.engine.setProperty('rate', 150)
        except Exception as e:
            print(f"Warning: TTS initialization failed: {e}")
            self.engine = None
        
        # Register route for status checks
        @app.route('/api/voice_assistant/status', methods=['GET'])
        def voice_status():
            return jsonify({'running': self.is_running})
    
    def start(self):
        """Start the voice assistant in a background thread"""
        if not self.is_running:
            self.is_running = True
            self.thread = threading.Thread(target=self.recognition_loop, daemon=True)
            self.thread.start()
            print("Voice assistant started")
            return True
        return False
    
    def stop(self):
        """Stop the voice assistant"""
        if self.is_running:
            self.is_running = False
            if self.thread:
                self.thread.join(timeout=2.0)
            print("Voice assistant stopped")
            return True
        return False
    
    def recognition_loop(self):
        """Main loop for voice recognition"""
        print("Starting voice recognition loop")
        
        while self.is_running:
            try:
                # Use microphone as source
                with sr.Microphone() as source:
                    print("Adjusting for ambient noise...")
                    self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    print("Listening for wake word...")
                    
                    # Listen for audio
                    try:
                        audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=5)
                    except Exception as e:
                        print(f"Listen error: {e}")
                        continue
                    
                    try:
                        # Recognize speech
                        text = self.recognizer.recognize_google(audio)
                        print(f"Heard: {text}")
                        
                        # Check for wake word
                        if self.wake_word.lower() in text.lower():
                            # Extract command after wake word
                            parts = text.lower().split(self.wake_word.lower(), 1)
                            if len(parts) > 1 and parts[1].strip():
                                command = parts[1].strip()
                                print(f"Processing command: {command}")
                                
                                # Process command using the existing API
                                from flask import current_app
                                with current_app.test_client() as client:
                                    response = client.post('/api/voice_command', 
                                                         json={'command': command})
                                    data = response.get_json()
                                    
                                    # Speak the response
                                    if data and 'response' in data:
                                        self.speak(data['response'])
                    
                    except sr.UnknownValueError:
                        print("Could not understand audio")
                    except sr.RequestError as e:
                        print(f"Google Speech Recognition service error: {e}")
                    except Exception as e:
                        print(f"Error processing speech: {e}")
            
            except Exception as e:
                print(f"Error in recognition loop: {e}")
                time.sleep(2)  # Pause before retrying
    
    def speak(self, text):
        """Speak the given text"""
        if not self.engine:
            print(f"TTS not available, would say: {text}")
            return
        
        try:
            # Run in a separate thread to avoid blocking
            def _speak():
                try:
                    self.engine.say(text)
                    self.engine.runAndWait()
                except Exception as e:
                    print(f"Error in TTS: {e}")
            
            threading.Thread(target=_speak, daemon=True).start()
        except Exception as e:
            print(f"Error starting TTS thread: {e}")
