from flask import Flask, render_template, request, jsonify, redirect, url_for, Response
import json
import random
import time
import os
import requests
import cv2
import numpy as np
import threading
import base64
from datetime import datetime
from object_detection import ObjectDetector

app = Flask(__name__)

# Initialize the object detector
object_detector = ObjectDetector()

# For webcam capture if using local camera
webcam = None
webcam_lock = threading.Lock()
webcam_frame = None
webcam_thread_active = False

# Global state for simulation
simulation_state = {
    'speed': 0,
    'call_active': False,
    'caller_name': None,
    'music_playing': False,
    'song_title': None,
    'nav_direction': None,
    'nav_instruction': None,
    'nav_distance': 0,
    'battery_level': 85,
    'fuel_level': 75,
    'camera_connected': False,
    'esp32_camera_url': 'http://192.168.1.100', # Default ESP32 camera IP - update this
    'camera_sensor_data': {
        'light_level': 500,  # Ambient light level in lux
        'motion_detected': False,  # Motion detection flag
        'distance': 3.5,  # Distance in meters (from ultrasonic/ToF sensor)
        'resolution': '640x480',  # Camera resolution
        'framerate': 20,  # Camera framerate
        'quality': 85,  # JPEG quality (0-100)
        'humans_count': 0,  # Number of humans detected
        'vehicles_count': 0  # Number of vehicles detected
    },
    'sensor_history': {
        'light_trend': 'stable',  # 'increasing', 'decreasing', or 'stable'
        'light_direction': 1,  # 1 for increasing, -1 for decreasing
        'last_motion_time': 0,  # timestamp of last motion
        'distance_trend': 'stable'  # 'approaching', 'receding', or 'stable'
    }
}

# Sample data for simulation
callers = ["John Smith", "Alice Johnson", "David Lee", "Sarah Wilson", "Mom", "Dad", "Work"]
songs = ["Highway to Hell", "Born to be Wild", "Ride the Lightning", "Fuel", "Breaking the Law", "Living on a Prayer"]
navigation_steps = [
    {"direction": "straight", "instruction": "Continue straight for 500 meters", "distance": 0.5},
    {"direction": "right", "instruction": "Turn right onto Main Street", "distance": 0.2},
    {"direction": "left", "instruction": "Turn left onto Oak Avenue", "distance": 0.3},
    {"direction": "straight", "instruction": "Continue straight for 300 meters", "distance": 0.3},
    {"direction": "right", "instruction": "Turn right onto Market Street", "distance": 0.1},
    {"direction": "stop", "instruction": "You have arrived at your destination", "distance": 0.0}
]

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/simulation')
def simulation():
    return render_template('simulation.html')

@app.route('/api/state')
def get_state():
    # Add current time to state with 12-hour format and AM/PM
    simulation_state['current_time'] = datetime.now().strftime("%I:%M %p")
    return jsonify(simulation_state)

@app.route('/api/update_speed', methods=['POST'])
def update_speed():
    data = request.json
    simulation_state['speed'] = data.get('speed', simulation_state['speed'])
    return jsonify({'success': True})

@app.route('/api/trigger_call', methods=['POST'])
def trigger_call():
    data = request.json
    if data.get('action') == 'start':
        caller = data.get('caller', random.choice(callers))
        simulation_state['call_active'] = True
        simulation_state['caller_name'] = caller
    else:
        simulation_state['call_active'] = False
        simulation_state['caller_name'] = None
    return jsonify({'success': True})

@app.route('/api/music_control', methods=['POST'])
def music_control():
    data = request.json
    action = data.get('action')
    
    if action == 'play':
        song = data.get('song', random.choice(songs))
        simulation_state['music_playing'] = True
        simulation_state['song_title'] = song
    elif action == 'pause':
        simulation_state['music_playing'] = False
    elif action == 'next':
        song = random.choice(songs)
        simulation_state['music_playing'] = True
        simulation_state['song_title'] = song
    elif action == 'previous':
        song = random.choice(songs)
        simulation_state['music_playing'] = True
        simulation_state['song_title'] = song
        
    return jsonify({'success': True})

@app.route('/api/navigation', methods=['POST'])
def navigation():
    data = request.json
    action = data.get('action')
    
    if action == 'start':
        # Start navigation with first step
        step = navigation_steps[0]
        simulation_state['nav_direction'] = step['direction']
        simulation_state['nav_instruction'] = step['instruction']
        simulation_state['nav_distance'] = step['distance']
    elif action == 'next':
        # Find current step and move to next
        current_direction = simulation_state['nav_direction']
        for i, step in enumerate(navigation_steps):
            if step['direction'] == current_direction and i < len(navigation_steps) - 1:
                next_step = navigation_steps[i + 1]
                simulation_state['nav_direction'] = next_step['direction']
                simulation_state['nav_instruction'] = next_step['instruction']
                simulation_state['nav_distance'] = next_step['distance']
                break
    elif action == 'stop':
        simulation_state['nav_direction'] = None
        simulation_state['nav_instruction'] = None
        simulation_state['nav_distance'] = 0
        
    return jsonify({'success': True})

@app.route('/api/voice_command', methods=['POST'])
def voice_command():
    """Process voice commands from the voice assistant"""
    try:
        data = request.json
        command = data.get('command', '').lower().strip()
        
        # Prepare response structure
        response = {
            'success': True, 
            'command': command,
            'action_taken': True,
            'response': 'Command processed'
        }
        
        # Log the incoming command
        print(f"Voice command received: '{command}'")
        
        # Process different voice commands
        if 'call' in command:
            # Extract name after "call"
            words = command.split()
            if len(words) > 1 and words[0] == "call":
                name = " ".join(words[1:])
                simulation_state['call_active'] = True
                simulation_state['caller_name'] = name
                response['response'] = f"Calling {name}"
            else:
                # Check if name is somewhere else in the command
                for i, word in enumerate(words):
                    if word == "call" and i < len(words) - 1:
                        name = " ".join(words[i+1:])
                        simulation_state['call_active'] = True
                        simulation_state['caller_name'] = name
                        response['response'] = f"Calling {name}"
                        break
        
        elif any(x in command for x in ['end call', 'hang up', 'stop call']):
            simulation_state['call_active'] = False
            simulation_state['caller_name'] = None
            response['response'] = "Call ended"
        
        elif any(x in command for x in ['play music', 'play song', 'start music']):
            song = random.choice(songs)
            simulation_state['music_playing'] = True
            simulation_state['song_title'] = song
            response['response'] = f"Playing {song}"
        
        elif any(x in command for x in ['pause music', 'stop music']):
            simulation_state['music_playing'] = False
            response['response'] = "Music paused"
        
        elif 'next song' in command or 'skip song' in command:
            song = random.choice(songs)
            simulation_state['music_playing'] = True
            simulation_state['song_title'] = song
            response['response'] = f"Playing next song: {song}"
        
        elif 'previous song' in command:
            song = random.choice(songs)
            simulation_state['music_playing'] = True
            simulation_state['song_title'] = song
            response['response'] = f"Playing previous song: {song}"
        
        elif any(x in command for x in ['navigate', 'directions', 'navigation', 'start navigation']):
            # Check if there's a destination
            destination = None
            for word in ['to', 'towards']:
                if word in command:
                    parts = command.split(word, 1)
                    if len(parts) > 1:
                        destination = parts[1].strip()
            
            # Start navigation with first step
            step = navigation_steps[0]
            simulation_state['nav_direction'] = step['direction']
            simulation_state['nav_instruction'] = step['instruction']
            simulation_state['nav_distance'] = step['distance']
            
            if destination:
                response['response'] = f"Starting navigation to {destination}: {step['instruction']}"
            else:
                response['response'] = f"Starting navigation: {step['instruction']}"
        
        elif any(x in command for x in ['stop navigation', 'cancel navigation', 'end navigation']):
            simulation_state['nav_direction'] = None
            simulation_state['nav_instruction'] = None
            simulation_state['nav_distance'] = 0
            response['response'] = "Navigation cancelled"
        
        elif 'next direction' in command:
            # Find current step and move to next
            current_direction = simulation_state['nav_direction']
            for i, step in enumerate(navigation_steps):
                if step['direction'] == current_direction and i < len(navigation_steps) - 1:
                    next_step = navigation_steps[i + 1]
                    simulation_state['nav_direction'] = next_step['direction']
                    simulation_state['nav_instruction'] = next_step['instruction']
                    simulation_state['nav_distance'] = next_step['distance']
                    response['response'] = f"Next direction: {next_step['instruction']}"
                    break
            else:
                response['response'] = "You have reached your destination"
        
        elif 'speed' in command:
            # Report current speed
            current_speed = simulation_state['speed']
            response['response'] = f"Current speed is {current_speed} kilometers per hour"
            
        elif any(x in command for x in ['time', "what's the time", 'current time']):
            # Report current time
            current_time = datetime.now().strftime("%I:%M %p")
            response['response'] = f"The current time is {current_time}"
        
        elif 'help' in command:
            # List available commands
            response['response'] = ("Available commands: call [name], end call, "
                                   "play music, pause music, next song, previous song, "
                                   "navigate to [place], stop navigation, next direction, "
                                   "current speed, what's the time")
        
        else:
            response['action_taken'] = False
            response['response'] = "I didn't understand that command. Try saying 'Helmet help' for available commands."
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Error processing voice command: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'response': "Sorry, there was an error processing your command"
        })

@app.route('/api/connect_camera', methods=['POST'])
def connect_camera():
    data = request.json
    ip_address = data.get('ip_address', '')
    
    if ip_address:
        # Update the ESP32 camera URL
        simulation_state['esp32_camera_url'] = f'http://{ip_address}'
        
        # Test the connection
        try:
            resp = requests.get(f'{simulation_state["esp32_camera_url"]}', timeout=3)
            if resp.status_code == 200:
                simulation_state['camera_connected'] = True
                return jsonify({'success': True, 'message': 'Camera connected successfully'})
        except:
            pass
            
    return jsonify({'success': False, 'message': 'Failed to connect to camera'})

@app.route('/camera_stream')
def camera_stream():
    """Stream the camera with object detection overlays"""
    if not simulation_state['camera_connected']:
        # Return a fallback image or error message if camera is not connected
        return Response(b'Camera not connected', mimetype='text/plain')
    
    def generate_frames():
        try:
            # Create a connection to ESP32 camera stream
            resp = requests.get(f'{simulation_state["esp32_camera_url"]}/stream', stream=True, timeout=5)
            
            # Variables for MJPEG parsing
            boundary = b''
            for line in resp.iter_lines():
                if line.startswith(b'--'):
                    boundary = line
                    break
            
            # Process the stream
            buffer = b''
            for chunk in resp.iter_content(chunk_size=1024):
                buffer += chunk
                
                # Find start and end of JPEG in buffer
                start = buffer.find(b'\xff\xd8')
                end = buffer.find(b'\xff\xd9')
                
                if start != -1 and end != -1:
                    # Extract JPEG data
                    jpg_data = buffer[start:end+2]
                    buffer = buffer[end+2:]
                    
                    # Decode the frame
                    frame = cv2.imdecode(np.frombuffer(jpg_data, dtype=np.uint8), cv2.IMREAD_COLOR)
                    
                    if frame is not None:
                        # Process with object detection
                        processed_frame, _, _, _ = object_detector.detect_objects(frame)
                        
                        # Encode back to JPEG
                        _, jpeg = cv2.imencode('.jpg', processed_frame)
                        
                        # Construct MJPEG packet
                        mjpeg_packet = (
                            boundary + b'\r\n' +
                            b'Content-Type: image/jpeg\r\n' +
                            b'Content-Length: ' + str(len(jpeg)).encode() + b'\r\n\r\n'
                        )
                        mjpeg_packet += jpeg.tobytes() + b'\r\n'
                        
                        yield (mjpeg_packet)
        except Exception as e:
            print(f"Stream error: {e}")
            yield b'Error in camera stream'
    
    # Return streaming response
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

# Fix iPhone camera connection error

@app.route('/api/start_local_camera', methods=['POST'])
def start_local_camera():
    """Start local webcam with object detection"""
    global webcam, webcam_thread_active
    
    try:
        # Stop any existing webcam
        if webcam is not None:
            with webcam_lock:
                webcam_thread_active = False
            
            # Give the thread time to stop
            time.sleep(0.5)
            
            # Release webcam resource only if it's not None
            try:
                webcam.release()
            except:
                print("Warning: Could not release previous webcam - it may not have been initialized properly")
            webcam = None
        
        # Initialize webcam with robust error handling
        camera_id = request.json.get('camera_id', 0)
        success = False
        error_msg = ""
        
        # Try multiple approaches to open the camera
        approaches = [
            # First try the original method with the provided ID
            lambda: try_open_camera(camera_id),
            # If that fails, try to convert to integer
            lambda: try_open_camera(int(camera_id)) if not isinstance(camera_id, int) else None,
            # If that fails, try default camera (0)
            lambda: try_open_camera(0),
            # If that fails, try camera 1 (external webcam on many systems)
            lambda: try_open_camera(1),
            # Last resort, try a different backend
            lambda: try_open_camera(0, cv2.CAP_DSHOW if os.name == 'nt' else cv2.CAP_V4L2)
        ]
        
        for approach_func in approaches:
            result = approach_func()
            if result and result['success']:
                webcam = result['camera']
                success = True
                break
            elif result and result['error']:
                error_msg += result['error'] + "; "
        
        if not success or not webcam or not webcam.isOpened():
            available_cameras = get_available_cameras()
            return jsonify({
                'success': False, 
                'message': f'Failed to open webcam: {error_msg}',
                'available_cameras': available_cameras
            })
        
        # Successfully opened camera, set parameters
        print(f"Successfully opened camera {camera_id}")
        
        # Set resolution
        webcam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        webcam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        # Start webcam thread
        with webcam_lock:
            webcam_thread_active = True
        
        threading.Thread(target=process_webcam, daemon=True).start()
        
        return jsonify({'success': True, 'message': 'Local camera started'})
    
    except Exception as e:
        # Detailed error reporting
        import traceback
        error_details = traceback.format_exc()
        print(f"Error starting camera: {str(e)}\n{error_details}")
        
        available_cameras = get_available_cameras()
        return jsonify({
            'success': False, 
            'message': f'Exception: {str(e)}',
            'available_cameras': available_cameras,
            'error_details': error_details
        })

def try_open_camera(camera_id, api_preference=None):
    """Try to open a camera with the given ID and API preference"""
    try:
        # Handle long device IDs that can't be converted to integers
        if isinstance(camera_id, str) and len(camera_id) > 10:
            print(f"Detected device hash ID, trying numeric index instead: {camera_id[:10]}...")
            # When we get a long hash ID like 'ac3013a96918c1bf2dea4f04f6f1ece050044aad87822c250199ca78505c3e2d',
            # ignore it and try camera 0 instead, which is usually the default camera
            return try_open_camera(0)
        
        print(f"Attempting to open camera with ID: {camera_id}, API: {api_preference}")
        
        # Special handling for iPhone/iOS devices
        if isinstance(camera_id, str) and ('iphone' in camera_id.lower() or 'ios' in camera_id.lower()):
            print("Detected iPhone camera attempt, using alternative approach")
            # For iPhones, we need to handle differently since they might use a different protocol
            # Check if we can connect to standard indices first
            for idx in [0, 1]:
                alt_result = try_open_camera(idx)
                if alt_result and alt_result['success']:
                    return alt_result
            
            # If standard indices fail, return specific error for iPhone users
            return {
                'success': False, 
                'camera': None, 
                'error': "iPhone cameras may require an IP camera app. Please use the ESP32 camera connection instead."
            }
        
        # Normal camera opening procedure
        if api_preference:
            cap = cv2.VideoCapture(camera_id, api_preference)
        else:
            cap = cv2.VideoCapture(camera_id)
            
        # Check if opened successfully
        if cap.isOpened():
            # Read a test frame to confirm it's working
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                print(f"Successfully opened and read from camera {camera_id}")
                return {'success': True, 'camera': cap, 'error': None}
            else:
                # Safely release if opened but can't read
                try:
                    cap.release()
                except:
                    pass
                return {'success': False, 'camera': None, 'error': f"Camera {camera_id} opened but could not read frame"}
        else:
            return {'success': False, 'camera': None, 'error': f"Could not open camera {camera_id}"}
    except Exception as e:
        return {'success': False, 'camera': None, 'error': f"Error with camera {camera_id}: {str(e)}"}

def get_available_cameras():
    """Check what cameras are available on the system"""
    available = []
    # Try the first 5 camera indices
    for i in range(5):
        try:
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    available.append(i)
                # Always release the camera properly
                try:
                    cap.release()
                except:
                    pass
        except:
            pass
    return available

@app.route('/api/stop_local_camera', methods=['POST'])
def stop_local_camera():
    """Stop the local webcam"""
    global webcam, webcam_thread_active
    
    try:
        # Stop webcam thread
        with webcam_lock:
            webcam_thread_active = False
        
        # Release webcam if it exists
        if webcam is not None:
            try:
                webcam.release()
            except Exception as e:
                print(f"Warning: Could not release webcam: {e}")
            webcam = None
        
        return jsonify({'success': True, 'message': 'Local camera stopped'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/local_camera_stream')
def local_camera_stream():
    """Stream from local webcam with object detection"""
    def generate_frames():
        global webcam_frame
        
        while True:
            # Get latest processed frame
            with webcam_lock:
                if webcam_frame is None:
                    # No frame available
                    time.sleep(0.1)
                    continue
                
                frame_to_send = webcam_frame.copy()
            
            # Encode frame to JPEG
            _, jpeg = cv2.imencode('.jpg', frame_to_send)
            
            # Yield the frame in MJPEG format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            
            # Control frame rate
            time.sleep(0.033)  # ~30 FPS
    
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

def process_webcam():
    """Background thread to process webcam frames with object detection"""
    global webcam, webcam_frame, webcam_thread_active
    
    while True:
        # Check if thread should continue
        with webcam_lock:
            if not webcam_thread_active:
                break
        
        # Read frame from webcam
        if webcam is not None and webcam.isOpened():
            ret, frame = webcam.read()
            
            if ret:
                # Process frame with object detection
                processed_frame, humans, vehicles, light = object_detector.detect_objects(frame)
                
                # Update the frame
                with webcam_lock:
                    webcam_frame = processed_frame
        
        # Sleep to control processing rate
        time.sleep(0.01)

# Initialize app startup
@app.before_first_request
def init_app():
    """Initialize the application"""
    pass  # Any initialization code can go here

@app.route('/api/detection_stats')
def get_detection_stats():
    """Return current detection statistics for the JavaScript frontend"""
    # Return the counts from the object detector
    return jsonify({
        'success': True,
        'humans_count': object_detector.humans_count,
        'vehicles_count': object_detector.vehicles_count,
        'faces_count': object_detector.faces_count,
        'motion_detected': object_detector.motion_detected,
        'light_level': object_detector.light_level,
        'distance': object_detector.closest_distance
    })

@app.route('/api/camera_status')
def get_camera_status():
    """Return current camera connection status"""
    return jsonify({
        'connected': simulation_state['camera_connected'],
        'url': simulation_state['esp32_camera_url'],
        'sensor_data': object_detector.get_sensor_data()  # Include sensor data with status
    })

@app.route('/api/camera_sensors')
def get_camera_sensors():
    """Return camera sensor data including detection results"""
    # Get latest data directly from object detector
    sensor_data = object_detector.get_sensor_data()
    
    # Force update human and vehicle counts to latest values
    sensor_data['humans_count'] = object_detector.humans_count
    sensor_data['vehicles_count'] = object_detector.vehicles_count
    
    # Update distance with closest detected object
    sensor_data['distance'] = object_detector.closest_distance
    
    # Update motion flag
    sensor_data['motion_detected'] = object_detector.motion_detected
    
    # Store the values in simulation state for future use
    simulation_state['camera_sensor_data'] = sensor_data
    
    # Debugging: Print the data to make sure it's working
    print(f"Sending sensor data: {sensor_data}")
    
    return jsonify({
        'success': True,
        'sensors': sensor_data
    })

def find_free_port(start_port=5000, max_attempts=20):
    """Find a free port starting from start_port"""
    import socket
    from contextlib import closing
    
    for port in range(start_port, start_port + max_attempts):
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.settimeout(1)
            result = sock.connect_ex(('127.0.0.1', port))
            if result != 0:  # Port is free
                return port
    
    # If we can't find a free port in the range, try a high random port
    import random
    return random.randint(8000, 9000)

if __name__ == '__main__':
    # Always find a free port first rather than trying default and failing
    port = find_free_port(start_port=5000, max_attempts=20)
    
    # If not using the default port, inform the user
    if port != 5000:
        print(f"Port 5000 is already in use (possibly by AirPlay on macOS).")
        print(f"Using alternative port {port} instead.")
        print(f"Access the application at: http://localhost:{port}")
    
    # Run the app with the selected port
    app.run(debug=True, host='0.0.0.0', threaded=True, port=port)
