// index.js - Main Express Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./database');
const MemoryManager = require('./memory');
const Chatbot = require('./chatbot');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Global variables
let chatbot;
let memoryManager;

// ==================== MIDDLEWARE ====================

// Enable CORS for frontend
app.use(cors({
  origin: '*',  // Allow all origins (for development)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ==================== INITIALIZATION ====================

/**
 * Initialize database and chatbot
 */
async function initialize() {
  try {
    console.log('🚀 Initializing STAN Chatbot Server...\n');

    // Connect to MongoDB
    const db = await connectDB();

    // Initialize memory manager
    memoryManager = new MemoryManager(db);
    console.log('✅ Memory Manager initialized\n');

    // Initialize chatbot
    chatbot = new Chatbot(memoryManager);
    console.log('✅ Chatbot initialized\n');

    // Test Gemini API connection
    const health = await chatbot.getHealth();
    if (health.status === 'healthy') {
      console.log('✅ Gemini AI connected\n');
    } else {
      console.warn('⚠️ Gemini AI connection issue:', health.message);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Server ready to accept requests!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// ==================== API ROUTES ====================

/**
 * POST /api/chat
 * Main chat endpoint
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;

    // Validate request
    if (!userId || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both userId and message are required'
      });
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid message',
        message: 'Message must be a non-empty string'
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        error: 'Message too long',
        message: 'Message must be 500 characters or less'
      });
    }

    console.log(`\n📨 Chat request from user: ${userId}`);

    // Generate response
    const response = await chatbot.chat(userId, message.trim());

    // Send response
    res.json({
      response,
      timestamp: new Date().toISOString(),
      userId
    });

    console.log(`✅ Response sent to ${userId}\n`);

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong processing your message'
    });
  }
});

/**
 * GET /api/user/:userId
 * Get user profile and statistics
 */
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId',
        message: 'userId parameter is required'
      });
    }

    // Get user data
    const user = await memoryManager.getUser(userId);
    const stats = await memoryManager.getUserStats(userId);

    res.json({
      profile: user.profile,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve user data'
    });
  }
});

/**
 * GET /api/user/:userId/history
 * Get conversation history
 */
app.get('/api/user/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId'
      });
    }

    const history = await memoryManager.getConversationHistory(userId, limit);

    res.json({
      userId,
      messageCount: history.length,
      messages: history
    });

  } catch (error) {
    console.error('❌ Error fetching history:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    const health = chatbot ? await chatbot.getHealth() : { status: 'initializing' };
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      bot: process.env.BOT_NAME || 'Alex',
      gemini: health
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /
 * Serve frontend
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ==================== ERROR HANDLING ====================

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.url} does not exist`
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==================== SERVER START ====================

/**
 * Start server
 */
async function startServer() {
  try {
    // Initialize everything
    await initialize();

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n🌐 Server running on http://localhost:${PORT}`);
      console.log(`📡 API endpoint: http://localhost:${PORT}/api/chat`);
      console.log(`💻 Frontend: http://localhost:${PORT}\n`);
      console.log('Press Ctrl+C to stop server\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ==================== PROCESS HANDLERS ====================

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();