// list-available-models.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

async function listAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found in .env');
    return;
  }

  console.log('═══════════════════════════════════');
  console.log('  LISTING AVAILABLE MODELS');
  console.log('═══════════════════════════════════\n');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log('Fetching available models...\n');
    
    // Method 1: Try to list models
    try {
      const models = await genAI.listModels();
      console.log('✅ Available models for your API key:\n');
      
      for await (const model of models) {
        console.log(`📦 ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Description: ${model.description}`);
        console.log(`   Supported methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
        console.log('');
      }
    } catch (listError) {
      console.log('⚠️  Cannot list models, trying direct REST API...\n');
      
      // Method 2: Use REST API to list models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.models && data.models.length > 0) {
        console.log('✅ Available models (via REST):\n');
        data.models.forEach(model => {
          console.log(`📦 ${model.name}`);
          console.log(`   Display Name: ${model.displayName}`);
          console.log(`   Supported: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('❌ No models available for this API key');
        console.log('\n🔍 This might mean:');
        console.log('   1. API key is from wrong service (use AI Studio, not Cloud Console)');
        console.log('   2. Your region doesn\'t have access to Gemini');
        console.log('   3. Billing needs to be enabled');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TROUBLESHOOTING STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Get NEW API key from: https://aistudio.google.com/app/apikey');
    console.log('2. Make sure you\'re using "Google AI Studio" NOT "Google Cloud"');
    console.log('3. Check if Gemini is available in your country');
    console.log('4. Try the Groq alternative (see backup-solution.md)');
  }
}

listAvailableModels();