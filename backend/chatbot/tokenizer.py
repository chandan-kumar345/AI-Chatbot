import re
import numpy as np

class Tokenizer:
    def __init__(self):
        self.vocab = {}
        self.vocab_inv = {}
        self.stop_words = {
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
            'to', 'of', 'for', 'and', 'or', 'but', 'in', 'on', 'at', 'by', 'with',
            'this', 'that', 'these', 'those', 'it', 'its', 'i', 'me', 'my', 'you', 'he',
            'she', 'we', 'they', 'them', 'their'
        }

    def clean_text(self, text):
        """Lowercase, remove special characters, and strip whitespace."""
        if not text:
            return ""
        text = text.lower()
        # Remove punctuation but keep letters, numbers, and basic contractions
        text = re.sub(r"[^a-zA-Z0-9\s']", "", text)
        return text.strip()

    def stem(self, word):
        """A simple custom stemmer to reduce words to their base form."""
        word = word.lower()
        if len(word) <= 3:
            return word
        
        # Strip common plural/tense suffixes
        suffixes = [
            ('ing', 3), ('eed', 1), ('ed', 2), ('es', 2), ('s', 1),
            ('ly', 2), ('ment', 4), ('ness', 4), ('ful', 3), ('able', 4)
        ]
        
        for suffix, length in suffixes:
            if word.endswith(suffix):
                # Ensure the root word is at least 2 characters
                root = word[:-length]
                if len(root) >= 2:
                    # Handle double consonant endings: e.g. "running" -> "runn" -> "run"
                    if len(root) >= 3 and root[-1] == root[-2] and root[-1] in 'bdfgklmnprst':
                        root = root[:-1]
                    return root
                break
        return word

    def tokenize(self, text):
        """Clean, split, and stem text into a list of tokens."""
        cleaned = self.clean_text(text)
        words = cleaned.split()
        tokens = [self.stem(w) for w in words if w not in self.stop_words]
        return tokens

    def fit(self, corpus):
        """Build vocabulary from a list of sentence strings."""
        unique_tokens = set()
        for sentence in corpus:
            tokens = self.tokenize(sentence)
            unique_tokens.update(tokens)
        
        # Sort tokens for deterministic mapping
        sorted_tokens = sorted(list(unique_tokens))
        
        # Reserve index 0 for Out-Of-Vocabulary / Unknown words
        self.vocab = {token: idx + 1 for idx, token in enumerate(sorted_tokens)}
        self.vocab["<UNK>"] = 0
        self.vocab_inv = {idx: token for token, idx in self.vocab.items()}

    def bag_of_words(self, tokenized_words):
        """Generate a one-hot (or frequency counts) representation based on the vocabulary."""
        vocab_size = len(self.vocab)
        vector = np.zeros(vocab_size, dtype=np.float32)
        for word in tokenized_words:
            stemmed = self.stem(word)
            if stemmed in self.vocab:
                vector[self.vocab[stemmed]] += 1.0
            else:
                vector[0] += 1.0  # Increment UNK count
        return vector

    def get_vocab_size(self):
        return len(self.vocab)
