/**
 * Realistic Motorcycle View Controller
 * Handles animations and effects for the motorcycle simulation view
 */
class MotorcycleViewController {
    constructor() {
        // Add the new meters to the DOM elements
        this.speedNeedle = document.getElementById('speed-needle');
        this.speedValue = document.getElementById('dashboard-speed');
        this.indicatorLeft = document.getElementById('indicator-left');
        this.indicatorRight = document.getElementById('indicator-right');
        this.headlight = document.querySelector('.headlight');
        this.headlightBeam = document.querySelector('.headlight-beam');
        this.roadLines = document.querySelectorAll('.road-line');
        this.motorcycleHandlebars = document.querySelector('.motorcycle-handlebars');
        this.motorcycleBody = document.querySelector('.motorcycle-body');
        this.weatherContainer = document.getElementById('weather-container');
        
        // New meter elements
        this.fuelIndicator = document.querySelector('.fuel-indicator');
        this.gearDisplay = document.querySelector('.panel-item:nth-child(3) .panel-value');
        this.tempDisplay = document.querySelector('.panel-item:nth-child(1) .panel-value');
        this.odometerDisplay = document.querySelector('.panel-item:nth-child(2) .panel-value');
        
        // State - add new state variables for meters
        this.currentSpeed = 0;
        this.maxSpeed = 180;
        this.currentTurnDirection = null;
        this.isNight = false;
        this.weather = 'clear';
        
        // New state for additional meters
        this.fuelLevel = 75; // 0-100
        this.temperature = 86; // degrees C
        this.odometer = 3824; // km
        this.currentGear = 3; // 1-6 (neutral is 0)
        
        // Initialize
        this.updateSpeedDisplay(0);
        this.setupEventListeners();
        this.updateMeters(); // Initialize all meters
    }
    
    /**
     * Set up event listeners for motorcycle controls
     */
    setupEventListeners() {
        // We'll use custom events to communicate with the main simulation.js
        document.addEventListener('motorcycle:speedChanged', (e) => {
            this.updateSpeed(e.detail.speed);
        });
        
        document.addEventListener('motorcycle:turnSignal', (e) => {
            this.activateTurnSignal(e.detail.direction);
        });
        
        document.addEventListener('motorcycle:environment', (e) => {
            if (e.detail.isNight !== undefined) {
                this.setNightMode(e.detail.isNight);
            }
            
            if (e.detail.weather) {
                this.changeWeather(e.detail.weather);
            }
        });
        
        // Add window resize handler for responsive adjustments
        window.addEventListener('resize', () => this.handleResize());

        // Listen for fuel level changes
        document.addEventListener('motorcycle:fuelChanged', (e) => {
            this.updateFuelLevel(e.detail.fuelLevel);
        });
        
        // Listen for gear changes
        document.addEventListener('motorcycle:gearChanged', (e) => {
            this.updateGear(e.detail.gear);
        });
    }
    
    /**
     * Update the speedometer with a new speed value
     * @param {number} speed - The new speed in km/h
     */
    updateSpeed(speed) {
        // Clamp speed between 0 and max
        this.currentSpeed = Math.max(0, Math.min(this.maxSpeed, speed));
        
        // Update the speedometer needle rotation
        // Map speed (0 to maxSpeed) to rotation (135deg to -135deg)
        const needleRotation = 135 - (this.currentSpeed / this.maxSpeed * 270);
        if (this.speedNeedle) {
            this.speedNeedle.style.transform = `rotate(${needleRotation}deg)`;
        }
        
        // Update the digital speed display with more realistic behavior
        // Add a small delay and slight randomness for analog feel
        setTimeout(() => {
            // Add slight randomness to the display for realism (analog meter fluctuation)
            const displaySpeed = Math.round(this.currentSpeed + (Math.random() - 0.5) * 0.8);
            this.updateSpeedDisplay(displaySpeed);
        }, 150);
        
        // Update road animation speed
        this.updateRoadAnimation();
        
        // Add shake effect at high speeds
        this.updateShakeEffect();
        
        // Update headlight intensity based on speed
        this.updateHeadlight();
        
        // Add high-speed class to motorcycle body for rumble animation
        if (this.motorcycleBody) {
            if (this.currentSpeed > 90) {
                this.motorcycleBody.classList.add('high-speed');
            } else {
                this.motorcycleBody.classList.remove('high-speed');
            }
        }

        // Update gear based on speed
        this.updateGearFromSpeed(this.currentSpeed);
        
        // Update temperature based on speed (longer rides heat up the engine)
        this.updateTemperatureFromSpeed(this.currentSpeed);
        
        // Update odometer (very slightly) based on speed
        this.incrementOdometer(this.currentSpeed);
        
        // Update fuel consumption with more variance based on speed
        if (this.currentSpeed > 0) {
            // Higher speeds consume more fuel, exponentially
            // Also make it less predictable for realism
            this.consumeFuel(this.currentSpeed);
        }
    }
    
    /**
     * Update digital speedometer display
     * @param {number} speed - The speed to display
     */
    updateSpeedDisplay(speed) {
        if (this.speedValue) {
            this.speedValue.textContent = Math.round(speed);
        }
    }
    
    /**
     * Update road line animation speed based on current speed
     */
    updateRoadAnimation() {
        // Calculate animation duration - faster speed = shorter duration
        // Minimum duration of 0.2s at max speed, 2s at 0 speed
        const duration = Math.max(0.2, 2 - (this.currentSpeed / this.maxSpeed * 1.8));
        
        if (this.roadLines && this.roadLines.length) {
            this.roadLines.forEach(line => {
                line.style.animationDuration = `${duration}s`;
            });
        }
    }
    
    /**
     * Add realistic shake effect at higher speeds
     */
    updateShakeEffect() {
        if (!this.motorcycleHandlebars) return;
        
        // Only shake at high speeds
        if (this.currentSpeed > 80) {
            // More intense shake at higher speeds
            const intensity = (this.currentSpeed - 80) / 100;
            
            // Clear any existing shake animation
            if (this._shakeAnimationId) {
                cancelAnimationFrame(this._shakeAnimationId);
            }
            
            const shake = () => {
                if (this.currentSpeed > 80) {
                    const randomX = (Math.random() - 0.5) * intensity * 3;
                    const randomY = (Math.random() - 0.5) * intensity;
                    this.motorcycleHandlebars.style.transform = `translateX(calc(-50% + ${randomX}px)) translateY(${randomY}px)`;
                    this._shakeAnimationId = requestAnimationFrame(shake);
                } else {
                    this.motorcycleHandlebars.style.transform = 'translateX(-50%)';
                }
            };
            
            // Start the shake animation
            this._shakeAnimationId = requestAnimationFrame(shake);
        } else {
            // Reset at normal speeds
            if (this._shakeAnimationId) {
                cancelAnimationFrame(this._shakeAnimationId);
                this._shakeAnimationId = null;
            }
            this.motorcycleHandlebars.style.transform = 'translateX(-50%)';
        }
    }
    
    /**
     * Update headlight brightness and beam based on speed
     */
    updateHeadlight() {
        if (!this.headlight || !this.headlightBeam) return;
        
        // Brighter headlight at higher speeds and at night
        const baseIntensity = this.isNight ? 1 : 0.7;
        const speedFactor = this.currentSpeed / this.maxSpeed;
        const intensity = baseIntensity + (speedFactor * 0.3);
        
        // Longer beam at higher speeds
        const beamLength = 300 + (this.currentSpeed * 3);
        
        // Apply the changes
        this.headlight.style.opacity = intensity;
        this.headlightBeam.style.height = `${beamLength}px`;
        this.headlightBeam.style.opacity = this.isNight ? 0.9 : 0.5;
    }
    
    /**
     * Activate turn indicator
     * @param {string} direction - 'left', 'right', or null to turn off
     */
    activateTurnSignal(direction) {
        if (!this.indicatorLeft || !this.indicatorRight) return;
        
        // Always reset both indicators first
        this.indicatorLeft.classList.remove('active');
        this.indicatorRight.classList.remove('active');
        
        // Activate the requested direction only if direction is specified
        if (direction === 'left') {
            this.indicatorLeft.classList.add('active');
        } else if (direction === 'right') {
            this.indicatorRight.classList.add('active');
        }
        // For null/center, both indicators remain inactive (already handled by removing 'active' class above)
        
        this.currentTurnDirection = direction;
    }
    
    /**
     * Toggle night mode
     * @param {boolean} isNight - Whether to enable night mode
     */
    setNightMode(isNight) {
        this.isNight = isNight;
        const view = document.getElementById('motorcycle-view');
        if (!view) return;
        
        const skyObject = document.querySelector('.sky-object');
        
        if (isNight) {
            // Make sky darker
            view.style.background = `linear-gradient(to bottom, 
                #0c1445 0%, 
                #1a2252 30%, 
                #29303d 50%,
                #333 55%,  
                #222 60%, 
                #111 100%)`;
            
            // Make headlight more prominent
            if (this.headlight) {
                this.headlight.style.boxShadow = '0 0 60px rgba(255, 255, 200, 0.8)';
            }
            if (this.headlightBeam) {
                this.headlightBeam.style.opacity = 0.9;
            }
            
            // Change sky object to moon
            if (skyObject) {
                skyObject.style.background = '#E6E6E6';
                skyObject.style.boxShadow = '0 0 40px rgba(200, 200, 255, 0.6)';
            }
        } else {
            // Restore daytime look
            view.style.background = `linear-gradient(to bottom, 
                #87CEEB 0%, 
                #6495ED 30%, 
                #7B8C95 50%,
                #3F4E56 55%,  
                #444444 60%, 
                #333333 100%)`;
            
            // Normal headlight
            if (this.headlight) {
                this.headlight.style.boxShadow = '0 0 40px rgba(255, 255, 200, 0.6)';
            }
            if (this.headlightBeam) {
                this.headlightBeam.style.opacity = 0.7;
            }
            
            // Change sky object to sun
            if (skyObject) {
                skyObject.style.background = '#FDB813';
                skyObject.style.boxShadow = '0 0 40px rgba(253, 184, 19, 0.5)';
            }
        }
        
        // Update headlight based on current settings
        this.updateHeadlight();
    }
    
    /**
     * Change weather effects
     * @param {string} weatherType - 'clear', 'rain', or 'snow'
     */
    changeWeather(weatherType) {
        if (!this.weatherContainer) return;
        
        this.weather = weatherType;
        
        // Clear existing weather effects
        this.weatherContainer.innerHTML = '';
        
        // Apply new weather effects
        switch (weatherType) {
            case 'rain':
                this.createRainEffect();
                break;
            case 'snow':
                this.createSnowEffect();
                break;
            // Default is clear weather, no effects needed
        }
    }
    
    /**
     * Create rain animation effect
     */
    createRainEffect() {
        if (!this.weatherContainer) return;
        
        // Create multiple raindrops
        for (let i = 0; i < 100; i++) {
            const raindrop = document.createElement('div');
            raindrop.className = 'raindrop';
            raindrop.style.left = `${Math.random() * 100}%`;
            raindrop.style.animationDuration = `${0.5 + Math.random()}s`;
            raindrop.style.animationDelay = `${Math.random()}s`;
            
            // Style for raindrops
            raindrop.style.position = 'absolute';
            raindrop.style.width = '2px';
            raindrop.style.height = '20px';
            raindrop.style.background = 'rgba(200, 200, 255, 0.6)';
            raindrop.style.top = '-20px';
            raindrop.style.animation = `rainfall ${0.5 + Math.random()}s linear infinite`;
            
            this.weatherContainer.appendChild(raindrop);
        }
        
        // Add rainfall animation
        const styleId = 'rain-style';
        let style = document.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }
        
        style.textContent = `
            @keyframes rainfall {
                from { transform: translateY(0) translateX(0); }
                to { transform: translateY(400px) translateX(${-100 * (this.currentSpeed/100)}px); }
            }
        `;
    }
    
    /**
     * Create snow animation effect
     */
    createSnowEffect() {
        if (!this.weatherContainer) return;
        
        // Create multiple snowflakes
        for (let i = 0; i < 80; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.style.left = `${Math.random() * 100}%`;
            snowflake.style.animationDuration = `${3 + Math.random() * 5}s`;
            snowflake.style.animationDelay = `${Math.random() * 3}s`;
            
            // Style for snowflakes
            snowflake.style.position = 'absolute';
            snowflake.style.width = `${3 + Math.random() * 5}px`;
            snowflake.style.height = snowflake.style.width;
            snowflake.style.borderRadius = '50%';
            snowflake.style.background = 'rgba(255, 255, 255, 0.8)';
            snowflake.style.top = '-10px';
            snowflake.style.animation = `snowfall ${3 + Math.random() * 5}s linear infinite`;
            
            this.weatherContainer.appendChild(snowflake);
        }
        
        // Add snowfall animation
        const styleId = 'snow-style';
        let style = document.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }
        
        style.textContent = `
            @keyframes snowfall {
                from { 
                    transform: translateY(0) translateX(0) rotate(0deg); 
                }
                to { 
                    transform: translateY(400px) translateX(${-150 * (this.currentSpeed/100)}px) rotate(360deg); 
                }
            }
        `;
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Adjust elements for responsive layout
        const view = document.getElementById('motorcycle-view');
        if (!view) return;
        
        const width = view.offsetWidth;
        const speedometerEl = document.querySelector('.speedometer');
        
        // Scale certain elements based on view width
        if (width < 500 && speedometerEl) {
            // Smaller screens
            speedometerEl.style.transform = 'scale(0.8) perspective(400px) rotateX(10deg)';
        } else if (speedometerEl) {
            // Larger screens
            speedometerEl.style.transform = 'perspective(400px) rotateX(10deg)';
        }
    }

    /**
     * Update fuel gauge position with better analog behavior
     * @param {number} level - Fuel level 0-100
     */
    updateFuelLevel(level) {
        this.fuelLevel = Math.max(0, Math.min(100, level));
        
        // Calculate needle rotation - from -90 (empty) to 0 (full)
        // Add slight random jitter for realism
        const jitter = (Math.random() - 0.5) * 1.5;
        const rotation = -90 + (this.fuelLevel / 100 * 90) + jitter;
        
        if (this.fuelIndicator) {
            this.fuelIndicator.style.transform = `rotate(${rotation}deg)`;
            
            // Update color based on fuel level
            if (this.fuelLevel < 20) {
                this.fuelIndicator.style.background = 'linear-gradient(to top, #ff0000 60%, #8c0000 100%)';
            } else if (this.fuelLevel < 40) {
                this.fuelIndicator.style.background = 'linear-gradient(to top, #ff9800 60%, #ac6800 100%)';
            } else {
                this.fuelIndicator.style.background = 'linear-gradient(to top, #ff3e3e 60%, #8c0000 100%)';
            }
        }
    }
    
    /**
     * Update gear display
     * @param {number} gear - Gear number (0-6, where 0 is neutral)
     */
    updateGear(gear) {
        this.currentGear = gear;
        
        if (this.gearDisplay) {
            if (gear === 0) {
                this.gearDisplay.textContent = 'N';
            } else {
                this.gearDisplay.textContent = gear;
            }
        }
    }
    
    /**
     * Update the gear automatically based on speed
     * @param {number} speed - Current speed in km/h
     */
    updateGearFromSpeed(speed) {
        // Simple automatic gear calculation
        let gear = 0; // neutral
        
        if (speed > 0) gear = 1;
        if (speed >= 20) gear = 2;
        if (speed >= 40) gear = 3;
        if (speed >= 60) gear = 4;
        if (speed >= 80) gear = 5;
        if (speed >= 100) gear = 6;
        
        this.updateGear(gear);
    }
    
    /**
     * Update engine temperature based on speed and time
     * @param {number} speed - Current speed in km/h
     */
    updateTemperatureFromSpeed(speed) {
        // Calculate a base temperature (higher with higher speeds)
        const baseTemp = 70 + (speed / 180 * 30);
        
        // Add some randomness
        const randomFactor = (Math.random() - 0.5) * 2;
        
        // Calculate new temperature with some damping to prevent rapid changes
        this.temperature = this.temperature * 0.95 + (baseTemp + randomFactor) * 0.05;
        
        // Update display
        if (this.tempDisplay) {
            const tempRounded = Math.round(this.temperature);
            this.tempDisplay.textContent = `${tempRounded}°C`;
            
            // Change color based on temperature
            if (tempRounded > 100) {
                this.tempDisplay.className = 'panel-value danger';
            } else if (tempRounded > 95) {
                this.tempDisplay.className = 'panel-value warning';
            } else {
                this.tempDisplay.className = 'panel-value';
            }
        }
    }
    
    /**
     * Increment odometer based on speed
     * @param {number} speed - Current speed in km/h
     */
    incrementOdometer(speed) {
        // Only update every few cycles to avoid excessive precision
        if (Math.random() < 0.05 && speed > 0) {
            // Increment based on speed - approximately accurate for updates
            const increment = speed / 3600; // km per update at real-time speed
            this.odometer += increment;
            
            // Update display
            if (this.odometerDisplay) {
                this.odometerDisplay.textContent = `${Math.floor(this.odometer)} km`;
            }
        }
    }
    
    /**
     * Consume fuel based on speed with more realistic consumption model
     * @param {number} speed - Current speed in km/h
     */
    consumeFuel(speed) {
        // Update occasionally
        if (Math.random() < 0.02 && speed > 0) {
            // Higher speeds consume fuel exponentially
            // 0.005 * (1 + (speed/40)²) gives a good curve
            // Add a bit of randomness for realism
            const baseConsumption = 0.005 * (1 + Math.pow(speed/40, 2));
            const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
            
            const consumption = baseConsumption * randomFactor;
            this.fuelLevel = Math.max(0, this.fuelLevel - consumption);
            
            // Update fuel gauge with slight delay to simulate mechanical lag
            setTimeout(() => {
                this.updateFuelLevel(this.fuelLevel);
            }, 200);
        }
    }
    
    /**
     * Update all meters to their current values
     */
    updateMeters() {
        this.updateFuelLevel(this.fuelLevel);
        this.updateGear(this.currentGear);
        
        if (this.tempDisplay) {
            this.tempDisplay.textContent = `${Math.round(this.temperature)}°C`;
        }
        
        if (this.odometerDisplay) {
            this.odometerDisplay.textContent = `${Math.floor(this.odometer)} km`;
        }
    }
}

// Initialize the controller when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.motorcycleView = new MotorcycleViewController();
    
    // Connect to the main simulation.js
    const speedControl = document.getElementById('speed-control');
    if (speedControl) {
        speedControl.addEventListener('input', function() {
            // Update speed needle directly
            if (window.motorcycleView) {
                window.motorcycleView.updateSpeed(parseInt(this.value));
            }
            
            // Also dispatch the event for the motorcycle view controller
            document.dispatchEvent(new CustomEvent('motorcycle:speedChanged', {
                detail: { speed: parseInt(this.value) }
            }));
        });
    }
    
    // Connect turn signals
    const turnLeftBtn = document.getElementById('turn-left-btn');
    const turnRightBtn = document.getElementById('turn-right-btn');
    const centerBtn = document.getElementById('center-btn');
    
    if (turnLeftBtn && window.motorcycleView) {
        turnLeftBtn.addEventListener('click', () => {
            window.motorcycleView.activateTurnSignal('left');
            
            document.dispatchEvent(new CustomEvent('motorcycle:turnSignal', {
                detail: { direction: 'left' }
            }));
        });
    }
    
    if (turnRightBtn && window.motorcycleView) {
        turnRightBtn.addEventListener('click', () => {
            window.motorcycleView.activateTurnSignal('right');
            
            document.dispatchEvent(new CustomEvent('motorcycle:turnSignal', {
                detail: { direction: 'right' }
            }));
        });
    }
    
    if (centerBtn && window.motorcycleView) {
        centerBtn.addEventListener('click', () => {
            window.motorcycleView.activateTurnSignal(null);
            
            document.dispatchEvent(new CustomEvent('motorcycle:turnSignal', {
                detail: { direction: null }
            }));
        });
    }
    
    // Add time-based automatic day/night cycle
    setInterval(() => {
        const hour = new Date().getHours();
        const isNight = hour < 6 || hour > 18; // Night time between 6 PM and 6 AM
        
        if (window.motorcycleView) {
            window.motorcycleView.setNightMode(isNight);
        }
        
        document.dispatchEvent(new CustomEvent('motorcycle:environment', {
            detail: { isNight: isNight }
        }));
    }, 10000); // Check every 10 seconds (would be longer in production)
    
    // Run initial resize handler
    if (window.motorcycleView) {
        window.motorcycleView.handleResize();
    }
    
    // Set initial weather (random between clear and rain)
    if (window.motorcycleView) {
        const weather = Math.random() > 0.7 ? 'rain' : 'clear';
        window.motorcycleView.changeWeather(weather);
    }

    // Add initial random fuel level between 60-90%
    if (window.motorcycleView) {
        const initialFuel = 60 + Math.random() * 30;
        window.motorcycleView.updateFuelLevel(initialFuel);
    }

    // Add the mode toggle buttons to the UI
    addModeToggleButtons();
    
    // Set the initial mode based on localStorage or default to sunny
    const savedMode = localStorage.getItem('motorcycle-environment-mode') || 'sunny';
    setEnvironmentMode(savedMode);
    updateActiveButton(`${savedMode}-mode-btn`);
    
    // Also update the buttons when page loads
    setTimeout(() => {
        const activeMode = localStorage.getItem('motorcycle-environment-mode') || 'sunny';
        updateActiveButton(`${activeMode}-mode-btn`);
    }, 500);
});

// Fix the placement of mode switching buttons

// Update the mode toggle buttons placement for better visibility
function addModeToggleButtons() {
    // First, check if the buttons already exist
    if (document.querySelector('.mode-toggle-container')) {
        return; // Buttons already added
    }
    
    // Create a more prominent container for the mode buttons
    const modeContainer = document.createElement('div');
    modeContainer.className = 'mode-toggle-container';
    modeContainer.innerHTML = `
        <div class="mode-toggle-header">Environment</div>
        <div class="mode-toggle-buttons">
            <button class="mode-btn sunny-btn active" id="sunny-mode-btn" title="Sunny Mode">
                <i class="bi bi-brightness-high-fill"></i>
            </button>
            <button class="mode-btn rainy-btn" id="rainy-mode-btn" title="Rainy Mode">
                <i class="bi bi-cloud-rain-fill"></i>
            </button>
            <button class="mode-btn night-btn" id="night-mode-btn" title="Night Mode">
                <i class="bi bi-moon-stars-fill"></i>
            </button>
        </div>
    `;
    
    // Insert the mode container directly into the motorcycle view
    const motorcycleView = document.getElementById('motorcycle-view');
    if (motorcycleView) {
        motorcycleView.appendChild(modeContainer);
        
        // Add event listeners
        document.getElementById('sunny-mode-btn').addEventListener('click', () => {
            setEnvironmentMode('sunny');
            updateActiveButton('sunny-mode-btn');
        });
        
        document.getElementById('rainy-mode-btn').addEventListener('click', () => {
            setEnvironmentMode('rainy');
            updateActiveButton('rainy-mode-btn');
        });
        
        document.getElementById('night-mode-btn').addEventListener('click', () => {
            setEnvironmentMode('night');
            updateActiveButton('night-mode-btn');
        });
    }
}

function updateActiveButton(activeButtonId) {
    // Remove active class from all buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to the clicked button
    document.getElementById(activeButtonId).classList.add('active');
}

function setEnvironmentMode(mode) {
    // Create and dispatch custom event for the motorcycle view
    const event = new CustomEvent('motorcycle:environment', {
        detail: { 
            isNight: mode === 'night',
            weather: mode === 'rainy' ? 'rain' : 'clear'
        }
    });
    
    document.dispatchEvent(event);
    
    // Save the mode preference to localStorage
    localStorage.setItem('motorcycle-environment-mode', mode);
}

// Existing motorcycle view code will handle the custom event

// Update motorcycle speed from main simulation.js
function updateMotorcycleSpeed(speed) {
    if (window.motorcycleView) {
        window.motorcycleView.updateSpeed(speed);
    }
}
