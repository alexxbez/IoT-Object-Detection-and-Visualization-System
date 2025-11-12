from fastapi import FastAPI
from pydantic import BaseModel

class Ultrasonic_sensor_data(BaseModel):
    sensor_1: float
    sensor_2: float
    sensor_3: float

sensor_1 = None
sensor_2 = None
sensor_3 = None

app = FastAPI()

@app.get('/')
async def home():
    return {"msg": "hello"}

@app.post('/api/ultrasonic')
async def recieve_ultrasonic_data(data: Ultrasonic_sensor_data):
    print(f"Sensor 1: {data.sensor_1}\nSensor 2: {data.sensor_2}\nSensor 3: {data.sensor_3}")
    global sensor_1
    global sensor_2
    global sensor_3
    sensor_1 = data.sensor_1
    sensor_2 = data.sensor_2
    sensor_3 = data.sensor_3

    return {"status": "data received"}

@app.get('/api/ultrasonic-get')
async def send_ultrasonic_values():
    return {"sensor_1": sensor_1, "sensor_2": sensor_2, "sensor_3": sensor_3}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
