const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.io configuration for real-time features
 * Handles WebSocket connections, authentication, and real-time events
 */

// Store active users
const activeUsers = new Map();

const initializeSocket = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.name} (${socket.user._id})`);

    // Add user to active users
    activeUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: {
        id: socket.user._id,
        name: socket.user.name,
        email: socket.user.email,
        avatar: socket.user.avatar,
      },
      connectedAt: new Date(),
    });

    // Join user's personal room
    socket.join(`user:${socket.user._id}`);

    // Emit to all users that this user is online
    io.emit('user:online', {
      userId: socket.user._id,
      name: socket.user.name,
      avatar: socket.user.avatar,
    });

    /**
     * Join a project room for real-time updates
     */
    socket.on('project:join', (projectId) => {
      socket.join(`project:${projectId}`);
      console.log(`User ${socket.user.name} joined project: ${projectId}`);

      // Emit presence to other users in the project
      socket.to(`project:${projectId}`).emit('user:joined-project', {
        userId: socket.user._id,
        name: socket.user.name,
        avatar: socket.user.avatar,
        projectId,
      });
    });

    /**
     * Leave a project room
     */
    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
      console.log(`User ${socket.user.name} left project: ${projectId}`);

      // Emit to others that user left
      socket.to(`project:${projectId}`).emit('user:left-project', {
        userId: socket.user._id,
        projectId,
      });
    });

    /**
     * Task is being viewed/edited (presence indicator)
     */
    socket.on('task:viewing', ({ taskId, projectId }) => {
      socket.to(`project:${projectId}`).emit('task:user-viewing', {
        taskId,
        userId: socket.user._id,
        name: socket.user.name,
        avatar: socket.user.avatar,
      });
    });

    /**
     * User stopped viewing a task
     */
    socket.on('task:stop-viewing', ({ taskId, projectId }) => {
      socket.to(`project:${projectId}`).emit('task:user-stop-viewing', {
        taskId,
        userId: socket.user._id,
      });
    });

    /**
     * User is typing a comment
     */
    socket.on('comment:typing', ({ taskId, projectId, isTyping }) => {
      socket.to(`project:${projectId}`).emit('comment:user-typing', {
        taskId,
        userId: socket.user._id,
        name: socket.user.name,
        isTyping,
      });
    });

    /**
     * User is typing a message
     */
    socket.on('message:typing', ({ recipientId, projectId, isTyping }) => {
      if (projectId) {
        socket.to(`project:${projectId}`).emit('message:user-typing', {
          userId: socket.user._id,
          name: socket.user.name,
          projectId,
          isTyping,
        });
      } else if (recipientId) {
        socket.to(`user:${recipientId}`).emit('message:user-typing', {
          userId: socket.user._id,
          name: socket.user.name,
          isTyping,
        });
      }
    });

    /**
     * Join workspace room
     */
    socket.on('workspace:join', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      console.log(`User ${socket.user.name} joined workspace: ${workspaceId}`);
    });

    /**
     * Leave workspace room
     */
    socket.on('workspace:leave', (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    /**
     * Get active users in a project
     */
    socket.on('project:get-active-users', (projectId, callback) => {
      const room = io.sockets.adapter.rooms.get(`project:${projectId}`);
      const activeUsersInProject = [];

      if (room) {
        room.forEach((socketId) => {
          const connectedSocket = io.sockets.sockets.get(socketId);
          if (connectedSocket && connectedSocket.user) {
            activeUsersInProject.push({
              userId: connectedSocket.user._id,
              name: connectedSocket.user.name,
              avatar: connectedSocket.user.avatar,
            });
          }
        });
      }

      if (callback) {
        callback(activeUsersInProject);
      }
    });

    /**
     * Cursor position for collaborative editing (optional feature)
     */
    socket.on('cursor:move', ({ projectId, taskId, position }) => {
      socket.to(`project:${projectId}`).emit('cursor:user-moved', {
        taskId,
        userId: socket.user._id,
        name: socket.user.name,
        position,
      });
    });

    /**
     * Handle user disconnection
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.name}`);

      // Remove from active users
      activeUsers.delete(socket.user._id.toString());

      // Emit to all users that this user is offline
      io.emit('user:offline', {
        userId: socket.user._id,
      });
    });

    /**
     * Error handling
     */
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.name}:`, error);
    });
  });

  // Return helper function to get active users
  return {
    getActiveUsers: () => Array.from(activeUsers.values()),
    getActiveUserCount: () => activeUsers.size,
  };
};

module.exports = initializeSocket;