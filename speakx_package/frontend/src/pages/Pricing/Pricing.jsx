import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../Landing/Landing.css';

export default function Pricing() {
  const { user, upgradePlan } = useAuth();
  const navigate = useNavigate();

  const handleUpgrade = async () => {
    try {
      await upgradePlan();
      navigate('/dashboard');
    } catch (err) {
      console.error('Upgrade failed:', err);
    }
  };

  return (
    <div className="page" id="pricing-page">
      <div className="container" style={{paddingTop: 'var(--space-12)'}}>
        <div className="section-header text-center animate-slide-up">
          <span className="badge badge-success">Pricing</span>
          <h1>Upgrade Your Training</h1>
          <p>Unlock team debates, social skills training, and advanced features</p>
        </div>

        <div className="pricing-grid animate-slide-up" style={{animationDelay: '0.1s'}}>
          <div className="price-card glass-card">
            <div className="price-header">
              <h3>Free</h3>
              <div className="price-amount">
                <span className="price-currency">$</span>
                <span className="price-value">0</span>
                <span className="price-period">/forever</span>
              </div>
            </div>
            <ul className="price-features">
              <li><span className="check">✓</span> AI Debate Sessions (1-on-1)</li>
              <li><span className="check">✓</span> Self Introduction Practice</li>
              <li><span className="check">✓</span> Pitch Practice & Scoring</li>
              <li><span className="check">✓</span> AI Feedback & Corrections</li>
              <li><span className="check">✓</span> XP & Badges</li>
              <li className="disabled"><span className="cross">✕</span> Team Debate Rooms</li>
              <li className="disabled"><span className="cross">✕</span> Social/Public Speaking</li>
            </ul>
            {user?.plan === 'free' ? (
              <button className="btn btn-ghost w-full" disabled>Current Plan</button>
            ) : (
              <button className="btn btn-ghost w-full" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
            )}
          </div>

          <div className="price-card glass-card price-card-featured">
            <div className="price-popular">Most Popular</div>
            <div className="price-header">
              <h3>Premium</h3>
              <div className="price-amount">
                <span className="price-currency">$</span>
                <span className="price-value">9</span>
                <span className="price-period">/month</span>
              </div>
            </div>
            <ul className="price-features">
              <li><span className="check">✓</span> Everything in Free</li>
              <li><span className="check accent">✓</span> Team Debate Rooms</li>
              <li><span className="check accent">✓</span> Social Skills Training</li>
              <li><span className="check accent">✓</span> Public Speaking</li>
              <li><span className="check accent">✓</span> Build Connections</li>
              <li><span className="check accent">✓</span> Priority AI</li>
            </ul>
            {user?.plan === 'premium' ? (
              <button className="btn btn-primary w-full" disabled>Current Plan ✓</button>
            ) : (
              <button className="btn btn-primary w-full" onClick={handleUpgrade}>
                Upgrade to Pro →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
