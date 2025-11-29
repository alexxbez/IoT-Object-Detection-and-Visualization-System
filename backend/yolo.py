import numpy as np
import cv2
from ultralytics import YOLO

model = YOLO("yolov8n.pt")   # lightweight YOLOv8 model

def prepare_image(img_bytes: bytes) -> np.ndarray:
    # Decode to OpenCV image (BGR)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img

async def analyze_image(img_bytes: bytes):
    img = prepare_image(img_bytes)

    # Run YOLOv8 detection
    res = model.predict(img, imgsz=640, conf=0.25, verbose=False)[0]

    # Allowed classes by COCO id
    valid_detections = {0, 1, 2, 3, 5, 7}  # person, bicycle, car, motorcycle, bus, truck
    objectWidth = {
        "person": 20,
        "bicycle": 10,
        "car": 60,
        "motorcycle": 10,
        "bus": 60,
        "truck": 60
    }

    detections = []
    names = res.names
    keep_indices = []  # indices of boxes that pass filters

    if res.boxes is not None:
        for i, b in enumerate(res.boxes):
            x1, y1, x2, y2 = b.xyxy[0].tolist()
            conf = float(b.conf[0])
            cls_id = int(b.cls[0])
            label = names[cls_id]
            x_center = (x1 + x2) / 2.0
            width = x2 - x1

            # Filter by class and by minimum width
            if cls_id in valid_detections and width > objectWidth.get(label, 0):
                detections.append((label, conf, x_center, width))
                keep_indices.append(i)

    # Apply filtering to the results used for plotting
    if res.boxes is not None:
        if keep_indices:
            res.boxes = res.boxes[keep_indices]
        else:
            # No boxes kept, create an empty slice
            res.boxes = res.boxes[:0]

    return detections

def get_three_greatest(detections):
    left = list(filter(lambda detection: 0 <= detection[2] <= 99, detections))
    left = max(left, key=lambda x: x[3])

    center = list(filter(lambda detection: 100 <= detection[2] <= 199, detections))
    center = max(center, key=lambda x: x[3])

    right = list(filter(lambda detection: 200 <= detection[2] <= 300, detections))
    right = max(right, key=lambda x: x[3])

    return [left, center, left]
