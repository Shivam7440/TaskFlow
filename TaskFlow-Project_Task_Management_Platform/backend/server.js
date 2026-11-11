require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import configurations
const connectDB = require('./config/database');
const passport = require('./config/passport');
const initializeSocket = require('./socket');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const projectRoutes = require('./routes/projectRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const sprintRoutes = require('./routes/sprintRoutes');
const messageRoutes = require('./routes/messageRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const templateRoutes = require('./routes/templateRoutes');
const documentRoutes = require('./routes/documentRoutes');
const aiRoutes = require('./routes/aiRoutes');
const contactRoutes = require('./routes/contactRoutes');
const platformUsageRoutes = require('./routes/platformUsageRoutes');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  process.env.CLIENT_URL?.replace(/\/$/, ''), // strip trailing slash
  'http://localhost:3000',
  'http://localhost:3001',
  'https://taskflow-projectmanagementplatform.vercel.app',
  'https://taskflow-frontend-taupe-two.vercel.app',
  'https://task-flow-zeta-jet.vercel.app',
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin === allowed || origin.endsWith('.vercel.app'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Initialize Socket.io
const io = new Server(server, {
  cors: corsOptions,
});

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(corsOptions));

// Rate limiting - disabled in development for testing
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit for development
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session middleware for passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',   // HTTPS only in prod
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      // 'none' required for cross-origin OAuth on HTTPS (Render ↔ Vercel)
      // 'lax' works for same-site / local development
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Task Management API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      tasks: '/api/tasks',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/platform-usage', platformUsageRoutes);

// Quick DB ping diagnostic
app.get('/api/dbping', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    res.json({ success: true, pingMs: Date.now() - start, db: mongoose.connection.name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check endpoint (includes MongoDB connection state)
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbState = mongoose.connection.readyState;
  const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: dbStateMap[dbState] || 'unknown',
    dbState,
  });
});

// Initialize Socket.io
const socketHelpers = initializeSocket(io);

// Socket.io status endpoint
app.get('/api/socket/status', (req, res) => {
  res.json({
    success: true,
    activeConnections: socketHelpers.getActiveUserCount(),
    activeUsers: socketHelpers.getActiveUsers(),
  });
});

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║  ---> Task Management Server Running                  ║
  ║                                                       ║
  ║  Environment:${process.env.NODE_ENV || 'development'} ║
  ║  Port: ${PORT}                                        ║
  ║  API URL: http://localhost:${PORT}                    ║
  ║  Socket.io: Enabled                                   ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);

  // Self-ping to prevent Render free tier from sleeping.
  // Pings the health endpoint every 14 minutes (Render sleeps after 15 min of inactivity).
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    const https = require('https');
    const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes
    setInterval(() => {
      const url = `${process.env.RENDER_EXTERNAL_URL}/api/health`;
      https.get(url, (res) => {
        console.log(`🏓 Self-ping: ${url} → ${res.statusCode}`);
      }).on('error', (err) => {
        console.warn(`⚠️  Self-ping failed: ${err.message}`);
      });
    }, PING_INTERVAL_MS);
    console.log(`🏓 Self-ping enabled → pinging ${process.env.RENDER_EXTERNAL_URL}/api/health every 14 min`);
  }
});

// Handle unhandled promise rejections
// Log the error but do NOT exit — crashing the whole server because of a
// single unhandled rejection (e.g. a MongoDB timeout) brings down all users.
process.on('unhandledRejection', (err) => {
  console.error(`⚠️  Unhandled Promise Rejection: ${err.message}`);
  console.error(err.stack);
  // Only exit on truly fatal errors (not network/DB timeouts)
  if (err.name === 'SyntaxError' || err.name === 'ReferenceError' || err.name === 'TypeError') {
    console.error('Fatal error — shutting down.');
    server.close(() => process.exit(1));
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

module.exports = { app, server, io };