const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  // ============ DEBATE MODULE ============
  
  async generateDebateTopic() {
    const prompt = `Generate a thought-provoking debate topic suitable for IT professionals practicing their soft skills. 
    The topic should be relevant to technology, workplace, career, or society.
    
    Return ONLY a JSON object with this format:
    {
      "topic": "The debate topic statement",
      "context": "Brief context about why this topic is debatable (2-3 sentences)",
      "forPoints": ["Point 1 for the topic", "Point 2", "Point 3"],
      "againstPoints": ["Point 1 against the topic", "Point 2", "Point 3"]
    }`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    return this._parseJSON(text);
  }

  async debateResponse(topic, userStance, messages, userMessage) {
    const aiStance = userStance === 'for' ? 'against' : 'for';
    const history = messages.map(m => `${m.role === 'user' ? 'Human' : 'AI'}: ${m.content}`).join('\n');
    
    const prompt = `You are participating in a debate about: "${topic}"
    You are arguing ${aiStance} this topic.
    The human is arguing ${userStance} this topic.
    
    Previous messages:
    ${history}
    
    Human's latest argument: "${userMessage}"
    
    Respond with a strong counter-argument. Keep it concise (2-4 sentences), professional, and logical. 
    Make your points compelling but respectful. Use data, logic, or real-world examples when possible.
    Respond naturally as a debate opponent.`;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async evaluateDebate(topic, userStance, messages) {
    const conversation = messages.map(m => 
      `${m.role === 'user' ? 'Participant' : 'AI Opponent'} [${new Date(m.timestamp).toLocaleTimeString()}]: ${m.content}`
    ).join('\n');

    const prompt = `Evaluate this debate performance. The participant was arguing ${userStance} the topic: "${topic}"
    
    Full debate transcript:
    ${conversation}
    
    Provide a detailed evaluation in this exact JSON format:
    {
      "overallScore": <score 0-100>,
      "grammarScore": <score 0-100>,
      "argumentScore": <score 0-100>,
      "confidenceScore": <score 0-100>,
      "suggestions": ["Suggestion 1 for improvement", "Suggestion 2", "Suggestion 3"],
      "corrections": [
        {"original": "what was said wrong", "corrected": "correct version", "explanation": "why this is better"}
      ],
      "strengths": ["Strength 1", "Strength 2"],
      "areasToImprove": ["Area 1", "Area 2"]
    }
    
    Be encouraging but honest. Focus on English communication skills, argument structure, and persuasion.`;

    const result = await this.model.generateContent(prompt);
    return this._parseJSON(result.response.text());
  }

  // ============ SELF INTRO MODULE ============

  async generateIntroScenario(type) {
    const prompt = `Generate a ${type} self-introduction scenario for an IT professional.
    
    ${type === 'formal' 
      ? 'This could be a job interview, corporate meeting, conference, or professional networking event.' 
      : 'This could be a casual meetup, team lunch, hackathon, or social gathering.'}
    
    Return ONLY a JSON object:
    {
      "scenario": "Brief scenario name (e.g., 'Job Interview at a Tech Startup')",
      "description": "Detailed description of the setting, who they are meeting, and what is expected (3-4 sentences)",
      "tips": ["Tip 1 for this scenario", "Tip 2", "Tip 3"],
      "durationHint": "Suggested duration (e.g., '30-60 seconds')"
    }`;

    const result = await this.model.generateContent(prompt);
    return this._parseJSON(result.response.text());
  }

  async evaluateIntro(type, scenario, userIntro) {
    const prompt = `Evaluate this ${type} self-introduction for an IT professional.
    
    Scenario: ${scenario}
    
    Their introduction: "${userIntro}"
    
    Return ONLY a JSON object:
    {
      "overallScore": <score 0-100>,
      "clarityScore": <score 0-100>,
      "confidenceScore": <score 0-100>,
      "relevanceScore": <score 0-100>,
      "suggestions": ["Specific suggestion 1", "Suggestion 2", "Suggestion 3"],
      "corrections": [
        {"original": "problematic phrase", "corrected": "better version", "explanation": "why"}
      ],
      "improvedVersion": "A complete improved version of their introduction"
    }
    
    Focus on English fluency, clarity, professionalism, and scenario appropriateness.`;

    const result = await this.model.generateContent(prompt);
    return this._parseJSON(result.response.text());
  }

  // ============ PITCHING MODULE ============

  async generatePitchScenario() {
    const prompt = `Generate a corporate pitching scenario for an IT professional to practice.
    
    This could be pitching a product idea, project proposal, startup concept, or technical solution.
    
    Return ONLY a JSON object:
    {
      "scenario": "Brief scenario name (e.g., 'Pitching an AI-Powered HR Tool to VCs')",
      "description": "Detailed context about what needs to be pitched, to whom, and the stakes (3-4 sentences)",
      "targetAudience": "Who you're pitching to (e.g., 'Venture Capitalists', 'CTO and Engineering Team')",
      "tips": ["Tip 1", "Tip 2", "Tip 3"],
      "durationHint": "Suggested duration (e.g., '2-3 minutes')",
      "keyPointsToHit": ["Key point 1 to cover", "Key point 2", "Key point 3"]
    }`;

    const result = await this.model.generateContent(prompt);
    return this._parseJSON(result.response.text());
  }

  async evaluatePitch(scenario, targetAudience, userPitch) {
    const prompt = `Evaluate this corporate pitch by an IT professional.
    
    Scenario: ${scenario}
    Target Audience: ${targetAudience}
    
    Their pitch: "${userPitch}"
    
    Return ONLY a JSON object:
    {
      "overallScore": <score 0-100>,
      "persuasionScore": <score 0-100>,
      "clarityScore": <score 0-100>,
      "structureScore": <score 0-100>,
      "deliveryScore": <score 0-100>,
      "suggestions": ["Specific suggestion 1", "Suggestion 2", "Suggestion 3"],
      "corrections": [
        {"original": "problematic phrase", "corrected": "better version", "explanation": "why"}
      ],
      "strengths": ["Strength 1", "Strength 2"],
      "areasToImprove": ["Area 1", "Area 2"],
      "improvedVersion": "A complete improved version of their pitch"
    }`;

    const result = await this.model.generateContent(prompt);
    return this._parseJSON(result.response.text());
  }

  // ============ SOCIAL / PUBLIC SPEAKING MODULE ============

  async generateSocialTask(type) {
    const taskType = type === 'build_connections' ? 'building connections' : 'public speaking';
    
    const prompt = `Generate a ${taskType} task for an IT professional to practice.
    
    ${type === 'build_connections' 
      ? 'Create a scenario where they need to initiate and maintain a professional conversation with a stranger or new colleague. This should simulate real networking situations.'
      : 'Create a public speaking challenge like giving a tech talk, team presentation, or impromptu speech at a conference.'}
    
    Return ONLY a JSON object:
    {
      "task": "Brief task name",
      "description": "Detailed scenario description (3-4 sentences)",
      "aiRole": "Description of who the AI will role-play as (e.g., 'A senior engineer at a tech conference')",
      "objectives": ["Objective 1", "Objective 2", "Objective 3"],
      "tips": ["Tip 1", "Tip 2"],
      "durationHint": "Suggested duration"
    }`;

    const result = await this.model.generateContent(prompt);
    return this._parseJSON(result.response.text());
  }

  async socialResponse(task, aiRole, messages, userMessage) {
    const history = messages.map(m => `${m.role === 'user' ? 'Participant' : 'AI'}: ${m.content}`).join('\n');
    
    const prompt = `You are role-playing as: ${aiRole}
    Task context: ${task}
    
    Previous conversation:
    ${history}
    
    The participant says: "${userMessage}"
    
    Respond naturally in character. Be realistic - sometimes be friendly, sometimes challenging. 
    React appropriately to the participant's social skills. Keep responses natural and conversational (2-4 sentences).`;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async evaluateSocialSession(type, task, messages) {
    const conversation = messages.map(m => 
      `${m.role === 'user' ? 'Participant' : 'AI Partner'}: ${m.content}`
    ).join('\n');

    const prompt = `Evaluate this ${type === 'build_connections' ? 'networking/connection building' : 'public speaking'} session.
    
    Task: ${task}
    
    Full conversation:
    ${conversation}
    
    Return ONLY a JSON object:
    {
      "overallScore": <score 0-100>,
      "approachScore": <score 0-100>,
      "initiationScore": <score 0-100>,
      "completionScore": <score 0-100>,
      "engagementScore": <score 0-100>,
      "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
      "corrections": [
        {"original": "what was said", "corrected": "better approach", "explanation": "why"}
      ],
      "strengths": ["Strength 1", "Strength 2"],
      "areasToImprove": ["Area 1", "Area 2"]
    }`;

    const result = await this.model.generateContent(prompt);
    return this._parseJSON(result.response.text());
  }

  // ============ HELPERS ============

  _parseJSON(text) {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      // Try direct parse
      return JSON.parse(text);
    } catch (e) {
      // Try to find JSON object in text
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        try {
          return JSON.parse(text.substring(start, end + 1));
        } catch (e2) {
          console.error('Failed to parse Gemini response:', text);
          throw new Error('Failed to parse AI response');
        }
      }
      throw new Error('No JSON found in AI response');
    }
  }
}

module.exports = new GeminiService();
