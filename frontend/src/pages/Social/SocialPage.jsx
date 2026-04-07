import { useState } from 'react';
import { FaGlobe, FaStar, FaHandshake, FaMicrophone, FaStopwatch, FaRobot, FaBullseye, FaLightbulb, FaRocket } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import '../Intro/Intro.css';
import '../Debate/Debate.css';
import './Social.css';

export default function SocialPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [taskType, setTaskType] = useState(null);
  const [task, setTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [starting, setStarting] = useState(false);

  const generateTask = async (type) => {
    setTaskType(type);
    setLoadingTask(true);
    try {
      const res = await api.get(`/social/task/${type}`);
      setTask(res.data);
    } catch (err) {
      console.error('Failed to generate task:', err);
    } finally {
      setLoadingTask(false);
    }
  };

  const startSession = async () => {
    if (!task) return;
    setStarting(true);
    try {
      const res = await api.post('/social/start', {
        type: taskType,
        task: task.task,
        taskDescription: task.description,
        aiRole: task.aiRole
      });
      navigate(`/social/session/${res.data.sessionId}`);
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="social-page page" id="social-page">
      <div className="container">
        <div className="page-header animate-slide-up">
          <div className="page-header-icon" style={{background: 'rgba(232, 121, 249, 0.15)', borderColor: 'rgba(232, 121, 249, 0.2)'}}><FaGlobe /></div>
          <div>
            <h1>Social & Public Speaking</h1>
            <p>Build professional connections and master public speaking with AI challenges.</p>
            <span className="badge badge-premium" style={{marginTop: 8}}><FaStar style={{marginRight: '4px'}} /> Premium Feature</span>
          </div>
        </div>

        {/* Type Selection */}
        {!taskType && (
          <div className="intro-type-select animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="type-card glass-card" onClick={() => generateTask('build_connections')} id="connections-btn">
              <span className="type-icon"><FaHandshake /></span>
              <h3>Build Connections</h3>
              <p>Practice initiating and maintaining professional conversations with strangers.</p>
              <span className="badge badge-premium"><FaStar style={{marginRight: '2px'}}/> Premium</span>
            </div>
            <div className="type-card glass-card" onClick={() => generateTask('public_speaking')} id="speaking-btn">
              <span className="type-icon"><FaMicrophone /></span>
              <h3>Public Speaking</h3>
              <p>Take on public speaking challenges — tech talks, presentations, and impromptu speeches.</p>
              <span className="badge badge-premium"><FaStar style={{marginRight: '2px'}}/> Premium</span>
            </div>
          </div>
        )}

        {loadingTask && (
          <div className="flex items-center justify-center gap-4" style={{padding: '4rem 0'}}>
            <div className="spinner" />
            <span style={{color: 'var(--text-secondary)'}}>Generating challenge...</span>
          </div>
        )}

        {task && (
          <div className="social-task-card glass-card animate-scale-in">
            <div className="scenario-header">
              <span className="badge badge-premium">
                {taskType === 'build_connections' ? <><FaHandshake style={{marginRight: '4px'}}/> Connection</> : <><FaMicrophone style={{marginRight: '4px'}}/> Speaking</>}
              </span>
              <span className="scenario-duration"><FaStopwatch style={{marginRight: '4px'}}/> {task.durationHint}</span>
            </div>
            <h3>{task.task}</h3>
            <p>{task.description}</p>
            <div className="social-role">
              <h5><FaRobot style={{marginRight: '6px'}}/>AI will play:</h5>
              <p>{task.aiRole}</p>
            </div>
            {task.objectives && (
              <div className="scenario-tips">
                <h5><FaBullseye style={{marginRight: '6px'}}/>Objectives:</h5>
                <ul>{task.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </div>
            )}
            {task.tips && (
              <div className="scenario-tips" style={{marginTop: 'var(--space-3)'}}>
                <h5><FaLightbulb style={{marginRight: '6px'}}/>Tips:</h5>
                <ul>{task.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
            <button className="btn btn-primary btn-lg w-full" onClick={startSession} disabled={starting} style={{marginTop: 'var(--space-6)'}} id="start-social-btn">
              {starting ? 'Starting...' : <><FaRocket style={{marginRight: '8px'}}/> Start Challenge</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
