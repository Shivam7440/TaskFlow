const mongoose = require('mongoose');
const dns = require('dns');

/**
 * Database connection configuration
 * Connects to MongoDB Atlas with retry logic.
 * In production (Render), skip the localhost fallback since it's unavailable.
 */

// Register mongoose connection events only once (at module load) to avoid listener leaks
mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;

  if (!primaryUri) {
    console.error('❌ MONGODB_URI environment variable is not set!');
    return;
  }

  // Set DNS servers to Google and Cloudflare to prevent querySrv ETIMEOUT
  if (primaryUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      console.log('🌐 Configured public DNS servers (8.8.8.8, 1.1.1.1) for MongoDB Atlas SRV resolution');
    } catch (dnsErr) {
      console.warn('⚠️  Could not set custom DNS servers, using system defaults:', dnsErr.message);
    }
  }

  // Graceful shutdown (register once)
  const handleShutdown = async () => {
    try {
      await mongoose.connection.close();
      console.log('🛑 MongoDB connection closed due to app termination');
    } catch (err) {
      console.error('Error during database close:', err.message);
    }
    process.exit(0);
  };
  process.once('SIGINT', handleShutdown);
  process.once('SIGTERM', handleShutdown);

  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`🔄 Connecting to MongoDB Atlas (Attempt ${attempt + 1}/${maxRetries})...`);
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 15000,  // 15s — longer for Render cold starts
        connectTimeoutMS: 20000,
        socketTimeoutMS: 30000,
      });
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
      return; // Connection successful
    } catch (error) {
      attempt++;
      console.error(`❌ Connection attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`⏱️  Retrying in 3 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  // In production on Render, do NOT try localhost — it's not available
  if (process.env.NODE_ENV !== 'production') {
    const localFallbackUri = 'mongodb://127.0.0.1:27017/task-management';
    console.warn('⚠️  Primary MongoDB connection failed. Attempting fallback to local MongoDB...');
    try {
      const conn = await mongoose.connect(localFallbackUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB Fallback Connected (Local): ${conn.connection.host}`);
      return;
    } catch (fallbackError) {
      console.error(`❌ Local MongoDB fallback also failed: ${fallbackError.message}`);
    }
  }

  console.error('');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🛑  MONGODB CONNECTION FAILED — Fix one of the following:');
  console.error('');
  console.error('  Option A (Atlas): Whitelist your IP/Render in MongoDB Atlas');
  console.error('    → Go to: https://cloud.mongodb.com');
  console.error('    → Security → Network Access → Add 0.0.0.0/0 (allow all)');
  console.error('');
  console.error('  Option B (Local dev): Install & start MongoDB locally');
  console.error('    → brew services start mongodb-community');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // Server stays running — DB operations will return 500 errors but server won't crash
};

module.exports = connectDB;