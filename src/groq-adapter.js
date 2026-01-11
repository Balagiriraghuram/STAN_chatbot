// groq-adapter.js - Groq API adapter that mimics Gemini's interface
const Groq = require('groq-sdk');
require('dotenv').config();

/**
 * GroqAdapter - Makes Groq API work like Gemini API
 * This allows you to switch from Gemini to Groq with minimal code changes
 */
class GroqAdapter {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not defined in .env file');
    }

    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    
    // Using Llama 3.3 70B - Latest model (updated from deprecated 3.1)
    this.model = 'llama-3.3-70b-versatile';
    
    console.log('✅ Groq adapter initialized with Llama 3.1');
  }

  /**
   * Mimics Gemini's getGenerativeModel method
   * @param {Object} config - Model configuration
   * @returns {GroqAdapter} Returns self to allow chaining
   */
  getGenerativeModel(config = {}) {
    // Store config for later use
    this.config = {
      temperature: config.generationConfig?.temperature || 0.9,
      maxTokens: config.generationConfig?.maxOutputTokens || 1024,
      topP: config.generationConfig?.topP || 0.95,
      topK: config.generationConfig?.topK || 40
    };
    
    return this;
  }

  /**
   * Mimics Gemini's generateContent method
   * @param {String} prompt - The prompt to send
   * @returns {Object} Response object matching Gemini's format
   */
  async generateContent(prompt) {
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        temperature: this.config?.temperature || 0.9,
        max_tokens: this.config?.maxTokens || 1024,
        top_p: this.config?.topP || 0.95
      });

      const responseText = completion.choices[0].message.content;

      // Return in Gemini's format
      return {
        response: {
          text: () => responseText
        }
      };
    } catch (error) {
      console.error('❌ Groq API Error:', error.message);
      throw error;
    }
  }

  /**
   * Mimics Gemini's startChat method with history
   * @param {Object} options - Chat options including history and systemInstruction
   * @returns {Object} Chat object with sendMessage method
   */
  startChat({ history = [], systemInstruction = '' }) {
    const messages = [];

    // Add system instruction if provided
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }

    // Convert history from Gemini format to Groq format
    // Gemini format: { role: 'user'/'model', parts: [{ text: '...' }] }
    // Groq format: { role: 'user'/'assistant', content: '...' }
    history.forEach(msg => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.parts[0].text
      });
    });

    // Return chat object with sendMessage method
    return {
      sendMessage: async (userMessage) => {
        // Add user message to conversation
        messages.push({ role: 'user', content: userMessage });

        try {
          // Send to Groq
          const completion = await this.groq.chat.completions.create({
            messages: messages,
            model: this.model,
            temperature: this.config?.temperature || 0.9,
            max_tokens: this.config?.maxTokens || 1024,
            top_p: this.config?.topP || 0.95
          });

          const responseText = completion.choices[0].message.content;
          
          // Add assistant response to history for next turn
          messages.push({ role: 'assistant', content: responseText });

          // Return in Gemini's format
          return {
            response: {
              text: () => responseText
            }
          };
        } catch (error) {
          console.error('❌ Groq Chat Error:', error.message);
          throw error;
        }
      }
    };
  }
}

module.exports = GroqAdapter;