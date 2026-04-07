const router = require('express').Router();
const { auth } = require('../middleware/auth');
const gemini = require('../services/geminiService');
const { calculateXP, checkBadges } = require('../services/gamification');
const PitchSession = require('../models/PitchSession');

// Generate a pitch scenario
router.get('/scenario', auth, async (req, res) => {
  try {
    const scenario = await gemini.generatePitchScenario();
    res.json(scenario);
  } catch (error) {
    console.error('Generate pitch scenario error:', error);
    res.status(500).json({ error: 'Failed to generate pitch scenario' });
  }
});

// Submit pitch for evaluation
router.post('/evaluate', auth, async (req, res) => {
  try {
    const { scenario, scenarioDescription, targetAudience, userPitch } = req.body;
    
    // Get AI evaluation
    const feedback = await gemini.evaluatePitch(scenario, targetAudience, userPitch);
    
    // Save session
    const session = new PitchSession({
      userId: req.user._id,
      scenario,
      scenarioDescription,
      targetAudience,
      userPitch,
      feedback,
      status: 'completed'
    });
    
    // Calculate XP
    const xp = calculateXP('pitch', feedback.overallScore);
    session.xpEarned = xp;
    
    await session.save();
    
    // Add XP to user
    await req.user.addXP(xp, 'pitch');
    const newBadges = checkBadges(req.user);
    await req.user.save();
    
    res.json({ 
      feedback, 
      xpEarned: xp, 
      newBadges,
      sessionId: session._id 
    });
  } catch (error) {
    console.error('Evaluate pitch error:', error);
    res.status(500).json({ error: 'Failed to evaluate pitch' });
  }
});

// Get pitch history
router.get('/history', auth, async (req, res) => {
  try {
    const sessions = await PitchSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('scenario targetAudience feedback.overallScore xpEarned createdAt status');
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pitch history' });
  }
});

module.exports = router;
