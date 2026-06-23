import os
import queue
import threading
import json
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

if __name__ == '__main__':
    # Ensure data folder exists
    os.makedirs(os.path.join(os.path.dirname(__file__), "data"), exist_ok=True)
    print("Starting Flask Chatbot backend server on port 5000...")
    app.run(host='127.0.0.1', port=5000, debug=True)
