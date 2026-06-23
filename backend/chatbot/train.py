import os
import json
import numpy as np
from chatbot.tokenizer import Tokenizer
from chatbot.model import MLPClassifier

def train_model(epochs=200, lr=0.1, hidden_dim=16, callback=None):
    """
    Loads dataset.json, fits the tokenizer, prepares vectors,
    trains the MLPClassifier, and saves weights and vocab mapping.
    Calls 'callback' each epoch with training details.
    """
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    dataset_path = os.path.join(data_dir, "dataset.json")
    weights_path = os.path.join(data_dir, "model_weights.json")
    vocab_path = os.path.join(data_dir, "tokenizer_vocab.json")

    # Load dataset
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset file not found at {dataset_path}")
        
    with open(dataset_path, 'r') as f:
        data = json.load(f)

    # Collect patterns and build tag indices
    patterns = []
    tags = []
    intent_mapping = {} # tag string to index
    
    for intent in data["intents"]:
        tag = intent["tag"]
        if tag not in intent_mapping:
            intent_mapping[tag] = len(intent_mapping)
            
        for pattern in intent["patterns"]:
            patterns.append(pattern)
            tags.append(tag)

    num_classes = len(intent_mapping)
    
    # Initialize and fit tokenizer
    tokenizer = Tokenizer()
    tokenizer.fit(patterns)
    vocab_size = tokenizer.get_vocab_size()

    # Create training matrices
    X = []
    Y = []
    
    for i, pattern in enumerate(patterns):
        tokens = tokenizer.tokenize(pattern)
        bow = tokenizer.bag_of_words(tokens)
        X.append(bow)
        
        # One-hot encode tag
        one_hot = np.zeros(num_classes, dtype=np.float32)
        one_hot[intent_mapping[tags[i]]] = 1.0
        Y.append(one_hot)

    X = np.array(X)
    Y = np.array(Y)

    # Instantiate MLP Classifier
    model = MLPClassifier(input_dim=vocab_size, hidden_dim=hidden_dim, output_dim=num_classes, learning_rate=lr)

    # Training Loop
    for epoch in range(1, epochs + 1):
        # Full batch gradient descent (small dataset, very fast)
        loss = model.train_step(X, Y)
        
        # Calculate accuracy on training set
        predictions = model.predict(X)
        targets = np.argmax(Y, axis=1)
        accuracy = float(np.sum(predictions == targets) / len(targets))

        # Yield metrics if callback is provided
        if callback:
            callback(epoch, epochs, float(loss), accuracy)

    # Save trained weights
    model.save(weights_path)

    # Save tokenizer vocabulary and tag mapping
    meta_data = {
        "vocab": tokenizer.vocab,
        "intent_mapping": intent_mapping,
        "classes": list(intent_mapping.keys())
    }
    with open(vocab_path, 'w') as f:
        json.dump(meta_data, f)

    print("Training finished successfully. Saved weights and vocabulary metadata.")
    return True
