/**
 * Direct Voice Assistant Integration
 * Uses HTTP instead of WebSockets for communication
 */

class DirectVoiceAssistant {
    constructor() {
        // Elements
        this.voiceResponseElement = document.getElementById('voice-response');
        this.voiceCommandInput = document.getElementById('voice-command');
        this.sendCommandBtn = document.getElementById('send-command-btn');
        this.voiceToggleBtn = document.getElementById('voice-toggle-btn');
        
        // Add transcript element or create if not found
        this.transcriptElement = document.getElementById('voice-transcript');
        if (!this.transcriptElement && this.voiceResponseElement) {
            this.transcriptElement = document.createElement('div');
            this.transcriptElement.id = 'voice-transcript';
            this.transcriptElement.className = 'transcript-display mt-2 p-2 border rounded bg-light';
            this.voiceResponseElement.parentNode.insertBefore(this.transcriptElement, this.voiceResponseElement.nextSibling);
        }
        
        // State
        this.isServerRunning = false;
        this.isProcessing = false;
        this.statusCheckTimer = null;
        
        // Initialize
        this.setupElements();
        this.setupEventListeners();
        this.checkServerStatus();
        
        // Start checking for transcript updates
        this.startTranscriptPolling();
    }
    
    setupElements() {
        // Make sure we have all needed elements
        if (!this.voiceToggleBtn && this.voiceResponseElement) {
            console.log("Creating voice toggle button");
            this.voiceToggleBtn = document.createElement('button');
            this.voiceToggleBtn.id = 'voice-toggle-btn';
            this.voiceToggleBtn.className = 'btn btn-success mt-3 w-100';
            this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Start Voice Assistant';
            this.voiceResponseElement.parentNode.appendChild(this.voiceToggleBtn);
        }
    }
    
    setupEventListeners() {
        // Set up the send command button
        if (this.sendCommandBtn) {
            this.sendCommandBtn.addEventListener('click', () => {
                const command = this.voiceCommandInput?.value?.trim();
                if (command) {
                    this.sendCommand(command);
                    this.voiceCommandInput.value = '';
                }
            });
        }
        
        // Set up the voice command input
        if (this.voiceCommandInput) {
            this.voiceCommandInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    const command = this.voiceCommandInput.value.trim();
                    if (command) {
                        this.sendCommand(command);
                        this.voiceCommandInput.value = '';
                    }
                }
            });
        }
        
        // Set up the voice toggle button
        if (this.voiceToggleBtn) {
            this.voiceToggleBtn.addEventListener('click', () => {
                if (this.isServerRunning) {
                    this.stopServer();
                } else {
                    this.startServer();
                }
            });
        }
    }
    
    async checkServerStatus() {
        try {
            const response = await fetch('/api/voice_assistant/status');
            if (response.ok) {
                const data = await response.json();
                this.updateServerStatus(data.running);
            } else {
                this.updateServerStatus(false);
            }
        } catch (error) {
            console.error("Error checking server status:", error);
            this.updateServerStatus(false);
        }
        
        // Schedule regular status checks
        this.statusCheckTimer = setTimeout(() => this.checkServerStatus(), 5000);
    }
    
    updateServerStatus(isRunning) {
        this.isServerRunning = isRunning;
        
        // First, try to get server connection details with IP
        this.getConnectionDetails().then(connectionDetails => {
            // Update UI
            if (this.voiceToggleBtn) {
                if (isRunning) {
                    this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Stop Voice Assistant <span class="status-indicator connected"></span>';
                    this.voiceToggleBtn.classList.replace('btn-success', 'btn-danger');
                } else {
                    this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Start Voice Assistant <span class="status-indicator disconnected"></span>';
                    this.voiceToggleBtn.classList.replace('btn-danger', 'btn-success');
                }
            }
            
            // Update response area with detailed connection information including IP
            if (this.voiceResponseElement) {
                const ipInfo = connectionDetails.ip ? 
                    `<span class="connection-ip">(${connectionDetails.ip})</span>` : 
                    '<span class="connection-ip">(localhost)</span>';
                    
                const connectionInfo = isRunning ? 
                    `<div class='connection-info'><i class='bi bi-info-circle'></i> Server connection active: Python voice recognition is running on the server ${ipInfo}</div>` :
                    `<div class='connection-info connection-inactive'><i class='bi bi-exclamation-triangle'></i> Server connection inactive: Voice assistant is not running on the server ${ipInfo}</div>`;
                    
                const statusMessage = isRunning ? 
                    "Voice assistant is running. Say 'Helmet' followed by a command..." : 
                    "Voice assistant is stopped.";
                
                // Only update if not processing a command
                if (!this.isProcessing) {
                    // Update with both status message and connection info
                    this.updateVoiceResponse(statusMessage, isRunning ? 'listening' : 'stopped');
                    
                    // Add the connection info
                    if (this.voiceResponseElement.querySelector('.connection-info')) {
                        this.voiceResponseElement.querySelector('.connection-info').remove();
                    }
                    
                    // Use innerHTML for the HTML connection info
                    const infoDiv = document.createElement('div');
                    infoDiv.innerHTML = connectionInfo;
                    this.voiceResponseElement.appendChild(infoDiv.firstChild);
                }
            }
        });
    }
    
    async getConnectionDetails() {
        try {
            const response = await fetch('/api/voice_assistant/connection_info');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error("Error fetching connection details:", error);
        }
        
        // Return default values if fetch fails
        return {
            ip: window.location.hostname,
            port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
        };
    }
    
    async startServer() {
        if (this.isServerRunning) return;
        
        try {
            this.updateVoiceResponse("Starting voice assistant...", "processing");
            const response = await fetch('/api/voice_assistant/start', {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateVoiceResponse("Voice assistant started. Say 'Helmet' followed by a command...", "listening");
                    this.updateServerStatus(true);
                } else {
                    this.updateVoiceResponse("Could not start voice assistant: " + data.message, "error");
                }
            } else {
                this.updateVoiceResponse("Failed to start voice assistant. Check server logs.", "error");
            }
        } catch (error) {
            console.error("Error starting server:", error);
            this.updateVoiceResponse("Network error when starting voice assistant.", "error");
        }
    }
    
    async stopServer() {
        if (!this.isServerRunning) return;
        
        try {
            this.updateVoiceResponse("Stopping voice assistant...", "processing");
            const response = await fetch('/api/voice_assistant/stop', {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateVoiceResponse("Voice assistant stopped.", "stopped");
                    this.updateServerStatus(false);
                } else {
                    this.updateVoiceResponse("Could not stop voice assistant: " + data.message, "error");
                }
            } else {
                this.updateVoiceResponse("Failed to stop voice assistant. Check server logs.", "error");
            }
        } catch (error) {
            console.error("Error stopping server:", error);
            this.updateVoiceResponse("Network error when stopping voice assistant.", "error");
        }
    }
    
    async sendCommand(command) {
        this.isProcessing = true;
        this.updateVoiceResponse(`Processing: "${command}"`, "processing");
        
        try {
            const response = await fetch('/api/voice_command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateVoiceResponse(data.response || "Command processed", "response");
            } else {
                this.updateVoiceResponse("Failed to process command. Server returned an error.", "error");
            }
        } catch (error) {
            console.error("Error sending command:", error);
            this.updateVoiceResponse("Network error when sending command.", "error");
        } finally {
            this.isProcessing = false;
        }
    }
    
    updateVoiceResponse(text, status = "default") {
        if (!this.voiceResponseElement) {
            console.error("Voice response element not found");
            return;
        }
        
        // Remove existing status classes
        this.voiceResponseElement.classList.remove('listening', 'processing', 'response', 'error', 'stopped', 'ready');
        
        // Add status class
        if (status) {
            this.voiceResponseElement.classList.add(status);
        }
        
        // Set text
        const p = document.createElement('p');
        p.className = 'mb-0';
        p.textContent = text;
        
        this.voiceResponseElement.innerHTML = '';
        this.voiceResponseElement.appendChild(p);
    }
    
    // Add this method to poll for transcript updates
    startTranscriptPolling() {
        setInterval(() => {
            if (this.isServerRunning) {
                this.fetchLatestTranscript();
            }
        }, 1000); // Check every second
    }

    // Fix fetchLatestTranscript to more aggressively update on any changes
    async fetchLatestTranscript() {
        try {
            const response = await fetch('/api/voice_assistant/transcript');
            if (response.ok) {
                const data = await response.json();
                
                // Always update if there's a transcript, even if timestamp hasn't changed
                if (data.transcript) {
                    console.log("Transcript data:", data);
                    
                    if (data.transcript.trim() !== '') {
                        // Show what was actually heard
                        this.updateTranscript(data.transcript);
                        
                        // Update status indicator
                        const statusBadge = document.getElementById('transcript-status');
                        if (statusBadge) {
                            statusBadge.textContent = 'Heard speech!';
                            statusBadge.classList.remove('bg-info');
                            statusBadge.classList.add('bg-success');
                            
                            // Reset after 2 seconds
                            setTimeout(() => {
                                statusBadge.textContent = 'Listening...';
                                statusBadge.classList.remove('bg-success');
                                statusBadge.classList.add('bg-info');
                            }, 2000);
                        }
                    } else if (!document.querySelector('.transcript-item')) {
                        // Only show listening message if no other transcript items exist
                        this.updateTranscript('(listening...)');
                    }
                } else if (!document.querySelector('.transcript-item')) {
                    // No transcript available, show listening message
                    this.updateTranscript('(listening...)');
                }
            }
        } catch (error) {
            console.log('Error fetching transcript:', error);
        }
    }

    // Update the updateTranscript method to make "listening" text white
    updateTranscript(text) {
        if (!this.transcriptElement) return;
        
        // Clear placeholder text if present
        if (this.transcriptElement.querySelector('.text-muted')) {
            this.transcriptElement.innerHTML = '';
        }
        
        // Process text, even if it's the listening message
        const transcriptItem = document.createElement('div');
        transcriptItem.className = 'transcript-item';
        
        if (text.includes('listening')) {
            // Make listening text WHITE as requested
            transcriptItem.innerHTML = `<span class="text-white"><i class="bi bi-record-circle text-danger me-1"></i>${text}</span>`;
            transcriptItem.style.opacity = '0.7';
        } else {
            // Keep recognized speech styling
            transcriptItem.innerHTML = `<span class="text-warning fw-bold">Heard:</span> <span class="text-white">"${text}"</span>`;
            transcriptItem.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
            transcriptItem.style.padding = '6px 8px';
            transcriptItem.style.borderRadius = '4px';
            transcriptItem.style.marginBottom = '8px';
        }
        
        // Add to transcript element and limit to last 5 items
        this.transcriptElement.insertBefore(transcriptItem, this.transcriptElement.firstChild);
        
        // Keep only the last 5 items for cleaner UI
        while (this.transcriptElement.children.length > 5) {
            this.transcriptElement.removeChild(this.transcriptElement.lastChild);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing Direct Voice Assistant");
    window.helmetVoiceAssistant = new DirectVoiceAssistant();
});
