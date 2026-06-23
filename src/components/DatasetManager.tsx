import React, { useState, useEffect } from 'react';

interface Intent {
  tag: string;
  domain: string;
  patterns: string[];
  responses: string[];
}

interface DatasetManagerProps {
  onDatasetSaved: () => void;
  switchToTab: (tab: string) => void;
}

export const DatasetManager: React.FC<DatasetManagerProps> = ({ onDatasetSaved, switchToTab }) => {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIntentIndex, setActiveIntentIndex] = useState<number | null>(null);
  
  // Add Intent Form State
  const [newTag, setNewTag] = useState('');
  const [newDomain, setNewDomain] = useState('general');
  const [newPatterns, setNewPatterns] = useState('');
  const [newResponses, setNewResponses] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchDataset();
  }, []);

  const fetchDataset = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/dataset');
      if (!response.ok) {
        throw new Error('Failed to load dataset from server.');
      }
      const data = await response.json();
      setIntents(data.intents || []);
    } catch (err: any) {
      setError(err.message || 'Could not connect to Flask backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedIntents: Intent[]) => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intents: updatedIntents }),
      });
      if (!response.ok) {
        throw new Error('Failed to save dataset.');
      }
      const res = await response.json();
      if (res.success) {
        setSaveSuccess(true);
        setIntents(updatedIntents);
        onDatasetSaved();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(res.error || 'Server rejected changes.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIntent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim() || !newPatterns.trim() || !newResponses.trim()) {
      alert('Please fill out all fields.');
      return;
    }

    const patternList = newPatterns
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const responseList = newResponses
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const newIntent: Intent = {
      tag: newTag.trim().toLowerCase().replace(/\s+/g, '_'),
      domain: newDomain,
      patterns: patternList,
      responses: responseList,
    };

    // Check if tag already exists
    if (intents.some((intent) => intent.tag === newIntent.tag)) {
      alert(`Intent with tag "${newIntent.tag}" already exists.`);
      return;
    }

    const updated = [...intents, newIntent];
    handleSave(updated);

    // Reset Form
    setNewTag('');
    setNewPatterns('');
    setNewResponses('');
    setIsAdding(false);
  };

  const handleDeleteIntent = (indexToDelete: number, tag: string) => {
    if (!confirm(`Are you sure you want to delete the "${tag}" intent?`)) {
      return;
    }
    const updated = intents.filter((_, idx) => idx !== indexToDelete);
    handleSave(updated);
    if (activeIntentIndex === indexToDelete) {
      setActiveIntentIndex(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="glow-text-indigo" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            Intent Dataset Manager
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Modify patterns and responses, and train the custom MLP neural network with the new dataset.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Close Panel' : '＋ Add Intent'}
          </button>
          <button className="btn-premium" onClick={() => switchToTab('training')}>
            ⚡ Train Model
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#fda4af', display: 'flex', justifyContent: 'space-between' }}>
          <span>⚠️ {error}</span>
          <button style={{ background: 'none', border: 'none', color: '#fda4af', cursor: 'pointer' }} onClick={fetchDataset}>Retry</button>
        </div>
      )}

      {saveSuccess && (
        <div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', color: '#86efac' }}>
          ✅ Dataset updated successfully! Model load triggered. Let's head to the **Training Console** to train the bot.
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAddIntent} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#fff', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
            Create New Neural Intent
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Intent Tag (ID)</label>
              <input
                className="input-premium"
                type="text"
                placeholder="e.g., support_billing"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Domain Pipeline</label>
              <select
                className="input-premium"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                style={{ background: 'rgba(15, 23, 42, 0.8)' }}
              >
                <option value="general">General Conversation</option>
                <option value="support">Customer Support</option>
                <option value="translation">Language Translation</option>
                <option value="entertainment">Entertainment / Games</option>
                <option value="education">Education / Quizzes</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Training Sentences (Patterns) - One per line
            </label>
            <textarea
              className="input-premium"
              rows={3}
              placeholder="e.g., How do I pay my invoice?&#10;Where to update billing?&#10;Change credit card details"
              value={newPatterns}
              onChange={(e) => setNewPatterns(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Bot Responses - One per line (Randomly chosen during chat)
            </label>
            <textarea
              className="input-premium"
              rows={3}
              placeholder="e.g., You can update your payment methods inside the billing portal under User Profile.&#10;We support Visa, Mastercard, and PayPal payments."
              value={newResponses}
              onChange={(e) => setNewResponses(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn-outline" onClick={() => setIsAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-premium" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save & Build'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="typing-dot" style={{ display: 'inline-block', margin: '0 4px' }}></div>
          <div className="typing-dot" style={{ display: 'inline-block', margin: '0 4px', animationDelay: '-0.16s' }}></div>
          <div className="typing-dot" style={{ display: 'inline-block', margin: '0 4px', animationDelay: '-0.32s' }}></div>
          <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Loading dataset intents...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {intents.map((intent, idx) => {
            const isActive = activeIntentIndex === idx;
            const badgeClass = `mode-badge mode-${intent.domain}`;
            return (
              <div
                key={intent.tag}
                className="glass-panel"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${
                    intent.domain === 'support'
                      ? 'var(--color-rose)'
                      : intent.domain === 'translation'
                      ? 'var(--color-teal)'
                      : intent.domain === 'entertainment'
                      ? 'var(--color-secondary)'
                      : intent.domain === 'education'
                      ? 'var(--color-cyan)'
                      : 'var(--color-primary)'
                  }`,
                }}
                onClick={() => setActiveIntentIndex(isActive ? null : idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                    {intent.tag}
                  </div>
                  <span className={badgeClass}>{intent.domain}</span>
                </div>

                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', gap: '16px' }}>
                  <span>💬 {intent.patterns.length} Patterns</span>
                  <span>🤖 {intent.responses.length} Responses</span>
                </div>

                {isActive && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '4px' }}>
                        Training Sentences:
                      </div>
                      <ul style={{ paddingLeft: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {intent.patterns.map((p, i) => (
                          <li key={i} style={{ marginBottom: '2px' }}>"{p}"</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-secondary)', marginBottom: '4px' }}>
                        Agent Responses:
                      </div>
                      <ul style={{ paddingLeft: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {intent.responses.map((r, i) => (
                          <li key={i} style={{ marginBottom: '2px' }}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button
                        style={{
                          background: 'rgba(244, 63, 94, 0.1)',
                          border: '1px solid rgba(244, 63, 94, 0.2)',
                          color: '#f43f5e',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                        onClick={() => handleDeleteIntent(idx, intent.tag)}
                      >
                        🗑️ Delete Intent
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
