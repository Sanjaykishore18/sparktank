const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  const levelInfo = req.user.calculateLevel();
  res.json({ user: { ...req.user.toObject(), levelInfo } });
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  const { name, avatar } = req.body;
  if (name) req.user.name = name;
  if (avatar) req.user.avatar = avatar;
  await req.user.save();
  res.json({ user: req.user });
});

// Get leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('name avatar xp level streak badges')
      .sort({ xp: -1 })
      .limit(20);
    
    res.json({ leaderboard: users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
