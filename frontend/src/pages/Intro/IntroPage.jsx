import { useState } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import api from '../../services/api';
import './Intro.css';

export default function IntroPage() {
  const [type, setType] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [userIntro, setUserIntro] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [newBadges, setNewBadges] = useState([]);

  const { isListening, transcript, interimTranscript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const generateScenario = async (selectedType) => {
    setType(selectedType);
    setLoadingScenario(true);
    setFeedback(null);
    setUserIntro('');
    try {
      const res = await api.get(`/intro/scenario/${selectedType}`);
      setScenario(res.data);
    } catch (err) {
      console.error('Failed to generate scenario:', err);
    } finally {
      setLoadingScenario(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
      setUserIntro(prev => prev + ' ' + transcript);
    } else {
      resetTranscript();
      startListening();
    }
  };

  const submitIntro = async () => {
    const text = (userIntro + ' ' + transcript).trim();
    if (!text) return;
    
    if (isListening) stopListening();
    setUserIntro(text);
    setEvaluating(true);
    
    try {
      const res = await api.post('/intro/evaluate', {
        type,
        scenario: scenario.scenario,
        scenarioDescription: scenario.description,
        userIntro: text
      });
      setFeedback(res.data.feedback);
      setXpEarned(res.data.xpEarned);
      setNewBadges(res.data.newBadges || []);
    } catch (err) {
      console.error('Failed to evaluate:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const reset = () => {
    setType(null);
    setScenario(null);
    setFeedback(null);
    setUserIntro('');
    setXpEarned(0);
    setNewBadges([]);
    resetTranscript();
  };

  return (
    <div className="intro-page page" id="intro-page">
      <div className="container">
        <div className="page-header animate-slide-up">
          <div className="page-header-icon" style={{background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.2)'}}>🎤</div>
          <div>
            <h1>Self Introduction</h1>
            <p>Practice scenario-based introductions — formal and informal. Completely free!</p>
          </div>
        </div>

        {/* Type Selection */}
        {!type && (
          <div className="intro-type-select animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="type-card glass-card" onClick={() => generateScenario('formal')} id="formal-intro-btn">
              <span className="type-icon">👔</span>
              <h3>Formal Introduction</h3>
              <p>Job interviews, corporate meetings, conferences, professional networking</p>
              <span className="badge badge-primary">Professional</span>
            </div>
            <div className="type-card glass-card" onClick={() => generateScenario('informal')} id="informal-intro-btn">
              <span className="type-icon">🤝</span>
              <h3>Informal Introduction</h3>
              <p>Team meetups, hackathons, casual gatherings, social events</p>
              <span className="badge badge-success">Casual</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loadingScenario && (
          <div className="flex items-center justify-center gap-4" style={{padding: '4rem 0'}}>
            <div className="spinner" />
            <span style={{color: 'var(--text-secondary)'}}>Generating scenario...</span>
          </div>
        )}

        {/* Scenario + Practice */}
        {scenario && !feedback && (
          <div className="intro-practice animate-scale-in">
            <div className="scenario-card glass-card">
              <div className="scenario-header">
                <span className="badge badge-primary">{type}</span>
                <span className="scenario-duration">⏱ {scenario.durationHint}</span>
              </div>
              <h3>{scenario.scenario}</h3>
              <p>{scenario.description}</p>
              {scenario.tips && (
                <div className="scenario-tips">
                  <h5>💡 Tips:</h5>
                  <ul>
                    {scenario.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="practice-area glass-card">
              <h3>🎤 Your Introduction</h3>
              <p>Speak using the microphone or type your introduction below.</p>

              {isListening && (
                <div className="voice-indicator">
                  <div className="recording-dot" />
                  <span>Recording... speak now</span>
                  {interimTranscript && <span className="interim-text">{interimTranscript}</span>}
                </div>
              )}

              <textarea
                className="input-field intro-textarea"
                placeholder="Type or speak your self-introduction..."
                value={userIntro + (transcript ? ' ' + transcript : '')}
                onChange={(e) => { setUserIntro(e.target.value); resetTranscript(); }}
                rows={6}
                id="intro-input"
              />

              <div className="practice-actions">
                {isSupported && (
                  <button className={`btn ${isListening ? 'btn-accent' : 'btn-ghost'}`} onClick={toggleMic} id="intro-mic-btn">
                    {isListening ? '⏹ Stop Recording' : '🎤 Start Recording'}
                  </button>
                )}
                <button
                  className="btn btn-primary btn-lg"
                  onClick={submitIntro}
                  disabled={evaluating || (!userIntro.trim() && !transcript.trim())}
                  id="submit-intro-btn"
                >
                  {evaluating ? (
                    <><span className="spinner" style={{width: 20, height: 20, borderWidth: 2}} /> Evaluating...</>
                  ) : '📊 Get AI Feedback'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="feedback-card glass-card animate-scale-in" style={{maxWidth: 800, margin: '0 auto'}}>
            <div className="feedback-header">
              <h2>📊 Introduction Feedback</h2>
              <p>{scenario?.scenario}</p>
            </div>

            <div className="feedback-xp">
              <div className="xp-earned animate-float">
                <span className="xp-icon">✨</span>
                <span className="xp-amount">+{xpEarned} XP</span>
              </div>
            </div>

            <div className="scores-grid">
              {[
                { label: 'Overall', score: feedback.overallScore, color: '--primary-400' },
                { label: 'Clarity', score: feedback.clarityScore, color: '--success-400' },
                { label: 'Confidence', score: feedback.confidenceScore, color: '--accent-400' },
                { label: 'Relevance', score: feedback.relevanceScore, color: '--warning-400' }
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

            {feedback.improvedVersion && (
              <div className="improved-version">
                <h4>✨ Improved Version</h4>
                <p>{feedback.improvedVersion}</p>
              </div>
            )}

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

            {feedback.suggestions?.length > 0 && (
              <div className="feedback-section">
                <h4>💡 Suggestions</h4>
                <ul>{feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}

            <div className="feedback-actions">
              <button onClick={reset} className="btn btn-primary btn-lg">Try Another →</button>
              <button onClick={() => window.location.href = '/dashboard'} className="btn btn-ghost btn-lg">Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
