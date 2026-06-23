import numpy as np
import json
import os

class MLPClassifier:
    def __init__(self, input_dim, hidden_dim, output_dim, learning_rate=0.01):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.lr = learning_rate
        
        # Xavier-like Weight Initialization
        self.W1 = np.random.randn(input_dim, hidden_dim) * np.sqrt(2.0 / input_dim)
        self.b1 = np.zeros((1, hidden_dim))
        self.W2 = np.random.randn(hidden_dim, output_dim) * np.sqrt(2.0 / hidden_dim)
        self.b2 = np.zeros((1, output_dim))

    def relu(self, Z):
        return np.maximum(0, Z)

    def relu_derivative(self, A):
        return (A > 0).astype(np.float32)

    def softmax(self, Z):
        # Subtract max for numerical stability (prevents overflow)
        exp_Z = np.exp(Z - np.max(Z, axis=1, keepdims=True))
        return exp_Z / np.sum(exp_Z, axis=1, keepdims=True)

    def forward(self, X):
        """Forward pass. Returns (Z1, A1, Z2, A2)."""
        if len(X.shape) == 1:
            X = X.reshape(1, -1)
        Z1 = np.dot(X, self.W1) + self.b1
        A1 = self.relu(Z1)
        Z2 = np.dot(A1, self.W2) + self.b2
        A2 = self.softmax(Z2)
        return Z1, A1, Z2, A2

    def train_step(self, X, Y_onehot):
        """Runs a single forward and backward pass, returns loss."""
        if len(X.shape) == 1:
            X = X.reshape(1, -1)
        if len(Y_onehot.shape) == 1:
            Y_onehot = Y_onehot.reshape(1, -1)
            
        m = X.shape[0]
        
        # Forward pass
        Z1, A1, Z2, A2 = self.forward(X)
        
        # Calculate loss (cross-entropy with epsilon to avoid log(0))
        loss = -np.sum(Y_onehot * np.log(A2 + 1e-15)) / m
        
        # Backward pass
        dZ2 = (A2 - Y_onehot) / m # (m, output_dim)
        dW2 = np.dot(A1.T, dZ2) # (hidden_dim, output_dim)
        db2 = np.sum(dZ2, axis=0, keepdims=True) # (1, output_dim)
        
        dA1 = np.dot(dZ2, self.W2.T) # (m, hidden_dim)
        dZ1 = dA1 * self.relu_derivative(A1) # (m, hidden_dim)
        dW1 = np.dot(X.T, dZ1) # (input_dim, hidden_dim)
        db1 = np.sum(dZ1, axis=0, keepdims=True) # (1, hidden_dim)
        
        # Gradient descent weights update
        self.W1 -= self.lr * dW1
        self.b1 -= self.lr * db1
        self.W2 -= self.lr * dW2
        self.b2 -= self.lr * db2
        
        return loss

    def predict(self, X):
        """Predict the index of the class with highest probability."""
        _, _, _, A2 = self.forward(X)
        return np.argmax(A2, axis=1)

    def save(self, filepath):
        """Save weights and biases to a JSON file."""
        data = {
            "W1": self.W1.tolist(),
            "b1": self.b1.tolist(),
            "W2": self.W2.tolist(),
            "b2": self.b2.tolist(),
            "dims": [self.input_dim, self.hidden_dim, self.output_dim]
        }
        with open(filepath, 'w') as f:
            json.dump(data, f)

    def load(self, filepath):
        """Load weights and biases from JSON file."""
        if not os.path.exists(filepath):
            return False
        with open(filepath, 'r') as f:
            data = json.load(f)
        self.W1 = np.array(data["W1"])
        self.b1 = np.array(data["b1"])
        self.W2 = np.array(data["W2"])
        self.b2 = np.array(data["b2"])
        self.input_dim, self.hidden_dim, self.output_dim = data["dims"]
        return True


class TranslationPipeline:
    """
    A rules-driven translation engine with grammatical structures (noun-adjective swaps,
    conjugation mapping, and phrase replacements) to perform natural translations.
    """
    def __init__(self):
        # English to Target Language dictionaries
        self.dictionary = {
            "es": {  # Spanish
                "hello": "hola", "hi": "hola", "bye": "adiós", "goodbye": "adiós",
                "morning": "mañana", "night": "noche", "day": "día",
                "thank": "agradecer", "thanks": "gracias", "welcome": "bienvenido",
                "yes": "sí", "no": "no", "please": "por favor",
                "friend": "amigo", "family": "familia", "love": "amor",
                "house": "casa", "car": "coche", "dog": "perro", "cat": "gato",
                "water": "agua", "food": "comida", "apple": "manzana", "bread": "pan",
                "school": "escuela", "teacher": "profesor", "student": "estudiante",
                "book": "libro", "computer": "ordenador",
                "red": "rojo", "blue": "azul", "green": "verde", "yellow": "amarillo", "black": "negro", "white": "blanco",
                "big": "grande", "small": "pequeño", "beautiful": "hermoso", "happy": "feliz", "sad": "triste",
                "good": "bueno", "bad": "malo", "new": "nuevo", "old": "viejo",
                "i": "yo", "you": "tú", "he": "él", "she": "ella", "we": "nosotros", "they": "ellos",
                "my": "mi", "your": "tu", "his": "su", "her": "su", "our": "nuestro", "their": "su",
                "am": "soy", "is": "es", "are": "somos", "have": "tengo", "like": "gusta", "want": "quiero"
            },
            "fr": {  # French
                "hello": "bonjour", "hi": "salut", "bye": "au revoir", "goodbye": "au revoir",
                "morning": "matin", "night": "nuit", "day": "jour",
                "thank": "remercier", "thanks": "merci", "welcome": "bienvenue",
                "yes": "oui", "no": "non", "please": "s'il vous plaît",
                "friend": "ami", "family": "famille", "love": "amour",
                "house": "maison", "car": "voiture", "dog": "chien", "cat": "chat",
                "water": "eau", "food": "nourriture", "apple": "pomme", "bread": "pain",
                "school": "école", "teacher": "professeur", "student": "étudiant",
                "book": "livre", "computer": "ordinateur",
                "red": "rouge", "blue": "bleu", "green": "vert", "yellow": "jaune", "black": "noir", "white": "blanc",
                "big": "grand", "small": "petit", "beautiful": "beau", "happy": "heureux", "sad": "triste",
                "good": "bon", "bad": "mauvais", "new": "nouveau", "old": "vieux",
                "i": "je", "you": "tu", "he": "il", "she": "elle", "we": "nous", "they": "ils",
                "my": "mon", "your": "ton", "his": "son", "her": "son", "our": "notre", "their": "leur",
                "am": "suis", "is": "est", "are": "sommes", "have": "ai", "like": "aime", "want": "veux"
            }
        }
        
        # English to Target Language phrase dictionary for common idioms/expressions
        self.phrase_dictionary = {
            "es": {
                "how are you": "cómo estás",
                "what is your name": "cómo te llamas",
                "my name is": "me llamo",
                "good morning": "buenos días",
                "good night": "buenas noches",
                "i love you": "te amo",
                "how much does it cost": "cuánto cuesta",
                "where is the bathroom": "dónde está el baño",
                "i want a": "quiero un",
                "i like the": "me gusta el"
            },
            "fr": {
                "how are you": "comment ça va",
                "what is your name": "comment tu t'appelles",
                "my name is": "je m'appelle",
                "good morning": "bonjour",
                "good night": "bonne nuit",
                "i love you": "je t'aime",
                "how much does it cost": "combien ça coûte",
                "where is the bathroom": "où sont les toilettes",
                "i want a": "je veux un",
                "i like the": "j'aime le"
            }
        }

        # Language metadata
        self.languages = {
            "es": "Spanish",
            "fr": "French"
        }

    def clean_query(self, text):
        return text.lower().strip().replace("?", "").replace("!", "").replace(".", "").replace(",", "")

    def translate(self, text, target_lang="es"):
        """Translates English text to target language using phrase parsing and grammar rules."""
        if target_lang not in self.dictionary:
            return f"Language '{target_lang}' is not supported yet."

        cleaned = self.clean_query(text)
        
        # 1. Try phrase level matching first
        phrases = self.phrase_dictionary[target_lang]
        for phrase, translation in phrases.items():
            if phrase in cleaned:
                # Simple replacement of matched sub-phrases
                cleaned = cleaned.replace(phrase, translation)

        # 2. Tokenize remaining words
        words = cleaned.split()
        translated_words = []
        
        lang_dict = self.dictionary[target_lang]
        adjectives = {"red", "blue", "green", "yellow", "black", "white", "big", "small", "beautiful", "new", "old", "good", "bad"}
        nouns = {"house", "car", "dog", "cat", "water", "food", "apple", "bread", "school", "teacher", "student", "book", "computer", "friend", "family"}

        i = 0
        while i < len(words):
            word = words[i]
            
            # Check for Adjective + Noun pattern for Romance languages (Spanish, French swap them: "blue car" -> "car blue")
            if i < len(words) - 1:
                next_word = words[i+1]
                if word in adjectives and next_word in nouns:
                    # Translate swapped order
                    trans_noun = lang_dict.get(next_word, next_word)
                    trans_adj = lang_dict.get(word, word)
                    
                    # Agreement rules for Spanish (adjective ending agreement)
                    if target_lang == "es":
                        # Feminine nouns in Spanish
                        feminine_nouns = {"house": "casa", "car": "coche", "apple": "manzana", "school": "escuela", "family": "familia", "food": "comida"}
                        if next_word in feminine_nouns:
                            if trans_adj.endswith("o"):
                                trans_adj = trans_adj[:-1] + "a"
                            elif trans_adj == "nuevo":
                                trans_adj = "nueva"
                            elif trans_adj == "hermoso":
                                trans_adj = "hermosa"
                            elif trans_adj == "pequeño":
                                trans_adj = "pequeña"
                    
                    translated_words.append(trans_noun)
                    translated_words.append(trans_adj)
                    i += 2
                    continue

            # Standard word translation
            translated_words.append(lang_dict.get(word, word))
            i += 1

        # Re-join translated words
        output = " ".join(translated_words)
        
        # Capitalize first letter
        if output:
            output = output[0].upper() + output[1:]
        return output
