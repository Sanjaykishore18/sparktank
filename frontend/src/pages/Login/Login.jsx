import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export default function Login() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginDemo, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleDemoLogin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await loginDemo(name, email);
      navigate('/dashboard');
    } catch (err) {
      setError('Login failed. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page page" id="login-page">
      <div className="login-container animate-scale-in">
        <div className="login-card glass-card">
          <div className="login-header">
            <div className="login-icon">⚡</div>
            <h2>Welcome to SpeakX</h2>
            <p>Start your AI-powered training journey</p>
          </div>

          {error && (
            <div className="login-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Google OAuth button placeholder */}
          <button className="btn-google" disabled title="Configure GOOGLE_CLIENT_ID in .env">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="login-divider">
            <span>or use demo login</span>
          </div>

          <form onSubmit={handleDemoLogin} className="login-form">
            <div className="input-group">
              <label htmlFor="login-name">Full Name</label>
              <input
                type="text"
                id="login-name"
                className="input-field"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                type="email"
                id="login-email"
                className="input-field"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading} id="demo-login-btn">
              {loading ? (
                <><span className="spinner" style={{width: 20, height: 20, borderWidth: 2}} /> Signing in...</>
              ) : (
                'Start Training →'
              )}
            </button>
          </form>

          <p className="login-note">
            Demo login for development. Configure Google OAuth for production.
          </p>
        </div>
      </div>
    </div>
  );
}
