import React, { useState, useEffect, useRef } from 'react';

interface Message {
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
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onPipelineUpdate, sessionState, setSessionState }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am your custom AI chatbot. I operate using a pipeline architecture for data processing and custom neural network NLU. Switch domains below or type a message to start chatting!',
      timestamp: new Date()
    }
  ]);
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
    if (e.key === 'Enter') {
      handleSendMessage(inputValue);
    }
  };

  // Render widget helpers
  const renderWidget = (widget: any) => {
    if (!widget) return null;

    switch (widget.type) {
      case 'translation':
        return (
          <div className="glass-panel" style={{ marginTop: '12px', padding: '12px', background: 'rgba(20, 184, 166, 0.08)', borderColor: 'rgba(20, 184, 166, 0.25)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>BILINGUAL ALIGNMENT</span>
              <span className="mode-badge mode-translation">{widget.lang_name}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>ENGLISH INPUT</div>
                <div style={{ fontWeight: 500 }}>{widget.original}</div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '12px' }}>
                <div style={{ color: 'var(--color-teal)', fontSize: '0.75rem', fontWeight: 600 }}>TRANSLATED</div>
                <div style={{ fontWeight: 700, color: '#fff' }}>{widget.translated}</div>
              </div>
            </div>
          </div>
        );

      case 'ticket':
        return (
          <div className="glass-panel" style={{ marginTop: '12px', padding: '12px', background: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.25)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '8px', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-rose)' }}>🎟️ SUPPORT TICKET GENERATED</span>
              <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>Status: Open</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              <div>Ticket Number: <b style={{ color: '#fff' }}>{widget.ticket_id}</b></div>
              <div>Issue Details: <span style={{ color: 'var(--text-secondary)' }}>"{widget.summary}"</span></div>
              <div>Contact Log: <span style={{ color: 'var(--text-secondary)' }}>{widget.contact}</span></div>
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="glass-panel" style={{ marginTop: '12px', padding: '12px', background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.25)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>🎓 ACTIVE STUDY QUIZ</span>
              <span>Running Score: <b style={{ color: 'var(--color-green)' }}>{widget.score}</b></span>
            </div>

            {widget.status === 'ongoing' ? (
              <>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                  {widget.question}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {widget.options.map((opt: string, i: number) => {
                    const choice = String.fromCharCode(65 + i);
                    return (
                      <button
                        key={choice}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => handleSendMessage(choice)}
                        onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-cyan)')}
                        onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                      >
                        <b>{choice})</b> {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '0.9rem' }}>
                🎉 Quiz finished! Final Score: <b style={{ color: 'var(--color-cyan)', fontSize: '1.1rem' }}>{widget.score} / {widget.total}</b>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
      
      {/* Category selector */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', flexWrap: 'wrap' }}>
        {[
          { id: 'general', name: 'General', badge: 'mode-general' },
          { id: 'support', name: 'Support', badge: 'mode-support' },
          { id: 'translation', name: 'Translation', badge: 'mode-translation' },
          { id: 'education', name: 'Education', badge: 'mode-education' },
          { id: 'entertainment', name: 'Entertainment', badge: 'mode-entertainment' }
        ].map(cat => (
          <button
            key={cat.id}
            className={`mode-badge ${cat.badge}`}
            style={{
              cursor: 'pointer',
              opacity: sessionState.mode === cat.id ? 1 : 0.45,
              transform: sessionState.mode === cat.id ? 'scale(1.05)' : 'none',
              transition: 'all 0.2s ease',
              padding: '6px 12px'
            }}
            onClick={() => selectDomain(cat.id)}
          >
            {cat.name}
          </button>
        ))}

        {/* Text to Speech Toggle */}
        <button
          className="mode-badge"
          style={{
            marginLeft: 'auto',
            cursor: 'pointer',
            background: ttsEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
            color: ttsEnabled ? '#86efac' : 'var(--text-muted)',
            border: ttsEnabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px'
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
          🔊 Speech {ttsEnabled ? 'On' : 'Off'}
        </button>
      </div>

      {/* Chat Messages */}
      <div 
        className="glass-panel" 
        style={{ 
          height: '460px', 
          padding: '20px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          background: 'rgba(10, 15, 30, 0.3)'
        }}
      >
        {messages.map(msg => {
          const isBot = msg.sender === 'bot';
          return (
            <div 
              key={msg.id} 
              className="animate-message"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: isBot ? 'flex-start' : 'flex-end',
                maxWidth: '80%'
              }}
            >
              <div 
                style={{
                  background: isBot ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  border: isBot ? '1px solid var(--border-light)' : 'none',
                  borderRadius: isBot ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '0.92rem',
                  lineHeight: '1.45',
                  wordBreak: 'break-word',
                  boxShadow: isBot ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.25)'
                }}
              >
                {/* Parse basic markdown like bold text */}
                {msg.text.split('\n').map((line, idx) => {
                  // Replace **text** with bold tag
                  const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  return (
                    <div key={idx} dangerouslySetInnerHTML={{ __html: formatted }} style={{ minHeight: '1rem' }} />
                  );
                })}

                {msg.widget && renderWidget(msg.widget)}
              </div>
              <span 
                style={{ 
                  fontSize: '0.7rem', 
                  color: 'var(--text-muted)', 
                  marginTop: '4px',
                  alignSelf: isBot ? 'flex-start' : 'flex-end',
                  padding: '0 4px'
                }}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {loading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', padding: '10px 16px', borderRadius: '16px 16px 16px 4px' }}>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          className="input-premium"
          style={{ flex: 1 }}
          type="text"
          placeholder={`Message AI pipeline (Active domain: ${sessionState.mode.toUpperCase()})...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading}
        />
        <button 
          className="btn-premium" 
          onClick={() => handleSendMessage(inputValue)}
          disabled={!inputValue.trim() || loading}
        >
          Send ➔
        </button>
      </div>

    </div>
  );
};
