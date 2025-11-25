import os
import time
import queue

from fastapi import FastAPI, UploadFile, File
from dotenv import load_dotenv
from supabase import create_client, Client

from models import ThreeSensorReadings
from yolo import analyze_image

load_dotenv()

URL: str = os.getenv("SUPABASE_URL")
KEY: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(URL, KEY)

ultrasonic_cache = queue.Queue()
# img_cache = queue.Queue()
detections_cache = queue.Queue()

app = FastAPI()

@app.get("/")
async def root():
    print("it worked!!!")
    return { "status": "success" }

@app.post("/api/ultrasonic-sensor/send")
async def send_ultrasonic_sensor(data: ThreeSensorReadings, device_id: int):
    ultrasonic_cache.put_nowait((data.left.distance, data.right.distance, data.distance.distance))

    response = (
        supabase.table("sensor_readings")
        .insert({ "sensor_id": data.left.sensor_id, "distance": data.left.distance })
    )

    response = (
        supabase.table("sensor_readings")
        .insert({ "sensor_id": data.center.sensor_id, "distance": data.center.distance })
    )

    response = (
        supabase.table("sensor_readings")
        .insert({ "sensor_id": data.right.sensor_id, "distance": data.right.distance })
    )

    return { "status": "success"}

@app.get("/api/ultrasonic-sensor/get/latest")
async def get_latest_ultrasonic_sensor(sensor_id: int):
    response = (
        supabase.table("sensor_readings")
        .select("distance")
        .eq("sensor_id", sensor_id)
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )

    print("it worked")
    return {
        "distance": response.data[0]["distance"],
    }

@app.get("/api/ultrasonic-sensor/get/instant")
async def get_instant_ultrasonic_sensor():
    (left, center, right) = ultrasonic_cache.get_nowait()
    return { "left": left, "center": center, "right": right }

@app.post("/api/camera/send")
async def send_camera(device_id: int, module_id: int, image: UploadFile = File(...)):
    img_bytes = await image.read()
    # img_cache.put_nowait(img_bytes)
    file_name: str = f"nonannotated/{time.time()}.jpg"
    response = (
        supabase.storage.from_("images")
        .upload(
            file=img_bytes,
            path=file_name,
            file_options={ "content_type": "image/jpeg" }
        )
    )

    response = (
        supabase.table("image_frame")
        .insert({
            "device_id": device_id,
            "module_id": module_id,
            "image_path": file_name
        })
    )
    # FIXME: THIS
    frame_id = response.data[0]["frame_id"]

    detections = analyze_image(img_bytes)

    for label, conf, x in detections:
        response = (
            supabase. table("object_detections")
            .insert({
                "frame_id": frame_id,
                "object_class": label,
                "confidence": conf,
                "x": x
            })
        )

    return { "status": "success" }

@app.get("/api/camera/get/latest")
async def get_latest_camera(device_id: int):
    response = (
        supabase.table("image_frame")
        .select("image_path")
        .eq("device_id", device_id)
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )

    path = response.data[0]["image_path"]
    return { "image_path": path }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
