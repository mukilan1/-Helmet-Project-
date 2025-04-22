document.addEventListener('DOMContentLoaded', function() {
    // State
    let currentSpeed = 0;
    let animationId = null;
    let updateInterval = null;
    let cameraConnected = false;
    let localStreamActive = false;
    let localStream = null;
    let sensorUpdateInterval = null;
    
    // DOM Elements
    const speedControl = document.getElementById('speed-control');
    const accelerateBtn = document.getElementById('accelerate-btn');
    const brakeBtn = document.getElementById('brake-btn');
    const speedIndicator = document.getElementById('speed-indicator');
    const dashboardSpeed = document.getElementById('dashboard-speed');
    const helmetSpeed = document.getElementById('helmet-speed');
    const helmetTime = document.getElementById('helmet-time');
    const helmetNav = document.getElementById('helmet-nav');
    const navDirection = document.getElementById('nav-direction');
    const navInstruction = document.getElementById('nav-instruction');
    const helmetCall = document.getElementById('helmet-call');
    const helmetMusic = document.getElementById('helmet-music');
    const indicatorLeft = document.getElementById('indicator-left');
    const indicatorRight = document.getElementById('indicator-right');
    
    // Control buttons
    const turnLeftBtn = document.getElementById('turn-left-btn');
    const turnRightBtn = document.getElementById('turn-right-btn');
    const centerBtn = document.getElementById('center-btn');
    
    // Feature buttons
    const startCallBtn = document.getElementById('start-call-btn');
    const endCallBtn = document.getElementById('end-call-btn');
    const callerNameInput = document.getElementById('caller-name');
    const playMusicBtn = document.getElementById('play-music-btn');
    const pauseMusicBtn = document.getElementById('pause-music-btn');
    const prevTrackBtn = document.getElementById('prev-track-btn');
    const nextTrackBtn = document.getElementById('next-track-btn');
    const startNavigationBtn = document.getElementById('start-navigation-btn');
    const nextDirectionBtn = document.getElementById('next-direction-btn');
    const stopNavigationBtn = document.getElementById('stop-navigation-btn');
    
    // Voice assistant elements
    const voiceCommandInput = document.getElementById('voice-command');
    const sendCommandBtn = document.getElementById('send-command-btn');
    const voiceResponse = document.getElementById('voice-response');
    
    // Camera elements
    const cameraIp = document.getElementById('camera-ip');
    const connectCameraBtn = document.getElementById('connect-camera-btn');
    const cameraStatus = document.getElementById('camera-status');
    const cameraStream = document.getElementById('camera-stream');
    const localVideoStream = document.getElementById('local-video-stream');
    const localCameraSelect = document.getElementById('local-camera-select');
    const startLocalCameraBtn = document.getElementById('start-local-camera-btn');
    const stopLocalCameraBtn = document.getElementById('stop-local-camera-btn');
    const esp32Tab = document.getElementById('esp32-tab');
    const localTab = document.getElementById('local-tab');
    
    // Sensor data elements
    const sensorStatus = document.getElementById('sensor-status');
    const lightLevelBar = document.getElementById('light-level-bar');
    const lightLevelValue = document.getElementById('light-level-value');
    const motionIndicator = document.getElementById('motion-indicator');
    const motionStatus = document.getElementById('motion-status');
    const distanceValue = document.getElementById('distance-value');
    const distanceIndicator = document.getElementById('distance-indicator');
    const distanceStatus = document.getElementById('distance-status');
    const cameraResolution = document.getElementById('camera-resolution');
    const cameraFramerate = document.getElementById('camera-framerate');
    const cameraQuality = document.getElementById('camera-quality');
    const refreshSensorBtn = document.getElementById('refresh-sensor-btn');
    
    // Initialize road animation
    function updateRoadLines() {
        const roadLines = document.querySelectorAll('.road-line');
        roadLines.forEach(line => {
            // Adjust animation speed based on current speed
            line.style.animationDuration = (2 - currentSpeed/60) + 's';
        });
    }
    
    // Update UI with current simulation state
    function updateUI(state) {
        // Update speed displays
        dashboardSpeed.textContent = state.speed;
        helmetSpeed.textContent = state.speed + ' km/h';
        speedControl.value = state.speed;
        
        // Update time
        helmetTime.textContent = state.current_time;
        
        // Update navigation display
        if (state.nav_direction) {
            helmetNav.style.display = 'flex';
            
            // Set direction arrow
            if (state.nav_direction === 'left') {
                navDirection.innerHTML = '←';
                indicatorLeft.classList.add('active');
                indicatorRight.classList.remove('active');
            } else if (state.nav_direction === 'right') {
                navDirection.innerHTML = '→';
                indicatorRight.classList.add('active');
                indicatorLeft.classList.remove('active');
            } else if (state.nav_direction === 'straight') {
                navDirection.innerHTML = '↑';
                indicatorLeft.classList.remove('active');
                indicatorRight.classList.remove('active');
            } else if (state.nav_direction === 'stop') {
                navDirection.innerHTML = '■';
                indicatorLeft.classList.remove('active');
                indicatorRight.classList.remove('active');
            }
            
            navInstruction.textContent = state.nav_instruction;
        } else {
            helmetNav.style.display = 'none';
            indicatorLeft.classList.remove('active');
            indicatorRight.classList.remove('active');
        }
        
        // Update call display
        if (state.call_active && state.caller_name) {
            helmetCall.style.display = 'block';
            helmetCall.innerHTML = `<i class="bi bi-telephone-fill me-1"></i> ${state.caller_name}`;
        } else {
            helmetCall.style.display = 'none';
        }
        
        // Update music display
        if (state.music_playing && state.song_title) {
            helmetMusic.style.display = 'block';
            helmetMusic.innerHTML = `<i class="bi bi-music-note-beamed me-1"></i> ${state.song_title}`;
        } else {
            helmetMusic.style.display = 'none';
        }
    }
    
    // Fetch current state from server
    function fetchState() {
        fetch('/api/state')
            .then(response => response.json())
            .then(state => {
                updateUI(state);
                currentSpeed = state.speed;
                updateRoadLines();
            })
            .catch(error => console.error('Error fetching state:', error));
    }
    
    // Update speed on server
    function updateSpeed(speed) {
        fetch('/api/update_speed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ speed: speed }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                speedIndicator.textContent = speed + ' km/h';
            }
        })
        .catch(error => console.error('Error updating speed:', error));
    }
    
    // Speed control event listeners
    speedControl.addEventListener('input', function() {
        currentSpeed = parseInt(this.value);
        updateSpeed(currentSpeed);
        updateRoadLines();
    });
    
    accelerateBtn.addEventListener('mousedown', function() {
        if (animationId) return;
        
        animationId = setInterval(() => {
            if (currentSpeed < 120) {
                currentSpeed += 5;
                speedControl.value = currentSpeed;
                updateSpeed(currentSpeed);
                updateRoadLines();
            }
        }, 300);
    });
    
    accelerateBtn.addEventListener('mouseup', function() {
        clearInterval(animationId);
        animationId = null;
    });
    
    accelerateBtn.addEventListener('mouseleave', function() {
        if (animationId) {
            clearInterval(animationId);
            animationId = null;
        }
    });
    
    brakeBtn.addEventListener('mousedown', function() {
        if (animationId) return;
        
        animationId = setInterval(() => {
            if (currentSpeed > 0) {
                currentSpeed -= 10;
                if (currentSpeed < 0) currentSpeed = 0;
                speedControl.value = currentSpeed;
                updateSpeed(currentSpeed);
                updateRoadLines();
            }
        }, 300);
    });
    
    brakeBtn.addEventListener('mouseup', function() {
        clearInterval(animationId);
        animationId = null;
    });
    
    brakeBtn.addEventListener('mouseleave', function() {
        if (animationId) {
            clearInterval(animationId);
            animationId = null;
        }
    });
    
    // Turn signals
    turnLeftBtn.addEventListener('click', function() {
        indicatorLeft.classList.add('active');
        indicatorRight.classList.remove('active');
    });
    
    turnRightBtn.addEventListener('click', function() {
        indicatorRight.classList.add('active');
        indicatorLeft.classList.remove('active');
    });
    
    centerBtn.addEventListener('click', function() {
        indicatorLeft.classList.remove('active');
        indicatorRight.classList.remove('active');
    });
    
    // Call handling
    startCallBtn.addEventListener('click', function() {
        const callerName = callerNameInput.value || null;
        fetch('/api/trigger_call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                action: 'start',
                caller: callerName
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchState();
            }
        })
        .catch(error => console.error('Error starting call:', error));
    });
    
    endCallBtn.addEventListener('click', function() {
        fetch('/api/trigger_call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'end' }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchState();
            }
        })
        .catch(error => console.error('Error ending call:', error));
    });
    
    // Music control
    playMusicBtn.addEventListener('click', function() {
        fetch('/api/music_control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'play' }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchState();
            }
        })
        .catch(error => console.error('Error playing music:', error));
    });
    
    pauseMusicBtn.addEventListener('click', function() {
        fetch('/api/music_control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'pause' }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchState();
            }
        })
        .catch(error => console.error('Error pausing music:', error));
    });
    
    prevTrackBtn.addEventListener('click', function() {
        fetch('/api/music_control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'previous' }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchState();
            }
        })
        .catch(error => console.error('Error changing track:', error));
    });
    
    nextTrackBtn.addEventListener('click', function() {
        fetch('/api/music_control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'next' }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchState();
            }
        })
        .catch(error => console.error('Error changing track:', error));
    });
    
    // Navigation control
    startNavigationBtn.addEventListener('click', function() {
        fetch('/api/navigation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'start' }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchState();
            }
        })
        .catch(error => console.error('Error starting navigation:', error));
    });
    
    nextDirectionBtn.addEventListener('click', function() {
        fetch('/api/navigation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'next' }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchState();
            }
        })
        .catch(error => console.error('Error changing direction:', error));
    });
    
    stopNavigationBtn.addEventListener('click', function() {
        fetch('/api/navigation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'stop' }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchState();
            }
        })
        .catch(error => console.error('Error stopping navigation:', error));
    });
    
    // Voice command processing
    sendCommandBtn.addEventListener('click', function() {
        const command = voiceCommandInput.value.trim();
        if (!command) return;
        
        // Show listening animation
        voiceResponse.className = 'mt-3 p-2 border rounded bg-light listening';
        voiceResponse.innerHTML = '<p class="text-muted mb-0">Listening...</p>';
        
        setTimeout(() => {
            // Show processing animation
            voiceResponse.className = 'mt-3 p-2 border rounded bg-light processing';
            voiceResponse.innerHTML = '<p class="text-muted mb-0">Processing command...</p>';
            
            fetch('/api/voice_command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command: command }),
            })
            .then(response => response.json())
            .then(data => {
                // Show response
                voiceResponse.className = 'mt-3 p-2 border rounded bg-light response';
                const responseClass = data.action_taken ? 'text-success' : 'text-danger';
                voiceResponse.innerHTML = `<p class="${responseClass} mb-0">${data.response}</p>`;
                
                if (data.action_taken) {
                    // Clear input on successful command
                    voiceCommandInput.value = '';
                    fetchState();
                }
                
                // Reset after a few seconds
                setTimeout(() => {
                    voiceResponse.className = 'mt-3 p-2 border rounded bg-light';
                }, 3000);
            })
            .catch(error => {
                console.error('Error processing voice command:', error);
                voiceResponse.innerHTML = '<p class="text-danger mb-0">Error processing command.</p>';
                
                setTimeout(() => {
                    voiceResponse.className = 'mt-3 p-2 border rounded bg-light';
                }, 3000);
            });
        }, 1000);
    });
    
    voiceCommandInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            sendCommandBtn.click();
        }
    });
    
    // Camera handling
    connectCameraBtn.addEventListener('click', function() {
        const ipAddress = cameraIp.value.trim();
        if (!ipAddress) {
            alert('Please enter the ESP32 camera IP address');
            return;
        }
        
        // Stop local camera if active
        if (localStreamActive) {
            stopLocalCamera();
        }
        
        cameraStatus.textContent = 'Connecting...';
        cameraStatus.className = 'badge bg-warning';
        
        fetch('/api/connect_camera', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ip_address: ipAddress }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cameraStatus.textContent = 'Connected';
                cameraStatus.className = 'badge bg-success';
                cameraConnected = true;
                
                // Show image stream and hide video element
                cameraStream.classList.remove('d-none');
                localVideoStream.classList.add('d-none');
                
                // Update camera stream source
                updateCameraStream();
                
                // Start sensor updates
                startSensorUpdates();

                // Start object detection for ESP32 camera
                if (window.objectDetector) {
                    window.objectDetector.startDetection();
                }
            } else {
                cameraStatus.textContent = 'Connection Failed';
                cameraStatus.className = 'badge bg-danger';
                cameraConnected = false;
            }
        })
        .catch(error => {
            console.error('Error connecting to camera:', error);
            cameraStatus.textContent = 'Connection Error';
            cameraStatus.className = 'badge bg-danger';
            cameraConnected = false;
        });
    });
    
    function updateCameraStream() {
        if (cameraConnected && !localStreamActive) {
            // Set random query parameter to avoid caching
            cameraStream.src = `/camera_stream?t=${new Date().getTime()}`;
            
            // Handle camera stream errors
            cameraStream.onerror = function() {
                cameraStatus.textContent = 'Stream Error';
                cameraStatus.className = 'badge bg-danger';
                cameraConnected = false;
                cameraStream.src = '/static/img/camera-placeholder.jpg';
            };
        } else if (!localStreamActive) {
            cameraStream.src = '/static/img/camera-placeholder.jpg';
        }
    }
    
    // Check camera status on page load
    function checkCameraStatus() {
        fetch('/api/camera_status')
            .then(response => response.json())
            .then(data => {
                if (data.connected) {
                    cameraStatus.textContent = 'Connected';
                    cameraStatus.className = 'badge bg-success';
                    cameraConnected = true;
                    cameraIp.value = data.url.replace('http://', '');
                    updateCameraStream();
                }
            })
            .catch(error => console.error('Error checking camera status:', error));
    }
    
    // Sensor data handling
    function fetchSensorData() {
        if (!cameraConnected && !localStreamActive) {
            sensorStatus.textContent = 'Camera Disconnected';
            sensorStatus.className = 'badge bg-secondary';
            return;
        }
        
        // Make the API call to get sensor data
        fetch('/api/camera_sensors')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.sensors) {
                    console.log("Received sensor data:", data.sensors);
                    
                    // Update UI with sensor data
                    updateSensorDisplay(data.sensors);
                    
                    // Update status badge
                    sensorStatus.textContent = 'Live Data';
                    sensorStatus.className = 'badge bg-success';
                    
                    // Ensure human and vehicle counts are updated in both places
                    const humanCountDisplays = document.querySelectorAll('[id="human-count"]');
                    const vehicleCountDisplays = document.querySelectorAll('[id="vehicle-count"]');
                    
                    humanCountDisplays.forEach(element => {
                        element.textContent = data.sensors.humans_count || 0;
                    });
                    
                    vehicleCountDisplays.forEach(element => {
                        element.textContent = data.sensors.vehicles_count || 0;
                    });
                    
                    // Update object detector counts if available
                    if (window.objectDetector) {
                        window.objectDetector.humanCount = data.sensors.humans_count || 0;
                        window.objectDetector.vehicleCount = data.sensors.vehicles_count || 0;
                    }
                } else {
                    console.error("Error in sensor data:", data);
                    sensorStatus.textContent = 'Data Error';
                    sensorStatus.className = 'badge bg-danger';
                }
            })
            .catch(error => {
                console.error('Error fetching sensor data:', error);
                sensorStatus.textContent = 'Connection Error';
                sensorStatus.className = 'badge bg-danger';
            });
    }
    
    function updateSensorDisplay(sensors) {
        console.log("Updating sensor display with:", sensors);
        
        // Update light level
        if (sensors.light_level !== undefined) {
            const lightPercent = Math.min(100, Math.max(0, sensors.light_level / 10));
            lightLevelBar.style.width = `${lightPercent}%`;
            lightLevelValue.textContent = `${sensors.light_level} lux`;
        }
        
        // Update motion detection
        if (sensors.motion_detected !== undefined) {
            motionIndicator.classList.toggle('active', sensors.motion_detected);
            motionStatus.textContent = sensors.motion_detected ? 'Motion detected!' : 'No motion';
        }
        
        // Update distance sensor
        if (sensors.distance !== undefined) {
            distanceValue.textContent = `${sensors.distance.toFixed(2)} m`;
            
            if (sensors.distance < 1.0) {
                distanceIndicator.className = 'sensor-indicator danger';
                distanceStatus.textContent = 'Very close!';
            } else if (sensors.distance < 3.0) {
                distanceIndicator.className = 'sensor-indicator warning';
                distanceStatus.textContent = 'Getting close';
            } else {
                distanceIndicator.className = 'sensor-indicator';
                distanceStatus.textContent = 'Safe distance';
            }
        }
        
        // Update camera details
        if (sensors.resolution) {
            cameraResolution.textContent = sensors.resolution;
        }
        if (sensors.framerate) {
            cameraFramerate.textContent = `${sensors.framerate} fps`;
        }
        if (sensors.quality) {
            cameraQuality.textContent = `${sensors.quality}%`;
        }
    }
    
    function updateLocalCameraSensorData() {
        if (localStreamActive && localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            
            // Extract real technical information from video track settings
            const width = settings.width || 640;
            const height = settings.height || 480;
            const frameRate = settings.frameRate || 30;
            
            // Get motion data from object detection module if available
            let motionDetected = false;
            let objectDistance = 0;
            
            if (window.objectDetector) {
                motionDetected = window.objectDetector.humanCount > 0 || window.objectDetector.vehicleCount > 0;
                
                // Estimate distance based on object size in detection
                // A crude approximation, but better than random values
                objectDistance = window.objectDetector.estimateClosestObjectDistance();
                if (objectDistance === 0) objectDistance = 3.5; // Default if no objects detected
            }
            
            // Get light level from video analysis
            const lightLevel = analyzeVideoLightLevel(this.localVideoStream);
            
            // Create accurate sensor data from local camera
            const sensorData = {
                light_level: lightLevel,
                motion_detected: motionDetected,
                distance: objectDistance,
                resolution: `${width}x${height}`,
                framerate: frameRate,
                quality: 85 // Assuming constant quality for webcam
            };
            
            updateSensorDisplay(sensorData);
            sensorStatus.textContent = 'Live Data';
            sensorStatus.className = 'badge bg-success';
        }
    }
    
    // Analyze video to determine approximate light level (0-1000)
    function analyzeVideoLightLevel(videoElement) {
        try {
            // Create a small canvas to analyze video brightness
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Use a small sample size for efficiency
            canvas.width = 50;
            canvas.height = 50;
            
            // Draw the current video frame to canvas
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // Get pixel data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            // Calculate average brightness
            let totalBrightness = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                
                // Use a common brightness formula (0-255)
                const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
                totalBrightness += brightness;
            }
            
            // Convert to an average (0-255)
            const avgBrightness = totalBrightness / (pixels.length / 4);
            
            // Scale to 0-1000 range for lux approximation
            return Math.round((avgBrightness / 255) * 1000);
        } catch (error) {
            console.error('Error analyzing video light level:', error);
            return 500; // Return medium value on error
        }
    }
    
    // Make the refresh button trigger continuous updates instead of a single update
    refreshSensorBtn.addEventListener('click', function() {
        // Change button text to indicate status
        if (sensorUpdateInterval) {
            // If already updating, stop updates
            clearInterval(sensorUpdateInterval);
            sensorUpdateInterval = null;
            this.innerHTML = '<i class="bi bi-play-fill me-1"></i> Start Live Updates';
            this.classList.remove('btn-outline-danger');
            this.classList.add('btn-outline-success');
        } else {
            // Start continuous updates
            sensorUpdateInterval = setInterval(fetchSensorData, 500); // Update every 500ms
            fetchSensorData(); // Fetch immediately first
            this.innerHTML = '<i class="bi bi-pause-fill me-1"></i> Pause Live Updates';
            this.classList.remove('btn-outline-success');
            this.classList.add('btn-outline-danger');
        }
    });
    
    // Modify to start continuous sensor updates
    function startSensorUpdates() {
        // Clear any existing interval
        if (sensorUpdateInterval) {
            clearInterval(sensorUpdateInterval);
        }
        
        // Start continuous updates
        fetchSensorData(); // Fetch immediately first
        sensorUpdateInterval = setInterval(fetchSensorData, 500); // Update every 500ms
        
        // Update button state
        refreshSensorBtn.innerHTML = '<i class="bi bi-pause-fill me-1"></i> Pause Live Updates';
        refreshSensorBtn.classList.remove('btn-outline-success');
        refreshSensorBtn.classList.add('btn-outline-danger');
    }
    
    // Local camera handling
    async function getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Clear any existing options
            localCameraSelect.innerHTML = '<option selected value="">Select camera...</option>';
            
            if (videoDevices.length === 0) {
                // No cameras found, add a disabled option explaining this
                const option = document.createElement('option');
                option.disabled = true;
                option.text = 'No cameras detected by browser';
                localCameraSelect.appendChild(option);
                
                // Add a "refresh" option that will prompt for camera permissions again
                const refreshOption = document.createElement('option');
                refreshOption.value = "refresh";
                refreshOption.text = '🔄 Refresh camera list';
                localCameraSelect.appendChild(refreshOption);
            } else {
                // Add options for each video device, using index as primary identifier
                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    // Use index as the value, not the device ID
                    option.value = index.toString(); 
                    option.text = device.label || `Camera ${index}`;
                    
                    // Save full device info in data attributes for debugging
                    option.dataset.deviceId = device.deviceId;
                    option.dataset.index = index;
                    
                    localCameraSelect.appendChild(option);
                });
                
                // Add numeric index options for direct camera access
                const directOption = document.createElement('option');
                directOption.value = "0";
                directOption.text = '📷 Default Camera (index 0)';
                localCameraSelect.appendChild(directOption);
                
                if (videoDevices.length > 1) {
                    const secondOption = document.createElement('option');
                    secondOption.value = "1";
                    secondOption.text = '📷 Second Camera (index 1)';
                    localCameraSelect.appendChild(secondOption);
                }
            }
            
            // Add event listener to handle the refresh option
            localCameraSelect.addEventListener('change', function() {
                if (this.value === 'refresh') {
                    // Request camera permission to get device labels
                    navigator.mediaDevices.getUserMedia({ video: true })
                        .then(stream => {
                            // Stop the stream immediately after getting permissions
                            stream.getTracks().forEach(track => track.stop());
                            // Refresh the camera list
                            getAvailableCameras();
                        })
                        .catch(err => {
                            console.error('Error requesting camera permission:', err);
                            alert('Failed to get camera permissions: ' + err.message);
                        });
                    
                    // Reset the select to the prompt option
                    this.value = '';
                }
            });
            
            // If we don't have labels, we might need permission first
            if (videoDevices.length > 0 && !videoDevices[0].label) {
                console.log('Camera devices found but no labels available. Requesting permissions...');
                try {
                    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    tempStream.getTracks().forEach(track => track.stop());
                    
                    // Try again to get devices with labels
                    getAvailableCameras();
                } catch (err) {
                    console.warn('Failed to get camera permissions for labels:', err);
                    // Add a note to the first option
                    if (localCameraSelect.options.length > 1) {
                        localCameraSelect.options[1].text += ' (No permission to access camera name)';
                    }
                }
            }
        } catch (error) {
            console.error('Error enumerating camera devices:', error);
            
            // Add an error option
            const option = document.createElement('option');
            option.disabled = true;
            option.text = `Error: ${error.message}`;
            localCameraSelect.appendChild(option);
        }
    }
    
    async function startLocalCamera() {
        try {
            const deviceId = localCameraSelect.value;
            if (!deviceId) {
                alert('Please select a camera');
                return;
            }
            
            // Stop any existing stream
            stopLocalCamera();
            
            // Show connecting status
            cameraStatus.textContent = 'Connecting...';
            cameraStatus.className = 'badge bg-warning';
            
            // Use camera index instead of device ID for more reliable connection
            // Extract index from option text or send numeric camera index
            let cameraIndex = 0; // Default to camera 0
            
            // Try to get the index from the selected option
            const selectedOption = localCameraSelect.options[localCameraSelect.selectedIndex];
            if (selectedOption && selectedOption.dataset && selectedOption.dataset.index) {
                cameraIndex = parseInt(selectedOption.dataset.index, 10);
            }
            
            console.log(`Using camera index ${cameraIndex} instead of device ID`);
            
            // Start camera via backend for Python-based processing
            fetch('/api/start_local_camera', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ camera_id: cameraIndex }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Set the source to the local camera stream endpoint
                    cameraStream.src = '/local_camera_stream';
                    cameraStream.classList.remove('d-none');
                    localVideoStream.classList.add('d-none');
                    
                    // Update status
                    cameraStatus.textContent = 'Local Camera Active';
                    cameraStatus.className = 'badge bg-success';
                    localStreamActive = true;
                    
                    // Start sensor updates
                    startSensorUpdates();
                } else {
                    // Show detailed error and suggest solutions
                    cameraStatus.textContent = 'Camera Error';
                    cameraStatus.className = 'badge bg-danger';
                    
                    let errorMessage = data.message || 'Failed to start camera';
                    
                    // Add available cameras to the error message if provided
                    if (data.available_cameras && data.available_cameras.length > 0) {
                        errorMessage += `\n\nAvailable camera indices: ${data.available_cameras.join(', ')}`;
                        errorMessage += '\n\nPlease select one of these camera indices and try again.';
                    } else {
                        errorMessage += '\n\nNo cameras were detected on your system. Please check your camera connection.';
                    }
                    
                    // Show a more detailed error dialog
                    const errorDialog = document.createElement('div');
                    errorDialog.className = 'alert alert-danger mt-3';
                    errorDialog.innerHTML = `
                        <h5>Camera Error</h5>
                        <p>${errorMessage.replace(/\n/g, '<br>')}</p>
                        <div class="mt-3">
                            <button class="btn btn-outline-secondary btn-sm" onclick="this.nextElementSibling.classList.toggle('d-none')">
                                Show Technical Details
                            </button>
                            <pre class="mt-2 p-2 bg-light d-none" style="font-size: 0.8rem; max-height: 200px; overflow: auto;">
${data.error_details || 'No additional error details available'}
                            </pre>
                        </div>
                    `;
                    
                    // Find a place to show the error dialog
                    const cameraContainer = document.querySelector('.camera-container');
                    if (cameraContainer && cameraContainer.parentNode) {
                        // Insert after camera container
                        cameraContainer.parentNode.insertBefore(errorDialog, cameraContainer.nextSibling);
                        
                        // Auto-remove after 20 seconds
                        setTimeout(() => {
                            errorDialog.remove();
                        }, 20000);
                    } else {
                        // Fallback to alert if we can't insert the dialog
                        alert(errorMessage);
                    }
                    
                    // Refresh available cameras
                    getAvailableCameras();
                }
            })
            .catch(error => {
                console.error('Error starting local camera:', error);
                cameraStatus.textContent = 'Connection Error';
                cameraStatus.className = 'badge bg-danger';
                localStreamActive = false;
                alert('Network error connecting to camera API: ' + error.message);
            });
        } catch (error) {
            console.error('Error starting local camera:', error);
            cameraStatus.textContent = 'Camera Error';
            cameraStatus.className = 'badge bg-danger';
            localStreamActive = false;
            alert('JavaScript error starting camera: ' + error.message);
        }
    }
    
    function stopLocalCamera() {
        if (localStreamActive) {
            // Stop camera via backend
            fetch('/api/stop_local_camera', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                console.log('Camera stopped:', data);
            })
            .catch(error => {
                console.error('Error stopping camera:', error);
            });
            
            // Reset UI
            localStreamActive = false;
            cameraStream.src = '/static/img/camera-placeholder.jpg';
            
            // Update status
            if (!cameraConnected) {
                cameraStatus.textContent = 'Disconnected';
                cameraStatus.className = 'badge bg-danger';
            }
        }
    }
    
    // Enhanced function to get available cameras with more information
    async function getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Clear any existing options
            localCameraSelect.innerHTML = '<option selected value="">Select camera...</option>';
            
            if (videoDevices.length === 0) {
                // No cameras found, add a disabled option explaining this
                const option = document.createElement('option');
                option.disabled = true;
                option.text = 'No cameras detected by browser';
                localCameraSelect.appendChild(option);
                
                // Add a "refresh" option that will prompt for camera permissions again
                const refreshOption = document.createElement('option');
                refreshOption.value = "refresh";
                refreshOption.text = '🔄 Refresh camera list';
                localCameraSelect.appendChild(refreshOption);
            } else {
                // Add options for each video device, using index as primary identifier
                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    // Use index as the value, not the device ID
                    option.value = index.toString(); 
                    option.text = device.label || `Camera ${index}`;
                    
                    // Save full device info in data attributes for debugging
                    option.dataset.deviceId = device.deviceId;
                    option.dataset.index = index;
                    
                    localCameraSelect.appendChild(option);
                });
                
                // Add numeric index options for direct camera access
                const directOption = document.createElement('option');
                directOption.value = "0";
                directOption.text = '📷 Default Camera (index 0)';
                localCameraSelect.appendChild(directOption);
                
                if (videoDevices.length > 1) {
                    const secondOption = document.createElement('option');
                    secondOption.value = "1";
                    secondOption.text = '📷 Second Camera (index 1)';
                    localCameraSelect.appendChild(secondOption);
                }
            }
            
            // Add event listener to handle the refresh option
            localCameraSelect.addEventListener('change', function() {
                if (this.value === 'refresh') {
                    // Request camera permission to get device labels
                    navigator.mediaDevices.getUserMedia({ video: true })
                        .then(stream => {
                            // Stop the stream immediately after getting permissions
                            stream.getTracks().forEach(track => track.stop());
                            // Refresh the camera list
                            getAvailableCameras();
                        })
                        .catch(err => {
                            console.error('Error requesting camera permission:', err);
                            alert('Failed to get camera permissions: ' + err.message);
                        });
                    
                    // Reset the select to the prompt option
                    this.value = '';
                }
            });
            
            // If we don't have labels, we might need permission first
            if (videoDevices.length > 0 && !videoDevices[0].label) {
                console.log('Camera devices found but no labels available. Requesting permissions...');
                try {
                    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    tempStream.getTracks().forEach(track => track.stop());
                    
                    // Try again to get devices with labels
                    getAvailableCameras();
                } catch (err) {
                    console.warn('Failed to get camera permissions for labels:', err);
                    // Add a note to the first option
                    if (localCameraSelect.options.length > 1) {
                        localCameraSelect.options[1].text += ' (No permission to access camera name)';
                    }
                }
            }
        } catch (error) {
            console.error('Error enumerating camera devices:', error);
            
            // Add an error option
            const option = document.createElement('option');
            option.disabled = true;
            option.text = `Error: ${error.message}`;
            localCameraSelect.appendChild(option);
        }
    }
    
    // Event listeners for local camera
    startLocalCameraBtn.addEventListener('click', startLocalCamera);
    stopLocalCameraBtn.addEventListener('click', stopLocalCamera);
    
    // Handle tab switching
    esp32Tab.addEventListener('shown.bs.tab', function() {
        if (localStreamActive) {
            stopLocalCamera();
        }
        
        if (cameraConnected) {
            updateCameraStream();
            cameraStatus.textContent = 'Connected';
            cameraStatus.className = 'badge bg-success';
        } else {
            cameraStatus.textContent = 'Disconnected';
            cameraStatus.className = 'badge bg-danger';
        }
    });
    
    localTab.addEventListener('shown.bs.tab', function() {
        // Get available cameras when switching to local tab
        getAvailableCameras();
        
        if (cameraConnected) {
            // When switching to local tab, if ESP32 is connected, temporarily disconnect display
            cameraStream.classList.add('d-none');
        }
    });
    
    // Initial state fetch and periodic updates
    fetchState();
    checkCameraStatus();
    getAvailableCameras(); // Get available cameras on page load
    updateInterval = setInterval(fetchState, 2000);
    
    // Start continuous sensor updates by default
    startSensorUpdates();
    
    // Camera handling - already existing code
    connectCameraBtn.addEventListener('click', function() {
        const ipAddress = cameraIp.value.trim();
        if (!ipAddress) {
            alert('Please enter the ESP32 camera IP address');
            return;
        }
        
        cameraStatus.textContent = 'Connecting...';
        cameraStatus.className = 'badge bg-warning';
        
        fetch('/api/connect_camera', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ip_address: ipAddress }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cameraStatus.textContent = 'Connected';
                cameraStatus.className = 'badge bg-success';
                cameraConnected = true;
                
                // Update camera stream source
                updateCameraStream();
                
                // Start sensor updates
                startSensorUpdates();
            } else {
                cameraStatus.textContent = 'Connection Failed';
                cameraStatus.className = 'badge bg-danger';
                cameraConnected = false;
            }
        })
        .catch(error => {
            console.error('Error connecting to camera:', error);
            cameraStatus.textContent = 'Connection Error';
            cameraStatus.className = 'badge bg-danger';
            cameraConnected = false;
        });
    });
    
    // Update camera stream periodically
    setInterval(function() {
        if (cameraConnected) {
            updateCameraStream();
        }
    }, 5000);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        if (animationId) clearInterval(animationId);
        if (updateInterval) clearInterval(updateInterval);
        if (sensorUpdateInterval) clearInterval(sensorUpdateInterval);
    });

    // Call fetchSensorData immediately on page load
    fetchSensorData();
});
