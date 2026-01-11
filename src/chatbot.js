// chatbot.js - AI Chatbot Core Logic (Updated for Groq)
// Changed from Gemini to Groq (Llama 3.1) for better quota and open-source LLM bonus points

const GroqAdapter = require('./groq-adapter');  // ✅ CHANGED: Using Groq instead of Gemini
const { 
  buildSystemPrompt, 
  buildConversationHistory, 
  detectTone, 
  getToneInstructions 
} = require('./personality');
require('dotenv').config();

/**
 * Chatbot - Main AI conversation handler
 * Now using Groq API with Llama 3.1 70B model
 */
class Chatbot {
  constructor(memoryManager) {
    // Validate API key
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not defined in .env file');
    }

    // ✅ CHANGED: Initialize Groq instead of Gemini
    this.genAI = new GroqAdapter();
    
    // Configure the model - now using Llama 3.3 70B (updated from deprecated 3.1)
    this.model = this.genAI.getGenerativeModel({
      model: 'llama-3.3-70b-versatile',  // ✅ Updated: Groq's latest Llama 3.3 model
      generationConfig: {
        temperature: 0.9,        // Higher = more creative (0.0 to 1.0)
        topP: 0.95,             // Nucleus sampling
        topK: 40,               // Top-k sampling
        maxOutputTokens: 1024,  // Maximum response length
      },
      // Note: Groq doesn't use safety settings the same way as Gemini
      // The adapter handles this automatically
    });

    this.memory = memoryManager;
    console.log('✅ Chatbot initialized with Groq (Llama 3.3 70B)');
  }

  /**
   * Generate AI response to user message
   * @param {string} userId - User identifier
   * @param {string} userMessage - User's message
   * @returns {string} Bot's response
   */
  async chat(userId, userMessage) {
    try {
      console.log(`\n💬 New message from ${userId}: "${userMessage}"`);

      // Step 1: Get user context and memory
      const context = await this.memory.getContextForPrompt(userId);
      console.log(`🧠 Retrieved context for user: ${context.userName || 'Unknown'}`);

      // Step 2: Detect emotional tone
      const tone = detectTone(userMessage);
      console.log(`🎭 Detected tone: ${tone}`);

      // Step 3: Build system prompt with memory
      let systemPrompt = buildSystemPrompt(context);
      
      // Add tone-specific instructions
      systemPrompt += getToneInstructions(tone);

      // Step 4: Build conversation history
      const history = buildConversationHistory(context.recentMessages);

      // Step 5: Start chat with history and system instructions
      const chat = this.model.startChat({
        history: history,
        systemInstruction: systemPrompt
      });

      console.log(`🤖 Sending to Groq (Llama 3.3)...`);

      // Step 6: Send message and get response
      const result = await chat.sendMessage(userMessage);
      const botResponse = result.response.text();

      console.log(`✅ Received response: "${botResponse.substring(0, 50)}..."`);

      // Step 7: Save both messages to database
      await this.memory.saveMessage(userId, 'user', userMessage);
      await this.memory.saveMessage(userId, 'assistant', botResponse);

      // Step 8: Extract and save important information from user message
      await this.memory.extractAndSaveInfo(userId, userMessage);

      // Step 9: Return bot's response
      return botResponse;

    } catch (error) {
      console.error('❌ Chatbot error:', error);
      
      // Return friendly error message
      return this.getErrorResponse(error);
    }
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} User-friendly error message
   */
  getErrorResponse(error) {
    // Check for specific error types
    if (error.message && error.message.includes('API key')) {
      return "Oops! There's an issue with my configuration. Let me know and I'll get it fixed!";
    }

    if (error.message && (error.message.includes('quota') || error.message.includes('rate limit'))) {
      return "Whoa, I've been chatting a lot today! Give me a moment to catch my breath. 😅";
    }

    if (error.message && error.message.includes('network')) {
      return "Hmm, seems like I'm having trouble connecting. Can you try again in a sec?";
    }

    // Generic error
    return "Sorry, I got a bit confused there. Mind rephrasing that?";
  }

  /**
   * Get chatbot health status
   * @returns {object} Health status
   */
  async getHealth() {
    try {
      // Test Groq API connection
      const testResult = await this.model.generateContent('Hello');
      
      return {
        status: 'healthy',
        aiConnected: true,
        model: 'llama-3.3-70b-versatile',  // ✅ UPDATED: Now using Llama 3.3
        provider: 'Groq',  // ✅ NEW: Specify provider
        message: 'All systems operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        aiConnected: false,
        error: error.message,
        message: 'Groq API connection failed'
      };
    }
  }
}

// CRITICAL: Export the class directly (not as object)
module.exports = Chatbot;