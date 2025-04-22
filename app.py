from flask import Flask, render_template, request, jsonify, redirect, url_for
import json
import random
import time
import os
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
    'fuel_level': 75
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
    # Add current time to state
    simulation_state['current_time'] = datetime.now().strftime("%H:%M")
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

if __name__ == '__main__':
    app.run(debug=True)
