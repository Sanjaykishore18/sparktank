import { useState, useEffect, useRef } from 'react';
import { FaTrophy, FaStar, FaChartLine, FaDumbbell, FaGlobe, FaFlagCheckered, FaUser, FaRobot, FaStop, FaMicrophone, FaPaperPlane, FaLightbulb, FaArrowRight } from 'react-icons/fa6';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import api from '../../services/api';
import '../Debate/Debate.css';
import './Social.css';

export default function SocialSession() {
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
  const messagesEndRef = useRef(null);
  const { isListening, transcript, interimTranscript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    api.get(`/social/${sessionId}`)
      .catch(() => {
        // Session loaded through start, use stored state
      });
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (transcript) setInputText(transcript);
  }, [transcript]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText('');
    resetTranscript();
    if (isListening) stopListening();

    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
    try {
      const res = await api.post(`/social/${sessionId}/message`, { message: text });
      setMessages(prev => [...prev, { role: 'ai', content: res.data.aiResponse, timestamp: new Date() }]);
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  const endSession = async () => {
    setEnding(true);
    try {
      const res = await api.post(`/social/${sessionId}/end`);
      setFeedback(res.data.feedback);
      setXpEarned(res.data.xpEarned);
      setNewBadges(res.data.newBadges || []);
    } catch (err) {
      console.error('Failed to end:', err);
    } finally {
      setEnding(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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

  if (feedback) {
    return (
      <div className="debate-page page">
        <div className="container">
          <div className="feedback-card glass-card animate-scale-in">
            <div className="feedback-header">
              <h2><FaTrophy style={{marginRight:'8px'}}/>Challenge Complete!</h2>
            </div>
            <div className="feedback-xp">
              <div className="xp-earned animate-float">
                <span className="xp-icon"><FaStar /></span>
                <span className="xp-amount">+{xpEarned} XP</span>
              </div>
            </div>
            <div className="scores-grid">
              {[
                { label: 'Overall', score: feedback.overallScore, color: '--primary-400' },
                { label: 'Approach', score: feedback.approachScore, color: '--success-400' },
                { label: 'Initiation', score: feedback.initiationScore, color: '--accent-400' },
                { label: 'Completion', score: feedback.completionScore, color: '--warning-400' }
              ].map((s, i) => (
                <div key={i} className="score-item">
                  <div className="score-circle">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" fill="none" stroke="var(--surface-glass-border)" strokeWidth="4" />
                      <circle cx="40" cy="40" r="35" fill="none" stroke={`var(${s.color})`} strokeWidth="4"
                        strokeDasharray={`${(s.score / 100) * 220} 220`}
                        strokeLinecap="round" style={{transform: 'rotate(-90deg)', transformOrigin: '50% 50%'}} />
                    </svg>
                    <span className="score-num">{s.score}</span>
                  </div>
                  <span className="score-label">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="feedback-grid">
              {feedback.strengths?.length > 0 && (
                <div className="feedback-section"><h4><FaDumbbell style={{marginRight:'6px'}}/>Strengths</h4><ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
              )}
              {feedback.areasToImprove?.length > 0 && (
                <div className="feedback-section"><h4><FaChartLine style={{marginRight:'6px'}}/>Improve</h4><ul>{feedback.areasToImprove.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
              )}
            </div>
            {feedback.suggestions?.length > 0 && (
              <div className="feedback-section"><h4><FaLightbulb style={{marginRight:'6px'}}/>Suggestions</h4><ul>{feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
            )}
            <div className="feedback-actions">
              <button onClick={() => navigate('/social')} className="btn btn-primary btn-lg">New Challenge <FaArrowRight style={{marginLeft:'6px'}}/></button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-lg">Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="debate-session page">
      <div className="container">
        <div className="session-header glass-card">
          <div className="session-info">
            <h3><FaGlobe style={{marginRight:'6px'}}/>Social Challenge</h3>
            <span className="badge badge-premium">Premium</span>
          </div>
          <button onClick={endSession} className="btn btn-accent" disabled={ending || messages.length < 2} id="end-social-btn">
            {ending ? 'Evaluating...' : <><FaFlagCheckered style={{marginRight:'6px'}}/> End & Evaluate</>}
          </button>
        </div>
        <div className="chat-area">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty"><span><FaGlobe /></span><p>Start the conversation! Introduce yourself.</p></div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                <div className="bubble-header">
                  <span>{msg.role === 'user' ? <><FaUser style={{marginRight:'4px'}}/> You</> : <><FaRobot style={{marginRight:'4px'}}/> AI Partner</>}</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <p>{msg.content}</p>
              </div>
            ))}
            {sending && <div className="chat-bubble chat-bubble-ai"><div className="typing-indicator"><span /><span /><span /></div></div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area glass-card">
            {isListening && (
              <div className="voice-indicator"><div className="recording-dot" /><span>Listening...</span></div>
            )}
            <div className="chat-input-row">
              {isSupported && (
                <button className={`btn btn-icon ${isListening ? 'btn-accent' : 'btn-ghost'}`} onClick={toggleMic}>
                  {isListening ? <FaStop /> : <FaMicrophone />}
                </button>
              )}
              <textarea
                className="input-field chat-input"
                placeholder="Type or speak..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button className="btn btn-primary btn-icon" onClick={sendMessage} disabled={!inputText.trim() || sending}><FaPaperPlane /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
