/**
 * Smart Helmet Voice Assistant
 * Provides voice control capabilities with "Helmet" wake word
 */

class HelmetVoiceAssistant {
    constructor() {
        // Speech recognition support
        this.recognition = null;
        this.isListening = false;
        this.processingCommand = false;
        this.wakeWord = "helmet";
        this.lastCommand = "";
        
        // UI elements
        this.voiceResponseElement = document.getElementById('voice-response');
        this.voiceCommandInput = document.getElementById('voice-command');
        this.sendCommandBtn = document.getElementById('send-command-btn');
        this.voiceToggleBtn = document.getElementById('voice-toggle-btn');
        
        // Feedback elements
        this.helmetDisplay = document.getElementById('helmet-display');
        
        // Command history
        this.commandHistory = [];
        
        // Speech synthesis
        this.synth = window.speechSynthesis;
        
        // Initialize
        this.initializeSpeechRecognition();
        this.setupEventListeners();
        
        console.log('Voice Assistant initialized');
        
        // Fix issue with the voice toggle button not being found
        if (!this.voiceToggleBtn) {
            console.warn("Voice toggle button not found. Adding it dynamically.");
            this.createVoiceToggleButton();
        }
    }
    
    createVoiceToggleButton() {
        // In case the voice toggle button wasn't found, let's add it dynamically
        const parentNode = this.voiceResponseElement?.parentNode;
        if (parentNode) {
            this.voiceToggleBtn = document.createElement('button');
            this.voiceToggleBtn.id = 'voice-toggle-btn';
            this.voiceToggleBtn.className = 'btn btn-success mt-3 w-100';
            this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Start Voice Assistant';
            parentNode.appendChild(this.voiceToggleBtn);
            
            // Add event listener
            this.voiceToggleBtn.addEventListener('click', () => {
                if (this.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            });
        }
    }
    
    initializeSpeechRecognition() {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported in this browser.");
            this.updateVoiceResponse("Speech recognition not supported in your browser. Try Chrome or Edge.", "error");
            return;
        }
        
        // Create recognition instance
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        
        // Set up recognition handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log("Voice recognition started");
            this.updateVoiceResponse("Listening for wake word 'Helmet'...", "listening");
            
            // Update button state
            if (this.voiceToggleBtn) {
                this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Stop Voice';
                this.voiceToggleBtn.classList.replace('btn-success', 'btn-danger');
            }
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            console.log("Voice recognition ended");
            
            // Update button state if we've fully stopped (not just processing)
            if (!this.processingCommand && this.voiceToggleBtn) {
                this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-mute-fill"></i> Start Voice';
                this.voiceToggleBtn.classList.replace('btn-danger', 'btn-success');
            }
            
            // Restart recognition if not explicitly stopped
            if (!this.processingCommand) {
                setTimeout(() => {
                    if (!this.isListening && !this.processingCommand && this.voiceToggleBtn?.classList.contains('btn-danger')) {
                        this.startListening();
                    }
                }, 500);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error("Recognition error", event.error);
            
            // Don't show the error if we manually stopped it
            if (event.error !== 'aborted') {
                this.updateVoiceResponse(`Error: ${event.error}`, "error");
            }
            
            // Only restart on recoverable errors
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
                setTimeout(() => this.startListening(), 2000);
            }
        };
        
        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript.trim().toLowerCase();
            console.log("Heard:", transcript);
            
            // Process the voice input
            this.processVoiceInput(transcript);
        };
    }
    
    setupEventListeners() {
        // Manual command button
        if (this.sendCommandBtn) {
            this.sendCommandBtn.addEventListener('click', () => {
                const command = this.voiceCommandInput.value.trim();
                if (command) {
                    this.processCommand(command);
                    this.voiceCommandInput.value = '';
                }
            });
        } else {
            console.warn("Send command button not found");
        }
        
        // Enter key in input field
        if (this.voiceCommandInput) {
            this.voiceCommandInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    const command = this.voiceCommandInput.value.trim();
                    if (command) {
                        this.processCommand(command);
                        this.voiceCommandInput.value = '';
                    }
                }
            });
        } else {
            console.warn("Voice command input not found");
        }
        
        // Initialize voice button
        if (this.voiceToggleBtn) {
            this.voiceToggleBtn.addEventListener('click', () => {
                if (this.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            });
        } else {
            console.error("Voice toggle button not found - created dynamically");
        }
    }
    
    startListening() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                console.log("Starting speech recognition");
                // Update button immediately to provide visual feedback
                if (this.voiceToggleBtn) {
                    this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Stop Voice';
                    this.voiceToggleBtn.classList.replace('btn-success', 'btn-danger');
                }
            } catch (error) {
                console.error("Error starting recognition:", error);
                // Wait a bit before trying again
                setTimeout(() => {
                    this.isListening = false;
                    this.startListening();
                }, 1000);
            }
        }
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
                console.log("Stopping speech recognition");
                this.updateVoiceResponse("Voice recognition paused", "paused");
                
                // Update button immediately for visual feedback
                if (this.voiceToggleBtn) {
                    this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-mute-fill"></i> Start Voice';
                    this.voiceToggleBtn.classList.replace('btn-danger', 'btn-success');
                }
            } catch (error) {
                console.error("Error stopping recognition:", error);
            }
        }
    }
    
    processVoiceInput(transcript) {
        // Check if input contains wake word "helmet"
        if (transcript.includes(this.wakeWord)) {
            // Extract command after wake word
            let commandPart = "";
            const parts = transcript.split(this.wakeWord);
            
            if (parts.length > 1 && parts[1].trim()) {
                // Wake word is at the beginning, take what follows
                commandPart = parts[1].trim();
            } else if (parts.length > 0 && parts[0].trim()) {
                // Wake word might be at the end, take what comes before
                commandPart = parts[0].trim();
            }
            
            // Clean up and process command if we have one
            if (commandPart) {
                this.updateVoiceResponse(`Processing: "${commandPart}"`, "processing");
                
                // Visual feedback
                if (this.helmetDisplay) {
                    this.helmetDisplay.classList.add('voice-active');
                    setTimeout(() => {
                        this.helmetDisplay.classList.remove('voice-active');
                    }, 2000);
                }
                
                // Process the command
                this.processCommand(commandPart);
            } else {
                // Just the wake word was recognized
                this.updateVoiceResponse("Helmet is listening. What would you like to do?", "ready");
                this.speakResponse("What would you like to do?");
            }
        }
    }
    
    async processCommand(command) {
        // Mark as processing to prevent overlapping recognition
        this.processingCommand = true;
        this.lastCommand = command;
        
        // Add to history
        this.commandHistory.push(command);
        if (this.commandHistory.length > 5) {
            this.commandHistory.shift();
        }
        
        try {
            this.updateVoiceResponse(`Processing: "${command}"`, "processing");
            
            // Send command to API
            const response = await fetch('/api/voice_command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command: command })
            });
            
            // Check for connectivity problems
            if (!response.ok) {
                throw new Error('Network response error');
            }
            
            const data = await response.json();
            
            // Display response
            if (data.success) {
                this.updateVoiceResponse(data.response, "response");
                this.speakResponse(data.response);
            } else {
                this.updateVoiceResponse(data.response || "Sorry, I couldn't process that command", "error");
                this.speakResponse("Sorry, I couldn't process that command");
            }
        } catch (error) {
            console.error("Error processing command:", error);
            this.updateVoiceResponse("Error connecting to the Smart Helmet system", "error");
            this.speakResponse("Error connecting to the Smart Helmet system");
        } finally {
            // Reset processing state after a delay
            setTimeout(() => {
                this.processingCommand = false;
                if (!this.isListening) {
                    this.startListening();
                }
            }, 1000);
        }
    }
    
    updateVoiceResponse(text, status = "default") {
        if (!this.voiceResponseElement) {
            console.error("Voice response element not found");
            return;
        }
        
        // Remove previous status classes
        this.voiceResponseElement.classList.remove('listening', 'processing', 'response', 'error', 'paused', 'ready');
        
        // Add appropriate class
        if (status) {
            this.voiceResponseElement.classList.add(status);
        }
        
        // Update text - safely set innerHTML
        this.voiceResponseElement.innerHTML = '';
        const paragraph = document.createElement('p');
        paragraph.className = 'mb-0';
        paragraph.textContent = text;
        this.voiceResponseElement.appendChild(paragraph);
        
        // If status is error, add a retry button
        if (status === 'error') {
            const retryButton = document.createElement('button');
            retryButton.className = 'btn btn-sm btn-outline-danger mt-2';
            retryButton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Try Again';
            retryButton.addEventListener('click', () => {
                if (this.lastCommand) {
                    this.processCommand(this.lastCommand);
                } else {
                    this.updateVoiceResponse("Ready for command", "ready");
                }
            });
            this.voiceResponseElement.appendChild(retryButton);
        }
    }
    
    speakResponse(text) {
        // Use speech synthesis for audible feedback
        if ('speechSynthesis' in window) {
            // Check if we're already speaking
            if (this.synth.speaking) {
                console.log("Speech synthesis is already speaking, canceling...");
                this.synth.cancel();
            }
            
            // Create a new utterance
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = 0.8;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            // Log when speech starts and ends
            utterance.onstart = () => console.log("Speech started");
            utterance.onend = () => console.log("Speech ended");
            utterance.onerror = (e) => console.error("Speech error:", e);
            
            // Speak the utterance
            console.log("Speaking:", text);
            this.synth.speak(utterance);
        } else {
            console.warn("Speech synthesis not supported in this browser");
        }
    }
}

// Initialize Voice Assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Ensure proper timing for initialization
    setTimeout(() => {
        window.helmetVoiceAssistant = new HelmetVoiceAssistant();
        console.log("Voice assistant loaded");
        
        // Auto-start if user has previously used it
        if (localStorage.getItem('voice-assistant-enabled') === 'true') {
            setTimeout(() => {
                if (window.helmetVoiceAssistant) {
                    window.helmetVoiceAssistant.startListening();
                }
            }, 1000);
        }
    }, 500); // Short delay to ensure DOM is ready
});

// Save state when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.helmetVoiceAssistant) {
        localStorage.setItem('voice-assistant-enabled', window.helmetVoiceAssistant.isListening.toString());
    }
});
