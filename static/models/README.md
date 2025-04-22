# Face Detection Models

This directory is used to store face detection models used by Face-API.js.

When the application first loads, it will automatically download and cache the following models:
- Tiny Face Detector model
- Face Landmark model
- Face Recognition model

These models enable high-precision face detection that works better than general object detection for detecting human faces.

## Note

The models are downloaded at runtime from CDN, so you don't need to manually place files here. This folder just serves as the caching location.

## Model Details

The face detection system uses TinyFaceDetector, which is a lightweight model optimized for real-time face detection with good accuracy. It's specifically designed to detect human faces, providing better results than general-purpose object detection.

### Advantages:

1. Higher accuracy for face detection
2. Better performance on low-resolution video
3. Works at various angles and with partial occlusion
4. Improves human count accuracy in the smart helmet system
