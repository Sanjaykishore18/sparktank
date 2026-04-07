const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { getAllBadges } = require('../services/gamification');
const User = require('../models/User');

// Get user gamification stats
router.get('/stats', auth, async (req, res) => {
  try {
    const levelInfo = req.user.calculateLevel();
    
    res.json({
      xp: req.user.xp,
      level: req.user.level,
      levelInfo,
      streak: req.user.streak,
      badges: req.user.badges,
      totalDebates: req.user.totalDebates,
      totalIntros: req.user.totalIntros,
      totalPitches: req.user.totalPitches,
      totalSocialTasks: req.user.totalSocialTasks,
      dailyXP: req.user.dailyXP,
      dailyActivities: req.user.dailyActivities
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all available badges
router.get('/badges', auth, (req, res) => {
  const allBadges = getAllBadges();
  const earnedIds = req.user.badges.map(b => b.id);
  
  const badges = allBadges.map(badge => ({
    ...badge,
    earned: earnedIds.includes(badge.id),
    earnedAt: req.user.badges.find(b => b.id === badge.id)?.earnedAt
  }));
  
  res.json({ badges });
});

// Get leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('name avatar xp level streak')
      .sort({ xp: -1 })
      .limit(50);
    
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      id: user._id,
      name: user.name,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      isCurrentUser: user._id.toString() === req.user._id.toString()
    }));
    
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
