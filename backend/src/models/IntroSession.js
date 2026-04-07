const mongoose = require('mongoose');

const introSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['formal', 'informal'], required: true },
  scenario: { type: String, required: true },
  scenarioDescription: { type: String },
  
  userIntro: { type: String, required: true },
  
  feedback: {
    overallScore: { type: Number, min: 0, max: 100 },
    clarityScore: { type: Number, min: 0, max: 100 },
    confidenceScore: { type: Number, min: 0, max: 100 },
    relevanceScore: { type: Number, min: 0, max: 100 },
    suggestions: [String],
    corrections: [{
      original: String,
      corrected: String,
      explanation: String
    }],
    improvedVersion: String
  },
  
  xpEarned: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('IntroSession', introSessionSchema);
