import React, { useState, useEffect, useRef } from 'react';

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  widget?: any;
}

interface ChatInterfaceProps {
  onPipelineUpdate: (log: any, mode: string) => void;
  sessionState: any;
  setSessionState: React.Dispatch<React.SetStateAction<any>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onPipelineUpdate, 
  sessionState, 
  setSessionState,
  messages,
  setMessages
}) => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Auto scroll chat to bottom
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const speakText = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    
    // Cancel active speech
    window.speechSynthesis.cancel();
    
    // Clean markdown characters from speech output
    const cleanText = text.replace(/[*#`_\-]/g, '').replace(/🎟️|❓|✅|❌|🎮|👉|🎓/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Use an English or neutral voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          state: sessionState
        })
      });

      if (!response.ok) {
        throw new Error('Server returned an error.');
      }

      const data = await response.json();
      
      // Update session state returned from backend
      if (data.session_state) {
        setSessionState(data.session_state);
      }

      const botMsg: Message = {
        id: Math.random().toString(36).substring(7),
        sender: 'bot',
        text: data.response,
        timestamp: new Date(),
        widget: data.widget
      };

      setMessages(prev => [...prev, botMsg]);
      
      // Pass pipeline details up to App.tsx for visualizer
      if (data.pipeline) {
        onPipelineUpdate(data.pipeline, data.mode);
      }

      // Trigger Text to Speech
      speakText(data.response);

    } catch (err: any) {
      const errorMsg: Message = {
        id: Math.random().toString(36).substring(7),
        sender: 'bot',
        text: '⚠️ **Connection Error**: I could not reach the NLP pipeline backend. Please ensure the Flask app server is running on `http://127.0.0.1:5000`.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const selectDomain = (domain: string) => {
    const freshState = {
      ...sessionState,
      mode: domain,
      quiz_active: false,
      ticket_active: false,
      game_active: false
    };
    setSessionState(freshState);
    
    // Append system message indicating mode switch
    const domainNames: Record<string, string> = {
      general: 'General Dialogue',
      support: 'Customer Support',
      translation: 'Language Translation',
      education: 'Education Tutoring',
      entertainment: 'Entertainment'
    };

    const sysMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: 'bot',
      text: `🔄 Switched pipeline to **${domainNames[domain]}** mode.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, sysMsg]);
    
    // Trigger default greets for specific modes
    let triggerQuery = "";
    if (domain === "support") triggerQuery = "support";
    if (domain === "translation") triggerQuery = "translate text";
    if (domain === "education") triggerQuery = "education explain";
    if (domain === "entertainment") triggerQuery = "tell me a joke";
    
    if (triggerQuery) {
      setTimeout(() => handleSendMessage(triggerQuery), 600);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // Render widget helpers
  const renderWidget = (widget: any) => {
    if (!widget) return null;

    switch (widget.type) {
      case 'translation':
        return (
          <div className="glass-panel" style={{ marginTop: '14px', padding: '16px', background: 'rgba(20, 184, 166, 0.08)', borderColor: 'rgba(20, 184, 166, 0.25)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 600, letterSpacing: '0.05em' }}>BILINGUAL ALIGNMENT</span>
              <span className="mode-badge mode-translation" style={{ fontSize: '0.65rem' }}>{widget.lang_name}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>ENGLISH INPUT</div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{widget.original}</div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '16px' }}>
                <div style={{ color: 'var(--color-teal)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>TRANSLATED</div>
                <div style={{ fontWeight: 700, color: '#fff' }}>{widget.translated}</div>
              </div>
            </div>
          </div>
        );

      case 'ticket':
        return (
          <div className="glass-panel" style={{ marginTop: '14px', padding: '16px', background: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.25)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-rose)', letterSpacing: '0.05em' }}>🎟️ SUPPORT TICKET GENERATED</span>
              <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>Status: Open</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
              <div>Ticket ID: <b style={{ color: '#fff', fontSize: '0.95rem' }}>{widget.ticket_id}</b></div>
              <div>Issue Details: <span style={{ color: 'var(--text-secondary)' }}>"{widget.summary}"</span></div>
              <div>Contact Phone: <span style={{ color: 'var(--text-secondary)' }}>{widget.contact}</span></div>
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="glass-panel" style={{ marginTop: '14px', padding: '16px', background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.25)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 600 }}>🎓 ACTIVE STUDY QUIZ</span>
              <span>Running Score: <b style={{ color: 'var(--color-green)' }}>{widget.score}</b></span>
            </div>

            {widget.status === 'ongoing' ? (
              <>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', lineHeight: '1.4' }}>
                  {widget.question}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {widget.options.map((opt: string, i: number) => {
                    const choice = String.fromCharCode(65 + i);
                    return (
                      <button
                        key={choice}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.88rem',
                          transition: 'all 0.2s',
                          fontFamily: 'var(--font-primary)'
                        }}
                        onClick={() => handleSendMessage(choice)}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-cyan)';
                          e.currentTarget.style.background = 'rgba(6, 182, 212, 0.04)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-light)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        }}
                      >
                        <b style={{ color: 'var(--color-cyan)', marginRight: '6px' }}>{choice}</b> {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: '0.95rem' }}>
                🎉 Quiz finished! Final Score: <b style={{ color: 'var(--color-cyan)', fontSize: '1.2rem' }}>{widget.score} / {widget.total}</b>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const suggestions = [
    {
      title: "Explain NLU Pipeline",
      description: "How does the custom model process input?",
      prompt: "explain chatbot pipeline",
      icon: "🎒"
    },
    {
      title: "File a Support Ticket",
      description: "Simulate generating a customer support ticket.",
      prompt: "create ticket",
      icon: "🎟️"
    },
    {
      title: "Translate a Phrase",
      description: "Convert text from English to French/Spanish.",
      prompt: "translate the red car",
      icon: "🇪🇸"
    },
    {
      title: "Tell a Joke",
      description: "Get a funny developer joke from Pluto AI.",
      prompt: "tell me a joke",
      icon: "🎭"
    }
  ];

  const isEmpty = messages.length === 0;

  return (
    <div className="chatgpt-container">
      
      {/* Speech Toggle Button at top right of chat screen */}
      <div style={{ 
        position: 'absolute', 
        top: '16px', 
        right: '20px', 
        zIndex: 5,
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        {/* Domain indicator badge */}
        <span className={`mode-badge mode-${sessionState.mode}`}>
          Domain: {sessionState.mode}
        </span>

        <button
          className="mode-badge"
          style={{
            cursor: 'pointer',
            background: ttsEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.03)',
            color: ttsEnabled ? '#86efac' : 'var(--text-secondary)',
            borderColor: ttsEnabled ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-light)',
          }}
          onClick={() => {
            const nextVal = !ttsEnabled;
            setTtsEnabled(nextVal);
            if (nextVal) {
              speakText("Voice synthesizer activated.");
            } else {
              window.speechSynthesis.cancel();
            }
          }}
        >
          {ttsEnabled ? '🔊 Speech On' : '🔇 Speech Off'}
        </button>
      </div>

      {/* Chat Messages / Welcome Container */}
      <div className="chatgpt-messages-scroller">
        {isEmpty ? (
          <div className="chat-welcome-container">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 10px var(--color-primary))' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" fill="var(--color-primary)" />
            </svg>
            <h2 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px' }}>
              Pluto AI
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '460px', lineHeight: '1.5' }}>
              A local custom NLU chatbot platform running neural network models completely in your browser and local server.
            </p>
            
            <div className="chat-welcome-grid">
              {suggestions.map((s, idx) => (
                <div 
                  key={idx} 
                  className="suggestion-card"
                  onClick={() => handleSendMessage(s.prompt)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
                    <h4>{s.title}</h4>
                  </div>
                  <p>{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="chatgpt-thread-container">
            {messages.map(msg => {
              const isBot = msg.sender === 'bot';
              return (
                <div key={msg.id} className={`message-line ${isBot ? 'bot' : 'user'}`}>
                  {/* Circular Avatar */}
                  <div className={`avatar-circle ${isBot ? 'bot' : 'user'}`}>
                    {isBot ? 'P' : 'U'}
                  </div>
                  
                  {/* Bubble content */}
                  <div className="message-bubble-text">
                    {msg.text.split('\n').map((line, idx) => {
                      // Replace **text** with bold tag
                      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                      return (
                        <div key={idx} dangerouslySetInnerHTML={{ __html: formatted }} style={{ minHeight: '1rem' }} />
                      );
                    })}

                    {msg.widget && renderWidget(msg.widget)}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="message-line bot">
                <div className="avatar-circle bot">P</div>
                <div className="message-bubble-text" style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '16px' }}>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input panel centered at the bottom */}
      <div className="chatgpt-input-area">
        <div className="chatgpt-input-wrapper">
          <input
            className="chatgpt-textarea"
            placeholder={`Message Pluto AI (Domain: ${sessionState.mode.toUpperCase()})...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
          />
          <button 
            className={`chatgpt-action-btn ${inputValue.trim() ? 'send-active' : ''}`}
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || loading}
            style={{ marginRight: '6px' }}
          >
            ➔
          </button>
        </div>
        <div className="chatgpt-input-note">
          Pluto AI Custom NLU Pipeline • All calculations processed locally.
        </div>
      </div>

    </div>
  );
};
