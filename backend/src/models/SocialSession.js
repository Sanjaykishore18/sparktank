const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'ai', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const socialSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['build_connections', 'public_speaking'], required: true },
  task: { type: String, required: true },
  taskDescription: { type: String },
  
  messages: [messageSchema],
  
  feedback: {
    overallScore: { type: Number, min: 0, max: 100 },
    approachScore: { type: Number, min: 0, max: 100 },
    initiationScore: { type: Number, min: 0, max: 100 },
    completionScore: { type: Number, min: 0, max: 100 },
    engagementScore: { type: Number, min: 0, max: 100 },
    suggestions: [String],
    corrections: [{
      original: String,
      corrected: String,
      explanation: String
    }],
    strengths: [String],
    areasToImprove: [String]
  },
  
  xpEarned: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('SocialSession', socialSessionSchema);
