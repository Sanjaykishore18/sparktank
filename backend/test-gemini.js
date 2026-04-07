// backend/src/services/geminiService.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in .env file");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ Use a valid model name
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest"
    });
  }

  async generateDebateTopic(promptText) {
    try {
      const result = await this.model.generateContent(promptText);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini API error:", error.message);
      throw new Error("Failed to generate debate topic");
    }
  }
}

module.exports = new GeminiService();
