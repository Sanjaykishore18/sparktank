const router = require('express').Router();
const { auth, premiumOnly } = require('../middleware/auth');
const gemini = require('../services/geminiService');
const { calculateXP, checkBadges } = require('../services/gamification');
const SocialSession = require('../models/SocialSession');

// Generate a social task (Premium only)
router.get('/task/:type', auth, premiumOnly, async (req, res) => {
  try {
    const { type } = req.params;
    if (!['build_connections', 'public_speaking'].includes(type)) {
      return res.status(400).json({ error: 'Type must be build_connections or public_speaking' });
    }
    
    const task = await gemini.generateSocialTask(type);
    res.json(task);
  } catch (error) {
    console.error('Generate social task error:', error);
    res.status(500).json({ error: 'Failed to generate task' });
  }
});

// Start a social session (Premium only)
router.post('/start', auth, premiumOnly, async (req, res) => {
  try {
    const { type, task, taskDescription, aiRole } = req.body;
    
    const session = new SocialSession({
      userId: req.user._id,
      type,
      task,
      taskDescription,
      messages: [{ role: 'system', content: `AI Role: ${aiRole}. Task: ${task}` }],
      status: 'active'
    });
    
    await session.save();
    res.json({ sessionId: session._id, session });
  } catch (error) {
    console.error('Start social session error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Send message in social session
router.post('/:sessionId/message', auth, premiumOnly, async (req, res) => {
  try {
    const session = await SocialSession.findOne({ 
      _id: req.params.sessionId, 
      userId: req.user._id,
      status: 'active' 
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Active session not found' });
    }
    
    const { message } = req.body;
    const systemMsg = session.messages.find(m => m.role === 'system');
    const aiRole = systemMsg ? systemMsg.content.split('AI Role: ')[1]?.split('. Task:')[0] : '';
    
    session.messages.push({ role: 'user', content: message, timestamp: new Date() });
    
    const aiResponse = await gemini.socialResponse(
      session.task, 
      aiRole, 
      session.messages.filter(m => m.role !== 'system'), 
      message
    );
    
    session.messages.push({ role: 'ai', content: aiResponse, timestamp: new Date() });
    await session.save();
    
    res.json({ aiResponse, messageCount: session.messages.length });
  } catch (error) {
    console.error('Social message error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// End social session and evaluate
router.post('/:sessionId/end', auth, premiumOnly, async (req, res) => {
  try {
    const session = await SocialSession.findOne({ 
      _id: req.params.sessionId, 
      userId: req.user._id 
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const feedback = await gemini.evaluateSocialSession(
      session.type, 
      session.task, 
      session.messages.filter(m => m.role !== 'system')
    );
    
    session.feedback = feedback;
    session.status = 'completed';
    
    const xp = calculateXP('social', feedback.overallScore);
    session.xpEarned = xp;
    
    await session.save();
    
    await req.user.addXP(xp, 'social');
    const newBadges = checkBadges(req.user);
    await req.user.save();
    
    res.json({ feedback, xpEarned: xp, newBadges });
  } catch (error) {
    console.error('End social session error:', error);
    res.status(500).json({ error: 'Failed to evaluate session' });
  }
});

// Get social session history
router.get('/history', auth, async (req, res) => {
  try {
    const sessions = await SocialSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('type task feedback.overallScore xpEarned createdAt status');
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
