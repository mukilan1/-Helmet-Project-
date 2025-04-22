"""
Vehicle detection using Haar Cascades.
This is a more reliable method for detecting vehicles in video streams.
"""
import cv2
import os
import urllib.request

class HaarVehicleDetector:
    def __init__(self):
        # Create cascade directory if it doesn't exist
        self.cascade_dir = os.path.join(os.path.dirname(__file__), 'cascades')
        os.makedirs(self.cascade_dir, exist_ok=True)
        
        # Path to Haar Cascade XML files
        self.car_cascade_path = os.path.join(self.cascade_dir, 'cars.xml')
        
        # Download cascade file if it doesn't exist
        if not os.path.exists(self.car_cascade_path):
            self.download_cascade()
        
        # Load the car cascade classifier
        self.car_cascade = cv2.CascadeClassifier(self.car_cascade_path)
        
        # Check if loaded correctly
        if self.car_cascade.empty():
            print("Warning: Haar cascade file could not be loaded. Vehicle detection may not work.")
            self.initialized = False
        else:
            print("Haar cascade for vehicles loaded successfully")
            self.initialized = True
    
    def download_cascade(self):
        """Download the Haar cascade XML file for cars"""
        print("Downloading car cascade file...")
        try:
            # URL for car cascade file
            car_cascade_url = "https://raw.githubusercontent.com/andrewssobral/vehicle_detection_haarcascades/master/cars.xml"
            
            # Download the file
            urllib.request.urlretrieve(car_cascade_url, self.car_cascade_path)
            print(f"Downloaded car cascade to {self.car_cascade_path}")
        except Exception as e:
            print(f"Failed to download car cascade: {e}")
            # Create a minimal cascade file to avoid errors
            with open(self.car_cascade_path, 'w') as f:
                f.write('<opencv-storage>\n<cascade>\n</cascade>\n</opencv-storage>')
    
    def detect_vehicles(self, frame):
        """
        Detect vehicles in the given frame using Haar cascade classifier
        Returns: A list of detected vehicle rectangles (x, y, w, h) and the annotated frame
        """
        if not self.initialized or self.car_cascade.empty():
            # Return empty list if not initialized
            return [], frame
        
        # Create a copy of the frame to draw on
        annotated_frame = frame.copy()
        
        # Convert frame to grayscale for Haar detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect cars in the frame
        # Parameters can be tuned for better performance:
        # 1.1 = scale factor, 1-4 = minNeighbors (higher = less false positives)
        cars = self.car_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(60, 60))
        
        # Filter out likely false positives (too small or too large)
        height, width = frame.shape[:2]
        valid_cars = []
        
        for (x, y, w, h) in cars:
            # Skip if box is too small or too large relative to frame
            area_ratio = (w * h) / (width * height)
            if area_ratio < 0.01 or area_ratio > 0.6:
                continue
                
            # Skip if aspect ratio is extreme (not car-like)
            aspect_ratio = w / h
            if aspect_ratio < 0.5 or aspect_ratio > 2.5:
                continue
                
            # Add to valid cars list
            valid_cars.append((x, y, w, h))
            
            # Draw rectangle around car
            cv2.rectangle(annotated_frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
            
            # Add label
            cv2.putText(annotated_frame, 'Vehicle', (x, y - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        return valid_cars, annotated_frame
