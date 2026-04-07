import { useState, useEffect } from 'react';
import { FaHand, FaStar, FaTrophy, FaFire, FaMedal, FaLock, FaArrowRight, FaKhanda, FaMicrophone, FaBullseye, FaUser, FaGlobe } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/gamification/stats')
      .then(res => setStats(res.data))
      .catch(() => {
        // Use local user data as fallback
        setStats({
          xp: user?.xp || 0,
          level: user?.level || 1,
          streak: user?.streak || 0,
          badges: user?.badges || [],
          totalDebates: user?.totalDebates || 0,
          totalIntros: user?.totalIntros || 0,
          totalPitches: user?.totalPitches || 0,
          totalSocialTasks: user?.totalSocialTasks || 0,
          levelInfo: { level: user?.level || 1, xpForNext: 200, currentXP: user?.xp || 0 }
        });
      });
  }, [user]);

  const levelInfo = stats?.levelInfo || { level: 1, xpForNext: 200, currentXP: 0 };
  const xpProgress = levelInfo.xpForNext > 0 ? (levelInfo.currentXP / levelInfo.xpForNext) * 100 : 0;

  const modules = [
    {
      id: 'debate',
      title: 'Debate Arena',
      icon: <FaKhanda />,
      description: 'Practice argumentation with AI opponents. Get real-time feedback on your debate skills.',
      path: '/debate',
      color: 'module-debate',
      free: true,
      premium: true,
      stat: stats?.totalDebates || 0,
      statLabel: 'debates completed'
    },
    {
      id: 'intro',
      title: 'Self Introduction',
      icon: <FaMicrophone />,
      description: 'Master formal and informal introductions with scenario-based AI practice.',
      path: '/intro',
      color: 'module-intro',
      free: true,
      premium: false,
      stat: stats?.totalIntros || 0,
      statLabel: 'intros practiced'
    },
    {
      id: 'pitch',
      title: 'Pitch Practice',
      icon: <FaBullseye />,
      description: 'Perfect your corporate pitching skills. AI scores and provides detailed feedback.',
      path: '/pitch',
      color: 'module-pitch',
      free: true,
      premium: false,
      stat: stats?.totalPitches || 0,
      statLabel: 'pitches delivered'
    },
    {
      id: 'social',
      title: 'Social & Public Speaking',
      icon: <FaGlobe />,
      description: 'Build connections and master public speaking with AI-assigned challenges.',
      path: '/social',
      color: 'module-social',
      free: false,
      premium: true,
      stat: stats?.totalSocialTasks || 0,
      statLabel: 'tasks completed'
    }
  ];

  return (
    <div className="dashboard page" id="dashboard-page">
      <div className="container">
        {/* Welcome Header */}
        <div className="dash-header animate-slide-up">
          <div className="dash-welcome">
            <h1>Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> </h1>
            <p>Ready to level up your communication skills today?</p>
          </div>
          {user?.plan === 'free' && (
            <Link to="/pricing" className="btn btn-accent btn-sm">
              <FaStar style={{marginRight: '6px'}}/> Upgrade to Pro
            </Link>
          )}
        </div>

        

        {/* Module Cards */}
        <div className="dash-section animate-slide-up" style={{animationDelay: '0.2s'}}>
          <h2>Training Modules</h2>
          <div className="dash-modules stagger-children">
            {modules.map(mod => {
              const locked = !mod.free && user?.plan !== 'premium';
              return (
                <Link
                  to={locked ? '/pricing' : mod.path}
                  key={mod.id}
                  className={`module-card-dash glass-card ${mod.color} ${locked ? 'locked' : ''}`}
                  id={`module-${mod.id}`}
                >
                  {locked && <div className="lock-overlay"><FaLock style={{marginRight: '6px'}}/> Premium Only</div>}
                  <div className="module-card-header">
                    <span className="module-card-icon">{mod.icon}</span>
                    <div className="module-card-badges">
                      {mod.free && <span className="badge badge-free">Free</span>}
                      {mod.premium && <span className="badge badge-premium">Pro</span>}
                    </div>
                  </div>
                  <h3>{mod.title}</h3>
                  <p>{mod.description}</p>
                  <div className="module-card-footer">
                    <div className="module-stat">
                      <span className="module-stat-value">{mod.stat}</span>
                      <span className="module-stat-label">{mod.statLabel}</span>
                    </div>
                    <span className="module-arrow"><FaArrowRight /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

       

        {/* Quick Actions */}
        <div className="dash-section animate-slide-up" style={{animationDelay: '0.35s'}}>
          <h2>Quick Start</h2>
          <div className="quick-actions">
            <Link to="/debate" className="quick-action glass-card">
              <span style={{fontSize: '1.4rem'}}><FaKhanda /></span>
              <span>Quick Debate</span>
            </Link>
            <Link to="/intro" className="quick-action glass-card">
              <span style={{fontSize: '1.4rem'}}><FaMicrophone /></span>
              <span>Practice Intro</span>
            </Link>
            <Link to="/pitch" className="quick-action glass-card">
              <span style={{fontSize: '1.4rem'}}><FaBullseye /></span>
              <span>Start Pitching</span>
            </Link>
            <Link to="/leaderboard" className="quick-action glass-card">
              <span style={{fontSize: '1.4rem'}}><FaMedal /></span>
              <span>Leaderboard</span>
            </Link>
            <Link to="/avatar-creator" className="quick-action glass-card avatar-action">
              <span style={{fontSize: '1.4rem'}}><FaUser /></span>
              <span>Edit Avatar</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
