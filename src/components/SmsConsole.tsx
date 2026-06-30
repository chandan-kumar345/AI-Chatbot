import React, { useState, useEffect, useRef } from 'react';

interface SmsLog {
  timestamp: string;
  phone: string;
  incoming: string;
  outgoing: string;
  intent: string;
  confidence: number;
  mode: string;
}

interface SimulatedThreadMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export const SmsConsole: React.FC = () => {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [activeNumber, setActiveNumber] = useState('+1 (555) 0199');
  const [typedMessage, setTypedMessage] = useState('');
  const [autoResponder, setAutoResponder] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone thread state
  const [thread, setThread] = useState<SimulatedThreadMessage[]>([
    {
      id: 'init',
      sender: 'bot',
      text: 'Pluto AI Auto-Responder active. Try text keywords like "start quiz", "help support" or "translate hello"',
      time: '12:00 PM'
    }
  ]);

  const phoneScreenEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    phoneScreenEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread, loading]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/sms/logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.reverse()); // latest logs first
      }
    } catch (err) {
      console.error('Error fetching SMS logs:', err);
    }
  };

  const toggleResponder = async () => {
    const nextVal = !autoResponder;
    setAutoResponder(nextVal);
    try {
      await fetch('http://127.0.0.1:5000/api/sms/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextVal })
      });
    } catch (err) {
      console.error('Error toggling responder:', err);
    }
  };

  const simulateIncomingSms = async () => {
    if (!typedMessage.trim() || loading) return;

    setError(null);
    const userMsgText = typedMessage;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to smartphone thread
    const userMsg: SimulatedThreadMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text: userMsgText,
      time: timeNow
    };

    setThread(prev => [...prev, userMsg]);
    setTypedMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/sms/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activeNumber,
          message: userMsgText
        })
      });

      if (!response.ok) {
        throw new Error('Simulation endpoint failed.');
      }

      const res = await response.json();
      if (res.success) {
        // Add bot reply to smartphone thread
        const botMsg: SimulatedThreadMessage = {
          id: Math.random().toString(36).substring(7),
          sender: 'bot',
          text: res.response,
          time: timeNow
        };
        setThread(prev => [...prev, botMsg]);
        fetchLogs(); // refresh transaction log list
      } else {
        throw new Error(res.error || 'Server rejected simulation');
      }

    } catch (err: any) {
      setError(err.message || 'Error occurred during simulation.');
      setThread(prev => [
        ...prev,
        {
          id: 'error-msg',
          sender: 'bot',
          text: '⚠️ SMS Delivery Failed. Make sure Flask is running on port 5000.',
          time: timeNow
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Header and Toggle controls */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="glow-text-indigo" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            AI Auto-Responder Console (SMS / WhatsApp)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Allow external messaging numbers to query your pipeline. Supports multi-session memory logic.
          </p>
        </div>
        
        {/* Auto Responder Status Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', color: autoResponder ? 'var(--color-green)' : 'var(--text-muted)', fontWeight: 600 }}>
            {autoResponder ? '● Webhook Active' : '○ Webhook Suspended'}
          </span>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: autoResponder ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
              color: autoResponder ? '#86efac' : 'var(--text-muted)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: autoResponder ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-light)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={toggleResponder}
          >
            {autoResponder ? 'Deactivate Auto-Response' : 'Activate Auto-Response'}
          </button>
        </div>
      </div>

      {/* Main split dashboard pane */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* SMS Phone Simulator Chassis */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', alignSelf: 'flex-start' }}>
            📱 Smartphone Simulator Channel
          </div>

          {/* Smartphone mockup */}
          <div 
            style={{
              width: '320px',
              height: '520px',
              background: '#080b11',
              borderRadius: '40px',
              border: '10px solid #1e293b',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Phone Notch/Speaker bar */}
            <div style={{ width: '120px', height: '20px', background: '#1e293b', position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', borderRadius: '0 0 12px 12px', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: '30px', height: '4px', background: '#080b11', borderRadius: '2px' }}></div>
            </div>

            {/* Phone screen status bar */}
            <div style={{ height: '38px', padding: '14px 20px 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(15, 23, 42, 0.4)' }}>
              <span>9:41 AM</span>
              <div style={{ display: 'flex', gap: '4px' }}>📶 🔋</div>
            </div>

            {/* Message header */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                AI
              </div>
              <div>
                <input
                  type="text"
                  value={activeNumber}
                  onChange={(e) => setActiveNumber(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, outline: 'none', width: '140px' }}
                  title="Click to change phone number"
                  placeholder="Set Phone Number"
                />
                <div style={{ fontSize: '0.65rem', color: 'var(--color-green)' }}>online responder active</div>
              </div>
            </div>

            {/* Chat message bubbles list inside screen */}
            <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0a0d14' }}>
              {thread.map(msg => {
                const isBot = msg.sender === 'bot';
                return (
                  <div 
                    key={msg.id} 
                    style={{
                      alignSelf: isBot ? 'flex-start' : 'flex-end',
                      maxWidth: '85%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isBot ? 'flex-start' : 'flex-end'
                    }}
                  >
                    <div 
                      style={{
                        background: isBot ? '#1e293b' : 'var(--color-primary)',
                        color: '#fff',
                        borderRadius: isBot ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                        padding: '8px 12px',
                        fontSize: '0.78rem',
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                      }}
                    >
                      {msg.text.split('\n').map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '2px' }}>{msg.time}</span>
                  </div>
                );
              })}
              
              {loading && (
                <div style={{ alignSelf: 'flex-start', background: '#1e293b', padding: '8px 12px', borderRadius: '12px 12px 12px 2px', display: 'flex', gap: '3px' }}>
                  <div className="typing-dot" style={{ width: '4px', height: '4px' }}></div>
                  <div className="typing-dot" style={{ width: '4px', height: '4px', animationDelay: '-0.16s' }}></div>
                  <div className="typing-dot" style={{ width: '4px', height: '4px', animationDelay: '-0.32s' }}></div>
                </div>
              )}
              <div ref={phoneScreenEndRef} />
            </div>

            {/* Smartphone input area */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Text Message..."
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && simulateIncomingSms()}
                disabled={loading}
                style={{
                  flex: 1,
                  background: '#0a0d14',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  color: '#fff',
                  outline: 'none'
                }}
              />
              <button
                onClick={simulateIncomingSms}
                disabled={!typedMessage.trim() || loading}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
                }}
              >
                ➔
              </button>
            </div>
            
            {/* Phone Home Bar indicators */}
            <div style={{ height: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
              <div style={{ width: '90px', height: '4px', background: '#475569', borderRadius: '2px' }}></div>
            </div>
          </div>
        </div>

        {/* Integration Instructions & Guides */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
            🔌 Connect Real Phone Number via Twilio
          </h3>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            The Flask backend server exposes a standard HTTP POST Webhook that parses incoming SMS requests. You can direct actual SMS messages to it for free using `ngrok` tunnels.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
            <div>
              <b style={{ color: 'var(--color-teal)' }}>Step 1: Start Backend server</b>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Make sure your python server is running on local port 5000.</p>
            </div>

            <div>
              <b style={{ color: 'var(--color-teal)' }}>Step 2: Download & Launch ngrok Tunnels</b>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Expose the port using ngrok so external APIs can request it:</p>
              <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-primary)', marginTop: '4px' }}>
                ngrok http 5000
              </pre>
            </div>

            <div>
              <b style={{ color: 'var(--color-teal)' }}>Step 3: Set Webhook in Twilio Console</b>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                Go to your Twilio Phone Number settings under <b>Messaging ➔ A Message Comes In</b>, set the format to <b>HTTP POST</b>, and paste your ngrok URL with the path:
              </p>
              <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-primary)', marginTop: '4px' }}>
                https://&lt;your-subdomain&gt;.ngrok.app/api/webhook/sms
              </pre>
            </div>

            <div>
              <b style={{ color: 'var(--color-teal)' }}>Step 4: Test real SMS!</b>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                Text your Twilio phone number from your mobile device. The AI will reply, and the transaction details will update in the transaction logs below!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SMS Transaction Logs */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>SMS Webhook Transaction Logs</h3>
          <button className="btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={fetchLogs}>
            🔄 Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {logs.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No SMS webhook activities logged. Send a message in the phone simulator to generate logs.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                  <th style={{ padding: '10px' }}>Phone Number</th>
                  <th style={{ padding: '10px' }}>Incoming Query</th>
                  <th style={{ padding: '10px' }}>AI Outgoing SMS Reply</th>
                  <th style={{ padding: '10px' }}>Predicted Intent</th>
                  <th style={{ padding: '10px' }}>Domain</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{log.timestamp}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{log.phone}</td>
                    <td style={{ padding: '10px', fontStyle: 'italic' }}>"{log.incoming}"</td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{log.outgoing}</td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                      <span className="mode-badge mode-general" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                        {log.intent} ({(log.confidence * 100).toFixed(0)}%)
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span className={`mode-badge mode-${log.mode}`} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                        {log.mode}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
    </div>
  );
};
