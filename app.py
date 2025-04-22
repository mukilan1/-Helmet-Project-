from flask import Flask, render_template, request, jsonify, redirect, url_for, Response
import json
import random
import time
import os
import requests
from datetime import datetime

app = Flask(__name__)

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
        'quality': 85  # JPEG quality (0-100)
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
    data = request.json
    command = data.get('command', '').lower()
    response = {
        'success': True, 
        'command': command,
        'action_taken': True,
        'response': 'Command processed'
    }
    
    # Process different voice commands
    if 'call' in command:
        # Extract name after "call"
        words = command.split()
        if len(words) > 1 and words[0] == "call":
            name = " ".join(words[1:])
            simulation_state['call_active'] = True
            simulation_state['caller_name'] = name
            response['response'] = f"Calling {name}"
    
    elif 'play music' in command or 'play song' in command:
        song = random.choice(songs)
        simulation_state['music_playing'] = True
        simulation_state['song_title'] = song
        response['response'] = f"Playing {song}"
    
    elif 'pause music' in command or 'stop music' in command:
        simulation_state['music_playing'] = False
        response['response'] = "Music paused"
    
    elif 'navigate' in command or 'directions' in command:
        # Start navigation with first step
        step = navigation_steps[0]
        simulation_state['nav_direction'] = step['direction']
        simulation_state['nav_instruction'] = step['instruction']
        simulation_state['nav_distance'] = step['distance']
        response['response'] = f"Starting navigation: {step['instruction']}"
    
    else:
        response['action_taken'] = False
        response['response'] = "Command not recognized"
    
    return jsonify(response)

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
    """Proxy the ESP32 camera stream"""
    if not simulation_state['camera_connected']:
        # Return a fallback image or error message if camera is not connected
        return Response(b'Camera not connected', mimetype='text/plain')
    
    try:
        # Forward the request to the ESP32 camera
        resp = requests.get(f'{simulation_state["esp32_camera_url"]}/stream', stream=True, timeout=5)
        
        # Stream the response back to the client
        return Response(
            resp.iter_content(chunk_size=1024),
            content_type=resp.headers['content-type']
        )
    except:
        return Response(b'Camera stream error', mimetype='text/plain')

@app.route('/api/camera_status')
def camera_status():
    return jsonify({
        'connected': simulation_state['camera_connected'],
        'url': simulation_state['esp32_camera_url']
    })

@app.route('/api/camera_sensors', methods=['GET'])
def camera_sensors():
    """Get sensor data from the ESP32 camera"""
    if not simulation_state['camera_connected']:
        return jsonify({'success': False, 'message': 'Camera not connected'})
    
    try:
        # In a real implementation, you'd fetch this data from the ESP32
        # For demo purposes, we'll simulate some sensor readings
        simulation_state['camera_sensor_data']['light_level'] = random.randint(200, 800)
        simulation_state['camera_sensor_data']['motion_detected'] = random.random() > 0.7
        simulation_state['camera_sensor_data']['distance'] = round(1 + random.random() * 5, 2)
        
        return jsonify({
            'success': True,
            'sensors': simulation_state['camera_sensor_data']
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
