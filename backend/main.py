import os
import time
import queue

from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    print("it worked!!!")
    return { "status": "success" }

@app.post("/api/ultrasonic-sensor/send")
async def send_ultrasonic_sensor(data: ThreeSensorReadings, device_id: int):
    ultrasonic_cache.put_nowait((data.left.distance, data.center.distance, data.right.distance))

    response = (
        supabase.table("sensor_readings")
        .insert({ "sensor_id": data.left.sensor_id, "distance": data.left.distance })
        .execute()
    )

    response = (
        supabase.table("sensor_readings")
        .insert({ "sensor_id": data.center.sensor_id, "distance": data.center.distance })
        .execute()
    )

    response = (
        supabase.table("sensor_readings")
        .insert({ "sensor_id": data.right.sensor_id, "distance": data.right.distance })
        .execute()
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
# async def send_camera(device_id: int, module_id: int, image: UploadFile = File(...)):
async def send_camera(device_id: int, module_id: int, request: Request):
    img_bytes = await request.body()
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
    print("image stored in supabase storage")

    response = (
        supabase.table("image_frames")
        .insert({
            "device_id": device_id,
            "module_id": module_id,
            "image_path": file_name
        })
        .execute()
    )
    print("image path inserted in database")
    # FIXME: THIS
    frame_id = response.data[0]["frame_id"]

    detections = await analyze_image(img_bytes)
    if not detections: return { "status": "success" }

    for label, conf, x, width in detections:
        response = (
            supabase. table("object_detections")
            .insert({
                "frame_id": frame_id,
                "object_class": label,
                "confidence": conf,
                "x": int(x),
                "width": width
            })
            .execute()
        )
        print("detections stored in database")

    return { "status": "success" }

@app.get("/api/camera/get/latest")
async def get_latest_camera(device_id: int):
    response = (
        supabase.table("image_frames")
        .select("image_path, frame_id")
        .eq("device_id", device_id)
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )

    path = response.data[0]["image_path"]
    frame_id = response.data[0]["frame_id"]
    img = (
        supabase.storage
        .from_("images")
        .get_public_url(path)
    )

    det = (
        supabase.table("object_detections")
        .select("*")
        .eq("frame_id", frame_id)
        .execute()
    )
    return { "image_url": img, "detections": det.data }

@app.get("/api/detections/get/latest")
async def get_latest_detection(device_id: int):
    response = (
        supabase.table("object_detections")
        .select("*, image_frames(device_id)")
        .eq("image_frames.device_id", device_id)
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )
    return response.data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
