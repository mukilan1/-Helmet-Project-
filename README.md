# Smart Helmet Project

A web-based simulation of a smart motorcycle helmet with integrated display and voice assistant.

## Features

- Real-time motorcycle simulation with speed control
- Virtual helmet display showing:
  - Digital speedometer with current speed
  - Time display in corner
  - Direction indicators (left, right, straight, stop arrows)
  - Incoming call notifications with caller name
  - Music playback status indicator
- Interactive controls for testing scenarios:
  - Simulate incoming calls with custom caller names
  - Trigger navigation directions
  - Control music playback status
- Voice command testing through simulated voice assistant

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the Flask application:
   ```
   python app.py
   ```
2. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000/
   ```

## Using the Simulation

### Motorcycle Controls

- Use the speed slider or Accelerate/Brake buttons to control the motorcycle speed
- Turn left/right buttons activate corresponding indicators

### Testing Features

- **Calls**: Enter a caller name and click "Call" to simulate an incoming call
- **Music**: Use the music control buttons to play, pause, and switch tracks
- **Navigation**: Start navigation and go through directions step by step

### Voice Assistant

Type a command in the voice assistant input and press "Send" to simulate voice commands. Examples:

- "Call Mom"
- "Play music"
- "Navigate home"
- "Pause music"

## Project Structure

- `app.py` - Main Flask application
- `templates/` - HTML templates
  - `index.html` - Homepage
  - `simulation.html` - Simulation interface
- `static/` - Static assets
  - `css/styles.css` - Styling
  - `js/simulation.js` - Interactive functionality

## Technologies Used

- Backend: Flask (Python)
- Frontend: HTML, CSS, JavaScript
- Styling: Bootstrap 5
