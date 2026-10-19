const mongoose = require('mongoose');
const dns = require('dns');

/**
 * Database connection configuration
 * Connects to MongoDB using the URI from environment variables.
 * Includes DNS server overrides for resolving SRV records on macOS/local routers,
 * connection retries, and an automatic fallback to local MongoDB if the primary Atlas DB is offline.
 */
const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const localFallbackUri = 'mongodb://127.0.0.1:27017/task-management';
  
  // Set DNS servers to Google and Cloudflare to prevent querySrv ETIMEOUT on macOS/local networks
  if (primaryUri && primaryUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      console.log('🌐 Configured public DNS servers (8.8.8.8, 1.1.1.1) for MongoDB Atlas SRV resolution');
    } catch (dnsErr) {
      console.warn('⚠️  Could not set custom DNS servers, using system defaults:', dnsErr.message);
    }
  }

  // Register mongoose connection events once
  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  // Graceful shutdown
  const handleShutdown = async () => {
    try {
      await mongoose.connection.close();
      console.log('🛑 MongoDB connection closed due to app termination');
    } catch (err) {
      console.error('Error during database close:', err.message);
    }
    process.exit(0);
  };
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      console.log(`🔄 Connecting to MongoDB (Attempt ${attempt + 1}/${maxRetries + 1})...`);
      const conn = await mongoose.connect(primaryUri);
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
      return; // Connection successful, exit connectDB
    } catch (error) {
      attempt++;
      console.error(`❌ Connection attempt ${attempt} failed: ${error.message}`);
      if (attempt <= maxRetries) {
        console.log(`⏱️  Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  // If primary connection completely fails, try fallback to local MongoDB
  if (primaryUri !== localFallbackUri) {
    console.warn(`⚠️  Primary MongoDB connection failed. Attempting fallback to local MongoDB...`);
    try {
      const conn = await mongoose.connect(localFallbackUri);
      console.log(`✅ MongoDB Fallback Connected (Local): ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error(`❌ Local MongoDB fallback also failed: ${fallbackError.message}`);
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
};

module.exports = connectDB;