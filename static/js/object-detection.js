/**
 * Object Detection Visualization
 * This module visualizes Python-based detection results without attempting its own detection
 */

class ObjectDetector {
    constructor() {
        // Detection elements
        this.canvas = document.getElementById('detection-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.humanCountElement = document.getElementById('human-count');
        this.vehicleCountElement = document.getElementById('vehicle-count');
        this.detectionToggle = document.getElementById('detection-toggle');
        
        // Video sources
        this.localVideoStream = document.getElementById('local-video-stream');
        this.cameraStream = document.getElementById('camera-stream');
        
        // Detection state
        this.isDetectionEnabled = true;
        this.humanCount = 0;
        this.vehicleCount = 0;
        this.updateInterval = null;
        
        // Bind methods
        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.startDetection = this.startDetection.bind(this);
        this.stopDetection = this.stopDetection.bind(this);
        this.updateStats = this.updateStats.bind(this);
        
        // Initialize
        this.init();
    }
    
    init() {
        try {
            // Set up detection toggle
            this.detectionToggle.addEventListener('change', () => {
                this.isDetectionEnabled = this.detectionToggle.checked;
                if (this.isDetectionEnabled) {
                    this.startDetection();
                } else {
                    this.stopDetection();
                    this.clearCanvas();
                }
            });
            
            // Set up resize handling
            window.addEventListener('resize', this.resizeCanvas);
            this.resizeCanvas();
            
            // Start the stats update interval (we're just displaying stats from backend here)
            this.startDetection();
            
            console.log('Object detection visualization initialized');
        } catch (error) {
            console.error('Error initializing object detector:', error);
        }
    }
    
    startDetection() {
        if (!this.isDetectionEnabled) return;
        
        // Stop any existing update loop
        this.stopDetection();
        
        // Start updating stats at regular intervals
        this.updateInterval = setInterval(this.updateStats, 1000);
        
        console.log('Detection visualization started');
    }
    
    stopDetection() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    updateStats() {
        // This function now only retrieves detection stats from the Python backend
        fetch('/api/detection_stats')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.humanCount = data.humans_count || 0;
                    this.vehicleCount = data.vehicles_count || 0;
                    
                    // Update the display
                    this.humanCountElement.textContent = this.humanCount;
                    this.vehicleCountElement.textContent = this.vehicleCount;
                }
            })
            .catch(error => {
                console.error('Error fetching detection stats:', error);
            });
    }
    
    resizeCanvas() {
        // Resize canvas to match video dimensions
        const container = document.querySelector('.camera-container');
        if (container) {
            this.canvas.width = container.offsetWidth;
            this.canvas.height = container.offsetHeight;
        }
    }
    
    clearCanvas() {
        // Clear the canvas and reset counts
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.humanCount = 0;
        this.vehicleCount = 0;
        this.humanCountElement.textContent = '0';
        this.vehicleCountElement.textContent = '0';
    }
    
    // This method is kept as a fallback for sensor data
    estimateClosestObjectDistance() {
        // Simply return a placeholder value (Python backend will handle real detection)
        return 3.0;
    }
}

// Initialize the detector when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.objectDetector = new ObjectDetector();
});
