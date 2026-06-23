import { useState } from 'react';
import './App.css';
import { ChatInterface } from './components/ChatInterface';
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

  const handlePipelineUpdate = (log: any, mode: string) => {
    setPipelineData(log);
    // Ensure frontend active mode matches backend state mode
    setSessionState((prev: any) => ({ ...prev, mode }));
  };

  const handleDatasetSaved = () => {
    // Notify or reload if needed
    console.log("Dataset updated on disk.");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Premium Header */}
      <header 
        className="glass-panel" 
        style={{ 
          margin: '20px 20px 0 20px', 
          padding: '16px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Custom SVG Glowing Brain Logo */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 8px var(--color-primary))' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" fill="var(--color-primary)" />
          </svg>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              ANTARES AI
            </h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Custom NLP Neural Pipeline Core
            </span>
          </div>
        </div>

        {/* Global pipeline active mode display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pipeline Domain:</span>
          <span className={`mode-badge mode-${sessionState.mode}`}>
            {sessionState.mode}
          </span>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px', padding: '20px' }}>
        
        {/* Navigation Sidebar Panel (3 cols) */}
        <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: '8px', marginBottom: '8px', letterSpacing: '0.05em' }}>
            System Dashboard
          </h3>
          
          {[
            { id: 'chat', label: 'Chat Console', icon: '💬', color: 'var(--color-primary)' },
            { id: 'sms', label: 'SMS Auto-Reply', icon: '📱', color: 'var(--color-green)' },
            { id: 'pipeline', label: 'Pipeline Visualizer', icon: '🔍', color: 'var(--color-teal)' },
            { id: 'training', label: 'Training Cockpit', icon: '⚡', color: 'var(--color-secondary)' },
            { id: 'dataset', label: 'Dataset Manager', icon: '📁', color: 'var(--color-cyan)' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: isActive ? '1px solid var(--border-light)' : '1px solid transparent',
                  borderLeft: isActive ? `3px solid ${tab.color}` : '1px solid transparent',
                  borderRadius: '8px',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onClick={() => setActiveTab(tab.id)}
                onMouseOver={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#fff';
                }}
                onMouseOut={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
                <span style={{ fontSize: '0.9rem' }}>{tab.label}</span>
              </button>
            );
          })}

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '8px', lineHeight: '1.4' }}>
            <div>Core: <b>NumPy MLP</b></div>
            <div>Tokenizer: <b>BoW Stemmer</b></div>
            <div>Server Status: <span style={{ color: 'var(--color-green)' }}>● Online</span></div>
          </div>
        </div>

        {/* Viewport Dashboard Pane (9 cols) */}
        <div style={{ gridColumn: 'span 9', minHeight: '520px' }}>
          {activeTab === 'chat' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <ChatInterface 
                onPipelineUpdate={handlePipelineUpdate} 
                sessionState={sessionState} 
                setSessionState={setSessionState}
              />
            </div>
          )}
          
          {activeTab === 'pipeline' && (
            <PipelineVisualizer 
              pipelineData={pipelineData} 
              mode={sessionState.mode}
            />
          )}
          
          {activeTab === 'training' && (
            <TrainingConsole />
          )}

          {activeTab === 'dataset' && (
            <DatasetManager 
              onDatasetSaved={handleDatasetSaved} 
              switchToTab={setActiveTab}
            />
          )}

          {activeTab === 'sms' && (
            <SmsConsole />
          )}
        </div>
      </main>

      {/* Subtle Footer */}
      <footer style={{ padding: '20px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', marginTop: 'auto' }}>
        Antares NLP Engine &copy; 2026 • Designed with scalable modular pipelines. All computations done locally.
      </footer>
    </div>
  );
}

export default App;
