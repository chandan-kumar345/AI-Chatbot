# Technical Workflow: Custom NLU/NLG Pipeline Mechanics

This document provides a deep-dive technical overview of the algorithms, mathematics, state machines, and multi-threaded streams running inside the custom AI Chatbot engine.

---

## 1. NLP Processing & Vectorization Pipeline

Before text is fed into the classification model, it undergoes three sequential processing steps:

### A. Normalization (Clean Phase)
```python
text = text.lower()
text = re.sub(r"[^a-zA-Z0-9\s']", "", text)
```
- Forces all input strings to lowercase.
- Strips special punctuation marks (excluding apostrophes for contractions like *let's*).
- Strips trailing/leading spaces.

### B. Custom Stemmer (Clean/Stem Phase)
To maximize vocabulary matching efficiency, words are reduced to their root forms using a custom rules-based suffix engine:
- If word length is $\le 3$, it remains unchanged.
- Endings in `['ing', 'eed', 'ed', 'es', 's', 'ly', 'ment', 'ness', 'ful', 'able']` are evaluated.
- If a match is found, the ending is removed.
- **Double Consonant Correction:** If the root ends in identical characters (e.g., *runn* from *running* or *shipp* from *shipping*), and the character is a consonant (`bdfgklmnprst`), the duplicate is truncated (➔ *run*, *ship*).

### C. Bag-of-Words Vectorizer (Vector Phase)
The document is converted to a vector representation $X \in \mathbb{R}^V$ where $V$ is the size of the vocabulary:
$$X_i = \text{Count of word } i \text{ in text}$$
Index `0` is reserved for `<UNK>` (Out-of-Vocabulary tokens) to prevent network crashes when users input words not present in the training set.

---

## 2. Neural Net NLU Classifier (MLP Math)

The NLU engine uses a Multi-Layer Perceptron (MLP) written in pure NumPy. It consists of three fully connected layers: **Input Layer ($V$)**, **Hidden Layer ($H$)**, and **Output Classes Layer ($C$)**.

```text
[ Input Vector (X) ] ➔ [ Weights W1, Bias b1 ] ➔ [ ReLU Activation ] ➔ [ Weights W2, Bias b2 ] ➔ [ Softmax Logits ]
```

### A. Forward Propagation Math
For a batch input $X$ of shape $(m, V)$:

1. **Linear Transformation 1:**
   $$Z^{(1)} = X W^{(1)} + b^{(1)}$$
   where $W^{(1)} \in \mathbb{R}^{V \times H}$ and $b^{(1)} \in \mathbb{R}^{1 \times H}$.

2. **Rectified Linear Unit (ReLU) Activation:**
   $$A^{(1)} = \max(0, Z^{(1)})$$

3. **Linear Transformation 2:**
   $$Z^{(2)} = A^{(1)} W^{(2)} + b^{(2)}$$
   where $W^{(2)} \in \mathbb{R}^{H \times C}$ and $b^{(2)} \in \mathbb{R}^{1 \times C}$.

4. **Softmax Output Activation:**
   $$A^{(2)} = \sigma(Z^{(2)})_i = \frac{e^{Z^{(2)}_i - \max(Z^{(2)})}}{\sum_{j=1}^C e^{Z^{(2)}_j - \max(Z^{(2)})}}$$
   *(Max subtraction is performed for numerical stability, preventing float overflows)*

### B. Backpropagation & Parameter Optimization
During model training, the network updates parameters by calculating gradients using a Cross-Entropy Loss function $L$:
$$L = -\frac{1}{m} \sum_{k=1}^m \sum_{i=1}^C Y_{ki} \log(A^{(2)}_{ki} + \epsilon)$$
where $Y$ is the one-hot encoded ground-truth class, and $\epsilon = 10^{-15}$ is a smoothing factor.

Gradients are calculated via the chain rule:

1. **Output Layer Error Logits ($\delta^{(2)}$):**
   $$\delta^{(2)} = A^{(2)} - Y \quad (\text{shape: } m \times C)$$

2. **Output Weights & Bias Gradients:**
   $$\frac{\partial L}{\partial W^{(2)}} = \frac{1}{m} (A^{(1)})^T \delta^{(2)}$$
   $$\frac{\partial L}{\partial b^{(2)}} = \frac{1}{m} \sum_{\text{rows}} \delta^{(2)}$$

3. **Hidden Layer Backpropagated Error ($\delta^{(1)}$):**
   $$\delta^{(1)} = (\delta^{(2)} (W^{(2)})^T) \odot f'(Z^{(1)}) \quad (\text{shape: } m \times H)$$
   where $f'(z)$ is the derivative of ReLU:
   $$f'(z) = \begin{cases} 1 & \text{if } z > 0 \\ 0 & \text{if } z \le 0 \end{cases}$$

4. **Input Weights & Bias Gradients:**
   $$\frac{\partial L}{\partial W^{(1)}} = \frac{1}{m} X^T \delta^{(1)}$$
   $$\frac{\partial L}{\partial b^{(1)}} = \frac{1}{m} \sum_{\text{rows}} \delta^{(1)}$$

5. **Weight Updates (Gradient Descent with Learning Rate $\eta$):**
   $$W^{(1)} \leftarrow W^{(1)} - \eta \frac{\partial L}{\partial W^{(1)}}$$
   $$b^{(1)} \leftarrow b^{(1)} - \eta \frac{\partial L}{\partial b^{(1)}}$$
   $$W^{(2)} \leftarrow W^{(2)} - \eta \frac{\partial L}{\partial W^{(2)}}$$
   $$b^{(2)} \leftarrow b^{(2)} - \eta \frac{\partial L}{\partial b^{(2)}}$$

---

## 3. Dialogue State Machines (Mode Logic)

When a mode is activated, the pipeline bypasses general class matching and routes messages to category-specific wizard routines:

### A. Customer Support Wizard
- **States:** `ticket_active` (boolean), `ticket_step` (int), `ticket_details` (dict).
- **Control Flow:**
  ```text
  User triggers ticket ➔ Set ticket_step=1. Ask for Issue.
  User submits issue  ➔ Save details. Set ticket_step=2. Ask for Email.
  User submits email  ➔ Save contact. Generate TKT-xxxx ID. Close wizard (ticket_active=False).
  ```

### B. Education Quiz Wizard
- **States:** `quiz_active` (boolean), `quiz_q_index` (int), `quiz_score` (int).
- **Control Flow:**
  - Standard answer check: Compares input with `quiz_questions[q_index]['ans']`.
  - Increments score on match.
  - If `q_idx < length`, updates state and outputs next question card.
  - Else, resets `quiz_active=False` and outputs the final score results.

### C. Language Translation Engine
- Translates input strings using structured dictionaries and grammatical rules:
  - **Romance Syntax Alignment:** Identifies **[Adjective] [Noun]** structures (e.g., *"blue car"*) and swaps them to fit Romance languages (e.g., Spanish: *"coche azul"*).
  - **Spanish Gender Agreement:** Detects feminine nouns (*casa, escuela, manzana*) and alters masculine adjectives ending in `-o` to end in `-a` (e.g., *"nuevo"* ➔ *"nueva"*).

---

## 4. Multi-Threaded SSE Training Stream

To prevent training runs from blocking the Flask HTTP server threads, training is offloaded to a background thread synchronized via thread-safe queues.

```text
[ POST /api/train ] ➔ Spawn daemon Thread ➔ Loop Epochs ➔ Push metrics to Queue
                                                                 ||
[ GET /api/train/status ] ➔ Read Queue (timeout 10s) ➔ Yield SSE text/event-stream
```

1. **Trigger:** `/api/train` verifies if `is_training` is false, locks the state, flushes the queue, and spawns `run_training_thread`.
2. **Execution Callback:** During training, the background loop passes metrics (loss, accuracy, epoch) to `training_queue.put()`.
3. **Streaming Response:** The client connects to the SSE channel `/api/train/status`. The server generates a continuous `Response` block, listening to the queue via `queue.get(timeout=10.0)`. If empty, it pings a keep-alive message to avoid timeouts.
4. **Conclusion:** When the thread completes or errors out, it puts a final state flag (`complete` or `error`) into the queue, reloads the model weight binaries on the server, and releases the thread-safe lock.
