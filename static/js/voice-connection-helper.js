/**
 * Helper for voice assistant connection management
 * Provides diagnostics and recovery for direct HTTP API calls
 */

class VoiceConnectionHelper {
    constructor(voiceAssistant) {
        this.voiceAssistant = voiceAssistant;
        this.isConnected = navigator.onLine;
        this.pingInterval = null;
        this.maxReconnectAttempts = 5;
        this.reconnectAttempts = 0;
        this.statusElement = document.getElementById('voice-response');
        
        // Setup network listeners
        this.setupNetworkListeners();
        
        // Start connection diagnostics
        this.startConnectionMonitoring();
    }
    
    setupNetworkListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Device is online');
            this.isConnected = true;
            this.showStatus('Network connection restored', 'success');
            this.reconnectVoiceAssistant();
        });
        
        window.addEventListener('offline', () => {
            console.log('Device is offline');
            this.isConnected = false;
            this.showStatus('Network connection lost. Voice assistant disabled.', 'error');
            if (this.voiceAssistant) {
                this.voiceAssistant.stopListening();
            }
        });
    }
    
    startConnectionMonitoring() {
        // Check connection every 30 seconds
        this.pingInterval = setInterval(() => {
            this.checkServerConnection();
        }, 30000);
        
        // Initial check
        setTimeout(() => {
            this.checkServerConnection();
        }, 1000);
    }
    
    async checkServerConnection() {
        if (!navigator.onLine) {
            this.isConnected = false;
            return;
        }
        
        try {
            // Try to ping the server
            const response = await fetch('/api/voice_assistant/status', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isConnected = true;
                
                // Show voice assistant status
                if (data.running) {
                    this.showStatus('Voice assistant is running on server', 'success');
                } else {
                    this.showStatus('Voice assistant is not running', 'warning');
                }
                
                // Reset reconnect attempts on successful connection
                this.reconnectAttempts = 0;
            } else {
                this.isConnected = false;
                this.showStatus('Cannot connect to voice assistant', 'error');
            }
        } catch (error) {
            console.error('Error checking server connection:', error);
            this.isConnected = false;
            this.showStatus('Connection error: ' + error.message, 'error');
            
            // Try to reconnect
            this.reconnectVoiceAssistant();
        }
    }
    
    reconnectVoiceAssistant() {
        if (!this.voiceAssistant || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }
        
        this.reconnectAttempts++;
        
        this.showStatus(`Reconnecting voice assistant (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, 'info');
        
        // Wait a bit before trying to reconnect
        setTimeout(() => {
            if (this.voiceAssistant.reconnect) {
                this.voiceAssistant.reconnect();
            } else if (!this.voiceAssistant.isListening && window.helmetVoiceAssistant) {
                // Try to restart the voice assistant
                window.helmetVoiceAssistant.startServerAssistant();
            }
        }, 2000 * this.reconnectAttempts); // Increasing delay with each attempt
    }
    
    showStatus(message, type = 'info') {
        console.log(`Voice Connection: ${message}`);
        
        if (this.statusElement) {
            // Create status message element
            const statusMsg = document.createElement('div');
            statusMsg.className = `connection-status ${type}`;
            statusMsg.innerHTML = `<i class="bi bi-wifi"></i> ${message}`;
            
            // Add to status element
            this.statusElement.appendChild(statusMsg);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (statusMsg.parentNode === this.statusElement) {
                    this.statusElement.removeChild(statusMsg);
                }
            }, 5000);
        }
    }
    
    stop() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
    }
}

// Initialize on page load after voice assistant is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for voice assistant to be initialized
    setTimeout(() => {
        if (window.helmetVoiceAssistant) {
            window.voiceConnectionHelper = new VoiceConnectionHelper(window.helmetVoiceAssistant);
            console.log('Voice connection helper initialized');
        }
    }, 2000);
});
