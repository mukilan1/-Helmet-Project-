"""
Enhanced version of the Smart Helmet application with integrated voice assistant
This file combines the original app with Socket.IO for real-time voice processing
"""

# Import the original app.py code
from app import app as flask_app, find_free_port

# Import necessary extensions for voice assistant
from flask_socketio import SocketIO
from app_voice_integration import HelmetVoiceAssistantBackend

# Create Socket.IO instance
socketio = SocketIO(flask_app, cors_allowed_origins="*")

# Initialize voice assistant with our Flask app and Socket.IO
voice_assistant = HelmetVoiceAssistantBackend(flask_app, socketio)

# Updated index route to include Socket.IO libraries
@flask_app.route('/voice_index')
def voice_index():
    return flask_app.send_static_file('voice_assistant.html')

if __name__ == '__main__':
    # Always find a free port first rather than trying default and failing
    port = find_free_port(start_port=5000, max_attempts=20)
    
    # If not using the default port, inform the user
    if port != 5000:
        print(f"Port 5000 is already in use (possibly by AirPlay on macOS).")
        print(f"Using alternative port {port} instead.")
        print(f"Access the application at: http://localhost:{port}")
    
    # Run the app with Socket.IO instead of the normal Flask run
    socketio.run(flask_app, debug=True, host='0.0.0.0', port=port)
