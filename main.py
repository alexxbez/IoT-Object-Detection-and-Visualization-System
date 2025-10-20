#!/usr/bin/env python3
"""
Flask server for parking sensor with real-time updates
"""

from flask import Flask, request, jsonify, Response, render_template_string
import datetime
import json
import time
import queue

app = Flask(__name__)

# Store sensor data
sensor_data = 0
request_count = 0

# Store connected clients for SSE
message_queues = []

def send_sse_update(data):
    """Send update to all connected SSE clients"""
    for q in message_queues[:]:
        try:
            q.put(data)
        except:
            message_queues.remove(q)

@app.route('/')
def home():
    # Serve your HTML file directly
    with open('index.html', 'r') as f:
        html_content = f.read()
    
    # Replace the static initialization with dynamic data
    html_content = html_content.replace(
        'updateDisplay(150);', 
        f'updateDisplay({sensor_data});'
    )
    
    # Add the SSE connection script
    sse_script = """
    <script>
        // Server-Sent Events connection for real-time updates
        const eventSource = new EventSource('/stream');
        
        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            updateFromSensor(data.value);
        };
        
        eventSource.onerror = function(event) {
            console.log('SSE connection error:', event);
        };
    </script>
    """
    
    # Insert the SSE script before closing body tag
    html_content = html_content.replace('</body>', sse_script + '</body>')
    
    return html_content

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

@app.route('/sense', methods=['POST'])
def sense():
    global sensor_data
    try:
        data = request.get_json()
        received_value = data.get('value', 0)
        sensor_data = received_value
        
        print(f"Parking sensor data updated to: {sensor_data}cm")
        
        # Send real-time update to all connected clients
        send_sse_update(sensor_data)
        
        return jsonify({'status': 'success', 'value': received_value}), 200
    except Exception as e:
        print(f"Error in /sense: {e}")
        return jsonify({'status': 'error', 'value': -1}), 500

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
