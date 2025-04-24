/**
 * Smart Helmet Voice Assistant
 * Provides voice control capabilities with "Helmet" wake word
 * Enhanced with network error handling
 */

class HelmetVoiceAssistant {
    constructor() {
        // Speech recognition support
        this.recognition = null;
        this.isListening = false;
        this.processingCommand = false;
        this.wakeWord = "helmet";
        this.lastCommand = "";
        
        // Error handling tracking
        this.networkErrorCount = 0;
        this.maxNetworkRetries = 3;
        this.lastErrorTime = 0;
        this.reconnectDelay = 2000; // ms before retry
        this.offlineMode = false;
        
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
        
        // Network status monitoring
        this.setupNetworkMonitoring();
        
        // Initialize
        this.initializeSpeechRecognition();
        this.setupEventListeners();
        
        console.log('Voice Assistant initialized');
        
        // Fix issue with the voice toggle button not being found
        if (!this.voiceToggleBtn) {
            console.warn("Voice toggle button not found. Adding it dynamically.");
            this.createVoiceToggleButton();
        }

        // Check if we're on a mobile device
        this.mobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    setupNetworkMonitoring() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Browser is online');
            this.offlineMode = false;
            this.updateVoiceResponse("Network connection restored. Voice recognition enabled.", "success");
            
            // Auto restart recognition if it was previously running
            if (this.voiceToggleBtn && this.voiceToggleBtn.textContent.includes('Stop')) {
                setTimeout(() => this.startListening(), 1000);
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('Browser is offline');
            this.offlineMode = true;
            this.updateVoiceResponse("Network connection lost. Voice recognition disabled.", "error");
            this.stopListening();
        });
        
        // Check initial network state
        this.offlineMode = !navigator.onLine;
        if (this.offlineMode) {
            console.log("Starting in offline mode");
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
        
        // Create recognition instance with robust configuration
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy
        
        // Set up recognition handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log("Voice recognition started");
            this.updateVoiceResponse("Listening for wake word 'Helmet'...", "listening");
            
            // Reset error counters when successfully started
            this.networkErrorCount = 0;
            
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
            
            // Restart recognition if not explicitly stopped and not in offline mode
            const currentTime = Date.now();
            if (!this.processingCommand && !this.offlineMode && 
                this.voiceToggleBtn?.classList.contains('btn-danger') && 
                currentTime - this.lastErrorTime > this.reconnectDelay) {
                console.log("Auto-restarting voice recognition...");
                setTimeout(() => this.startListening(), 300);
            }
        };
        
        this.recognition.onerror = (event) => {
            const errorTime = Date.now();
            this.lastErrorTime = errorTime;
            
            console.error("Recognition error:", event.error, event);
            
            // Handle different types of errors
            switch (event.error) {
                case 'network':
                    this.networkErrorCount++;
                    console.log(`Network error count: ${this.networkErrorCount}`);
                    
                    if (this.networkErrorCount <= this.maxNetworkRetries) {
                        const delayTime = Math.min(this.reconnectDelay * this.networkErrorCount, 10000);
                        this.updateVoiceResponse(`Network error. Retrying in ${delayTime/1000} seconds... (${this.networkErrorCount}/${this.maxNetworkRetries})`, "error");
                        
                        // Try to restart after increasing delays
                        setTimeout(() => {
                            if (!this.isListening && !this.offlineMode) {
                                console.log(`Attempting to restart after network error (attempt ${this.networkErrorCount})`);
                                this.startListening();
                            }
                        }, delayTime);
                    } else {
                        // Too many network errors, switch to offline mode
                        this.offlineMode = true;
                        this.updateVoiceResponse("Network connection unstable. Please check your internet connection and try again.", "error");
                        
                        // Add a retry button
                        const retryButton = document.createElement('button');
                        retryButton.className = 'btn btn-warning mt-2';
                        retryButton.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Reset & Retry Connection';
                        retryButton.onclick = () => {
                            this.networkErrorCount = 0;
                            this.offlineMode = false;
                            this.startListening();
                        };
                        
                        if (this.voiceResponseElement) {
                            this.voiceResponseElement.appendChild(retryButton);
                        }
                    }
                    break;
                
                case 'not-allowed':
                case 'service-not-allowed':
                    this.updateVoiceResponse("Microphone access denied. Please check your browser permissions.", "error");
                    break;
                
                case 'aborted':
                    if (!this.processingCommand) {
                        this.updateVoiceResponse("Voice recognition was aborted", "paused");
                    }
                    break;
                
                case 'no-speech':
                    this.updateVoiceResponse("No speech detected. Please try again.", "paused");
                    // No-speech errors don't count toward our retry limit
                    setTimeout(() => {
                        if (this.voiceToggleBtn?.classList.contains('btn-danger')) {
                            this.startListening();
                        }
                    }, 300);
                    break;
                
                default:
                    this.updateVoiceResponse(`Error: ${event.error}. Please try again.`, "error");
                    // For other errors, retry once automatically
                    setTimeout(() => {
                        if (this.voiceToggleBtn?.classList.contains('btn-danger')) {
                            this.startListening();
                        }
                    }, 1000);
            }
        };
        
        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript.trim().toLowerCase();
            console.log("Heard:", transcript, "Confidence:", result[0].confidence);
            
            // Process the voice input if confidence is high enough
            if (result[0].confidence > 0.5) {
                this.processVoiceInput(transcript);
            } else {
                console.log("Low confidence result, ignoring");
                // Try top alternative if available
                if (result.length > 1) {
                    const alternativeTranscript = result[1].transcript.trim().toLowerCase();
                    console.log("Trying alternative:", alternativeTranscript);
                    this.processVoiceInput(alternativeTranscript);
                }
            }
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
                    // Check for offline mode before starting
                    if (this.offlineMode) {
                        this.updateVoiceResponse("Cannot start voice recognition in offline mode. Please check your internet connection.", "error");
                    } else {
                        this.startListening();
                    }
                }
            });
        } else {
            console.error("Voice toggle button not found - created dynamically");
        }
    }
    
    startListening() {
        // On mobile or if we have network issues, use the server-side voice assistant
        if (this.offlineMode || this.mobileDevice) {
            this.startServerAssistant();
            return;
        }
        
        // Don't attempt to start if we're in offline mode
        if (this.offlineMode) {
            this.updateVoiceResponse("Cannot start voice recognition in offline mode. Please check your internet connection.", "error");
            return;
        }
        
        if (this.recognition && !this.isListening) {
            try {
                // Update UI first for immediate feedback
                if (this.voiceToggleBtn) {
                    this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Stop Voice';
                    this.voiceToggleBtn.classList.replace('btn-success', 'btn-danger');
                }
                this.updateVoiceResponse("Starting voice recognition...", "listening");
                
                // Start recognition with a small delay to ensure UI updates first
                setTimeout(() => {
                    try {
                        this.recognition.start();
                        console.log("Starting speech recognition");
                    } catch (error) {
                        console.error("Error starting recognition (delayed):", error);
                        this.updateVoiceResponse("Could not start voice recognition. Please try again.", "error");
                        
                        // Reset button state
                        if (this.voiceToggleBtn) {
                            this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-mute-fill"></i> Start Voice';
                            this.voiceToggleBtn.classList.replace('btn-danger', 'btn-success');
                        }
                    }
                }, 100);
            } catch (error) {
                console.error("Error setting up recognition:", error);
                this.updateVoiceResponse("Error starting recognition. Please try again.", "error");
                
                // Reset button state
                if (this.voiceToggleBtn) {
                    this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-mute-fill"></i> Start Voice';
                    this.voiceToggleBtn.classList.replace('btn-danger', 'btn-success');
                }
            }
        }
    }
    
    stopListening() {
        // If we're using the server assistant, stop it
        if (this.offlineMode || this.mobileDevice) {
            this.stopServerAssistant();
            return;
        }

        if (this.recognition) {
            try {
                // Update button immediately for visual feedback
                if (this.voiceToggleBtn) {
                    this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-mute-fill"></i> Start Voice';
                    this.voiceToggleBtn.classList.replace('btn-danger', 'btn-success');
                }
                
                this.updateVoiceResponse("Stopping voice recognition...", "paused");
                
                // Stop recognition if it's running
                if (this.isListening) {
                    this.recognition.stop();
                    console.log("Stopping speech recognition");
                } else {
                    this.updateVoiceResponse("Voice recognition stopped", "paused");
                }
            } catch (error) {
                console.error("Error stopping recognition:", error);
                this.updateVoiceResponse("Error occurred while stopping", "error");
            }
        }
    }
    
    reconnect() {
        // Reinitialize if needed
        if (!this.recognition) {
            this.initializeSpeechRecognition();
        }
        
        // Reset error counters
        this.networkErrorCount = 0;
        this.offlineMode = false;
        
        // Start listening if not already listening
        if (!this.isListening) {
            this.startListening();
        }
    }

    // Rest of the methods remain the same
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
            
            // Check for offline mode - use simple commands locally if offline
            if (this.offlineMode) {
                console.log("Processing command in offline mode");
                const response = this.processOfflineCommand(command);
                this.updateVoiceResponse(response, "response");
                this.speakResponse(response);
                this.processingCommand = false;
                return;
            }
            
            // Add timeout to the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            // Send command to API with timeout handling
            try {
                const response = await fetch('/api/voice_command', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ command: command }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                // Check for connectivity problems
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
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
            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.error("Fetch error:", fetchError);
                
                if (fetchError.name === 'AbortError') {
                    this.updateVoiceResponse("Request timed out. Please check your connection and try again.", "error");
                    this.speakResponse("Request timed out. Please check your connection.");
                } else {
                    // Network error, fall back to offline processing
                    console.log("Network error, using offline processing");
                    const response = this.processOfflineCommand(command);
                    this.updateVoiceResponse(response + " (Offline Mode)", "response");
                    this.speakResponse(response);
                }
            }
        } catch (error) {
            console.error("Error processing command:", error);
            this.updateVoiceResponse("Error connecting to the Smart Helmet system", "error");
            this.speakResponse("Error connecting to the Smart Helmet system");
        } finally {
            // Reset processing state after a delay
            setTimeout(() => {
                this.processingCommand = false;
                if (!this.isListening && this.voiceToggleBtn?.classList.contains('btn-danger') && !this.offlineMode) {
                    this.startListening();
                }
            }, 1000);
        }
    }
    
    // New method to handle offline commands
    processOfflineCommand(command) {
        // Simple command processing for offline mode
        const cmd = command.toLowerCase();
        
        if (cmd.includes('time')) {
            const now = new Date();
            return `The current time is ${now.toLocaleTimeString()}`;
        } 
        else if (cmd.includes('help')) {
            return "Available commands: time, help. Note: Most features require an internet connection.";
        }
        else if (cmd.includes('hello') || cmd.includes('hi')) {
            return "Hello! I'm operating in offline mode with limited functionality.";
        }
        else {
            return "I can't process that command in offline mode. Please check your internet connection.";
        }
    }
    
    updateVoiceResponse(text, status = "default") {
        if (!this.voiceResponseElement) {
            console.error("Voice response element not found");
            return;
        }
        
        // Remove previous status classes
        this.voiceResponseElement.classList.remove('listening', 'processing', 'response', 'error', 'paused', 'ready', 'success');
        
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

    startServerAssistant() {
        // Start the server-side voice assistant
        fetch('/api/voice_assistant/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.updateVoiceResponse("Server-side voice assistant started", "success");
                
                // Update the button to show the assistant is running
                if (this.voiceToggleBtn) {
                    this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Stop Voice';
                    this.voiceToggleBtn.classList.replace('btn-success', 'btn-danger');
                }
            } else {
                this.updateVoiceResponse("Could not start server voice assistant", "error");
            }
        })
        .catch(error => {
            console.error("Error starting server voice assistant:", error);
            this.updateVoiceResponse("Error connecting to server", "error");
        });
    }

    stopServerAssistant() {
        // Stop the server-side voice assistant
        fetch('/api/voice_assistant/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.updateVoiceResponse("Server-side voice assistant stopped", "paused");
                
                // Update the button
                if (this.voiceToggleBtn) {
                    this.voiceToggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Start Voice';
                    this.voiceToggleBtn.classList.replace('btn-danger', 'btn-success');
                }
            } else {
                this.updateVoiceResponse("Could not stop server voice assistant", "error");
            }
        })
        .catch(error => {
            console.error("Error stopping server voice assistant:", error);
            this.updateVoiceResponse("Error connecting to server", "error");
        });
    }
}

// Initialize Voice Assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Ensure proper timing for initialization
    setTimeout(() => {
        // Check if we have internet before starting
        const hasNetwork = navigator.onLine;
        console.log("Network status on load:", hasNetwork ? "Online" : "Offline");
        
        window.helmetVoiceAssistant = new HelmetVoiceAssistant();
        console.log("Voice assistant loaded");
        
        // Auto-start if user has previously used it and we have network
        if (localStorage.getItem('voice-assistant-enabled') === 'true' && hasNetwork) {
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
