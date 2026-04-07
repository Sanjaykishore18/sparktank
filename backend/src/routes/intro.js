const router = require('express').Router();
const { auth } = require('../middleware/auth');
const gemini = require('../services/geminiService');
const { calculateXP, checkBadges } = require('../services/gamification');
const IntroSession = require('../models/IntroSession');

// Generate a scenario
router.get('/scenario/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    if (!['formal', 'informal'].includes(type)) {
      return res.status(400).json({ error: 'Type must be formal or informal' });
    }
    
    const scenario = await gemini.generateIntroScenario(type);
    res.json(scenario);
  } catch (error) {
    console.error('Generate scenario error:', error);
    res.status(500).json({ error: 'Failed to generate scenario' });
  }
});

// Submit introduction for evaluation
router.post('/evaluate', auth, async (req, res) => {
  try {
    const { type, scenario, scenarioDescription, userIntro } = req.body;
    
    // Get AI evaluation
    const feedback = await gemini.evaluateIntro(type, scenario, userIntro);
    
    // Save session
    const session = new IntroSession({
      userId: req.user._id,
      type,
      scenario,
      scenarioDescription,
      userIntro,
      feedback,
      status: 'completed'
    });
    
    // Calculate XP
    const xp = calculateXP('intro', feedback.overallScore);
    session.xpEarned = xp;
    
    await session.save();
    
    // Add XP to user
    await req.user.addXP(xp, 'intro');
    const newBadges = checkBadges(req.user);
    await req.user.save();
    
    res.json({ 
      feedback, 
      xpEarned: xp, 
      newBadges,
      sessionId: session._id
    });
  } catch (error) {
    console.error('Evaluate intro error:', error);
    res.status(500).json({ error: 'Failed to evaluate introduction' });
  }
});

// Get intro history
router.get('/history', auth, async (req, res) => {
  try {
    const sessions = await IntroSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('type scenario feedback.overallScore xpEarned createdAt status');
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch intro history' });
  }
});

module.exports = router;
