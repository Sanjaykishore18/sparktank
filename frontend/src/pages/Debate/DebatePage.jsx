import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Debate.css';
import { io } from 'socket.io-client';

export default function DebatePage() {
  const { user } = useAuth();
  const [topic, setTopic] = useState(null);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [selectedStance, setSelectedStance] = useState(null);
  const [starting, setStarting] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'team'
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Auto-fill room code if joined via invite link
    const code = searchParams.get('room');
    if (code) {
      setActiveTab('team');
      setJoinCode(code);
    }
  }, [searchParams]);

  const generateTopic = async () => {
    setLoadingTopic(true);
    try {
      const res = await api.get('/debate/topic');
      setTopic(res.data);
      setSelectedStance(null);
    } catch (err) {
      console.error('Failed to generate topic:', err);
    } finally {
      setLoadingTopic(false);
    }
  };

  const startDebate = async () => {
    if (!topic || !selectedStance) return;
    setStarting(true);
    
    if (activeTab === 'ai') {
      try {
        const res = await api.post('/debate/start', {
          topic: topic.topic,
          userStance: selectedStance
        });
        navigate(`/debate/session/${res.data.sessionId}`);
      } catch (err) {
        console.error('Failed to start AI debate:', err);
        setStarting(false);
      }
    } else {
      // In Team mode, generate a room on the socket
      // Wait, let's navigate to the room UI and handle socket connection there
      navigate(`/debate/room/new`, { state: { topic: topic.topic, stance: selectedStance } });
    }
  };

  const joinRoom = () => {
    if (!joinCode.trim()) return;
    navigate(`/debate/room/${joinCode.trim()}`);
  };

  return (
    <div className="debate-page page" id="debate-page">
      <div className="container">
        <div className="page-header animate-slide-up">
          <div className="page-header-icon module-debate">⚔️</div>
          <div>
            <h1>Debate Arena</h1>
            <p>Practice argumentation with AI or invite friends for a multiplayer debate.</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="tabs-container animate-slide-up">
          <button 
            className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            🤖 AI Debate
          </button>
          <button 
            className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
            disabled={user?.plan !== 'premium'}
            title={user?.plan !== 'premium' ? "Premium Feature" : ""}
          >
            👥 Team Rooms {user?.plan !== 'premium' && '🔒'}
          </button>
        </div>

        {user?.plan !== 'premium' && activeTab === 'team' && (
          <div className="glass-card premium-lock" style={{textAlign: 'center', padding: 'var(--space-8)', marginTop: 'var(--space-6)'}}>
            <span style={{fontSize: '3rem', marginBottom: 'var(--space-4)', display: 'block'}}>🔒</span>
            <h3>Premium Feature</h3>
            <p style={{marginBottom: 'var(--space-4)'}}>Upgrade your plan to debate in real-time with friends and colleagues.</p>
            <button className="btn btn-accent" onClick={() => navigate('/pricing')}>View Pro Plans</button>
          </div>
        )}

        {/* Team Room Quick Join & Create */}
        {(activeTab === 'team' && user?.plan === 'premium') && (
          <div className="debate-setup glass-card animate-slide-up" style={{animationDelay: '0.1s', marginBottom: 'var(--space-6)'}}>
            <div className="setup-header" style={{ marginBottom: 'var(--space-4)' }}>
              <h3>🤝 Team Rooms</h3>
              <p>Quickly join a friend's room or host your own custom debate.</p>
            </div>
            
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)'}}>
              {/* Join Room */}
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ marginBottom: 'var(--space-2)' }}>Join Existing Room</h4>
                <div style={{display: 'flex', gap: 'var(--space-3)'}}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Enter Room Code" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={joinRoom}
                    disabled={!joinCode.trim()}
                  >
                    Join
                  </button>
                </div>
              </div>

              {/* Create Custom Room */}
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ marginBottom: 'var(--space-2)' }}>Host Custom Room</h4>
                <div style={{display: 'flex', gap: 'var(--space-3)'}}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Enter custom topic..." 
                    id="custom-topic-input"
                    style={{ flex: 1 }}
                  />
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="Size" 
                    id="custom-size-input"
                    min="2" max="10" defaultValue="4"
                    title="Max Participants"
                    style={{ width: '80px' }}
                  />
                  <button 
                    className="btn btn-accent"
                    onClick={() => {
                      const topicText = document.getElementById('custom-topic-input').value.trim() || 'Open Debate';
                      const maxSize = parseInt(document.getElementById('custom-size-input').value, 10) || 4;
                      navigate('/debate/room/new', { state: { topic: topicText, stance: null, maxSize } });
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Topic Generation */}
        {(activeTab === 'ai' || (activeTab === 'team' && user?.plan === 'premium')) && (
          <div className="debate-setup glass-card animate-slide-up" style={{animationDelay: '0.15s'}}>
            <div className="setup-header">
              <h3>🎲 Generate a Debate Topic</h3>
              <p>{activeTab === 'ai' ? 'AI will generate a thought-provoking topic for you to debate' : 'Host a new room by generating a topic first.'}</p>
            </div>

            <button 
              className="btn btn-primary btn-lg" 
              onClick={generateTopic} 
              disabled={loadingTopic}
              id="generate-topic-btn"
            >
              {loadingTopic ? (
                <><span className="spinner" style={{width: 20, height: 20, borderWidth: 2}} /> Generating...</>
              ) : (
                <>{topic ? '🔄 New Topic' : '⚡ Generate Topic'}</>
              )}
            </button>

            {topic && (
              <div className="topic-card animate-scale-in">
                <h3 className="topic-title">{topic.topic}</h3>
                <p className="topic-context">{topic.context}</p>
                
                <div className="stance-grid">
                  <div className="stance-section">
                    <h4 className="stance-for">🟢 For</h4>
                    <ul>
                      {topic.forPoints?.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                  <div className="stance-section">
                    <h4 className="stance-against">🔴 Against</h4>
                    <ul>
                      {topic.againstPoints?.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="stance-select">
                  <h4>Choose your stance:</h4>
                  <div className="stance-buttons">
                    <button
                      className={`btn ${selectedStance === 'for' ? 'btn-success' : 'btn-ghost'}`}
                      onClick={() => setSelectedStance('for')}
                      id="stance-for-btn"
                    >
                      👍 I'm For It
                    </button>
                    <button
                      className={`btn ${selectedStance === 'against' ? 'btn-accent' : 'btn-ghost'}`}
                      onClick={() => setSelectedStance('against')}
                      id="stance-against-btn"
                    >
                      👎 I'm Against It
                    </button>
                  </div>
                </div>

                {selectedStance && (
                  <button 
                    className="btn btn-primary btn-lg w-full animate-scale-in" 
                    onClick={startDebate}
                    disabled={starting}
                    id="start-debate-btn"
                  >
                    {activeTab === 'team' ? (starting ? 'Creating Room...' : '👥 Create Team Room') : (starting ? 'Starting...' : '🚀 Start AI Debate')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

