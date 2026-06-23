import unittest
import numpy as np
import sys
import os

sys.path.append(os.path.dirname(__file__))

from chatbot.tokenizer import Tokenizer
from chatbot.model import MLPClassifier, TranslationPipeline
from chatbot.pipeline import ChatPipeline

class TestChatbotPipeline(unittest.TestCase):
    def setUp(self):
        self.tokenizer = Tokenizer()
        self.translator = TranslationPipeline()

    def test_tokenizer_clean_and_stem(self):
        text = "Hello! I am running and testing shipping packages."
        cleaned = self.tokenizer.clean_text(text)
        self.assertEqual(cleaned, "hello i am running and testing shipping packages")
        
        # Stemming checks
        self.assertEqual(self.tokenizer.stem("running"), "run")
        self.assertEqual(self.tokenizer.stem("shipping"), "ship")
        self.assertEqual(self.tokenizer.stem("packages"), "packag") # plural stripping

        tokens = self.tokenizer.tokenize(text)
        # Verify stop words are excluded ('i', 'am', 'and')
        self.assertNotIn("i", tokens)
        self.assertNotIn("am", tokens)
        self.assertNotIn("and", tokens)
        self.assertIn("run", tokens)
        self.assertIn("ship", tokens)

    def test_tokenizer_bag_of_words(self):
        patterns = ["hello friend", "ship packages"]
        self.tokenizer.fit(patterns)
        
        bow = self.tokenizer.bag_of_words(["hello", "packages"])
        # Vocabulary size should be 5: <UNK> + hello + friend + ship + packag
        self.assertEqual(len(bow), len(self.tokenizer.vocab))
        self.assertEqual(bow[self.tokenizer.vocab["hello"]], 1.0)
        self.assertEqual(bow[self.tokenizer.vocab["packag"]], 1.0)
        self.assertEqual(bow[self.tokenizer.vocab["friend"]], 0.0)

    def test_mlp_classifier(self):
        # 4 inputs, 3 hidden nodes, 2 outputs
        model = MLPClassifier(input_dim=4, hidden_dim=3, output_dim=2, learning_rate=0.1)
        
        X = np.array([[1, 0, 1, 0]])
        Y = np.array([[1, 0]]) # class 0 is active
        
        # Run forward pass
        Z1, A1, Z2, A2 = model.forward(X)
        self.assertEqual(A2.shape, (1, 2))
        self.assertAlmostEqual(np.sum(A2), 1.0) # probabilities sum to 1.0
        
        # Run train step
        loss1 = model.train_step(X, Y)
        loss2 = model.train_step(X, Y)
        # Loss should decrease or adjust
        self.assertTrue(loss2 <= loss1 or np.abs(loss2 - loss1) < 0.1)

    def test_translator_pipeline(self):
        # Translate simple greeting
        trans_greeting = self.translator.translate("hello friend", target_lang="es")
        self.assertEqual(trans_greeting.lower(), "hola amigo")
        
        # Translate with adjective-noun swap: "blue dog" -> Spanish "perro azul"
        trans_swap = self.translator.translate("the blue dog", target_lang="es")
        self.assertIn("perro azul", trans_swap.lower())

        # French test: "hello" -> "bonjour"
        trans_fr = self.translator.translate("hello", target_lang="fr")
        self.assertEqual(trans_fr.lower(), "bonjour")

    def test_chat_pipeline(self):
        pipeline = ChatPipeline()
        # Test basic fallbacks/state changes without weights (runs rule/general logic gracefully)
        res = pipeline.process("help support")
        self.assertEqual(res["mode"], "support")
        
        res_trans = pipeline.process("translate to spanish")
        self.assertEqual(res_trans["mode"], "translation")
        
        # Test state reset
        self.assertEqual(res_trans["session_state"]["ticket_active"], False)

    def test_flask_webhook(self):
        from app import app
        client = app.test_client()
        
        # Test SMS Webhook with simulated Twilio POST payload
        response = client.post('/api/webhook/sms', data={
            "From": "+15559999",
            "Body": "translate to spanish"
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'application/xml')
        self.assertIn(b"<Response>", response.data)
        self.assertIn(b"<Message>", response.data)
        
        # Test SMS logs retrieval
        logs_resp = client.get('/api/sms/logs')
        self.assertEqual(logs_resp.status_code, 200)
        logs_data = logs_resp.get_json()
        self.assertTrue(len(logs_data) > 0)
        self.assertEqual(logs_data[0]["phone"], "+15559999")

if __name__ == '__main__':
    unittest.main()
