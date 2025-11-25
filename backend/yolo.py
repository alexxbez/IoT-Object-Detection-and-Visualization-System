import numpy as np
import cv2
from ultralytics import YOLO

model = YOLO("yolov8n.pt")   # lightweight YOLOv8 model

def prepare_image(img_bytes: bytes) -> np.ndarray:
    # Decode to OpenCV image (BGR)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img

def analyze_image(img_bytes: bytes):
    img = prepare_image(img_bytes)

    # Run YOLOv8 detection
    res = model.predict(img, imgsz=640, conf=0.25, verbose=False)[0]

    # Extract useful data
    valid_detections = [0, 1, 2, 3, 5, 7]  # person, bicycle, car, motorcycle, bus, truck
    detections = []
    names = res.names
    if res.boxes is not None:
        for b in res.boxes:
            x1, y1, x2, y2 = b.xyxy[0].tolist()
            conf = float(b.conf[0])
            cls_id = int(b.cls[0])
            label = names[cls_id]
            x_center = (x1 + x2) / 2.0

            if cls_id in valid_detections:
                detections.append((label, conf, x_center))

    return detections

# ## Change section for data handling
# def output_to_console():
#     # Print detections to console
#     print("\nNew frame received:")
#     for label, conf, x in detections:
#         print(f"{label}  conf={conf:.2f}  x={x:.1f}") # object name, confidence, x-center
#
#     # Create and save annotated image
#     annotated = res.plot()  # draws boxes on a copy
#
#     # Store in image folder
#     os.makedirs("images", exist_ok=True)
#     out_path = f"images/det_{int(time.time())}.jpg"
#     cv2.imwrite(out_path, annotated)
#     print("Annotated image saved to", out_path)
