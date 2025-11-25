from pydantic import BaseModel

class SensorReadings(BaseModel):
    sensor_id: int
    distance: float

class ThreeSensorReadings(BaseModel):
    left: SensorReadings
    center: SensorReadings
    right: SensorReadings

class ImageData(BaseModel):
    device_id: int
    module_id: int