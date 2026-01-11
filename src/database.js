// database.js - MongoDB Connection Handler
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Database instance (singleton pattern)
let db = null;
let client = null;

/**
 * Connect to MongoDB Atlas
 * Returns the database instance
 */
async function connectDB() {
  try {
    // If already connected, return existing connection
    if (db) {
      console.log('📦 Using existing database connection');
      return db;
    }

    // Create new MongoDB client
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000,          // Close sockets after 45 seconds
    });

    // Connect to MongoDB
    await client.connect();

    // Get database (name from connection string or default)
    db = client.db('chatbot');

    // Test connection
    await db.command({ ping: 1 });
    
    console.log('✅ Successfully connected to MongoDB Atlas');
    console.log(`📊 Database: ${db.databaseName}`);

    // Create indexes for better performance
    await createIndexes();

    return db;

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

/**
 * Create database indexes for better query performance
 */
async function createIndexes() {
  try {
    // Index on userId for faster user lookups
    await db.collection('users').createIndex({ userId: 1 }, { unique: true });
    
    // Index on userId and timestamp for conversation queries
    await db.collection('conversations').createIndex({ userId: 1, timestamp: -1 });
    
    console.log('📇 Database indexes created');
  } catch (error) {
    console.warn('⚠️ Index creation warning:', error.message);
  }
}

/**
 * Close database connection
 */
async function closeDB() {
  try {
    if (client) {
      await client.close();
      db = null;
      client = null;
      console.log('🔌 Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
}

/**
 * Get database instance
 */
function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  closeDB,
  getDB
};