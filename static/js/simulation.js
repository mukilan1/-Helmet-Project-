document.addEventListener('DOMContentLoaded', function() {
    // State
    let currentSpeed = 0;
    let animationId = null;
    let updateInterval = null;
    
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
    
    // Initial state fetch and periodic updates
    fetchState();
    updateInterval = setInterval(fetchState, 2000);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        if (animationId) clearInterval(animationId);
        if (updateInterval) clearInterval(updateInterval);
    });
});
