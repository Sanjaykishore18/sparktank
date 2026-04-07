const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'ai', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const debateSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String, required: true },
  userStance: { type: String, enum: ['for', 'against'], required: true },
  mode: { type: String, enum: ['ai', 'team'], default: 'ai' },
  messages: [messageSchema],
  
  // AI Feedback
  feedback: {
    overallScore: { type: Number, min: 0, max: 100 },
    grammarScore: { type: Number, min: 0, max: 100 },
    argumentScore: { type: Number, min: 0, max: 100 },
    confidenceScore: { type: Number, min: 0, max: 100 },
    suggestions: [String],
    corrections: [{
      original: String,
      corrected: String,
      explanation: String
    }],
    strengths: [String],
    areasToImprove: [String]
  },
  
  // Gamification
  xpEarned: { type: Number, default: 0 },
  
  duration: { type: Number, default: 0 }, // in seconds
  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
  
  // Team debate fields
  roomId: { type: String },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('DebateSession', debateSessionSchema);
