# Antares AI - Custom Chatbot & NLU Pipeline Cockpit

Antares AI is a custom chatbot platform built completely from scratch in Python (NumPy) and React + TypeScript. It is designed to run entirely locally without calling pre-built large language models or external APIs (such as OpenAI, Claude, or Gemini). It features an interactive glassmorphic cockpit UI where you can chat, view NLU/NLG token transitions, update training intents, and watch live training loss curves plotted in real-time.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### Setup & Execution

1. **Install Dependencies:**
   First, install both Python and Node.js packages in your terminal:
   ```powershell
   # Install frontend node modules
   npm install

   # Setup Python virtual environment and install backend packages
   python -m venv backend/.venv
   backend\.venv\Scripts\pip install flask flask-cors numpy
   ```

2. **Start the Application:**
   Open two separate terminal windows in the root folder of the project to run the backend and frontend:

   - **Terminal 1 (Backend):**
     ```powershell
     npm run start-backend
     ```
     *Runs the Flask NLP server on `http://127.0.0.1:5000`.*

   - **Terminal 2 (Frontend):**
     ```powershell
     npm run start-frontend
     ```
     *Runs the React dashboard dev server. Open `http://localhost:5173` in your browser.*

---

## 📂 Project Structure

```text
├── backend/                  # Python Flask NLP Stack
│   ├── chatbot/              # NLP & ML Modules
│   │   ├── tokenizer.py      # Custom regex cleaner, stemmer, and BoW vectorizer
│   │   ├── model.py          # Custom NumPy MLP neural net & grammar translator
│   │   ├── pipeline.py       # Orchestrator and multi-domain state tracker
│   │   └── train.py          # Training loop execution & weight serialization
│   ├── data/                 # Data Storage
│   │   ├── dataset.json      # JSON intents training database
│   │   ├── model_weights.json  # Saved MLP weights & biases
│   │   └── tokenizer_vocab.json# Vocabulary maps & tag configurations
│   ├── app.py                # Flask API server & SSE logs streamer
│   └── test_chatbot.py       # Test assertions verifying backend components
├── src/                      # Vite React Frontend
│   ├── components/           # Subcomponents
│   │   ├── ChatInterface.tsx # Dynamic dialogue list with TTS and widgets
│   │   ├── PipelineVisualizer.tsx # Step-by-step visual token & weights tracker
│   │   ├── TrainingConsole.tsx # SSE logs display & live SVG curve charting
│   │   └── DatasetManager.tsx# Full CRUD manager for training datasets
│   ├── App.css               # Override layout resets
│   ├── App.tsx               # Primary dashboard page shell
│   ├── index.css             # Glassmorphic UI tokens & dark theme
│   └── main.tsx              # React mounting root
├── index.html                # Entry HTML page
├── package.json              # NPM dependencies & build scripts
└── README.md                 # Project user documentation
```

---

## 🔄 User & Development Workflow

Here is how the data processing and control loop flows through the system during typical usage:

```text
+-----------------------+      1. Submit      +-----------------------------+
|    User Dialogue      |  ================>  |     NLU/NLG Pipeline        |
|  (Chat Console Tab)   |                     |     (backend/app.py)        |
+-----------------------+                     +-----------------------------+
            ^                                                ||
            || 6. Render Response & TTS                      || 2. Process
            ||                                               \/
+-----------------------+  5. Send Logs back  +-----------------------------+
|  Pipeline Visualizer  |  <================  |  State & Dialogue Tracking  |
|  (Intermediate Steps) |                     |  (support/quiz/translation) |
+-----------------------+                     +-----------------------------+
                                                             ||
                                                             || (Optional)
                                                             \/
+-----------------------+   3. Edit Intents   +-----------------------------+
|    Dataset Manager    |  ================>  |     data/dataset.json       |
|    (Intent Editor)    |                     +-----------------------------+
+-----------------------+                                    ||
            ||                                               || 4. Train
            ||                                               \/
            || Trigger                        +-----------------------------+
            ===============================>  |      Training Cockpit       |
                                              |   (NumPy Backpropagation)   |
                                              +-----------------------------+
```

### 1. The Interaction & Inference Loop
1. **User Input:** The user types a query in the chat console (e.g., `"start quiz"` or `"translate the big red car"`).
2. **REST request:** The frontend client sends the text along with the current session state object to `/api/chat`.
3. **NLU Processing:** The backend runs the text through the `Tokenizer` to clean, stem, and build a Bag-of-Words array, then feeds it through the custom `MLPClassifier` to categorize the intent.
4. **Dialogue Management:** The `ChatPipeline` checks if the classified intent triggers a domain mode switch (e.g., switching to `education` or `support`). If a mode state machine is already running (like an active quiz or a ticket complaint submission), the bot bypasses the classifier and routes the message to the active wizard step.
5. **NLG Response:** The response string and any relevant widget variables (like quiz score status, ticket codes, or side-by-side translation values) are returned.
6. **Frontend Updates:** The React client prints the message bubble, speaks the text aloud if Voice Synth is active, and caches the logs to populate the **Pipeline Visualizer** tab.

### 2. The Custom Training & dataset updates Loop
1. **Adding Examples:** You navigate to the **Dataset Manager** and add a new intent tag (e.g., `support_payment`) with sample patterns and bot replies.
2. **Writing to Disk:** Clicking "Save & Build" updates the shared database file `data/dataset.json` and updates the active dataset schema on the server.
3. **Training Hook:** You navigate to the **Training Cockpit**, adjust hyper-parameters (Epochs, Learning Rate, Hidden Size), and click "Trigger Model Re-Training".
4. **SSE Progress Stream:** The Flask server starts a background thread running the NumPy backpropagation loops. It feeds status metrics (epoch number, active loss, accuracy percentages) to a thread-safe queue. The `/api/train/status` Server-Sent Events (SSE) channel reads from this queue and pushes metrics live.
5. **Dynamic Charts:** The React training cockpit receives the events and updates an interactive SVG chart showing training progress and loss curves in real-time.
6. **Live Reload:** Once training finishes, the background thread overrides `data/model_weights.json` and `data/tokenizer_vocab.json`, and triggers `pipeline.load_model()` to instantly update the active chatbot's intelligence.
