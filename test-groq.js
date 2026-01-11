// test-groq.js - FIXED with correct Llama 3.3 model
const Groq = require('groq-sdk');
require('dotenv').config();

console.log('═══════════════════════════════════');
console.log('  GROQ API CONNECTION TEST');
console.log('  (Llama 3.3 70B - FIXED)');
console.log('═══════════════════════════════════\n');

async function testGroq() {
  try {
    console.log('Testing Groq API...\n');
    
    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY not found in .env file!');
      return;
    }
    
    console.log('✅ API Key found in .env');
    console.log('Key starts with:', process.env.GROQ_API_KEY.substring(0, 10) + '...');
    console.log('Key length:', process.env.GROQ_API_KEY.length, 'characters\n');
    
    console.log('🔌 Initializing Groq...');
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    console.log('✅ Groq initialized\n');
    
    // Test 1: Simple message
    console.log('📡 Test 1: Simple greeting');
    const completion1 = await groq.chat.completions.create({
      messages: [
        { role: 'user', content: 'Say hello in a friendly way!' }
      ],
      model: 'llama-3.3-70b-versatile',  // ✅ FIXED: Updated to 3.3
      temperature: 0.9,
      max_tokens: 100
    });
    
    console.log('✅ Response:', completion1.choices[0].message.content);
    console.log('');
    
    // Test 2: Conversation with memory
    console.log('📡 Test 2: Testing conversation memory');
    const completion2 = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful assistant with memory.' },
        { role: 'user', content: 'My name is Alex and I love pizza' },
        { role: 'assistant', content: 'Nice to meet you, Alex! Pizza is awesome!' },
        { role: 'user', content: 'What did I say I love?' }
      ],
      model: 'llama-3.3-70b-versatile',  // ✅ FIXED: Updated to 3.3
      temperature: 0.7,
      max_tokens: 100
    });
    
    console.log('✅ Memory test:', completion2.choices[0].message.content);
    console.log('');
    
    // Test 3: Personality test
    console.log('📡 Test 3: Personality/tone test');
    const completion3 = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'You are a cheerful and energetic friend who loves celebrating successes!' 
        },
        { role: 'user', content: 'I just aced my exam!' }
      ],
      model: 'llama-3.3-70b-versatile',  // ✅ FIXED: Updated to 3.3
      temperature: 0.9,
      max_tokens: 150
    });
    
    console.log('✅ Personality response:', completion3.choices[0].message.content);
    console.log('');
    
    // Success summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 Groq API is working perfectly!');
    console.log('✨ Model: llama-3.3-70b-versatile');  // ✅ FIXED
    console.log('🚀 Ready for your chatbot!\n');
    
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR OCCURRED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error message:', error.message);
    console.log('\n💡 Full error details:');
    console.log(error);
  }
}

testGroq();