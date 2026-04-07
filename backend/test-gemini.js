require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('Testing Gemini API...');
  console.log('API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'MISSING');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not defined in .env');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // List models first to see what's available
    console.log('Fetching available models...');
    // Note: listModels is not directly on genAI in all versions, 
    // but we can try to fetch it if the SDK supports it.
    // Alternatively, just try the most common models.
    
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash',
      'gemini-pro'
    ];

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('test');
        console.log(`✅ Model found and working: ${modelName}`);
        return; // Stop if we find one
      } catch (e) {
        console.log(`❌ Model failed: ${modelName} - ${e.message}`);
      }
    }
  } catch (error) {
    console.error('FAILURE: Gemini API test failed.');
    console.error('Error details:', error.message);
  }
}

testGemini();
