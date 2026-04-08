const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// Google OAuth login
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        user.avatar = picture || user.avatar;
        await user.save();
      } else {
        user = new User({
          googleId,
          email,
          name,
          avatar: picture || ''
        });
        await user.save();
      }
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        plan: user.plan,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        badges: user.badges
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Demo login (for development without Google OAuth)
router.post('/demo', async (req, res) => {
  try {
    const { email, name } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email: email || 'demo@VoiceCraft.com',
        name: name || 'Demo User',
        avatar: ''
      });
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        plan: user.plan,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        badges: user.badges
      }
    });
  } catch (error) {
    console.error('Demo auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  const levelInfo = req.user.calculateLevel();
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      plan: req.user.plan,
      xp: req.user.xp,
      level: req.user.level,
      streak: req.user.streak,
      badges: req.user.badges,
      totalDebates: req.user.totalDebates,
      totalIntros: req.user.totalIntros,
      totalPitches: req.user.totalPitches,
      totalSocialTasks: req.user.totalSocialTasks,
      averageScore: req.user.averageScore,
      levelInfo
    }
  });
});

// Upgrade to premium (mock)
router.post('/upgrade', auth, async (req, res) => {
  req.user.plan = 'premium';
  await req.user.save();
  res.json({ message: 'Upgraded to premium!', plan: 'premium' });
});

// Downgrade to free (mock)
router.post('/downgrade', auth, async (req, res) => {
  req.user.plan = 'free';
  await req.user.save();
  res.json({ message: 'Downgraded to free plan', plan: 'free' });
});

module.exports = router;
