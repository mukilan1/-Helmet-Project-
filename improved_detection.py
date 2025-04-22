"""
Improved detection model for more accurate human and vehicle detection.
This module integrates with the existing object_detection.py file.
"""
import cv2
import numpy as np
import os
import urllib.request
import time

# Constants for detection - increased thresholds for reliability
CONF_THRESHOLD = 0.55  # Higher confidence threshold for more accurate detections
NMS_THRESHOLD = 0.35   # Non-maximum suppression threshold
PERSON_CLASS_ID = 0    # YOLO class ID for person 
VEHICLE_CLASS_IDS = [2, 5, 7, 3, 1]  # car, bus, truck, motorcycle, bicycle in priority order

class ImprovedDetector:
    def __init__(self):
        # Create models directory if it doesn't exist
        os.makedirs("models", exist_ok=True)
        
        # Initialize detector
        self.net = None
        self.output_layers = []
        self.initialized = False
        self.classes = None
        
        # Track last detections to reduce jitter
        self.last_human_boxes = []
        self.last_vehicle_boxes = []
        self.last_detection_time = time.time()
        
        # Try to initialize the detector
        self.initialize_detector()
    
    def initialize_detector(self):
        """Initialize YOLOv4 for improved detection"""
        try:
            # Define model files - prefer standard YOLOv4 over tiny for better accuracy
            weights_path = "models/yolov4.weights"
            config_path = "models/yolov4.cfg"
            coco_names_path = "models/coco.names"
            
            # Fall back to YOLOv4-tiny if the full model isn't available
            if not os.path.exists(weights_path) or not os.path.exists(config_path):
                weights_path = "models/yolov4-tiny.weights"
                config_path = "models/yolov4-tiny.cfg"
            
            # Check if model files exist
            if not os.path.exists(weights_path) or not os.path.exists(config_path):
                self.download_model_files(weights_path, config_path, coco_names_path)
            
            # Load class names
            if os.path.exists(coco_names_path):
                with open(coco_names_path, 'r') as f:
                    self.classes = [line.strip() for line in f.readlines()]
            else:
                # Fallback class names
                self.classes = ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", 
                               "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench"]
            
            # Load the network
            print(f"Loading detection model from {weights_path}")
            self.net = cv2.dnn.readNetFromDarknet(config_path, weights_path)
            
            # Optimize for CPU if no GPU
            self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            
            # Determine output layers
            layer_names = self.net.getLayerNames()
            try:
                # OpenCV 4.5.4+
                self.output_layers = [layer_names[i - 1] for i in self.net.getUnconnectedOutLayers()]
            except:
                # Older OpenCV versions
                self.output_layers = [layer_names[i[0] - 1] for i in self.net.getUnconnectedOutLayers()]
            
            self.initialized = True
            print("Improved detector initialized successfully")
        except Exception as e:
            print(f"Failed to initialize improved detector: {e}")
            self.initialized = False
    
    def download_model_files(self, weights_path, config_path, names_path):
        """Download YOLO model files if they don't exist"""
        try:
            print(f"Downloading model files to {weights_path}...")
            
            # Create model directory if it doesn't exist
            os.makedirs(os.path.dirname(weights_path), exist_ok=True)
            
            # Download configuration file
            if not os.path.exists(config_path):
                # Try YOLOv4-tiny first, as it's smaller
                cfg_url = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg"
                print(f"Downloading config from {cfg_url}")
                urllib.request.urlretrieve(cfg_url, config_path)
            
            # Download weights file - prefer tiny for faster download
            if not os.path.exists(weights_path):
                weights_url = "https://github.com/AlexeyAB/darknet/releases/download/darknet_yolo_v4_pre/yolov4-tiny.weights"
                print(f"Downloading weights from {weights_url}")
                urllib.request.urlretrieve(weights_url, weights_path)
            
            # Download class names
            if not os.path.exists(names_path):
                names_url = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/data/coco.names"
                print(f"Downloading class names from {names_url}")
                urllib.request.urlretrieve(names_url, names_path)
            
            print("Model files downloaded successfully")
        except Exception as e:
            print(f"Failed to download model files: {e}")
            # Use the curl method as fallback
            try:
                if not os.path.exists(config_path):
                    os.system(f"curl -o {config_path} https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg")
                if not os.path.exists(weights_path):
                    os.system(f"curl -L -o {weights_path} https://github.com/AlexeyAB/darknet/releases/download/darknet_yolo_v4_pre/yolov4-tiny.weights")
                if not os.path.exists(names_path):
                    os.system(f"curl -o {names_path} https://raw.githubusercontent.com/AlexeyAB/darknet/master/data/coco.names")
            except Exception as e2:
                print(f"Fallback download also failed: {e2}")
                raise
    
    def is_person(self, class_id, class_name):
        """Check if the detected object is a person"""
        if class_id == PERSON_CLASS_ID:
            return True
        if self.classes and class_name and 'person' in class_name.lower():
            return True
        return False
    
    def is_vehicle(self, class_id, class_name):
        """Check if the detected object is a vehicle"""
        if class_id in VEHICLE_CLASS_IDS:
            return True
        if self.classes and class_name:
            vehicle_keywords = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'vehicle']
            return any(keyword in class_name.lower() for keyword in vehicle_keywords)
        return False
    
    def get_class_name(self, class_id):
        """Get the class name from class ID"""
        if self.classes and class_id < len(self.classes):
            return self.classes[class_id]
        return f"Class-{class_id}"
    
    def calculate_iou(self, box1, box2):
        """Calculate Intersection over Union (IoU) for two boxes"""
        # box format: [x, y, w, h]
        x1, y1, w1, h1 = box1
        x2, y2, w2, h2 = box2
        
        # Calculate intersection area
        x_left = max(x1, x2)
        y_top = max(y1, y2)
        x_right = min(x1 + w1, x2 + w2)
        y_bottom = min(y1 + h1, y2 + h2)
        
        if x_right < x_left or y_bottom < y_top:
            return 0.0
        
        intersection_area = (x_right - x_left) * (y_bottom - y_top)
        
        # Calculate union area
        box1_area = w1 * h1
        box2_area = w2 * h2
        union_area = box1_area + box2_area - intersection_area
        
        # Calculate IoU
        iou = intersection_area / union_area if union_area > 0 else 0.0
        return iou
    
    def smooth_detections(self, new_boxes, last_boxes, box_type):
        """Smooth detections to reduce jitter and maintain persistent tracking"""
        current_time = time.time()
        time_diff = current_time - self.last_detection_time
        
        # Return new detections directly if no previous detections or too much time has passed
        if not last_boxes or time_diff > 1.0:
            return new_boxes
        
        smoothed_boxes = []
        matched_indices = []
        
        # Try to match new detections with previous ones
        for new_box in new_boxes:
            best_match_idx = -1
            best_iou = 0.3  # Minimum IoU threshold for a match
            
            for i, last_box in enumerate(last_boxes):
                if i in matched_indices:
                    continue
                
                iou = self.calculate_iou(new_box, last_box)
                if iou > best_iou:
                    best_iou = iou
                    best_match_idx = i
            
            if best_match_idx >= 0:
                # Found a match - average the boxes to reduce jitter
                matched_indices.append(best_match_idx)
                last_box = last_boxes[best_match_idx]
                
                # Calculate weighted average (favor new detection)
                x = int(0.7 * new_box[0] + 0.3 * last_box[0])
                y = int(0.7 * new_box[1] + 0.3 * last_box[1])
                w = int(0.7 * new_box[2] + 0.3 * last_box[2])
                h = int(0.7 * new_box[3] + 0.3 * last_box[3])
                
                smoothed_boxes.append([x, y, w, h])
            else:
                # No match - use new detection
                smoothed_boxes.append(new_box)
        
        # Add unmatched previous detections if they're still relevant
        if time_diff < 0.5:  # Only keep unmatched boxes for a short time
            for i, last_box in enumerate(last_boxes):
                if i not in matched_indices:
                    # Add with lower confidence
                    smoothed_boxes.append(last_box)
        
        self.last_detection_time = current_time
        return smoothed_boxes
    
    def detect(self, frame):
        """
        Detect humans and vehicles in the given frame
        Returns: humans_count, vehicles_count, annotated_frame
        """
        if not self.initialized or self.net is None:
            # Return zeros if not initialized
            return 0, 0, frame
        
        height, width = frame.shape[:2]
        
        # Store original for drawing
        original_frame = frame.copy()
        
        # Prepare image for detection - YOLOv4 prefers 416x416
        target_size = (416, 416)
        
        # Create blob from image
        blob = cv2.dnn.blobFromImage(frame, 1/255.0, target_size, swapRB=True, crop=False)
        
        # Set input to the network
        self.net.setInput(blob)
        
        # Run forward pass
        outputs = self.net.forward(self.output_layers)
        
        # Initialize lists for detection results
        class_ids = []
        confidences = []
        boxes = []
        
        # Process each detection
        for output in outputs:
            for detection in output:
                if len(detection) >= 85:  # YOLO outputs have 85 elements per detection
                    scores = detection[5:]
                    class_id = np.argmax(scores)
                    confidence = scores[class_id]
                    
                    # Filter detections by confidence threshold
                    if confidence > CONF_THRESHOLD:
                        # Get class name if available
                        class_name = self.get_class_name(class_id)
                        
                        # Filter to only keep persons and vehicles
                        if self.is_person(class_id, class_name) or self.is_vehicle(class_id, class_name):
                            # Scale the bounding box coordinates back to the frame size
                            center_x = int(detection[0] * width)
                            center_y = int(detection[1] * height)
                            w = int(detection[2] * width)
                            h = int(detection[3] * height)
                            
                            # Calculate top-left corner coordinates
                            x = int(center_x - w / 2)
                            y = int(center_y - h / 2)
                            
                            # Ensure coordinates are within frame boundaries
                            x = max(0, x)
                            y = max(0, y)
                            w = min(w, width - x)
                            h = min(h, height - y)
                            
                            # Skip if box is too small - these are often false positives
                            if w < 20 or h < 20:
                                continue
                                
                            # Skip if box is unrealistically large
                            if w > width * 0.95 or h > height * 0.95:
                                continue
                            
                            # Add to lists
                            boxes.append([x, y, w, h])
                            confidences.append(float(confidence))
                            class_ids.append(class_id)
        
        # Apply non-maximum suppression
        if boxes:
            indices = cv2.dnn.NMSBoxes(boxes, confidences, CONF_THRESHOLD, NMS_THRESHOLD)
        else:
            indices = []
        
        # Separate human and vehicle detections
        human_boxes = []
        vehicle_boxes = []
        
        if len(indices) > 0:
            for i in indices:
                if isinstance(i, list):  # OpenCV 4.5.x and below
                    i = i[0]
                    
                box = boxes[i]
                class_id = class_ids[i]
                class_name = self.get_class_name(class_id)
                
                if self.is_person(class_id, class_name):
                    human_boxes.append(box)
                elif self.is_vehicle(class_id, class_name):
                    vehicle_boxes.append(box)
        
        # Apply smoothing to reduce jitter
        human_boxes = self.smooth_detections(human_boxes, self.last_human_boxes, "human")
        vehicle_boxes = self.smooth_detections(vehicle_boxes, self.last_vehicle_boxes, "vehicle")
        
        # Update tracking for next frame
        self.last_human_boxes = human_boxes.copy()
        self.last_vehicle_boxes = vehicle_boxes.copy()
        
        # Count objects
        humans_count = len(human_boxes)
        vehicles_count = len(vehicle_boxes)
        
        # Draw bounding boxes on original frame
        for box in human_boxes:
            x, y, w, h = box
            color = (50, 205, 50)  # Green
            cv2.rectangle(original_frame, (x, y), (x + w, y + h), color, 2)
            label = "Person"
            cv2.putText(original_frame, label, (x, y - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        for box in vehicle_boxes:
            x, y, w, h = box
            color = (255, 165, 0)  # Orange
            cv2.rectangle(original_frame, (x, y), (x + w, y + h), color, 2)
            label = "Vehicle"
            cv2.putText(original_frame, label, (x, y - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        # Add detector info
        cv2.putText(original_frame, f"Humans: {humans_count}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 205, 50), 2)
        cv2.putText(original_frame, f"Vehicles: {vehicles_count}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 165, 0), 2)
        
        return humans_count, vehicles_count, original_frame
