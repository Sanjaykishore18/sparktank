import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaTrophy, FaStar, FaDumbbell, FaChartLine, FaPen, FaXmark, FaCheck, FaLightbulb, FaArrowRight, FaThumbsUp, FaThumbsDown, FaStopwatch, FaCommentDots, FaFlagCheckered, FaStop, FaMicrophone, FaPaperPlane, FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useAuth } from '../../context/AuthContext';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import threeService from '../../services/threeService';
import api from '../../services/api';
import './Debate.css';

export default function DebateSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [newBadges, setNewBadges] = useState([]);
  const [timer, setTimer] = useState(0);
  const [isAiVoiceOn, setIsAiVoiceOn] = useState(true);
  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);
  
  // 3D Refs
  const canvasRef = useRef(null);
  const roomRef = useRef(null);
  const animationRef = useRef(null);
  const lastMsgCountRef = useRef(0);
  
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
    return () => {
      clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [sessionId]);

  // Initialize 3D Room
  useEffect(() => {
    if (!canvasRef.current || !session || feedback) return;

    let userConfig = { skin: 0, hair: 0, outfit: 0 };
    try {
      if (user?.avatar) {
        userConfig = JSON.parse(user.avatar);
      }
    } catch (e) {
      console.warn('Failed to parse avatar config, using defaults');
    }

    const { scene, camera, renderer, avatars } = threeService.initRoomScene(canvasRef.current, userConfig);
    
    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2;

    roomRef.current = { scene, camera, renderer, avatars, controls };

    const handleResize = () => {
      if (!canvasRef.current || !renderer) return;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      if (width === 0 || height === 0) return;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      // Subtle breathing for avatars
      const time = Date.now() * 0.002;
      avatars.forEach((avatar, i) => {
        avatar.position.y = 0.05 + Math.sin(time + i) * 0.008;
      });

      controls.update();
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, [session, feedback]);

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
      const aiResponseText = res.data.aiResponse;
      const aiMsg = { role: 'ai', content: aiResponseText, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      
      // Speak AI response if voice is enabled
      if (isAiVoiceOn && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiResponseText);
        window.speechSynthesis.speak(utterance);
      }
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
              <h2><FaTrophy style={{marginRight:'6px'}}/> Debate Complete!</h2>
              <p>Topic: {session.topic}</p>
            </div>

            {/* XP and Badges */}
            <div className="feedback-xp">
              <div className="xp-earned animate-float">
                <span className="xp-icon"><FaStar /></span>
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
                  <h4><FaDumbbell style={{marginRight:'6px'}}/> Strengths</h4>
                  <ul>
                    {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {feedback.areasToImprove?.length > 0 && (
                <div className="feedback-section">
                  <h4><FaChartLine style={{marginRight:'6px'}}/> Areas to Improve</h4>
                  <ul>
                    {feedback.areasToImprove.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Corrections */}
            {feedback.corrections?.length > 0 && (
              <div className="feedback-section">
                <h4><FaPen style={{marginRight:'6px'}}/> Corrections</h4>
                <div className="corrections-list">
                  {feedback.corrections.map((c, i) => (
                    <div key={i} className="correction-item">
                      <div className="correction-original"><FaXmark style={{marginRight:'6px', color:'var(--error-400)'}}/> {c.original}</div>
                      <div className="correction-fixed"><FaCheck style={{marginRight:'6px', color:'var(--success-400)'}}/> {c.corrected}</div>
                      <div className="correction-explain"><FaLightbulb style={{marginRight:'6px', color:'var(--warning-400)'}}/> {c.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {feedback.suggestions?.length > 0 && (
              <div className="feedback-section">
                <h4><FaLightbulb style={{marginRight:'6px'}}/> Suggestions</h4>
                <ul>
                  {feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            <div className="feedback-actions">
              <button onClick={() => navigate('/debate')} className="btn btn-primary btn-lg">
                New Debate <FaArrowRight style={{marginLeft:'6px'}}/>
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
    <div className="debate-room-container page">
      <div className="container">
        {/* Session Header */}
        <div className="session-header glass-card">
          <div className="session-info">
            <h3>{session.topic}</h3>
            <div className="session-stance">
              <span className={`badge ${session.userStance === 'for' ? 'badge-success' : 'badge-error'}`}>
                {session.userStance === 'for' ? <><FaThumbsUp style={{marginRight:'4px'}}/> For</> : <><FaThumbsDown style={{marginRight:'4px'}}/> Against</>}
              </span>
              <span className="session-timer"><FaStopwatch style={{marginRight:'4px'}}/> {formatTime(timer)}</span>
              <span className="session-msgs"><FaCommentDots style={{marginRight:'4px'}}/> {messages.length} messages</span>
            </div>
          </div>
          <button 
            onClick={endDebate} 
            className="btn btn-accent" 
            disabled={ending || messages.length < 2}
            id="end-debate-btn"
          >
            {ending ? 'Evaluating...' : <><FaFlagCheckered style={{marginRight:'6px'}}/> End & Evaluate</>}
          </button>
        </div>

        <div className="room-layout">
          {/* 3D World */}
          <div id="room-canvas-wrap">
            <canvas ref={canvasRef} id="room-canvas"></canvas>
            <div className="room-overlay">
              <div className="room-badge">
                <div className="room-dot"></div>
                Live AI Debate Arena
              </div>
            </div>
          </div>

          {/* Sidebar Chat */}
          <div className="room-sidebar">
            <div className="sidebar-header">
              <span className="font-semibold text-sm">Debate Logs</span>
              <span className="text-xs text-muted">AI Moderated</span>
            </div>
            <div className="sidebar-content">
              <div className="chat-messages-compact scroll-hint">
                {messages.length === 0 && (
                  <div className="chat-empty py-8 text-center text-xs opacity-50">
                    <p>Start the debate! Share your opening argument.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`compact-bubble ${msg.role === 'user' ? 'compact-bubble-user' : 'compact-bubble-ai'}`}>
                    <p className={msg.role === 'user' ? 'text-white' : ''}>{msg.content}</p>
                  </div>
                ))}
                {sending && (
                  <div className="compact-bubble compact-bubble-ai">
                    <div className="typing-indicator scale-75 origin-left">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area (Integrated into Sidebar) */}
              <div className="chat-input-area border-t border-glass">
                {isListening && (
                  <div className="voice-indicator text-[10px] py-1 mb-2">
                    <div className="recording-dot w-2 h-2" />
                    <span>Listening...</span>
                  </div>
                )}
                <div className="chat-input-row">
                  <button
                    type="button"
                    className={`btn btn-icon btn-sm ${isAiVoiceOn ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => {
                      if (isAiVoiceOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                      setIsAiVoiceOn(!isAiVoiceOn);
                    }}
                    title={isAiVoiceOn ? "Mute AI Voice" : "Enable AI Voice"}
                  >
                    {isAiVoiceOn ? <FaVolumeHigh /> : <FaVolumeXmark />}
                  </button>
                  {isSupported && (
                    <button
                      type="button"
                      className={`btn btn-icon btn-sm ${isListening ? 'btn-accent' : 'btn-ghost'}`}
                      onClick={toggleMic}
                      id="debate-mic-btn"
                    >
                      {isListening ? <FaStop /> : <FaMicrophone />}
                    </button>
                  )}
                  <textarea
                    className="input-field chat-input text-sm p-2"
                    placeholder="Argue..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-icon btn-sm"
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    id="send-msg-btn"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
