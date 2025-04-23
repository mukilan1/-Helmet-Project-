"""
High-precision detector for humans and vehicles.
Focuses on minimizing false positives by using multiple validation checks.
"""
import cv2
import numpy as np
import os
import urllib.request
import time

# Constants for detection with high precision
CONF_THRESHOLD = 0.70  # Higher confidence threshold to avoid false positives
NMS_THRESHOLD = 0.30   # Stricter non-maximum suppression
MIN_DETECTION_SIZE = 0.005  # Minimum object size as ratio of image (prevents tiny false detections)
MAX_DETECTION_SIZE = 0.80   # Maximum object size as ratio of image

class PrecisionDetector:
    def __init__(self):
        # Path configurations
        self.models_dir = os.path.join(os.path.dirname(__file__), 'models')
        os.makedirs(self.models_dir, exist_ok=True)
        
        # Model configurations
        self.model_files = {
            'yolo': {
                'weights': os.path.join(self.models_dir, 'yolov4.weights'),
                'config': os.path.join(self.models_dir, 'yolov4.cfg'),
                'names': os.path.join(self.models_dir, 'coco.names'),
                'tiny_weights': os.path.join(self.models_dir, 'yolov4-tiny.weights'),
                'tiny_config': os.path.join(self.models_dir, 'yolov4-tiny.cfg'),
            },
            'ssd': {
                'weights': os.path.join(self.models_dir, 'frozen_inference_graph.pb'),
                'config': os.path.join(self.models_dir, 'ssd_mobilenet_v2_coco_2018_03_29.pbtxt'),
            }
        }
        
        # Detection parameters
        self.person_class_id = 0  # COCO class ID for person
        self.vehicle_class_ids = [1, 2, 3, 5, 7]  # bicycle, car, motorcycle, bus, truck
        
        # Detectors
        self.yolo_net = None
        self.yolo_output_layers = []
        self.ssd_net = None  # SSD MobileNet backup detector
        
        # Detection state
        self.classes = None
        self.initialized = False
        self.last_valid_human_boxes = []
        self.last_valid_vehicle_boxes = []
        self.last_detection_time = time.time()
        self.detection_history = []  # Keep track of recent detections for stability
        
        # Initialize detectors
        self.initialize_detectors()
    
    def initialize_detectors(self):
        """Initialize multiple detectors for redundancy and accuracy"""
        try:
            # First, download model files if needed
            self.download_model_files()
            
            # Load class names
            if os.path.exists(self.model_files['yolo']['names']):
                with open(self.model_files['yolo']['names'], 'r') as f:
                    self.classes = [line.strip() for line in f.readlines()]
            else:
                # Fallback class names for COCO dataset
                self.classes = ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck"]
            
            # Initialize YOLO network
            yolo_config = self.model_files['yolo']['config']
            yolo_weights = self.model_files['yolo']['weights']
            
            # Fall back to tiny YOLO if full model isn't available
            if not os.path.exists(yolo_weights) or not os.path.exists(yolo_config):
                yolo_config = self.model_files['yolo']['tiny_config']
                yolo_weights = self.model_files['yolo']['tiny_weights']
            
            # Load appropriate YOLO model if available
            if os.path.exists(yolo_weights) and os.path.exists(yolo_config):
                print(f"Loading YOLO model from {yolo_weights}")
                self.yolo_net = cv2.dnn.readNetFromDarknet(yolo_config, yolo_weights)
                
                # Optimize network for CPU
                self.yolo_net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.yolo_net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                
                # Get output layer names
                layer_names = self.yolo_net.getLayerNames()
                try:
                    # OpenCV 4.5.4+
                    self.yolo_output_layers = [layer_names[i - 1] for i in self.yolo_net.getUnconnectedOutLayers()]
                except:
                    # Older OpenCV versions
                    self.yolo_output_layers = [layer_names[i[0] - 1] for i in self.yolo_net.getUnconnectedOutLayers()]
            
            # Try to load SSD MobileNet as backup
            ssd_weights = self.model_files['ssd']['weights']
            ssd_config = self.model_files['ssd']['config']
            
            if os.path.exists(ssd_weights) and os.path.exists(ssd_config):
                print(f"Loading SSD MobileNet model from {ssd_weights}")
                self.ssd_net = cv2.dnn.readNetFromTensorflow(ssd_weights, ssd_config)
                self.ssd_net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.ssd_net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            
            # Mark initialization successful if at least one model is loaded
            self.initialized = (self.yolo_net is not None) or (self.ssd_net is not None)
            if self.initialized:
                print("Precision detector initialized successfully")
            else:
                print("Warning: No detection models could be loaded")
        
        except Exception as e:
            print(f"Error initializing precision detector: {e}")
            self.initialized = False
    
    def download_model_files(self):
        """Download model files if they don't exist"""
        try:
            # Download YOLO config and names files - they're small
            yolo_names_url = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/data/coco.names"
            yolo_cfg_url = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg"
            yolo_tiny_cfg_url = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg"
            
            # Only download if they don't exist
            if not os.path.exists(self.model_files['yolo']['names']):
                print(f"Downloading YOLO class names from {yolo_names_url}")
                urllib.request.urlretrieve(yolo_names_url, self.model_files['yolo']['names'])
                
            if not os.path.exists(self.model_files['yolo']['config']):
                print(f"Downloading YOLO config from {yolo_cfg_url}")
                urllib.request.urlretrieve(yolo_cfg_url, self.model_files['yolo']['config'])
                
            if not os.path.exists(self.model_files['yolo']['tiny_config']):
                print(f"Downloading YOLO tiny config from {yolo_tiny_cfg_url}")
                urllib.request.urlretrieve(yolo_tiny_cfg_url, self.model_files['yolo']['tiny_config'])
                
            # For weights files, they're large and we should check before downloading
            # We'll provide download instructions if needed, rather than auto-downloading
            if not os.path.exists(self.model_files['yolo']['tiny_weights']):
                print("YOLO tiny weights file not found. You may want to download it from:")
                print("https://github.com/AlexeyAB/darknet/releases/download/darknet_yolo_v4_pre/yolov4-tiny.weights")
                print(f"and save it to {self.model_files['yolo']['tiny_weights']}")
                
            if not os.path.exists(self.model_files['ssd']['config']):
                # Create a minimal config file for TensorFlow model
                with open(self.model_files['ssd']['config'], 'w') as f:
                    f.write("""# SSD MobileNet v2 COCO configuration
node {
  name: "image_tensor"
  op: "Placeholder"
  attr {
    key: "dtype"
    value {
      type: DT_UINT8
    }
  }
}
""")
                
        except Exception as e:
            print(f"Error downloading model files: {e}")
    
    def is_person(self, class_id):
        """Check if detected class is a person"""
        return class_id == self.person_class_id or (self.classes and class_id < len(self.classes) and self.classes[class_id] == "person")
    
    def is_vehicle(self, class_id):
        """Check if detected class is a vehicle"""
        return class_id in self.vehicle_class_ids or (self.classes and class_id < len(self.classes) and any(v in self.classes[class_id].lower() for v in ["car", "truck", "bus", "bicycle", "motorcycle"]))
    
    def validate_detection(self, box, frame_dims, class_id, confidence):
        """Apply multiple validation checks to reduce false positives"""
        width, height = frame_dims
        x, y, w, h = box
        
        # Validate size - reject if too small or too large
        size_ratio = (w * h) / (width * height)
        if size_ratio < MIN_DETECTION_SIZE or size_ratio > MAX_DETECTION_SIZE:
            return False
            
        # Validate aspect ratio - people are generally taller than wide, vehicles wider than tall
        aspect_ratio = w / max(h, 1)  # Prevent division by zero
        
        if self.is_person(class_id):
            # Person typically has aspect ratio < 0.8 (taller than wide)
            if aspect_ratio > 1.2:
                return False
            # Additional checks for person detections
            if confidence < 0.65:  # Higher confidence for people
                return False
        
        elif self.is_vehicle(class_id):
            # Vehicles typically have aspect ratio > 1.0 (wider than tall)
            if aspect_ratio < 0.7:
                return False
            # Additional checks for vehicle detections
            if confidence < 0.60:  # Higher confidence for vehicles 
                return False
        
        # More lenient threshold for other objects
        elif confidence < 0.55:
            return False
        
        return True
    
    def smooth_detections(self, current_boxes, prev_boxes, box_type):
        """Smooth detections over time to reduce jitter and false positives"""
        if not prev_boxes:
            return current_boxes
            
        # If no current detections but we had previous ones,
        # check if we should keep the previous ones (avoid flickering)
        if not current_boxes and prev_boxes and time.time() - self.last_detection_time < 0.5:
            return prev_boxes
            
        # Update tracking timestamp
        self.last_detection_time = time.time()
        return current_boxes
    
    def detect(self, frame):
        """
        Detect humans and vehicles with high precision
        Returns: humans_count, vehicles_count, annotated_frame
        """
        if not self.initialized:
            return 0, 0, frame
            
        height, width = frame.shape[:2]
        frame_dims = (width, height)
        
        # Copy frame for annotations
        annotated_frame = frame.copy()
        
        # Track detections for this frame
        human_boxes = []
        vehicle_boxes = []
        
        # Try YOLO detection first
        if self.yolo_net is not None:
            # Use both YOLOv4 and SSD MobileNet for high-precision detection
            yolo_humans, yolo_vehicles = self.detect_with_yolo(frame, frame_dims, annotated_frame)
            human_boxes.extend(yolo_humans)
            vehicle_boxes.extend(yolo_vehicles)
            
        # Try SSD MobileNet if we haven't found anything with YOLO
        if self.ssd_net is not None and not (human_boxes or vehicle_boxes):
            ssd_humans, ssd_vehicles = self.detect_with_ssd(frame, frame_dims, annotated_frame)
            human_boxes.extend(ssd_humans)
            vehicle_boxes.extend(ssd_vehicles)
            
        # Apply temporal smoothing
        human_boxes = self.smooth_detections(human_boxes, self.last_valid_human_boxes, "human")
        vehicle_boxes = self.smooth_detections(vehicle_boxes, self.last_valid_vehicle_boxes, "vehicle")
        
        # Save current detections for next frame
        self.last_valid_human_boxes = human_boxes.copy()
        self.last_valid_vehicle_boxes = vehicle_boxes.copy()
        
        # Count objects
        humans_count = len(human_boxes)
        vehicles_count = len(vehicle_boxes)
        
        # Clear the annotations and redraw only the final validated detections
        annotated_frame = frame.copy()
        
        # Draw human detections
        for x, y, w, h in human_boxes:
            cv2.rectangle(annotated_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(annotated_frame, "Person", (x, y - 5), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
        # Draw vehicle detections
        for x, y, w, h in vehicle_boxes:
            cv2.rectangle(annotated_frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
            cv2.putText(annotated_frame, "Vehicle", (x, y - 5), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            
        # Add summary text
        cv2.putText(annotated_frame, f"Humans: {humans_count}", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(annotated_frame, f"Vehicles: {vehicles_count}", (10, 60), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                    
        return humans_count, vehicles_count, annotated_frame
    
    def detect_with_yolo(self, frame, frame_dims, annotated_frame):
        """Detect objects using YOLO"""
        width, height = frame_dims
        human_boxes = []
        vehicle_boxes = []
        
        # Prepare input blob
        blob = cv2.dnn.blobFromImage(frame, 1/255.0, (416, 416), swapRB=True, crop=False)
        self.yolo_net.setInput(blob)
        
        # Run detection
        outputs = self.yolo_net.forward(self.yolo_output_layers)
        
        # Process detections
        boxes = []
        confidences = []
        class_ids = []
        
        for output in outputs:
            for detection in output:
                if len(detection) >= 85:  # YOLO format check
                    scores = detection[5:]
                    class_id = np.argmax(scores)
                    confidence = scores[class_id]
                    
                    # Only keep persons and vehicles with high confidence
                    if confidence > CONF_THRESHOLD and (self.is_person(class_id) or self.is_vehicle(class_id)):
                        # Calculate box coordinates
                        center_x = int(detection[0] * width)
                        center_y = int(detection[1] * height)
                        w = int(detection[2] * width)
                        h = int(detection[3] * height)
                        x = int(center_x - w/2)
                        y = int(center_y - h/2)
                        
                        # Ensure coordinates are valid
                        x = max(0, x)
                        y = max(0, y)
                        w = min(w, width - x)
                        h = min(h, height - y)
                        
                        boxes.append([x, y, w, h])
                        confidences.append(float(confidence))
                        class_ids.append(class_id)
        
        # Apply non-maximum suppression
        if boxes:
            indices = cv2.dnn.NMSBoxes(boxes, confidences, CONF_THRESHOLD, NMS_THRESHOLD)
            
            # Process valid detections
            for i in indices:
                if isinstance(i, list):  # OpenCV version compatibility
                    i = i[0]
                
                x, y, w, h = boxes[i]
                confidence = confidences[i]
                class_id = class_ids[i]
                
                # Apply extra validation to minimize false positives
                if self.validate_detection([x, y, w, h], frame_dims, class_id, confidence):
                    if self.is_person(class_id):
                        human_boxes.append([x, y, w, h])
                    elif self.is_vehicle(class_id):
                        vehicle_boxes.append([x, y, w, h])
        
        return human_boxes, vehicle_boxes
    
    def detect_with_ssd(self, frame, frame_dims, annotated_frame):
        """Detect objects using SSD MobileNet"""
        width, height = frame_dims
        human_boxes = []
        vehicle_boxes = []
        
        # Prepare input blob - SSD needs 300x300
        blob = cv2.dnn.blobFromImage(frame, 1.0, (300, 300), [127.5, 127.5, 127.5], swapRB=True, crop=False)
        self.ssd_net.setInput(blob)
        
        # Run detection
        detections = self.ssd_net.forward()
        
        # Process detections
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            
            if confidence > CONF_THRESHOLD:
                class_id = int(detections[0, 0, i, 1]) - 1  # SSD class IDs are 1-indexed
                
                # Only keep persons and vehicles
                if self.is_person(class_id) or self.is_vehicle(class_id):
                    # Get box coordinates
                    box = detections[0, 0, i, 3:7] * np.array([width, height, width, height])
                    (x1, y1, x2, y2) = box.astype("int")
                    
                    # Convert to x,y,w,h format
                    x = max(0, x1)
                    y = max(0, y1)
                    w = min(x2 - x1, width - x)
                    h = min(y2 - y1, height - y)
                    
                    # Apply validation
                    if self.validate_detection([x, y, w, h], frame_dims, class_id, confidence):
                        if self.is_person(class_id):
                            human_boxes.append([x, y, w, h])
                        elif self.is_vehicle(class_id):
                            vehicle_boxes.append([x, y, w, h])
        
        return human_boxes, vehicle_boxes
