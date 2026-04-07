const router = require('express').Router();
const { auth, premiumOnly } = require('../middleware/auth');
const gemini = require('../services/geminiService');
const { calculateXP, checkBadges } = require('../services/gamification');
const DebateSession = require('../models/DebateSession');

// Get a new debate topic
router.get('/topic', auth, async (req, res) => {
  try {
    const topic = await gemini.generateDebateTopic();
    res.json(topic);
  } catch (error) {
    console.error('Generate topic error:', error);
    res.status(500).json({ error: 'Failed to generate debate topic' });
  }
});

// Start a new AI debate session (Free)
router.post('/start', auth, async (req, res) => {
  try {
    const { topic, userStance } = req.body;
    
    const session = new DebateSession({
      userId: req.user._id,
      topic,
      userStance,
      mode: 'ai',
      status: 'active',
      messages: []
    });
    
    await session.save();
    res.json({ sessionId: session._id, session });
  } catch (error) {
    console.error('Start debate error:', error);
    res.status(500).json({ error: 'Failed to start debate' });
  }
});

// Send a message in debate (AI responds)
router.post('/:sessionId/message', auth, async (req, res) => {
  try {
    const session = await DebateSession.findOne({ 
      _id: req.params.sessionId, 
      userId: req.user._id,
      status: 'active'
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Active debate session not found' });
    }
    
    const { message } = req.body;
    
    // Add user message
    session.messages.push({ role: 'user', content: message, timestamp: new Date() });
    
    // Get AI response
    const aiResponse = await gemini.debateResponse(
      session.topic, 
      session.userStance, 
      session.messages, 
      message
    );
    
    session.messages.push({ role: 'ai', content: aiResponse, timestamp: new Date() });
    await session.save();
    
    res.json({ 
      aiResponse, 
      messageCount: session.messages.length,
      session
    });
  } catch (error) {
    console.error('Debate message error:', error);
    res.status(500).json({ error: 'Failed to process debate message' });
  }
});

// End debate and get evaluation
router.post('/:sessionId/end', auth, async (req, res) => {
  try {
    const session = await DebateSession.findOne({ 
      _id: req.params.sessionId, 
      userId: req.user._id 
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Debate session not found' });
    }
    
    // Get AI evaluation
    const feedback = await gemini.evaluateDebate(
      session.topic, 
      session.userStance, 
      session.messages
    );
    
    session.feedback = feedback;
    session.status = 'completed';
    
    // Calculate XP
    const xp = calculateXP('debate', feedback.overallScore);
    session.xpEarned = xp;
    
    // Add XP to user
    await req.user.addXP(xp, 'debate');
    
    // Check for new badges
    const newBadges = checkBadges(req.user);
    await req.user.save();
    
    await session.save();
    
    res.json({ 
      feedback, 
      xpEarned: xp, 
      newBadges,
      userLevel: req.user.level,
      totalXP: req.user.xp
    });
  } catch (error) {
    console.error('End debate error:', error);
    res.status(500).json({ error: 'Failed to evaluate debate' });
  }
});

// Get debate history
router.get('/history', auth, async (req, res) => {
  try {
    const sessions = await DebateSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('topic userStance mode status feedback.overallScore xpEarned createdAt');
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch debate history' });
  }
});

// Get specific session details
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const session = await DebateSession.findOne({ 
      _id: req.params.sessionId, 
      userId: req.user._id 
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

module.exports = router;
