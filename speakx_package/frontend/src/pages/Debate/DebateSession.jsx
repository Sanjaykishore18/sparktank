import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import api from '../../services/api';
import './Debate.css';

export default function DebateSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [newBadges, setNewBadges] = useState([]);
  const [timer, setTimer] = useState(0);
  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);
  
  const { isListening, transcript, interimTranscript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    // Load session
    api.get(`/debate/${sessionId}`)
      .then(res => {
        setSession(res.data.session);
        setMessages(res.data.session.messages || []);
        if (res.data.session.status === 'completed') {
          setFeedback(res.data.session.feedback);
        }
      })
      .catch(() => navigate('/debate'));

    // Start timer
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');
    resetTranscript();
    if (isListening) stopListening();

    // Optimistic update
    const userMsg = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await api.post(`/debate/${sessionId}/message`, { message: text });
      const aiMsg = { role: 'ai', content: res.data.aiResponse, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const endDebate = async () => {
    setEnding(true);
    clearInterval(timerRef.current);
    try {
      const res = await api.post(`/debate/${sessionId}/end`);
      setFeedback(res.data.feedback);
      setXpEarned(res.data.xpEarned);
      setNewBadges(res.data.newBadges || []);
    } catch (err) {
      console.error('Failed to end debate:', err);
    } finally {
      setEnding(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setInputText('');
      startListening();
    }
  };

  if (!session) {
    return (
      <div className="page flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  // Show feedback/results screen
  if (feedback) {
    return (
      <div className="debate-page page" id="debate-results">
        <div className="container">
          <div className="feedback-card glass-card animate-scale-in">
            <div className="feedback-header">
              <h2>🎉 Debate Complete!</h2>
              <p>Topic: {session.topic}</p>
            </div>

            {/* XP and Badges */}
            <div className="feedback-xp">
              <div className="xp-earned animate-float">
                <span className="xp-icon">✨</span>
                <span className="xp-amount">+{xpEarned} XP</span>
              </div>
              {newBadges.length > 0 && (
                <div className="new-badges">
                  {newBadges.map((b, i) => (
                    <div key={i} className="new-badge animate-scale-in" style={{animationDelay: `${i * 0.1}s`}}>
                      <span>{b.icon}</span>
                      <span>{b.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scores */}
            <div className="scores-grid">
              {[
                { label: 'Overall', score: feedback.overallScore, color: '--primary-400' },
                { label: 'Grammar', score: feedback.grammarScore, color: '--success-400' },
                { label: 'Arguments', score: feedback.argumentScore, color: '--accent-400' },
                { label: 'Confidence', score: feedback.confidenceScore, color: '--warning-400' }
              ].map((s, i) => (
                <div key={i} className="score-item">
                  <div className="score-circle">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" fill="none" stroke="var(--surface-glass-border)" strokeWidth="4" />
                      <circle cx="40" cy="40" r="35" fill="none" stroke={`var(${s.color})`} strokeWidth="4"
                        strokeDasharray={`${(s.score / 100) * 220} 220`}
                        strokeLinecap="round"
                        style={{transform: 'rotate(-90deg)', transformOrigin: '50% 50%'}} />
                    </svg>
                    <span className="score-num">{s.score}</span>
                  </div>
                  <span className="score-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Strengths & Improvements */}
            <div className="feedback-grid">
              {feedback.strengths?.length > 0 && (
                <div className="feedback-section">
                  <h4>💪 Strengths</h4>
                  <ul>
                    {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {feedback.areasToImprove?.length > 0 && (
                <div className="feedback-section">
                  <h4>📈 Areas to Improve</h4>
                  <ul>
                    {feedback.areasToImprove.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Corrections */}
            {feedback.corrections?.length > 0 && (
              <div className="feedback-section">
                <h4>✏️ Corrections</h4>
                <div className="corrections-list">
                  {feedback.corrections.map((c, i) => (
                    <div key={i} className="correction-item">
                      <div className="correction-original">❌ {c.original}</div>
                      <div className="correction-fixed">✅ {c.corrected}</div>
                      <div className="correction-explain">💡 {c.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {feedback.suggestions?.length > 0 && (
              <div className="feedback-section">
                <h4>💡 Suggestions</h4>
                <ul>
                  {feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            <div className="feedback-actions">
              <button onClick={() => navigate('/debate')} className="btn btn-primary btn-lg">
                New Debate →
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-lg">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="debate-session page" id="debate-session">
      <div className="container">
        {/* Session Header */}
        <div className="session-header glass-card">
          <div className="session-info">
            <h3>{session.topic}</h3>
            <div className="session-meta">
              <span className={`badge ${session.userStance === 'for' ? 'badge-success' : 'badge-accent'}`}>
                {session.userStance === 'for' ? '👍 For' : '👎 Against'}
              </span>
              <span className="session-timer">⏱ {formatTime(timer)}</span>
              <span className="session-msgs">💬 {messages.length} messages</span>
            </div>
          </div>
          <button 
            onClick={endDebate} 
            className="btn btn-accent" 
            disabled={ending || messages.length < 2}
            id="end-debate-btn"
          >
            {ending ? 'Evaluating...' : '🏁 End & Evaluate'}
          </button>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <span>⚔️</span>
                <p>Start the debate! Share your opening argument using text or voice.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                <div className="bubble-header">
                  <span className="bubble-sender">{msg.role === 'user' ? '👤 You' : '🤖 AI Opponent'}</span>
                  <span className="bubble-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <p>{msg.content}</p>
              </div>
            ))}
            {sending && (
              <div className="chat-bubble chat-bubble-ai">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area glass-card">
            {isListening && (
              <div className="voice-indicator">
                <div className="recording-dot" />
                <span>Listening... speak now</span>
                {interimTranscript && <span className="interim-text">{interimTranscript}</span>}
              </div>
            )}
            <div className="chat-input-row">
              {isSupported && (
                <button
                  className={`btn btn-icon ${isListening ? 'btn-accent' : 'btn-ghost'}`}
                  onClick={toggleMic}
                  id="mic-btn"
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  {isListening ? '⏹' : '🎤'}
                </button>
              )}
              <textarea
                className="input-field chat-input"
                placeholder="Type your argument or use the microphone..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                id="debate-input"
              />
              <button
                className="btn btn-primary btn-icon"
                onClick={sendMessage}
                disabled={!inputText.trim() || sending}
                id="send-btn"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
