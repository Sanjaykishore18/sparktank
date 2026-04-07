// Badge definitions for gamification
const BADGES = {
  // Activity-based badges
  FIRST_DEBATE: { id: 'first_debate', name: 'First Debate', icon: '⚔️', description: 'Complete your first debate', condition: (user) => user.totalDebates >= 1 },
  DEBATE_MASTER: { id: 'debate_master', name: 'Debate Master', icon: '🏆', description: 'Complete 10 debates', condition: (user) => user.totalDebates >= 10 },
  DEBATE_LEGEND: { id: 'debate_legend', name: 'Debate Legend', icon: '👑', description: 'Complete 50 debates', condition: (user) => user.totalDebates >= 50 },
  
  FIRST_INTRO: { id: 'first_intro', name: 'Ice Breaker', icon: '🤝', description: 'Complete your first self-introduction', condition: (user) => user.totalIntros >= 1 },
  INTRO_PRO: { id: 'intro_pro', name: 'Intro Pro', icon: '⭐', description: 'Complete 10 introductions', condition: (user) => user.totalIntros >= 10 },
  
  FIRST_PITCH: { id: 'first_pitch', name: 'Pitcher', icon: '🎯', description: 'Complete your first pitch', condition: (user) => user.totalPitches >= 1 },
  PITCH_STAR: { id: 'pitch_star', name: 'Pitch Star', icon: '🌟', description: 'Complete 10 pitches', condition: (user) => user.totalPitches >= 10 },
  
  SOCIAL_BUTTERFLY: { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', description: 'Complete 5 social tasks', condition: (user) => user.totalSocialTasks >= 5 },
  CONNECTOR: { id: 'connector', name: 'Master Connector', icon: '🔗', description: 'Complete 20 social tasks', condition: (user) => user.totalSocialTasks >= 20 },
  
  // Streak badges
  WEEK_STREAK: { id: 'week_streak', name: 'Week Warrior', icon: '🔥', description: '7-day streak', condition: (user) => user.streak >= 7 },
  MONTH_STREAK: { id: 'month_streak', name: 'Monthly Legend', icon: '💎', description: '30-day streak', condition: (user) => user.streak >= 30 },
  
  // Level badges
  LEVEL_5: { id: 'level_5', name: 'Rising Star', icon: '🌠', description: 'Reach level 5', condition: (user) => user.level >= 5 },
  LEVEL_10: { id: 'level_10', name: 'Expert Speaker', icon: '🎖️', description: 'Reach level 10', condition: (user) => user.level >= 10 },
  LEVEL_20: { id: 'level_20', name: 'Communication Guru', icon: '🏅', description: 'Reach level 20', condition: (user) => user.level >= 20 },
  
  // XP badges
  XP_1000: { id: 'xp_1000', name: 'XP Hunter', icon: '💰', description: 'Earn 1000 XP', condition: (user) => user.xp >= 1000 },
  XP_5000: { id: 'xp_5000', name: 'XP Master', icon: '💎', description: 'Earn 5000 XP', condition: (user) => user.xp >= 5000 },
};

// Calculate XP for an activity
function calculateXP(activity, score) {
  const baseXP = {
    debate: 50,
    intro: 30,
    pitch: 40,
    social: 60
  };
  
  const base = baseXP[activity] || 30;
  const scoreBonus = Math.floor((score / 100) * base);
  return base + scoreBonus;
}

// Check and award new badges
function checkBadges(user) {
  const newBadges = [];
  const existingBadgeIds = user.badges.map(b => b.id);
  
  for (const [key, badge] of Object.entries(BADGES)) {
    if (!existingBadgeIds.includes(badge.id) && badge.condition(user)) {
      const newBadge = { id: badge.id, name: badge.name, icon: badge.icon, earnedAt: new Date() };
      user.badges.push(newBadge);
      newBadges.push({ ...newBadge, description: badge.description });
    }
  }
  
  return newBadges;
}

// Get all badge definitions
function getAllBadges() {
  return Object.values(BADGES).map(b => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    description: b.description
  }));
}

module.exports = { calculateXP, checkBadges, getAllBadges, BADGES };
