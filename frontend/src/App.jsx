import { useEffect, useRef, useState } from 'react';
import { Brain, Film, Mic, Send, Sparkles, Trash2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function Badge({ children, tone = 'purple' }) {
  const tones = {
    purple: { background: 'rgba(124,58,237,0.16)', color: '#c9b4ff', border: 'rgba(124,58,237,0.36)' },
    cyan: { background: 'rgba(6,182,212,0.14)', color: '#79e0f2', border: 'rgba(6,182,212,0.32)' },
    green: { background: 'rgba(16,185,129,0.14)', color: '#8ce6c0', border: 'rgba(16,185,129,0.3)' },
  };
  const style = tones[tone] || tones.purple;
  return <span style={{ ...style, display: 'inline-block', padding: '0.3rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: `1px solid ${style.border}` }}>{children}</span>;
}

function Card({ title, children, accent = 'purple' }) {
  const accentMap = {
    purple: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
    cyan: 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)',
    green: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  };

  return (
    <section style={{ background: 'rgba(17,17,24,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1rem 1.1rem', boxShadow: '0 20px 45px rgba(0,0,0,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.8rem' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentMap[accent] }} />
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#a5b3d2' }}>{title}</h3>
      </div>
      <div style={{ color: '#f5f7ff', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{children}</div>
    </section>
  );
}

export default function App() {
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState('english');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [thinking, setThinking] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, thinking]);

  async function runAnalysis() {
    if (!source.trim()) {
      setError('Please provide a YouTube URL or a local file path.');
      return;
    }

    setError('');
    setRunning(true);
    setResult(null);
    setChatHistory([]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, language }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setRunning(false);
    }
  }

  async function handleSend() {
    const question = chatInput.trim();
    if (!question || !result) return;

    setChatInput('');
    setChatHistory((prev) => [...prev, { role: 'user', content: question }]);
    setThinking(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: result.transcript, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Chat failed');
      setChatHistory((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Film size={25} color="#8b5cf6" />
          <div>
            <div className="brand-title">AI Video</div>
            <div className="brand-subtitle">Meeting Intelligence</div>
          </div>
        </div>

        <div className="panel">
          <label className="label">Input</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or /path/to/file.mp4"
            className="input"
          />

          <label className="label" style={{ marginTop: '0.9rem' }}>Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="select">
            <option value="english">english</option>
            <option value="hinglish">hinglish</option>
          </select>

          {error ? <div className="error">{error}</div> : null}

          <button className="primary-btn" onClick={runAnalysis} disabled={running}>
            <Sparkles size={16} /> {running ? 'Analysing…' : 'Analyse'}
          </button>
        </div>

        <div className="panel">
          <Badge color="purple">Live API</Badge>
          <div className="small-text">The UI talks to FastAPI endpoints on port 8000.</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="hero">
          <div>
            <div className="eyebrow">Transcribe · Summarise · Search your meetings</div>
            <h1>AI Video Assistant</h1>
          </div>
          <div className="hero-badges">
            <Badge tone="purple">Transcription</Badge>
            <Badge tone="cyan">Summaries</Badge>
            <Badge tone="green">RAG Chat</Badge>
          </div>
        </header>

        {!result ? (
          <div className="empty-state">
            <Mic size={48} color="#8b5cf6" />
            <h2>Ready to analyse</h2>
            <p>Paste a YouTube link or local media path, choose your language, and hit Analyse to start.</p>
          </div>
        ) : (
          <div className="results-grid">
            <Card title="Session Title" accent="purple">
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{result.title}</div>
            </Card>

            <Card title="Summary" accent="cyan">
              {result.summary}
            </Card>

            <Card title="Full Transcript" accent="purple">
              {result.transcript}
            </Card>

            <Card title="Action Items" accent="green">
              {result.actionItems}
            </Card>

            <Card title="Key Decisions" accent="green">
              {result.keyDecisions}
            </Card>

            <Card title="Open Questions" accent="cyan">
              {result.openQuestions}
            </Card>

            <div style={{ gridColumn: '1 / -1' }}>
              <Card title="Chat with your meeting" accent="purple">
                {chatHistory.length === 0 ? (
                  <div className="chat-empty">Ask anything grounded in the transcript.</div>
                ) : (
                  <div className="chat-window">
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`chat-bubble ${msg.role}`}>
                        <strong>{msg.role === 'user' ? 'You' : 'Assistant'}</strong>
                        <div>{msg.content}</div>
                      </div>
                    ))}
                    {thinking ? <div className="thinking">Thinking…</div> : null}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <div className="chat-input-row">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="What were the main decisions made?"
                    className="input"
                  />
                  <button className="secondary-btn" onClick={handleSend}>
                    <Send size={15} /> Send
                  </button>
                </div>

                {chatHistory.length > 0 ? (
                  <button className="ghost-btn" onClick={() => setChatHistory([])}>
                    <Trash2 size={14} /> Clear chat
                  </button>
                ) : null}
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
