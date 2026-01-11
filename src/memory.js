// memory.js - Memory Management System
const { v4: uuidv4 } = require('uuid');

/**
 * MemoryManager - Handles user profiles, facts, and conversation history
 */
class MemoryManager {
  constructor(db) {
    this.db = db;
    this.users = db.collection('users');
    this.conversations = db.collection('conversations');
  }

  /**
   * Get or create user profile
   * @param {string} userId - Unique user identifier
   * @returns {object} User profile
   */
  async getUser(userId) {
    try {
      // Try to find existing user
      let user = await this.users.findOne({ userId });

      // If user doesn't exist, create new profile
      if (!user) {
        console.log(`👤 Creating new user profile: ${userId}`);
        
        user = {
          userId,
          createdAt: new Date(),
          lastActive: new Date(),
          profile: {
            name: null,
            age: null,
            location: null,
            interests: [],
            preferences: {},
            facts: []
          },
          conversationCount: 0,
          totalMessages: 0
        };

        await this.users.insertOne(user);
        console.log(`✅ New user created: ${userId}`);
      } else {
        // Update last active time
        await this.users.updateOne(
          { userId },
          { $set: { lastActive: new Date() } }
        );
      }

      return user;

    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  }

  /**
   * Update user profile information
   * @param {string} userId - User identifier
   * @param {object} profileUpdates - Profile fields to update
   */
  async updateUserProfile(userId, profileUpdates) {
    try {
      await this.users.updateOne(
        { userId },
        { 
          $set: { 
            profile: profileUpdates,
            lastActive: new Date()
          } 
        }
      );
      console.log(`📝 Updated profile for user: ${userId}`);
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Add a new fact/memory about the user
   * @param {string} userId - User identifier
   * @param {string} fact - Fact to remember
   */
  async addMemory(userId, fact) {
    try {
      const user = await this.getUser(userId);
      
      // Avoid duplicate facts
      if (user.profile.facts.includes(fact)) {
        return;
      }

      await this.users.updateOne(
        { userId },
        { 
          $push: { 'profile.facts': fact },
          $set: { lastActive: new Date() }
        }
      );
      
      console.log(`🧠 Added memory for ${userId}: "${fact}"`);
    } catch (error) {
      console.error('❌ Error adding memory:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a user
   * @param {string} userId - User identifier
   * @param {number} limit - Maximum messages to retrieve
   * @returns {array} Array of messages
   */
  async getConversationHistory(userId, limit = 10) {
    try {
      const messages = await this.conversations
        .find({ userId })
        .sort({ timestamp: -1 })  // Most recent first
        .limit(limit)
        .toArray();

      // Reverse to get chronological order (oldest to newest)
      return messages.reverse();

    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Save a message to conversation history
   * @param {string} userId - User identifier
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   */
  async saveMessage(userId, role, content) {
    try {
      const message = {
        messageId: uuidv4(),
        userId,
        role,
        content,
        timestamp: new Date()
      };

      await this.conversations.insertOne(message);

      // Increment user's message count
      await this.users.updateOne(
        { userId },
        { 
          $inc: { totalMessages: 1 },
          $set: { lastActive: new Date() }
        }
      );

      console.log(`💬 Saved ${role} message for ${userId}`);

    } catch (error) {
      console.error('❌ Error saving message:', error);
      throw error;
    }
  }

  /**
   * Get complete context for AI prompt
   * @param {string} userId - User identifier
   * @returns {object} Context including profile and recent messages
   */
  async getContextForPrompt(userId) {
    try {
      const user = await this.getUser(userId);
      const recentMessages = await this.getConversationHistory(userId, 5);

      return {
        userName: user.profile.name,
        userAge: user.profile.age,
        userLocation: user.profile.location,
        interests: user.profile.interests,
        preferences: user.profile.preferences,
        facts: user.profile.facts,
        recentMessages,
        conversationCount: user.conversationCount,
        totalMessages: user.totalMessages
      };

    } catch (error) {
      console.error('❌ Error getting context:', error);
      throw error;
    }
  }

  /**
   * Extract information from user message using patterns
   * @param {string} userId - User identifier
   * @param {string} message - User's message
   */
  async extractAndSaveInfo(userId, message) {
    try {
      const user = await this.getUser(userId);
      const lowerMessage = message.toLowerCase();

      // Pattern matching for common information
      const patterns = {
        name: /(?:my name is|i'm|i am|call me)\s+([a-z]+)/i,
        age: /(?:i am|i'm)\s+(\d+)\s*(?:years old|yrs old)?/i,
        location: /(?:i live in|i'm from|from)\s+([a-z\s]+)/i,
        favoriteColor: /(?:favorite|favourite)\s+colou?r\s+is\s+(\w+)/i,
        hobby: /(?:i love|i like|i enjoy)\s+([a-z\s]+)/i
      };

      let updated = false;
      const newProfile = { ...user.profile };

      // Extract name
      const nameMatch = message.match(patterns.name);
      if (nameMatch && !newProfile.name) {
        newProfile.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
        console.log(`📝 Learned user's name: ${newProfile.name}`);
        updated = true;
      }

      // Extract age
      const ageMatch = message.match(patterns.age);
      if (ageMatch && !newProfile.age) {
        newProfile.age = parseInt(ageMatch[1]);
        console.log(`📝 Learned user's age: ${newProfile.age}`);
        updated = true;
      }

      // Extract location
      const locationMatch = message.match(patterns.location);
      if (locationMatch && !newProfile.location) {
        newProfile.location = locationMatch[1].trim();
        console.log(`📝 Learned user's location: ${newProfile.location}`);
        updated = true;
      }

      // Extract favorite color
      const colorMatch = message.match(patterns.favoriteColor);
      if (colorMatch) {
        newProfile.preferences.favoriteColor = colorMatch[1];
        console.log(`📝 Learned favorite color: ${colorMatch[1]}`);
        updated = true;
      }

      // Extract hobbies/interests
      const hobbyMatch = message.match(patterns.hobby);
      if (hobbyMatch) {
        const hobby = hobbyMatch[1].trim();
        if (!newProfile.interests.includes(hobby)) {
          newProfile.interests.push(hobby);
          console.log(`📝 Learned interest: ${hobby}`);
          updated = true;
        }
      }

      // Update profile if anything was extracted
      if (updated) {
        await this.updateUserProfile(userId, newProfile);
      }

    } catch (error) {
      console.error('❌ Error extracting info:', error);
    }
  }

  /**
   * Get user statistics
   * @param {string} userId - User identifier
   * @returns {object} User statistics
   */
  async getUserStats(userId) {
    try {
      const user = await this.getUser(userId);
      const messageCount = await this.conversations.countDocuments({ userId });

      return {
        userId: user.userId,
        name: user.profile.name,
        memberSince: user.createdAt,
        lastActive: user.lastActive,
        totalMessages: messageCount,
        factsStored: user.profile.facts.length,
        interestsStored: user.profile.interests.length
      };

    } catch (error) {
      console.error('❌ Error getting stats:', error);
      throw error;
    }
  }
}

module.exports = MemoryManager;