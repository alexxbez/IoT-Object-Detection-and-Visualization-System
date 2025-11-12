#!/usr/bin/env python3
"""
Minimal Flask server that receives values from ESP32 with real-time updates
"""

from flask import Flask, request, jsonify, Response
import datetime
import json
import time
import queue
import os

app = Flask(__name__)

# Counter to track received requests
request_count = 0
sensor_data = 0

# Store connected clients for SSE
message_queues = []

def send_sse_update(data):
    """Send update to all connected SSE clients"""
    for q in message_queues[:]:  # Use slice copy to avoid modification during iteration
        try:
            q.put(data)
        except:
            message_queues.remove(q)

@app.route('/update', methods=["POST"])
def update():
    img_bytes = request.data
    os.makerdirs("images", 0o777, exist_ok=False)

    file_name = f"{images}" 

@app.route('/')
def home():
    return """
<!DOCTYPE html>
<html>
<head>
    <title>Sensor Server - Real Time</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .sensor-value {
            font-size: 3em;
            font-weight: bold;
            color: #2c3e50;
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background: #ecf0f1;
            border-radius: 5px;
            transition: all 0.3s ease;
        }
        .timestamp {
            color: #7f8c8d;
            text-align: center;
            font-size: 0.9em;
        }
        .status {
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            margin: 10px 0;
        }
        .connected { background: #d4edda; color: #155724; }
        .disconnected { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌡️ Real-Time Sensor Monitor</h1>
        
        <div id="status" class="status connected">
            ✅ Connected - Receiving real-time updates
        </div>
        
        <div class="sensor-value">
            <span id="sensor-value">0</span>
        </div>
        
        <div class="timestamp">
            Last updated: <span id="timestamp">-</span>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
            <small>Requests received: <span id="request-count">0</span></small>
        </div>
    </div>

    <script>
        const sensorElement = document.getElementById('sensor-value');
        const timestampElement = document.getElementById('timestamp');
        const statusElement = document.getElementById('status');
        const requestCountElement = document.getElementById('request-count');
        
        // Function to format timestamp
        function formatTimestamp(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleString();
        }
        
        // Server-Sent Events connection
        const eventSource = new EventSource('/stream');
        
        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            
            // Update sensor value with animation
            sensorElement.style.transform = 'scale(1.1)';
            sensorElement.style.color = '#e74c3c';
            sensorElement.textContent = data.value;
            
            setTimeout(() => {
                sensorElement.style.transform = 'scale(1)';
                sensorElement.style.color = '#2c3e50';
            }, 300);
            
            // Update timestamp
            timestampElement.textContent = formatTimestamp(data.timestamp);
            
            // Update connection status
            statusElement.className = 'status connected';
            statusElement.textContent = '✅ Connected - Receiving real-time updates';
        };
        
        eventSource.onopen = function() {
            statusElement.className = 'status connected';
            statusElement.textContent = '✅ Connected - Receiving real-time updates';
        };
        
        eventSource.onerror = function(event) {
            statusElement.className = 'status disconnected';
            statusElement.textContent = '❌ Disconnected - Attempting to reconnect...';
        };
        
        // Periodically update request count
        function updateRequestCount() {
            fetch('/status')
                .then(response => response.json())
                .then(data => {
                    requestCountElement.textContent = data.requests_received;
                });
        }
        
        // Update request count every 5 seconds
        setInterval(updateRequestCount, 5000);
        updateRequestCount(); // Initial call
    </script>
</body>
</html>
"""

@app.route('/stream')
def stream():
    def event_stream():
        q = queue.Queue()
        message_queues.append(q)
        try:
            # Send initial data
            yield f"data: {json.dumps({'value': sensor_data, 'timestamp': datetime.datetime.now().isoformat()})}\n\n"
            
            # Keep connection alive and send updates
            while True:
                try:
                    # Wait for new data with timeout for keep-alive
                    data = q.get(timeout=30)
                    yield f"data: {json.dumps({'value': data, 'timestamp': datetime.datetime.now().isoformat()})}\n\n"
                except queue.Empty:
                    # Send keep-alive comment
                    yield ":keepalive\n\n"
                    
        except GeneratorExit:
            # Remove client when they disconnect
            if q in message_queues:
                message_queues.remove(q)
        finally:
            # Clean up
            if q in message_queues:
                message_queues.remove(q)
    
    return Response(event_stream(), mimetype='text/event-stream')

@app.route('/send_data', methods=['POST'])
def receive_data():
    """Receive data from ESP32 and print it"""
    global request_count
    request_count += 1
    
    try:
        current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if request.is_json:
            data = request.get_json()
            received_value = data.get('value', 'No value field')
            print(f"[{current_time}] Request #{request_count}: JSON data received: {received_value}")
            
        elif request.data:
            raw_data = request.get_data(as_text=True)
            print(f"[{current_time}] Request #{request_count}: Raw data received: {raw_data}")
            received_value = raw_data
            
        else:
            received_value = "No data in request"
            print(f"[{current_time}] Request #{request_count}: Empty request received")
        
        return jsonify({
            'status': 'success',
            'message': f'Data received: {received_value}',
            'request_id': request_count,
            'timestamp': current_time
        })
        
    except Exception as e:
        print(f"[{current_time}] ERROR processing request: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/sense', methods=['POST'])
def sense():
    global sensor_data
    try:
        data = request.get_json()
        received_value = data.get('value', 'No value field')
        sensor_data = received_value
        
        print(f"Sensor data updated to: {sensor_data}")
        
        # Send real-time update to all connected clients
        send_sse_update(sensor_data)
        
        return jsonify({'status': 'success', 'value': received_value}), 200
    except Exception as e:
        print(e)
        return jsonify({'status': 'error', 'value': -1}), 500

@app.route('/status', methods=['GET'])
def status():
    """Check server status"""
    return jsonify({
        'status': 'running',
        'requests_received': request_count,
        'sensor_data': sensor_data,
        'connected_clients': len(message_queues),
        'timestamp': datetime.datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
