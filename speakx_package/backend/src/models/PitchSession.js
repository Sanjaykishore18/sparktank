const mongoose = require('mongoose');

const pitchSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scenario: { type: String, required: true },
  scenarioDescription: { type: String },
  targetAudience: { type: String },
  
  userPitch: { type: String, required: true },
  
  feedback: {
    overallScore: { type: Number, min: 0, max: 100 },
    persuasionScore: { type: Number, min: 0, max: 100 },
    clarityScore: { type: Number, min: 0, max: 100 },
    structureScore: { type: Number, min: 0, max: 100 },
    deliveryScore: { type: Number, min: 0, max: 100 },
    suggestions: [String],
    corrections: [{
      original: String,
      corrected: String,
      explanation: String
    }],
    strengths: [String],
    areasToImprove: [String],
    improvedVersion: String
  },
  
  xpEarned: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('PitchSession', pitchSessionSchema);
