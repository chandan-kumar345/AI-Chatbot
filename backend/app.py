import os
import queue
import threading
import json
from datetime import datetime
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

from chatbot.pipeline import ChatPipeline
from chatbot.train import train_model

app = Flask(__name__)
# Enable CORS for React frontend (default port is usually 5173 for Vite)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Global states
pipeline = ChatPipeline()
training_queue = queue.Queue()
is_training = False
training_lock = threading.Lock()

# Multi-user session mapping by phone number & SMS transactional logs
phone_sessions = {}
sms_logs = []
auto_responder_active = True

@app.route('/api/chat', methods=['POST'])
def chat():
    """Receives chat queries, processes them, and returns response."""
    global pipeline
    data = request.get_json() or {}
    message = data.get("message", "")
    session_state = data.get("state", None)

    if not message:
        return jsonify({"error": "Message is required"}), 400

    try:
        result = pipeline.process(message, session_state)
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal pipeline error: {str(e)}"}), 500

@app.route('/api/dataset', methods=['GET', 'POST'])
def dataset_api():
    """GET to fetch dataset.json, POST to update it."""
    global pipeline
    dataset_path = os.path.join(os.path.dirname(__file__), "data", "dataset.json")

    if request.method == 'GET':
        if not os.path.exists(dataset_path):
            return jsonify({"intents": []})
        with open(dataset_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)

    elif request.method == 'POST':
        new_dataset = request.get_json()
        if not new_dataset or "intents" not in new_dataset:
            return jsonify({"error": "Invalid dataset schema. Must contain 'intents'."}), 400

        try:
            with open(dataset_path, 'w') as f:
                json.dump(new_dataset, f, indent=2)
            # Reload dataset in pipeline
            pipeline.load_dataset()
            return jsonify({"success": True, "message": "Dataset saved successfully."})
        except Exception as e:
            return jsonify({"error": f"Failed to save dataset: {str(e)}"}), 500

def run_training_thread(epochs, lr, hidden_dim):
    """Worker function to run model training and stream metrics to queue."""
    global is_training, pipeline
    
    def training_callback(epoch, max_epochs, loss, accuracy):
        # Push metrics to queue
        training_queue.put({
            "status": "training",
            "epoch": epoch,
            "max_epochs": max_epochs,
            "loss": loss,
            "accuracy": accuracy
        })

    try:
        train_model(epochs=epochs, lr=lr, hidden_dim=hidden_dim, callback=training_callback)
        # Reload model inside pipeline
        pipeline.load_model()
        training_queue.put({"status": "complete", "message": "Model trained and loaded successfully."})
    except Exception as e:
        training_queue.put({"status": "error", "message": f"Training failed: {str(e)}"})
    finally:
        with training_lock:
            is_training = False

@app.route('/api/train', methods=['POST'])
def start_training():
    """Triggers the training thread in the background."""
    global is_training, training_queue
    
    with training_lock:
        if is_training:
            return jsonify({"error": "Training is already in progress."}), 400
        is_training = True

    # Get configuration parameters
    data = request.get_json() or {}
    epochs = int(data.get("epochs", 150))
    lr = float(data.get("lr", 0.05))
    hidden_dim = int(data.get("hidden_dim", 16))

    # Empty the queue
    while not training_queue.empty():
        try:
            training_queue.get_nowait()
        except queue.Empty:
            break

    # Spawn thread
    t = threading.Thread(target=run_training_thread, args=(epochs, lr, hidden_dim))
    t.daemon = True
    t.start()

    return jsonify({"success": True, "message": "Training started in background."})

@app.route('/api/train/status', methods=['GET'])
def training_status():
    """SSE endpoint streaming live training metrics."""
    def event_stream():
        # Yield initial connection confirmation
        yield f"data: {json.dumps({'status': 'connected'})}\n\n"
        
        while True:
            try:
                # Block for up to 10 seconds waiting for queue items
                item = training_queue.get(timeout=10.0)
                yield f"data: {json.dumps(item)}\n\n"
                if item["status"] in ["complete", "error"]:
                    break
            except queue.Empty:
                # Send keep-alive ping
                yield f"data: {json.dumps({'status': 'ping'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
                break
                
    return Response(event_stream(), content_type='text/event-stream')

# --- SMS Webhook & Integration Endpoints ---

@app.route('/api/webhook/sms', methods=['POST'])
def twilio_sms_webhook():
    """Twilio SMS webhook endpoint. Parses incoming messages and auto-responds."""
    global pipeline, phone_sessions, sms_logs, auto_responder_active
    
    if not auto_responder_active:
        return Response("<Response></Response>", content_type='application/xml')

    # Twilio sends form data: From, Body
    phone = request.form.get("From", "").strip()
    body = request.form.get("Body", "").strip()

    # Fallback to JSON if request is simulated with JSON
    if not phone or not body:
        data = request.get_json() or {}
        phone = data.get("From", "").strip()
        body = data.get("Body", "").strip()

    if not phone or not body:
        return Response("<Response></Response>", content_type='application/xml')

    # Get or create independent state for this phone number
    if phone not in phone_sessions:
        phone_sessions[phone] = {
            "mode": "general",
            "quiz_active": False,
            "quiz_q_index": 0,
            "quiz_score": 0,
            "ticket_active": False,
            "ticket_step": 0,
            "ticket_details": {},
            "game_active": False,
            "game_step": 0,
            "translation_lang": "es"
        }
        
    session_state = phone_sessions[phone]

    try:
        # Process user message with specific phone session state
        result = pipeline.process(body, session_state)
        
        # Save the updated session state
        phone_sessions[phone] = result["session_state"]
        
        response_text = result["response"]
        
        # Log this transaction
        log_entry = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "phone": phone,
            "incoming": body,
            "outgoing": response_text,
            "intent": result["pipeline"]["predicted_tag"],
            "confidence": float(result["pipeline"]["confidence"]),
            "mode": result["mode"]
        }
        sms_logs.append(log_entry)
        if len(sms_logs) > 50:
            sms_logs.pop(0)

        # Build standard TwiML XML Response
        twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{response_text}</Message></Response>'
        return Response(twiml, content_type='application/xml')
        
    except Exception as e:
        error_twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, our internal AI pipeline encountered an error: {str(e)}</Message></Response>'
        return Response(error_twiml, content_type='application/xml')

@app.route('/api/sms/logs', methods=['GET'])
def get_sms_logs():
    """Retrieve recent SMS transactions."""
    return jsonify(sms_logs)

@app.route('/api/sms/simulate', methods=['POST'])
def simulate_sms():
    """Simulate an incoming SMS from the dashboard console."""
    global pipeline, phone_sessions, sms_logs
    
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    body = data.get("message", "").strip()

    if not phone or not body:
        return jsonify({"error": "Phone and message parameters are required."}), 400

    # Get or create independent state
    if phone not in phone_sessions:
        phone_sessions[phone] = {
            "mode": "general",
            "quiz_active": False,
            "quiz_q_index": 0,
            "quiz_score": 0,
            "ticket_active": False,
            "ticket_step": 0,
            "ticket_details": {},
            "game_active": False,
            "game_step": 0,
            "translation_lang": "es"
        }
        
    session_state = phone_sessions[phone]

    try:
        result = pipeline.process(body, session_state)
        phone_sessions[phone] = result["session_state"]
        
        response_text = result["response"]
        
        log_entry = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "phone": phone,
            "incoming": body,
            "outgoing": response_text,
            "intent": result["pipeline"]["predicted_tag"],
            "confidence": float(result["pipeline"]["confidence"]),
            "mode": result["mode"]
        }
        sms_logs.append(log_entry)
        if len(sms_logs) > 50:
            sms_logs.pop(0)

        return jsonify({
            "success": True,
            "response": response_text,
            "log": log_entry
        })
    except Exception as e:
        return jsonify({"error": f"Failed to process simulation: {str(e)}"}), 500

@app.route('/api/sms/toggle', methods=['POST'])
def toggle_sms_responder():
    """Toggle the SMS auto-responder capability."""
    global auto_responder_active
    data = request.get_json() or {}
    auto_responder_active = bool(data.get("active", True))
    return jsonify({"success": True, "active": auto_responder_active})

if __name__ == '__main__':
    # Ensure data folder exists
    os.makedirs(os.path.join(os.path.dirname(__file__), "data"), exist_ok=True)
    print("Starting Flask Chatbot backend server on port 5000...")
    app.run(host='127.0.0.1', port=5000, debug=True)
