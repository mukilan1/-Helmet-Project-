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
        
        # Add transcript storage
        self.latest_transcript = ""
        self.transcript_timestamp = 0
        
        # Register additional route for transcript
        @app.route('/api/voice_assistant/transcript', methods=['GET'])
        def get_transcript():
            # Return the latest transcript with timestamp
            return jsonify({
                'transcript': self.latest_transcript,
                'timestamp': self.transcript_timestamp
            })
    
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
        
        # Initialize mic_index with a default value BEFORE the try block
        mic_index = None  # Default to system default microphone
        
        # Ensure we have the microphone available
        try:
            # Test microphone before entering the loop
            microphone_list = sr.Microphone.list_microphone_names()
            print(f"Available microphones: {microphone_list}", flush=True)
            
            if not microphone_list:
                print("ERROR: No microphones detected!", flush=True)
                return
                
            # Try to set a specific microphone index if you're having issues
            # You might need to try different indices based on your system
            for i, name in enumerate(microphone_list):
                print(f"Microphone {i}: {name}", flush=True)
                # Prefer default mic or one with "default" in the name
                if "default" in name.lower() or "built-in" in name.lower():
                    mic_index = i
                    print(f"Selected microphone: {name} (index {i})", flush=True)
                    break
        
        except Exception as e:
            print(f"Error detecting microphones: {e}", flush=True)
            # Continue with default microphone (mic_index is still None here)
        
        # Main recognition loop  
        while self.is_running:
            try:
                # Use microphone as source, potentially with specific index
                with sr.Microphone(device_index=mic_index) as source:
                    print("Adjusting for ambient noise...", flush=True)
                    # Use longer duration for better noise profile
                    self.recognizer.adjust_for_ambient_noise(source, duration=1.0)
                    
                    # Use higher energy threshold if needed for better detection
                    self.recognizer.energy_threshold = 400  # Increased from 300
                    self.recognizer.dynamic_energy_adjustment_ratio = 1.5
                    
                    print(f"Listening for wake word... (Energy threshold: {self.recognizer.energy_threshold})", flush=True)
                    
                    # Listen for audio with more generous timeouts
                    try:
                        audio = self.recognizer.listen(source, timeout=10, phrase_time_limit=10)
                        print("Audio captured! Recognizing...", flush=True)
                    except Exception as e:
                        print(f"Listen error: {e}", flush=True)
                        continue
                    
                    try:
                        # Try multiple recognition services if Google fails
                        try:
                            text = self.recognizer.recognize_google(audio)
                        except sr.RequestError:
                            # Fallback to Sphinx for offline recognition
                            try:
                                print("Google recognition failed, trying Sphinx...", flush=True)
                                text = self.recognizer.recognize_sphinx(audio)
                            except:
                                raise  # Re-raise if Sphinx also fails
                        
                        # Debug what was heard immediately
                        print("\n" + "="*50, flush=True)
                        print(f"HEARD TEXT: \"{text}\"", flush=True)
                        print("="*50 + "\n", flush=True)
                        
                        # IMPORTANT: Always update transcript timestamp to a new value
                        # to trigger frontend detection of changes
                        self.latest_transcript = text
                        self.transcript_timestamp = time.time()
                        print(f"Updated transcript with timestamp: {self.transcript_timestamp}", flush=True)
                        
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
                        # Don't update transcript on failure
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
