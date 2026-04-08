import { Link, useLocation } from 'react-router-dom';
import { FaBolt, FaStar, FaFire } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner container">
        <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
          <span className="brand-icon"><FaBolt /></span>
          <span className="brand-text">Voice<span className="brand-accent">Craft</span></span>
        </Link>

        {!user && isLanding && (
          <div className="navbar-links">
            <a href="#features">Features</a>
            <a href="#modules">Modules</a>
            <a href="#pricing">Pricing</a>
          </div>
        )}

        <div className="navbar-actions">
          {user ? (
            <>
              <div className="nav-xp">
                <span className="nav-xp-icon"><FaStar /></span>
                <span className="nav-xp-value">{user.xp || 0} XP</span>
              </div>
              <div className="nav-streak">
                <span className="nav-streak-icon"><FaFire /></span>
                <span>{user.streak || 0}</span>
              </div>
              {user.plan === 'premium' && (
                <span className="badge badge-premium">PRO</span>
              )}
              <div className="nav-profile">
                <div className="nav-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    <span>{user.name?.charAt(0)?.toUpperCase()}</span>
                  )}
                </div>
                <div className="nav-dropdown">
                  <div className="nav-dropdown-header">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="nav-dropdown-divider" />
                  <Link to="/dashboard" className="nav-dropdown-item">Dashboard</Link>
                  <Link to="/profile" className="nav-dropdown-item">Profile</Link>
                  <Link to="/leaderboard" className="nav-dropdown-item">Leaderboard</Link>
                  <div className="nav-dropdown-divider" />
                  <button onClick={logout} className="nav-dropdown-item nav-dropdown-logout">
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
