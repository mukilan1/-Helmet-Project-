/**
 * Frontend component for Python-based voice assistant
 * Uses WebSockets to communicate with the Python backend
 */

class PythonVoiceAssistant {
    constructor() {
        // Connect to WebSocket
        this.socket = io();
        
        // UI elements
        this.statusElement = document.getElementById('voice-status');
        this.transcriptElement = document.getElementById('voice-transcript');
        this.responseElement = document.getElementById('voice-response');
        this.toggleButton = document.getElementById('voice-toggle-btn');
        
        // State
        this.isListening = false;
        
        // Initialize
        this.setupEventListeners();
        this.setupSocketListeners();
    }
    
    setupEventListeners() {
        // Toggle button for voice assistant
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => {
                if (this.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            });
        } else {
            console.warn("Voice toggle button not found");
            this.createToggleButton();
        }
    }
    
    createToggleButton() {
        // Create a toggle button if it doesn't exist
        this.toggleButton = document.createElement('button');
        this.toggleButton.id = 'voice-toggle-btn';
        this.toggleButton.className = 'btn btn-success';
        this.toggleButton.innerHTML = '<i class="bi bi-mic-fill"></i> Start Voice';
        
        // Add to the document
        document.body.appendChild(this.toggleButton);
        
        // Add event listener
        this.toggleButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });
    }
    
    setupSocketListeners() {
        // Receive status updates
        this.socket.on('voice_status', (data) => {
            this.updateStatus(data.status);
        });
        
        // Receive transcribed text
        this.socket.on('voice_transcript', (data) => {
            this.updateTranscript(data.text);
        });
        
        // Receive command responses
        this.socket.on('voice_response', (data) => {
            this.updateResponse(data.command, data.response);
        });
        
        // Receive errors
        this.socket.on('voice_error', (data) => {
            this.showError(data.error);
        });
        
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateStatus('connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateStatus('disconnected');
            this.isListening = false;
            this.updateButtonState();
        });
    }
    
    startListening() {
        this.socket.emit('start_listening', {}, (response) => {
            if (response && response.status === 'started') {
                this.isListening = true;
                this.updateButtonState();
                this.updateStatus('listening');
            } else {
                console.warn('Failed to start listening:', response);
            }
        });
    }
    
    stopListening() {
        this.socket.emit('stop_listening', {}, (response) => {
            if (response && response.status === 'stopped') {
                this.isListening = false;
                this.updateButtonState();
                this.updateStatus('stopped');
            } else {
                console.warn('Failed to stop listening:', response);
            }
        });
    }
    
    updateStatus(status) {
        if (this.statusElement) {
            this.statusElement.textContent = `Status: ${status}`;
            
            // Update class based on status
            this.statusElement.className = 'status-indicator';
            this.statusElement.classList.add(`status-${status}`);
        }
    }
    
    updateTranscript(text) {
        if (this.transcriptElement) {
            // Add the new text to the transcript
            const transcriptItem = document.createElement('div');
            transcriptItem.className = 'transcript-item';
            transcriptItem.textContent = text;
            
            // Add to the transcript
            this.transcriptElement.appendChild(transcriptItem);
            
            // Scroll to bottom
            this.transcriptElement.scrollTop = this.transcriptElement.scrollHeight;
        }
    }
    
    updateResponse(command, response) {
        if (this.responseElement) {
            // Create response item
            const responseItem = document.createElement('div');
            responseItem.className = 'response-item';
            
            // Format response with command and response text
            if (command) {
                const commandSpan = document.createElement('span');
                commandSpan.className = 'command-text';
                commandSpan.textContent = `Command: "${command}"`;
                responseItem.appendChild(commandSpan);
                
                // Add line break
                responseItem.appendChild(document.createElement('br'));
            }
            
            const responseSpan = document.createElement('span');
            responseSpan.className = 'response-text';
            responseSpan.textContent = response;
            responseItem.appendChild(responseSpan);
            
            // Add to response container
            this.responseElement.appendChild(responseItem);
            
            // Scroll to bottom
            this.responseElement.scrollTop = this.responseElement.scrollHeight;
        }
    }
    
    showError(error) {
        console.error('Voice assistant error:', error);
        
        // Show error in status
        this.updateStatus('error');
        
        // Show error in response element
        if (this.responseElement) {
            const errorItem = document.createElement('div');
            errorItem.className = 'error-item';
            errorItem.textContent = `Error: ${error}`;
            this.responseElement.appendChild(errorItem);
            this.responseElement.scrollTop = this.responseElement.scrollHeight;
        }
    }
    
    updateButtonState() {
        if (this.toggleButton) {
            if (this.isListening) {
                this.toggleButton.innerHTML = '<i class="bi bi-mic-fill"></i> Stop Voice';
                this.toggleButton.classList.replace('btn-success', 'btn-danger');
            } else {
                this.toggleButton.innerHTML = '<i class="bi bi-mic-fill"></i> Start Voice';
                this.toggleButton.classList.replace('btn-danger', 'btn-success');
            }
        }
    }
    
    // Helper method to manually send a command
    sendCommand(command) {
        if (!command) return;
        
        this.socket.emit('send_command', { command }, (response) => {
            if (response.error) {
                this.showError(response.error);
            } else {
                this.updateResponse(command, response.response);
            }
        });
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pythonVoiceAssistant = new PythonVoiceAssistant();
});
