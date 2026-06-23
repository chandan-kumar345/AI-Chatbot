import os
import json
import random
import numpy as np
from chatbot.tokenizer import Tokenizer
from chatbot.model import MLPClassifier, TranslationPipeline

class ChatPipeline:
    def __init__(self):
        self.tokenizer = Tokenizer()
        self.model = None
        self.translator = TranslationPipeline()
        self.intent_mapping = {}
        self.classes = []
        
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        self.weights_path = os.path.join(self.data_dir, "model_weights.json")
        self.vocab_path = os.path.join(self.data_dir, "tokenizer_vocab.json")
        self.dataset_path = os.path.join(self.data_dir, "dataset.json")
        
        self.dataset = {"intents": []}
        self.load_dataset()
        self.load_model()

    def load_dataset(self):
        if os.path.exists(self.dataset_path):
            with open(self.dataset_path, 'r') as f:
                self.dataset = json.load(f)

    def load_model(self):
        """Loads model weights and vocab tokenizer mapping."""
        if not os.path.exists(self.weights_path) or not os.path.exists(self.vocab_path):
            print("Model weights or vocab not found. Chatbot running in fallback rule-based mode.")
            return False

        try:
            with open(self.vocab_path, 'r') as f:
                meta = json.load(f)
            self.tokenizer.vocab = meta["vocab"]
            self.tokenizer.vocab_inv = {idx: token for token, idx in meta["vocab"].items()}
            self.intent_mapping = meta["intent_mapping"]
            self.classes = meta["classes"]
            
            vocab_size = len(meta["vocab"])
            num_classes = len(meta["classes"])
            
            # Recreate model structure and load weights
            self.model = MLPClassifier(input_dim=vocab_size, hidden_dim=16, output_dim=num_classes)
            self.model.load(self.weights_path)
            return True
        except Exception as e:
            print(f"Error loading model weights: {e}")
            return False

    def process(self, query, session_state=None):
        """
        Orchestrates the chatbot pipeline:
        1. NLU Inference
        2. Dialogue State Tracking (Mode Management)
        3. NLG Output Generation
        """
        if session_state is None:
            session_state = {
                "mode": "general", # general, support, translation, entertainment, education
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

        # Pipeline visual logging
        pipeline_log = {
            "raw_query": query,
            "cleaned_query": "",
            "tokens": [],
            "vocab_active": [],
            "mlp_probabilities": {},
            "predicted_tag": "fallback",
            "confidence": 0.0
        }

        # NLP Step 1: Text Cleaning & Tokenization
        cleaned = self.tokenizer.clean_text(query)
        pipeline_log["cleaned_query"] = cleaned
        tokens = self.tokenizer.tokenize(query)
        pipeline_log["tokens"] = tokens

        tag = "fallback"
        confidence = 0.0
        probabilities = {}

        # NLP Step 2: Vectorization & MLP Inference
        if self.model and len(self.tokenizer.vocab) > 0:
            bow = self.tokenizer.bag_of_words(tokens)
            # Find active vocabulary words
            for idx, val in enumerate(bow):
                if val > 0 and str(idx) in self.tokenizer.vocab_inv:
                    pipeline_log["vocab_active"].append({
                        "word": self.tokenizer.vocab_inv[str(idx)],
                        "index": idx,
                        "value": float(val)
                    })
                elif val > 0 and idx in self.tokenizer.vocab_inv:
                    pipeline_log["vocab_active"].append({
                        "word": self.tokenizer.vocab_inv[idx],
                        "index": idx,
                        "value": float(val)
                    })

            # Forward pass
            _, _, _, A2 = self.model.forward(bow.reshape(1, -1))
            probs = A2[0].tolist()
            
            # Map probabilities to classes
            for idx, p in enumerate(probs):
                class_tag = self.classes[idx]
                probabilities[class_tag] = float(p)
                
            pred_idx = np.argmax(probs)
            confidence = probs[pred_idx]
            
            # Standard threshold for NLU intent matching
            if confidence > 0.45:
                tag = self.classes[pred_idx]
                
            pipeline_log["mlp_probabilities"] = probabilities
            pipeline_log["predicted_tag"] = tag
            pipeline_log["confidence"] = confidence

        # Find corresponding intent metadata if matched
        matched_intent = None
        for intent in self.dataset["intents"]:
            if intent["tag"] == tag:
                matched_intent = intent
                break

        # Check for direct manual domain switches
        normalized_q = query.lower().strip()
        if "support" in normalized_q or "helpdesk" in normalized_q:
            session_state["mode"] = "support"
        elif "translate" in normalized_q or "translation" in normalized_q:
            session_state["mode"] = "translation"
        elif "quiz" in normalized_q or "education" in normalized_q:
            session_state["mode"] = "education"
        elif "game" in normalized_q or "joke" in normalized_q:
            session_state["mode"] = "entertainment"
        elif matched_intent and matched_intent["domain"] != "general":
            session_state["mode"] = matched_intent["domain"]

        # Reset other game/quiz states if switching modes
        if session_state["mode"] != "education":
            session_state["quiz_active"] = False
        if session_state["mode"] != "support":
            session_state["ticket_active"] = False
        if session_state["mode"] != "entertainment":
            session_state["game_active"] = False

        # --- NLG & NLG Logic ---
        response_text = ""
        widget_data = None

        # Domain A: CUSTOMER SUPPORT PIPELINE
        if session_state["mode"] == "support":
            if session_state["ticket_active"]:
                step = session_state["ticket_step"]
                if step == 1:
                    # Storing ticket summary
                    session_state["ticket_details"]["summary"] = query
                    session_state["ticket_step"] = 2
                    response_text = "Thank you. Now, please enter your Account Email or Order ID so we can locate your record."
                elif step == 2:
                    # Storing ticket contact info
                    session_state["ticket_details"]["contact"] = query
                    session_state["ticket_step"] = 3
                    ticket_id = f"TKT-{random.randint(1000, 9999)}"
                    session_state["ticket_details"]["id"] = ticket_id
                    response_text = f"Perfect! I have successfully generated a Support Ticket for you.\n\n🎟️ **Ticket ID**: {ticket_id}\n📝 **Issue**: {session_state['ticket_details']['summary']}\n📧 **Contact**: {query}\n\nOur human representative will contact you via email shortly. What else can I help you with?"
                    widget_data = {
                        "type": "ticket",
                        "status": "Created",
                        "ticket_id": ticket_id,
                        "summary": session_state['ticket_details']['summary'],
                        "contact": query
                    }
                    session_state["ticket_active"] = False
                    session_state["ticket_step"] = 0
            elif tag == "support_ticket" or "ticket" in normalized_q or "human" in normalized_q:
                session_state["ticket_active"] = True
                session_state["ticket_step"] = 1
                response_text = "I'm launching the ticket creation wizard. Please describe your support issue or complaint in a single sentence:"
            else:
                # Standard support response
                if matched_intent:
                    response_text = random.choice(matched_intent["responses"])
                else:
                    response_text = "Welcome to Customer Support. I can help you with returns, tracking packages, and raising tickets. Type 'create ticket' to log a support issue."

        # Domain B: LANGUAGE TRANSLATION PIPELINE
        elif session_state["mode"] == "translation":
            # Set translation language
            if "spanish" in normalized_q or "es" in normalized_q:
                session_state["translation_lang"] = "es"
                response_text = "Target language set to **Spanish**. Enter any sentence and I will translate it."
            elif "french" in normalized_q or "fr" in normalized_q:
                session_state["translation_lang"] = "fr"
                response_text = "Target language set to **French**. Enter any sentence and I will translate it."
            else:
                target_lang = session_state.get("translation_lang", "es")
                translated = self.translator.translate(query, target_lang=target_lang)
                lang_name = self.translator.languages.get(target_lang, target_lang)
                
                response_text = f"Here is the translation in **{lang_name}**:\n\n👉 **\"{translated}\"**"
                widget_data = {
                    "type": "translation",
                    "original": query,
                    "translated": translated,
                    "target_lang": target_lang,
                    "lang_name": lang_name
                }

        # Domain C: EDUCATION PIPELINE (Quizzes, explanation definitions)
        elif session_state["mode"] == "education":
            quiz_questions = [
                {
                    "q": "What is the CPU's primary job in a computer?",
                    "options": ["Store data permanently", "Perform calculations and execute instructions", "Render 3D graphics"],
                    "ans": "B"
                },
                {
                    "q": "Which chemical element has the symbol 'O'?",
                    "options": ["Osmium", "Oxygen", "Gold"],
                    "ans": "B"
                },
                {
                    "q": "What does NLU stand for in Artificial Intelligence?",
                    "options": ["Natural Language Understanding", "Neural Network Logic Unit", "Network Link Utility"],
                    "ans": "A"
                }
            ]

            if session_state["quiz_active"]:
                q_idx = session_state["quiz_q_index"]
                user_choice = query.strip().upper()
                
                # Check user choice validity
                if user_choice not in ["A", "B", "C"]:
                    response_text = f"Please reply with A, B, or C only. Here is the question again:\n\n❓ **{quiz_questions[q_idx]['q']}**\n" + "\n".join([f"{chr(65+i)}) {opt}" for i, opt in enumerate(quiz_questions[q_idx]['options'])])
                else:
                    correct_ans = quiz_questions[q_idx]["ans"]
                    is_correct = user_choice == correct_ans
                    if is_correct:
                        session_state["quiz_score"] += 1
                        feedback = "✅ **Correct!** Excellent job."
                    else:
                        feedback = f"❌ **Incorrect.** The correct answer was {correct_ans}: *{quiz_questions[q_idx]['options'][ord(correct_ans)-65]}*."

                    # Advance to next question
                    q_idx += 1
                    session_state["quiz_q_index"] = q_idx
                    
                    if q_idx < len(quiz_questions):
                        next_q = quiz_questions[q_idx]
                        response_text = f"{feedback}\n\n**Next Question ({q_idx + 1}/{len(quiz_questions)}):**\n\n❓ **{next_q['q']}**\n" + "\n".join([f"**{chr(65+i)})** {opt}" for i, opt in enumerate(next_q['options'])])
                        widget_data = {
                            "type": "quiz",
                            "status": "ongoing",
                            "q_index": q_idx,
                            "total": len(quiz_questions),
                            "question": next_q['q'],
                            "options": next_q['options'],
                            "score": session_state["quiz_score"]
                        }
                    else:
                        score = session_state["quiz_score"]
                        response_text = f"{feedback}\n\n🏁 **Quiz Complete!**\n\nYour final score is **{score}/{len(quiz_questions)}**! {'Excellent!' if score == len(quiz_questions) else 'Good effort! Let us study more and try again.'}"
                        widget_data = {
                            "type": "quiz",
                            "status": "completed",
                            "q_index": q_idx,
                            "total": len(quiz_questions),
                            "score": score
                        }
                        session_state["quiz_active"] = False
            elif tag == "education_quiz" or "quiz" in normalized_q:
                session_state["quiz_active"] = True
                session_state["quiz_q_index"] = 0
                session_state["quiz_score"] = 0
                first_q = quiz_questions[0]
                response_text = f"🎓 **Education Quiz Started!**\n\n**Question 1/3:**\n\n❓ **{first_q['q']}**\n" + "\n".join([f"**{chr(65+i)})** {opt}" for i, opt in enumerate(first_q['options'])])
                widget_data = {
                    "type": "quiz",
                    "status": "ongoing",
                    "q_index": 0,
                    "total": len(quiz_questions),
                    "question": first_q['q'],
                    "options": first_q['options'],
                    "score": 0
                }
            else:
                if matched_intent:
                    response_text = random.choice(matched_intent["responses"])
                else:
                    response_text = "I am ready for tutoring! You can start a quiz by saying 'start quiz' or ask me to explain topics like 'photosynthesis' or 'machine learning'."

        # Domain D: ENTERTAINMENT PIPELINE (Jokes & text adventure games)
        elif session_state["mode"] == "entertainment":
            if session_state["game_active"]:
                step = session_state["game_step"]
                if "forest" in normalized_q:
                    response_text = "🌲 You step into the dark forest. The air is cool and misty. Suddenly, a friendly wood elf greets you and awards you a magic scroll! You win!\n\nType 'play game' to play again."
                    session_state["game_active"] = False
                    session_state["game_step"] = 0
                elif "cavern" in normalized_q:
                    response_text = "🧗 You walk into the glowing cavern. Sparkling crystals line the walls, and you find a chest of gold coins! You win!\n\nType 'play game' to play again."
                    session_state["game_active"] = False
                    session_state["game_step"] = 0
                else:
                    response_text = "You must choose a direction! Type **forest** or **cavern** to make your move."
            elif tag == "entertainment_game" or "game" in normalized_q:
                session_state["game_active"] = True
                session_state["game_step"] = 1
                response_text = "🎮 **Text Adventure Started!**\n\nYou are standing at the entrance of a mysterious valley. To your left is a **dark forest** (forest), and to your right is a **glowing cavern** (cavern).\n\n*Where do you go? (type 'forest' or 'cavern')*"
            else:
                if matched_intent:
                    response_text = random.choice(matched_intent["responses"])
                else:
                    response_text = "Let's have some fun! Ask me to 'tell a joke' or 'play a game'."

        # Fallback to General Conversation
        else:
            if matched_intent:
                response_text = random.choice(matched_intent["responses"])
            else:
                response_text = "I processed your query, but could not identify a specific action class. Can you rephrase it, or specify if you want to switch to Support, Translation, Entertainment, or Education?"

        # Populate output structure
        result = {
            "response": response_text,
            "mode": session_state["mode"],
            "session_state": session_state,
            "pipeline": pipeline_log
        }
        if widget_data:
            result["widget"] = widget_data
            
        return result
