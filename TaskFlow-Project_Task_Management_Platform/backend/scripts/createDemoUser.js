// scripts/createDemoUser.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/user');

const createDemoUser = async () => {
  try {
    await connectDB();
    // Check if demo user already exists
    const existing = await User.findOne({ email: 'demo@example.com' });
    if (existing) {
      console.log('Demo user already exists:', existing);
      return;
    }
    const demoUser = new User({
      name: 'Demo User',
      email: 'demo@example.com',
      password: 'DemoPass123', // pre-save hook will hash it
      role: 'user',
    });
    await demoUser.save();
    console.log('Demo user created:', demoUser);
  } catch (err) {
    console.error('Error creating demo user:', err);
  } finally {
    mongoose.connection.close();
  }
};

createDemoUser();
