import { useState } from 'react';
import { FaBullseye, FaBolt, FaStopwatch, FaClipboardList, FaLightbulb, FaMicrophone, FaStop, FaChartBar, FaStar, FaDumbbell, FaChartLine, FaArrowRight } from 'react-icons/fa6';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import api from '../../services/api';
import '../Intro/Intro.css';
import '../Debate/Debate.css';

export default function PitchPage() {
  const [scenario, setScenario] = useState(null);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [userPitch, setUserPitch] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [newBadges, setNewBadges] = useState([]);

  const { isListening, transcript, interimTranscript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const generateScenario = async () => {
    setLoadingScenario(true);
    setFeedback(null);
    setUserPitch('');
    try {
      const res = await api.get('/pitch/scenario');
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
      setUserPitch(prev => prev + ' ' + transcript);
    } else {
      resetTranscript();
      startListening();
    }
  };

  const submitPitch = async () => {
    const text = (userPitch + ' ' + transcript).trim();
    if (!text) return;
    if (isListening) stopListening();
    setUserPitch(text);
    setEvaluating(true);
    try {
      const res = await api.post('/pitch/evaluate', {
        scenario: scenario.scenario,
        scenarioDescription: scenario.description,
        targetAudience: scenario.targetAudience,
        userPitch: text
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
    setScenario(null);
    setFeedback(null);
    setUserPitch('');
    resetTranscript();
  };

  return (
    <div className="intro-page page" id="pitch-page">
      <div className="container">
        <div className="page-header animate-slide-up">
          <div className="page-header-icon" style={{background: 'rgba(255, 92, 10, 0.15)', borderColor: 'rgba(255, 92, 10, 0.2)'}}><FaBullseye /></div>
          <div>
            <h1>Pitch Practice</h1>
            <p>Master corporate pitching with AI-generated scenarios and detailed scoring. Free!</p>
          </div>
        </div>

        {/* Generate Scenario */}
        {!scenario && !feedback && (
          <div className="debate-setup glass-card animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="setup-header">
              <h3><FaBullseye style={{marginRight:'6px'}}/>Generate a Pitch Scenario</h3>
              <p>AI will create a realistic corporate pitching scenario for you to practice.</p>
            </div>
            <button className="btn btn-accent btn-lg" onClick={generateScenario} disabled={loadingScenario} id="generate-pitch-btn">
              {loadingScenario ? (
                <><span className="spinner" style={{width: 20, height: 20, borderWidth: 2}} /> Generating...</>
              ) : <><FaBolt style={{marginRight:'6px'}}/> Generate Scenario</>}
            </button>
          </div>
        )}

        {/* Scenario + Practice */}
        {scenario && !feedback && (
          <div className="intro-practice animate-scale-in">
            <div className="scenario-card glass-card">
              <div className="scenario-header">
                <span className="badge badge-accent">Pitch Challenge</span>
                <span className="scenario-duration"><FaStopwatch style={{marginRight:'4px'}}/> {scenario.durationHint}</span>
              </div>
              <h3>{scenario.scenario}</h3>
              <p>{scenario.description}</p>
              <div style={{marginTop: 'var(--space-3)'}}>
                <span className="badge badge-primary"><FaBullseye style={{marginRight:'4px'}}/> Target: {scenario.targetAudience}</span>
              </div>
              {scenario.keyPointsToHit && (
                <div className="scenario-tips" style={{marginTop: 'var(--space-4)'}}>
                  <h5><FaClipboardList style={{marginRight:'6px'}}/>Key Points to Cover:</h5>
                  <ul>{scenario.keyPointsToHit.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
              )}
              {scenario.tips && (
                <div className="scenario-tips" style={{marginTop: 'var(--space-3)'}}>
                  <h5><FaLightbulb style={{marginRight:'6px'}}/>Tips:</h5>
                  <ul>{scenario.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
            </div>

            <div className="practice-area glass-card">
              <h3>🎤 Your Pitch</h3>
              <p>Deliver your pitch using voice or text.</p>
              {isListening && (
                <div className="voice-indicator">
                  <div className="recording-dot" />
                  <span>Recording... deliver your pitch</span>
                  {interimTranscript && <span className="interim-text">{interimTranscript}</span>}
                </div>
              )}
              <textarea
                className="input-field intro-textarea"
                placeholder="Deliver your pitch here..."
                value={userPitch + (transcript ? ' ' + transcript : '')}
                onChange={(e) => { setUserPitch(e.target.value); resetTranscript(); }}
                rows={8}
                id="pitch-input"
              />
              <div className="practice-actions">
                {isSupported && (
                  <button className={`btn ${isListening ? 'btn-accent' : 'btn-ghost'}`} onClick={toggleMic}>
                    {isListening ? <><FaStop style={{marginRight:'6px'}}/> Stop</> : <><FaMicrophone style={{marginRight:'6px'}}/> Record</>}
                  </button>
                )}
                <button className="btn btn-accent btn-lg" onClick={submitPitch} disabled={evaluating || (!userPitch.trim() && !transcript.trim())} id="submit-pitch-btn">
                  {evaluating ? <><span className="spinner" style={{width: 20, height: 20, borderWidth: 2}} /> Evaluating...</> : <><FaChartBar style={{marginRight:'6px'}}/> Get AI Score</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="feedback-card glass-card animate-scale-in" style={{maxWidth: 800, margin: '0 auto'}}>
            <div className="feedback-header">
              <h2><FaChartBar style={{marginRight:'6px'}}/>Pitch Scorecard</h2>
              <p>{scenario?.scenario}</p>
            </div>

            <div className="feedback-xp">
              <div className="xp-earned animate-float">
                <span className="xp-icon"><FaStar /></span>
                <span className="xp-amount">+{xpEarned} XP</span>
              </div>
            </div>

            <div className="scores-grid" style={{gridTemplateColumns: 'repeat(5, 1fr)'}}>
              {[
                { label: 'Overall', score: feedback.overallScore, color: '--primary-400' },
                { label: 'Persuasion', score: feedback.persuasionScore, color: '--accent-400' },
                { label: 'Clarity', score: feedback.clarityScore, color: '--success-400' },
                { label: 'Structure', score: feedback.structureScore, color: '--warning-400' },
                { label: 'Delivery', score: feedback.deliveryScore, color: '--error-400' }
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
                <h4><FaStar style={{marginRight:'6px'}}/>Improved Pitch</h4>
                <p>{feedback.improvedVersion}</p>
              </div>
            )}

            <div className="feedback-grid">
              {feedback.strengths?.length > 0 && (
                <div className="feedback-section">
                  <h4><FaDumbbell style={{marginRight:'6px'}}/>Strengths</h4>
                  <ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {feedback.areasToImprove?.length > 0 && (
                <div className="feedback-section">
                  <h4><FaChartLine style={{marginRight:'6px'}}/>Improve</h4>
                  <ul>{feedback.areasToImprove.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </div>

            {feedback.suggestions?.length > 0 && (
              <div className="feedback-section">
                <h4><FaLightbulb style={{marginRight:'6px'}}/>Suggestions</h4>
                <ul>{feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}

            <div className="feedback-actions">
              <button onClick={reset} className="btn btn-accent btn-lg">Try Another <FaArrowRight style={{marginLeft:'6px'}}/></button>
              <button onClick={() => window.location.href = '/dashboard'} className="btn btn-ghost btn-lg">Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
