import { useState } from 'react';
import './App.css';
import { ChatInterface } from './components/ChatInterface';
import type { Message } from './components/ChatInterface';
import { PipelineVisualizer } from './components/PipelineVisualizer';
import { TrainingConsole } from './components/TrainingConsole';
import { DatasetManager } from './components/DatasetManager';
import { SmsConsole } from './components/SmsConsole';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [sessionState, setSessionState] = useState<any>({
    mode: 'general',
    quiz_active: false,
    quiz_q_index: 0,
    quiz_score: 0,
    ticket_active: false,
    ticket_step: 0,
    ticket_details: {},
    game_active: false,
    game_step: 0,
    translation_lang: 'es'
  });

  // Share messages state at the App level to allow "New Chat" sidebar action
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am **Pluto AI**, your custom local AI chatbot. I operate using a pipeline architecture for data processing and custom neural network NLU. Switch domains in the sidebar or type a message to start chatting!',
      timestamp: new Date()
    }
  ]);

  const handlePipelineUpdate = (log: any, mode: string) => {
    setPipelineData(log);
    // Ensure frontend active mode matches backend state mode
    setSessionState((prev: any) => ({ ...prev, mode }));
  };

  const handleDatasetSaved = () => {
    console.log("Dataset updated on disk.");
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionState({
      mode: 'general',
      quiz_active: false,
      quiz_q_index: 0,
      quiz_score: 0,
      ticket_active: false,
      ticket_step: 0,
      ticket_details: {},
      game_active: false,
      game_step: 0,
      translation_lang: 'es'
    });
    setActiveTab('chat');
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
    
    // Switch tab to chat console automatically when changing domain
    setActiveTab('chat');

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
    
    // Clear chat or append mode switch notification
    setMessages(prev => [...prev, sysMsg]);
    
    // Trigger default greets for specific modes
    let triggerQuery = "";
    if (domain === "support") triggerQuery = "support";
    if (domain === "translation") triggerQuery = "translate text";
    if (domain === "education") triggerQuery = "education explain";
    if (domain === "entertainment") triggerQuery = "tell me a joke";
    
    if (triggerQuery) {
      // Simulate sending the message after a tiny delay
      setTimeout(() => {
        // Send request to API
        triggerApiMessage(triggerQuery, freshState);
      }, 500);
    }
  };

  const triggerApiMessage = async (textToSend: string, activeState: any) => {
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          state: activeState
        })
      });

      if (response.ok) {
        const data = await response.json();
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
        if (data.pipeline) {
          handlePipelineUpdate(data.pipeline, data.mode);
        }
      }
    } catch (err) {
      console.error("API error triggering default greet:", err);
    }
  };

  return (
    <div className="app-container">
      
      {/* Left Sidebar Panel (ChatGPT Style) */}
      <aside className="sidebar-panel">
        
        {/* Header Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingLeft: '4px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 6px var(--color-primary))' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" fill="var(--color-primary)" />
          </svg>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.05em', lineHeight: '1.2' }}>
              PLUTO AI
            </h1>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Local Neural NLP Core
            </span>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: '1px solid var(--border-light)',
            borderRadius: '24px',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-primary)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-light)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span>➕</span> New Chat
        </button>

        {/* Sidebar Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          
          {/* Section 1: Domains */}
          <div>
            <h3 style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: '8px', marginBottom: '8px', letterSpacing: '0.08em', fontWeight: 700 }}>
              AI Pipeline Domains
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { id: 'general', label: 'General Dialogue', icon: '💬', color: 'var(--color-primary)' },
                { id: 'support', label: 'Customer Support', icon: '🎟️', color: 'var(--color-rose)' },
                { id: 'translation', label: 'Translation Engine', icon: '🇪🇸', color: 'var(--color-teal)' },
                { id: 'education', label: 'Tutoring Explainer', icon: '🎒', color: 'var(--color-cyan)' },
                { id: 'entertainment', label: 'Entertainment Bot', icon: '🎭', color: 'var(--color-secondary)' }
              ].map(domain => {
                const isActive = sessionState.mode === domain.id && activeTab === 'chat';
                return (
                  <button
                    key={domain.id}
                    className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => selectDomain(domain.id)}
                    style={isActive ? { boxShadow: `inset 3px 0 0 ${domain.color}`, background: 'rgba(255,255,255,0.02)' } : {}}
                  >
                    <span>{domain.icon}</span>
                    <span style={{ fontSize: '0.85rem' }}>{domain.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Developer Cockpit */}
          <div>
            <h3 style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: '8px', marginBottom: '8px', letterSpacing: '0.08em', fontWeight: 700 }}>
              Developer Cockpit
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { id: 'pipeline', label: 'Pipeline Visualizer', icon: '🔍' },
                { id: 'training', label: 'Training Cockpit', icon: '⚡' },
                { id: 'dataset', label: 'Dataset Manager', icon: '📁' },
                { id: 'sms', label: 'SMS Auto-Reply', icon: '📱' }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span>{tab.icon}</span>
                    <span style={{ fontSize: '0.85rem' }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Sidebar Footer Info */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-light)', fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '8px', lineHeight: '1.5' }}>
          <div>Core Model: <b>NumPy MLP</b></div>
          <div>Tokenizer: <b>BoW Stemmer</b></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-green)', display: 'inline-block' }}></span>
            <span>Local Server: <b>Online</b></span>
          </div>
        </div>

      </aside>

      {/* Main Content Viewport (ChatGPT Style Chat or Dev Dashboard) */}
      <main className="main-content-panel">
        
        {activeTab === 'chat' && (
          <ChatInterface 
            onPipelineUpdate={handlePipelineUpdate} 
            sessionState={sessionState} 
            setSessionState={setSessionState}
            messages={messages}
            setMessages={setMessages}
          />
        )}
        
        {activeTab === 'pipeline' && (
          <div style={{ padding: '30px', height: '100%', overflowY: 'auto' }}>
            <PipelineVisualizer 
              pipelineData={pipelineData} 
              mode={sessionState.mode}
            />
          </div>
        )}
        
        {activeTab === 'training' && (
          <div style={{ padding: '30px', height: '100%', overflowY: 'auto' }}>
            <TrainingConsole />
          </div>
        )}

        {activeTab === 'dataset' && (
          <div style={{ padding: '30px', height: '100%', overflowY: 'auto' }}>
            <DatasetManager 
              onDatasetSaved={handleDatasetSaved} 
              switchToTab={setActiveTab}
            />
          </div>
        )}

        {activeTab === 'sms' && (
          <div style={{ padding: '30px', height: '100%', overflowY: 'auto' }}>
            <SmsConsole />
          </div>
        )}

      </main>

    </div>
  );
}

export default App;
