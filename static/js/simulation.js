document.addEventListener('DOMContentLoaded', function() {
    // State
    let currentSpeed = 0;
    let animationId = null;
    let updateInterval = null;
    let cameraConnected = false;
    let localStreamActive = false;
    let localStream = null;
    
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
        if (localStreamActive) {
            // Use local camera sensor data
            updateLocalCameraSensorData();
            return;
        }
        
        if (!cameraConnected) {
            sensorStatus.textContent = 'Camera Disconnected';
            sensorStatus.className = 'badge bg-secondary';
            return;
        }
        
        sensorStatus.textContent = 'Fetching...';
        sensorStatus.className = 'badge bg-warning';
        
        fetch('/api/camera_sensors')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateSensorDisplay(data.sensors);
                    sensorStatus.textContent = 'Connected';
                    sensorStatus.className = 'badge bg-success';
                } else {
                    sensorStatus.textContent = 'Data Error';
                    sensorStatus.className = 'badge bg-danger';
                }
            })
            .catch(error => {
                console.error('Error fetching sensor data:', error);
                sensorStatus.textContent = 'Connection Error';
                sensorStatus.className = 'badge bg-danger';
                
                // Simulate sensor data if real data isn't available
                simulateSensorData();
            });
    }
    
    function updateSensorDisplay(sensors) {
        // Update light level
        if (sensors.light_level !== undefined) {
            const lightPercent = Math.min(100, Math.max(0, sensors.light_level / 10));
            lightLevelBar.style.width = `${lightPercent}%`;
            lightLevelValue.textContent = `${sensors.light_level} lux`;
        }
        
        // Update motion detection
        if (sensors.motion_detected !== undefined) {
            if (sensors.motion_detected) {
                motionIndicator.classList.add('active');
                motionStatus.textContent = 'Motion detected!';
            } else {
                motionIndicator.classList.remove('active');
                motionStatus.textContent = 'No motion';
            }
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
    
    function simulateSensorData() {
        // Generate simulated sensor data for demo purposes
        const simulatedData = {
            light_level: Math.floor(Math.random() * 1000),
            motion_detected: Math.random() > 0.7,
            distance: 1 + Math.random() * 5,
            resolution: "640x480",
            framerate: 15 + Math.floor(Math.random() * 10),
            quality: 70 + Math.floor(Math.random() * 20)
        };
        
        updateSensorDisplay(simulatedData);
        sensorStatus.textContent = 'Demo Data';
        sensorStatus.className = 'badge bg-info';
    }
    
    refreshSensorBtn.addEventListener('click', function() {
        fetchSensorData();
    });
    
    // Local camera handling
    async function getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Clear any existing options
            localCameraSelect.innerHTML = '<option selected value="">Select camera...</option>';
            
            // Add options for each video device
            videoDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${localCameraSelect.options.length}`;
                localCameraSelect.appendChild(option);
            });
            
            // If we don't have labels, we might need permission first
            if (videoDevices.length > 0 && !videoDevices[0].label) {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                tempStream.getTracks().forEach(track => track.stop());
                
                // Try again to get devices with labels
                getAvailableCameras();
            }
        } catch (error) {
            console.error('Error getting camera devices:', error);
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
            
            // Get the selected camera stream
            const constraints = {
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };
            
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            localVideoStream.srcObject = localStream;
            
            // Hide image stream and show video element
            cameraStream.classList.add('d-none');
            localVideoStream.classList.remove('d-none');
            
            // Update status
            cameraStatus.textContent = 'Local Camera Active';
            cameraStatus.className = 'badge bg-success';
            localStreamActive = true;
            
            // Update sensor data with local camera info
            updateLocalCameraSensorData();
        } catch (error) {
            console.error('Error starting local camera:', error);
            cameraStatus.textContent = 'Camera Error';
            cameraStatus.className = 'badge bg-danger';
            localStreamActive = false;
        }
    }
    
    function stopLocalCamera() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
            localVideoStream.srcObject = null;
            
            // Hide video element and show image stream
            localVideoStream.classList.add('d-none');
            cameraStream.classList.remove('d-none');
            
            // Update status
            if (!cameraConnected) {
                cameraStatus.textContent = 'Disconnected';
                cameraStatus.className = 'badge bg-danger';
            }
            
            localStreamActive = false;
        }
    }
    
    function updateLocalCameraSensorData() {
        if (localStreamActive && localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            
            // Extract information from video track settings
            const width = settings.width || 640;
            const height = settings.height || 480;
            const frameRate = settings.frameRate || 30;
            
            // Create simulated sensor data for local camera
            const simulatedData = {
                light_level: Math.floor(Math.random() * 800 + 200), // Random light level
                motion_detected: Math.random() > 0.7, // Random motion detection
                distance: 1.5 + Math.random() * 3, // Random distance (not really available from webcam)
                resolution: `${width}x${height}`,
                framerate: frameRate,
                quality: 90 // Assumed quality
            };
            
            updateSensorDisplay(simulatedData);
            sensorStatus.textContent = 'Local Camera';
            sensorStatus.className = 'badge bg-info';
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
    
    // Fetch sensor data on connection and periodically
    function startSensorUpdates() {
        fetchSensorData();
        setInterval(fetchSensorData, 5000);
    }
    
    // Start sensor updates when camera connects
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
    });
});
