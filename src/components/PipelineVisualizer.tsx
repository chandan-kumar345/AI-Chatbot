import React from 'react';

interface ActiveWord {
  word: string;
  index: number;
  value: number;
}

interface PipelineLog {
  raw_query: string;
  cleaned_query: string;
  tokens: string[];
  vocab_active: ActiveWord[];
  mlp_probabilities: Record<string, number>;
  predicted_tag: string;
  confidence: number;
}

interface PipelineVisualizerProps {
  pipelineData: PipelineLog | null;
  mode: string;
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ pipelineData, mode }) => {
  if (!pipelineData) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
        <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '8px' }}>Pipeline Visualizer Idle</h3>
        <p style={{ maxWidth: '460px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.5' }}>
          No message has been processed in this session yet. Head over to the **Chat Dashboard**, select a domain, type a message, and return here to inspect how your custom AI processes the data!
        </p>
      </div>
    );
  }

  const sortedIntents = Object.entries(pipelineData.mlp_probabilities || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // top 5

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 className="glow-text-teal" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-teal)' }}>
          NLP & NLG Execution Pipeline
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Inspect step-by-step vector conversions, neural network activations, and dialog state tracker logs.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        
        {/* Step 1 & 2: Text Pre-processing */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#000' }}>1</span>
            <h4 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Text Cleaning, Stop-words filtering, & Stemming</h4>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(5, 5, 10, 0.4)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>RAW QUERY INPUT</div>
              <div style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text-primary)' }}>"{pipelineData.raw_query}"</div>
            </div>
            
            <div style={{ background: 'rgba(5, 5, 10, 0.4)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>CLEANED TEXT (NOISE REMOVED)</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--color-teal)', fontFamily: 'monospace' }}>"{pipelineData.cleaned_query}"</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>TOKENIZED & STEMMED WORDS:</div>
            {pipelineData.tokens.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No valid tokens (all words filtered as stop-words)</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {pipelineData.tokens.map((token, index) => (
                  <span key={index} className="mode-badge mode-translation" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    {token}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Vectorization */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#000' }}>2</span>
            <h4 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Feature Vectorization (Bag-of-Words Matrix)</h4>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            The tokens are compared against the built vocabulary mapping. Mapped words activate elements in the input vector array (value set to 1.0).
          </p>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>ACTIVE VOCABULARY MATCHES:</div>
            {pipelineData.vocab_active.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No vocabulary match. Using index 0 (Out-Of-Vocabulary / Unknown token).
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {pipelineData.vocab_active.map((item, index) => (
                  <div key={index} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{item.word}</span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-teal)' }}>Idx: {item.index}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sparse vector visualization */}
          <div style={{ background: 'rgba(5, 5, 10, 0.4)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>SPARSE VECTOR PREVIEW</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', maxHeight: '100px', overflowY: 'auto', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              {Array.from({ length: 40 }).map((_, idx) => {
                const isActive = pipelineData.vocab_active.some(item => item.index === idx);
                return (
                  <span 
                    key={idx} 
                    style={{ 
                      fontSize: '0.7rem', 
                      fontFamily: 'monospace', 
                      padding: '2px 4px', 
                      borderRadius: '2px',
                      background: isActive ? 'rgba(20, 184, 166, 0.25)' : 'rgba(255,255,255,0.02)',
                      color: isActive ? 'var(--color-teal)' : 'var(--text-muted)',
                      border: isActive ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid transparent'
                    }}
                  >
                    {isActive ? '1' : '0'}
                  </span>
                );
              })}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '4px' }}>... ({pipelineData.vocab_active.length} active nodes)</span>
            </div>
          </div>
        </div>

        {/* Step 4: Multi-Layer Perceptron (MLP) Neural Network Propagation */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#000' }}>3</span>
            <h4 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Custom NumPy Neural Net Inference (MLP Classifier)</h4>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            The vector feeds forward into our Multi-Layer Perceptron network weights (Input Vector ➔ Hidden Layer with ReLU activation ➔ Softmax Output logits).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Neural Net Layer Schema */}
            <div style={{ background: 'rgba(5, 5, 10, 0.4)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>MODEL ACTIVATIONS</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '280px', position: 'relative' }}>
                {/* Input Layer Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 2 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>INPUT</span>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: pipelineData.vocab_active.length > 0 ? 'var(--color-teal)' : 'var(--text-muted)', boxShadow: pipelineData.vocab_active.length > 0 ? 'var(--glow-teal)' : 'none' }} />
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                </div>

                {/* Hidden Layer Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 2 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>HIDDEN (16)</span>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--color-primary)', boxShadow: 'var(--glow-indigo)' }} />
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--color-primary)', boxShadow: 'var(--glow-indigo)' }} />
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--color-primary)', boxShadow: 'var(--glow-indigo)' }} />
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--color-primary)', boxShadow: 'var(--glow-indigo)' }} />
                </div>

                {/* Output Layer Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 2 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>OUTPUT</span>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: pipelineData.confidence > 0.45 ? 'var(--color-secondary)' : 'rgba(255,255,255,0.05)', boxShadow: pipelineData.confidence > 0.45 ? 'var(--glow-purple)' : 'none' }} />
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                </div>

                {/* Simulated connecting lines */}
                <svg style={{ position: 'absolute', top: 15, left: 0, width: '100%', height: 'calc(100% - 15px)', pointerEvents: 'none', zIndex: 1 }}>
                  <line x1="10%" y1="10%" x2="50%" y2="10%" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
                  <line x1="10%" y1="10%" x2="50%" y2="35%" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
                  <line x1="50%" y1="10%" x2="90%" y2="10%" stroke="rgba(168,85,247,0.2)" strokeWidth="1" />
                  <line x1="50%" y1="35%" x2="90%" y2="10%" stroke="rgba(168,85,247,0.2)" strokeWidth="1" />
                </svg>
              </div>
            </div>

            {/* Softmax probabilities output bar chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>TOP INTENT SOFTMAX PROBABILITIES</div>
              
              {sortedIntents.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                  Model weights not loaded. Classifier bypassed.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sortedIntents.map(([tag, prob]) => {
                    const isWinner = tag === pipelineData.predicted_tag;
                    return (
                      <div key={tag} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: isWinner ? 700 : 500, color: isWinner ? '#fff' : 'var(--text-secondary)' }}>
                            {tag} {isWinner && '👑'}
                          </span>
                          <span style={{ fontFamily: 'monospace', color: isWinner ? 'var(--color-teal)' : 'var(--text-muted)' }}>
                            {(prob * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${prob * 100}%`, 
                              background: isWinner ? 'linear-gradient(90deg, var(--color-teal), var(--color-primary))' : 'rgba(255,255,255,0.1)',
                              borderRadius: '3px'
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 5: NLG & State tracker */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#000' }}>4</span>
            <h4 style={{ fontWeight: 600, fontSize: '1.05rem' }}>Dialogue State Tracking & Natural Language Generation (NLG)</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Dialog state tracker logs */}
            <div style={{ background: 'rgba(5, 5, 10, 0.4)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DIALOG STATE VARIABLES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                <div>⚙️ Active Pipeline Mode: <span style={{ color: 'var(--color-primary)' }}>{mode.toUpperCase()}</span></div>
                <div>🏷️ Detected Intent: <span style={{ color: 'var(--color-secondary)' }}>{pipelineData.predicted_tag}</span></div>
                <div>🎯 Intent Confidence: <span style={{ color: 'var(--color-teal)' }}>{pipelineData.confidence.toFixed(4)}</span></div>
              </div>
            </div>

            {/* NLG logic explanation */}
            <div style={{ background: 'rgba(5, 5, 10, 0.4)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', justifySelf: 'stretch' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>NLG STRATEGY</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {mode === 'support' && 'Runs Customer Support state machine. Evaluates ticket progress steps, processes ticket IDs, or picks templates.'}
                {mode === 'translation' && 'Runs Translation parser. Translates English words using grammar rules (adjective agreement, syntax positions) to target languages.'}
                {mode === 'education' && 'Runs Quiz state tracker. Validates answers (A, B, C), tracks running score count, and selects next quiz array item.'}
                {mode === 'entertainment' && 'Runs Text Adventure game states or returns clean entertainment joke snippets from intents database.'}
                {mode === 'general' && 'Retrieves a random message from responses associated with the classified intent.'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
