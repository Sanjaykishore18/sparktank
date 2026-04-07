import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Leaderboard.css';

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/gamification/leaderboard')
      .then(res => setLeaderboard(res.data.leaderboard))
      .catch(() => {
        // Fallback with current user
        setLeaderboard([{
          rank: 1, id: user?._id, name: user?.name, avatar: user?.avatar,
          xp: user?.xp || 0, level: user?.level || 1, streak: user?.streak || 0, isCurrentUser: true
        }]);
      })
      .finally(() => setLoading(false));
  }, []);

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="leaderboard-page page" id="leaderboard-page">
      <div className="container">
        <div className="page-header animate-slide-up">
          <div className="page-header-icon" style={{background: 'rgba(255, 170, 0, 0.15)', borderColor: 'rgba(255, 170, 0, 0.2)'}}>🏅</div>
          <div>
            <h1>Leaderboard</h1>
            <p>Compete with fellow IT professionals. XP determines your ranking!</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{padding: '4rem 0'}}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="lb-table glass-card animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="lb-header-row">
              <span className="lb-col-rank">Rank</span>
              <span className="lb-col-user">Player</span>
              <span className="lb-col-level">Level</span>
              <span className="lb-col-streak">Streak</span>
              <span className="lb-col-xp">XP</span>
            </div>
            {leaderboard.map((entry) => (
              <div key={entry.id} className={`lb-row ${entry.isCurrentUser ? 'lb-row-you' : ''}`}>
                <span className="lb-col-rank lb-rank">{getRankEmoji(entry.rank)}</span>
                <div className="lb-col-user lb-user">
                  <div className="lb-avatar">
                    {entry.avatar ? <img src={entry.avatar} alt="" /> : <span>{entry.name?.charAt(0)}</span>}
                  </div>
                  <span className="lb-name">
                    {entry.name} {entry.isCurrentUser && <span className="badge badge-primary" style={{marginLeft: 8}}>You</span>}
                  </span>
                </div>
                <span className="lb-col-level">{entry.level}</span>
                <span className="lb-col-streak">🔥 {entry.streak}</span>
                <span className="lb-col-xp lb-xp">{entry.xp?.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
