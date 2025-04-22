# Object Detection Models

This directory is used to store pre-trained object detection models for the Smart Helmet Project.

## Model Usage

The application will look for models in this directory, but will gracefully fall back to simulated detection if they're not found.

## Adding Models

You can add any of the following pre-trained models to improve detection quality:

### Option 1: MobileNet-SSD (Recommended for lightweight usage)
Download these files and place them in this directory:
- `MobileNetSSD_deploy.prototxt.txt`
- `MobileNetSSD_deploy.caffemodel`

These can be downloaded from OpenCV's repository or various model zoos.

### Option 2: TensorFlow model
Alternatively, you can add:
- `ssd_mobilenet_v3_large_coco_2020_01_14.pbtxt`
- `frozen_inference_graph.pb`

## Notes

Even without these model files, the system will still work using a simulation approach that demonstrates the interface's functionality.
