const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String, default: '' },
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  
  // Gamification
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  badges: [{
    id: String,
    name: String,
    icon: String,
    earnedAt: { type: Date, default: Date.now }
  }],
  
  // Stats
  totalDebates: { type: Number, default: 0 },
  totalIntros: { type: Number, default: 0 },
  totalPitches: { type: Number, default: 0 },
  totalSocialTasks: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  
  // Daily tracking
  dailyXP: { type: Number, default: 0 },
  dailyActivities: { type: Number, default: 0 },
  lastDailyReset: { type: Date, default: Date.now }
}, { timestamps: true });

// Calculate level from XP
userSchema.methods.calculateLevel = function() {
  // Each level requires 100 * level XP
  let level = 1;
  let xpNeeded = 100;
  let remaining = this.xp;
  
  while (remaining >= xpNeeded) {
    remaining -= xpNeeded;
    level++;
    xpNeeded = 100 * level;
  }
  
  this.level = level;
  return { level, xpForNext: xpNeeded, currentXP: remaining };
};

// Add XP and update streak
userSchema.methods.addXP = async function(amount, activity) {
  this.xp += amount;
  this.dailyXP += amount;
  this.dailyActivities += 1;
  
  // Update streak
  const now = new Date();
  const lastActive = new Date(this.lastActive);
  const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    this.streak += 1;
  } else if (diffDays > 1) {
    this.streak = 1;
  }
  
  this.lastActive = now;
  this.calculateLevel();
  
  // Update activity counts
  if (activity === 'debate') this.totalDebates += 1;
  if (activity === 'intro') this.totalIntros += 1;
  if (activity === 'pitch') this.totalPitches += 1;
  if (activity === 'social') this.totalSocialTasks += 1;
  
  await this.save();
  return this;
};

module.exports = mongoose.model('User', userSchema);
