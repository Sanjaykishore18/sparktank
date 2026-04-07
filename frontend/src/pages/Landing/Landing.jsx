import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaRocket, FaArrowRight, FaMicrophone, FaRobot, FaGamepad, FaChartBar, FaUsers, FaBullseye, FaKhanda, FaCheck, FaStar, FaGlobe, FaXmark, FaBolt } from 'react-icons/fa6';
import './Landing.css';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing" id="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg-orbs">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>
        <div className="container hero-content">
          <div className="hero-badge animate-slide-up">
            <FaRocket style={{marginRight:'8px', color: 'var(--primary-400)'}}/> AI-Powered Soft Skills Training
          </div>
          <h1 className="hero-title animate-slide-up">
            Master Your <span className="gradient-text">Communication</span> Skills
            <br />with AI Training
          </h1>
          <p className="hero-subtitle animate-slide-up" style={{animationDelay: '0.1s'}}>
            Practice debates, self-introductions, pitching, and public speaking
            with real-time AI feedback. Built for IT professionals who want to stand out.
          </p>
          <div className="hero-actions animate-slide-up" style={{animationDelay: '0.2s'}}>
            <Link to={user ? '/dashboard' : '/login'} className="btn btn-primary btn-lg" id="hero-cta">
              {user ? 'Go to Dashboard' : 'Start Training Free'}
              <FaArrowRight />
            </Link>
            <a href="#modules" className="btn btn-ghost btn-lg">
              Explore Modules
            </a>
          </div>
          <div className="hero-stats animate-fade-in" style={{animationDelay: '0.4s'}}>
            <div className="hero-stat">
              <span className="hero-stat-value">3</span>
              <span className="hero-stat-label">Training Modules</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">AI</span>
              <span className="hero-stat-label">Real-time Feedback</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value"><FaMicrophone /></span>
              <span className="hero-stat-label">Voice Interaction</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header text-center">
            <span className="badge badge-primary">Features</span>
            <h2>Why SpeakX?</h2>
            <p>Transform your communication skills with cutting-edge AI technology</p>
          </div>
          <div className="features-grid stagger-children">
            {[
              { icon: <FaMicrophone />, title: 'Voice-First Training', desc: 'Speak naturally using your microphone. Our AI listens, understands, and provides real-time feedback on your communication.' },
              { icon: <FaRobot />, title: 'Gemini AI Engine', desc: 'Powered by Google\'s Gemini AI for intelligent, context-aware analysis of your arguments, grammar, and delivery.' },
              { icon: <FaGamepad />, title: 'Gamified Learning', desc: 'Earn XP, unlock badges, build streaks, and climb the leaderboard. Making skill development addictive and fun.' },
              { icon: <FaChartBar />, title: 'Detailed Scoring', desc: 'Get granular feedback across multiple dimensions — grammar, confidence, persuasion, structure, and more.' },
              { icon: <FaUsers />, title: 'Team Sessions', desc: 'Premium users can debate with team members in real-time rooms with AI moderation and collective feedback.' },
              { icon: <FaBullseye />, title: 'Scenario-Based Practice', desc: 'Practice with realistic scenarios — job interviews, investor pitches, tech conferences, and professional networking.' }
            ].map((f, i) => (
              <div className="feature-card glass-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="modules-section" id="modules">
        <div className="container">
          <div className="section-header text-center">
            <span className="badge badge-accent">Modules</span>
            <h2>Three Powerful Training Modules</h2>
            <p>Comprehensive training for every communication scenario</p>
          </div>
          <div className="modules-grid stagger-children">
            <div className="module-card glass-card">
              <div className="module-icon-wrap"><span><FaKhanda /></span></div>
              <h3>Debate Arena</h3>
              <p>Practice argumentation with AI opponents. Master logical fallacies, structure, and emotional control.</p>
              <div className="module-badges">
                <span className="badge badge-free"><FaCheck style={{marginRight:'4px'}}/> Free: 1-on-1 AI</span>
                <span className="badge badge-premium"><FaStar style={{marginRight:'4px'}}/> Pro: Team Rooms</span>
              </div>
            </div>
            <div className="module-card glass-card">
              <div className="module-icon-wrap"><span><FaMicrophone /></span></div>
              <h3>Introductions & Pitches</h3>
              <p>Master self-introductions for any scenario — formal interviews to casual meetups. Practice corporate pitching with AI scoring.</p>
              <div className="module-badges">
                <span className="badge badge-free"><FaCheck style={{marginRight:'4px'}}/> Intro: Free</span>
                <span className="badge badge-free"><FaCheck style={{marginRight:'4px'}}/> Pitching: Free</span>
              </div>
            </div>
            <div className="module-card glass-card">
              <div className="module-icon-wrap"><span><FaGlobe /></span></div>
              <h3>Social & Public Speaking</h3>
              <p>Build connections and master public speaking with AI-assigned challenges like tech talks and networking events.</p>
              <div className="module-badges">
                <span className="badge badge-premium"><FaStar style={{marginRight:'4px'}}/> Premium Only</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section" id="pricing">
        <div className="container">
          <div className="section-header text-center">
            <span className="badge badge-success">Pricing</span>
            <h2>Choose Your Plan</h2>
            <p>Start free and upgrade when you're ready to level up</p>
          </div>
          <div className="pricing-grid">
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
                <li><span className="check"><FaCheck /></span> AI Debate Sessions (1-on-1)</li>
                <li><span className="check"><FaCheck /></span> Self Introduction Practice</li>
                <li><span className="check"><FaCheck /></span> Pitch Practice & Scoring</li>
                <li><span className="check"><FaCheck /></span> AI Feedback & Corrections</li>
                <li><span className="check"><FaCheck /></span> XP & Badges</li>
                <li className="disabled"><span className="cross"><FaXmark /></span> Team Debate Rooms</li>
                <li className="disabled"><span className="cross"><FaXmark /></span> Social/Public Speaking</li>
                <li className="disabled"><span className="cross"><FaXmark /></span> Build Connections</li>
              </ul>
              <Link to="/login" className="btn btn-ghost w-full">Get Started</Link>
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
                <li><span className="check"><FaCheck /></span> Everything in Free</li>
                <li><span className="check accent"><FaCheck /></span> Team Debate Rooms</li>
                <li><span className="check accent"><FaCheck /></span> Social Skills Training</li>
                <li><span className="check accent"><FaCheck /></span> Public Speaking Challenges</li>
                <li><span className="check accent"><FaCheck /></span> Build Connections Mode</li>
                <li><span className="check accent"><FaCheck /></span> Priority AI Processing</li>
                <li><span className="check accent"><FaCheck /></span> Advanced Analytics</li>
              </ul>
              <Link to="/login" className="btn btn-primary w-full">Upgrade to Pro</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="brand-icon"><FaBolt /></span>
              <span className="brand-text">Speak<span className="brand-accent">X</span></span>
            </div>
            <p>AI-powered soft skills training for IT professionals</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
