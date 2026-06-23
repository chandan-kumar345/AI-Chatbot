import React, { useState, useEffect, useRef } from 'react';

interface MetricPoint {
  epoch: number;
  loss: number;
  accuracy: number;
}

export const TrainingConsole: React.FC = () => {
  const [epochs, setEpochs] = useState(200);
  const [learningRate, setLearningRate] = useState(0.05);
  const [hiddenDim, setHiddenDim] = useState(16);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [currentMetrics, setCurrentMetrics] = useState<{
    epoch: number;
    loss: number;
    accuracy: number;
  } | null>(null);
  
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Auto scroll terminal logs to bottom
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  useEffect(() => {
    // Cleanup event source on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startTraining = async () => {
    if (training) return;
    
    setTraining(true);
    setProgress(0);
    setHistory([]);
    setCurrentMetrics(null);
    setTerminalLogs(['[SYSTEM] Initializing training pipeline...', `[SYSTEM] Dimensions: Vocab size -> Hidden [${hiddenDim}] -> Output classes`]);
    
    try {
      const response = await fetch('http://127.0.0.1:5000/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epochs: epochs,
          lr: learningRate,
          hidden_dim: hiddenDim
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start training. Server returned error.');
      }
      
      const res = await response.json();
      if (!res.success) {
        throw new Error(res.error || 'Server error.');
      }

      setTerminalLogs(prev => [...prev, '[SYSTEM] Connection established. Opening SSE stream...']);

      // Setup Server-Sent Events
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource('http://127.0.0.1:5000/api/train/status');
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.status === 'connected') {
          setTerminalLogs(prev => [...prev, '[SYSTEM] Active training thread connected.']);
        } else if (data.status === 'training') {
          const pt: MetricPoint = {
            epoch: data.epoch,
            loss: data.loss,
            accuracy: data.accuracy
          };
          
          setHistory(prev => [...prev, pt]);
          setCurrentMetrics(pt);
          setProgress(Math.round((data.epoch / data.max_epochs) * 100));
          
          // Log periodically to not flood terminal
          if (data.epoch === 1 || data.epoch % 10 === 0 || data.epoch === data.max_epochs) {
            setTerminalLogs(prev => [
              ...prev, 
              `[EPOCH ${data.epoch}/${data.max_epochs}] Loss: ${data.loss.toFixed(4)} | Accuracy: ${(data.accuracy * 100).toFixed(2)}%`
            ]);
          }
        } else if (data.status === 'complete') {
          setTerminalLogs(prev => [
            ...prev,
            '-------------------------------------------------------',
            `[SUCCESS] ${data.message}`,
            '[SYSTEM] Pipeline weights reloaded. Chatbot model updated!'
          ]);
          setTraining(false);
          eventSource.close();
        } else if (data.status === 'error') {
          setTerminalLogs(prev => [...prev, `[ERROR] ${data.message}`]);
          setTraining(false);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setTerminalLogs(prev => [...prev, '[ERROR] Event stream disconnected unexpectedly. Check server logs.']);
        setTraining(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      };

    } catch (err: any) {
      setTerminalLogs(prev => [...prev, `[ERROR] ${err.message || 'Network exception'}`]);
      setTraining(false);
    }
  };

  // Render SVG Paths for charts
  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 25;
  
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getSvgCoordinates = (points: MetricPoint[]) => {
    if (points.length === 0) return { lossPath: '', accPath: '' };
    
    const maxEpochs = epochs;
    // Find max loss to scale correctly
    const losses = points.map(p => p.loss);
    const maxLoss = Math.max(...losses, 1.0);
    
    let lossPath = '';
    let accPath = '';

    points.forEach((pt, idx) => {
      // Map epoch index to X
      const pctX = pt.epoch / maxEpochs;
      const x = paddingLeft + pctX * chartW;
      
      // Map loss to Y
      const pctLoss = pt.loss / maxLoss;
      const lossY = paddingTop + (1.0 - pctLoss) * chartH;
      
      // Map accuracy to Y (accuracy is already 0.0 - 1.0)
      const accY = paddingTop + (1.0 - pt.accuracy) * chartH;

      if (idx === 0) {
        lossPath = `M ${x} ${lossY}`;
        accPath = `M ${x} ${accY}`;
      } else {
        lossPath += ` L ${x} ${lossY}`;
        accPath += ` L ${x} ${accY}`;
      }
    });

    return { lossPath, accPath };
  };

  const { lossPath, accPath } = getSvgCoordinates(history);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      {/* Configuration Header */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 className="glow-text-purple" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
          Model Training Hyperparameters
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Training Epochs ({epochs})</label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={epochs}
              onChange={(e) => setEpochs(Number(e.target.value))}
              disabled={training}
              style={{ accentColor: 'var(--color-secondary)' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Learning Rate ({learningRate.toFixed(3)})</label>
            <input
              type="range"
              min="0.005"
              max="0.5"
              step="0.005"
              value={learningRate}
              onChange={(e) => setLearningRate(Number(e.target.value))}
              disabled={training}
              style={{ accentColor: 'var(--color-secondary)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Hidden Layer Size ({hiddenDim} nodes)</label>
            <input
              type="range"
              min="8"
              max="64"
              step="4"
              value={hiddenDim}
              onChange={(e) => setHiddenDim(Number(e.target.value))}
              disabled={training}
              style={{ accentColor: 'var(--color-secondary)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button 
            className="btn-premium" 
            style={{ 
              background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))',
              boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)'
            }}
            onClick={startTraining}
            disabled={training}
          >
            {training ? '⏳ Training Pipeline Active...' : '⚡ Trigger Model Re-Training'}
          </button>
        </div>
      </div>

      {/* Progress & Live Graphs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Terminal Logs Console */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Training Pipeline Logs</span>
            {training && <span className="mode-badge mode-education" style={{ animation: 'pulse 1.5s infinite' }}>training</span>}
          </div>
          
          <div 
            ref={logContainerRef}
            style={{ 
              background: 'rgba(5, 5, 10, 0.75)', 
              borderRadius: '8px', 
              padding: '12px', 
              flex: 1, 
              overflowY: 'auto',
              fontFamily: 'Consolas, monospace',
              fontSize: '0.8rem',
              color: 'var(--color-teal)'
            }}
          >
            {terminalLogs.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>Console idle. Trigger model training to see execution steps.</span>
            ) : (
              terminalLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live SVG Graph Dashboard */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '320px', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Loss & Accuracy Curves</span>
            {currentMetrics && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-rose)' }}>Loss: <b>{currentMetrics.loss.toFixed(4)}</b></span>
                <span style={{ color: 'var(--color-green)' }}>Acc: <b>{(currentMetrics.accuracy * 100).toFixed(1)}%</b></span>
              </div>
            )}
          </div>

          {/* SVG Canvas */}
          <div style={{ flex: 1, background: 'rgba(5, 5, 10, 0.4)', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {history.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data coordinates generated yet.</span>
            ) : (
              <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ padding: '8px' }}>
                {/* Horizontal Guide Lines */}
                <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                <line x1={paddingLeft} y1={paddingTop + chartH/2} x2={width - paddingRight} y2={paddingTop + chartH/2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                <line x1={paddingLeft} y1={paddingTop + chartH} x2={width - paddingRight} y2={paddingTop + chartH} stroke="rgba(255,255,255,0.1)" />

                {/* Y Axis labels */}
                <text x={paddingLeft - 8} y={paddingTop + 4} fill="var(--text-muted)" fontSize="8" textAnchor="end">Max</text>
                <text x={paddingLeft - 8} y={paddingTop + chartH/2 + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">0.5</text>
                <text x={paddingLeft - 8} y={paddingTop + chartH + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">0.0</text>

                {/* X Axis labels */}
                <text x={paddingLeft} y={height - 5} fill="var(--text-muted)" fontSize="8" textAnchor="start">Epoch 1</text>
                <text x={paddingLeft + chartW/2} y={height - 5} fill="var(--text-muted)" fontSize="8" textAnchor="middle">Epoch {Math.round(epochs / 2)}</text>
                <text x={width - paddingRight} y={height - 5} fill="var(--text-muted)" fontSize="8" textAnchor="end">Epoch {epochs}</text>

                {/* Chart Paths */}
                {lossPath && (
                  <path 
                    d={lossPath} 
                    fill="none" 
                    stroke="var(--color-rose)" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(244, 63, 94, 0.4))' }}
                  />
                )}
                {accPath && (
                  <path 
                    d={accPath} 
                    fill="none" 
                    stroke="var(--color-green)" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.4))' }}
                  />
                )}
              </svg>
            )}
          </div>

          {/* Progress bar container */}
          {training && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>Epoch Processing progress</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${progress}%`, 
                    background: 'linear-gradient(90deg, var(--color-rose), var(--color-green))',
                    transition: 'width 0.2s ease-out'
                  }} 
                />
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.75rem', marginTop: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '12px', height: '3px', background: 'var(--color-rose)', borderRadius: '2px', display: 'inline-block' }} />
              Loss Value
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '12px', height: '3px', background: 'var(--color-green)', borderRadius: '2px', display: 'inline-block' }} />
              Validation Accuracy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
