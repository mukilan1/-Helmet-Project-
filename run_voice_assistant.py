"""
Standalone script to run the voice assistant server
This allows the voice recognition to run in a separate process from the main app
"""
import os
import sys
from app_voice_integration import create_socket_app

print("Starting Smart Helmet Voice Assistant...")
print("Make sure the main application is running on port 5000")

# Check required packages
try:
    import speech_recognition as sr
    import pyttsx3
    from flask_socketio import SocketIO
except ImportError as e:
    print(f"Error: Missing required package - {e}")
    print("\nPlease install all required packages with:")
    print("pip install flask flask-socketio SpeechRecognition pyttsx3 pyaudio")
    sys.exit(1)

try:
    # Try to initialize the microphone to check if it's available
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Microphone detected and working.")
        
    # Create and run the app
    app, socketio, voice_assistant = create_socket_app()
    
    # Use PORT environment variable if available (for deployment)
    PORT = int(os.environ.get('PORT', 5001))
    
    print(f"\nVoice Assistant started successfully!")
    print(f"Listening on http://localhost:{PORT}")
    print(f"Wake word: 'helmet'")
    print(f"Press Ctrl+C to exit")
    
    # Run the app
    socketio.run(app, debug=False, host='0.0.0.0', port=PORT)
    
except Exception as e:
    print(f"\nError starting voice assistant: {e}")
    print("\nTroubleshooting tips:")
    print("1. Make sure your microphone is connected and working")
    print("2. Check that you have all required packages installed")
    print("3. Make sure no other application is using the microphone")
    print("4. On Linux, you may need to install additional dependencies:")
    print("   sudo apt-get install portaudio19-dev python3-pyaudio")
    sys.exit(1)
