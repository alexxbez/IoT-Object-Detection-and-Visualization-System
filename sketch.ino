#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>

#define echoPin 2
#define trigPin 4

const char *ssid = "Tec-IoT";
const char *password = "spotless.magnetic.bridge";

const char* server_url = "http://10.25.66.209:5000/sense";

long duration, distance;

void setup(){
  Serial.begin(9600);
 
  delay(2000);

  WiFi.begin(ssid, password);
  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println();

  delay(2000);

   pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

}

void loop(){
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  duration = pulseIn(echoPin, HIGH);
  distance = duration / 58.2;
  
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  send_data_to_server(distance);
  delay(1000);
}

void send_data_to_server(double sensor_data) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    Serial.println("Sending data to server");

    http.begin(server_url);
    http.addHeader("Content-Type", "application/json");

    String json_data = "{\"status\": \"success\", \"value\": " + String(sensor_data) + " }";

    int http_response_code = http.POST(json_data);

    if (http_response_code > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(http_response_code);
      
      if (http_response_code == 200) {
        Serial.println("Data sent successfully!");
        String response = http.getString();
        Serial.println("Response: " + response);
      }
    } else {
      Serial.print("Error in HTTP request: ");
      Serial.println(http_response_code);
    }

    http.end();
  } else {
    Serial.println("WiFi not connected!");
  }
}
