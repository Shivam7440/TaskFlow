import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const activeProjectRef = useRef(null);
  const activeWorkspaceRef = useRef(null);

  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        try {
          const res = await notificationAPI.getNotifications();
          setUnreadNotificationsCount(res.data.unreadCount || 0);
        } catch (e) {
          console.error('Failed to fetch unread count:', e);
        }
      };
      fetchUnreadCount();
    } else {
      setUnreadNotificationsCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const token = sessionStorage.getItem('accessToken');
      const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

      // Initialize socket connection
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected');
        setConnected(true);
        if (activeProjectRef.current) {
          console.log('Rejoining active project room:', activeProjectRef.current);
          newSocket.emit('project:join', activeProjectRef.current);
        }
        if (activeWorkspaceRef.current) {
          console.log('Rejoining active workspace room:', activeWorkspaceRef.current);
          newSocket.emit('workspace:join', activeWorkspaceRef.current);
        }
      });

      newSocket.on('notification:new', (notification) => {
        console.log('🔔 New notification received:', notification);
        setUnreadNotificationsCount(prev => prev + 1);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
        
        // If authentication failed (e.g., token invalid or DB disconnected during verification)
        if (error.message && error.message.includes('Authentication error')) {
          newSocket.close();
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          sessionStorage.removeItem('user');
          window.location.href = '/';
        }
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
        socketRef.current = null;
      };
    } else {
      // Disconnect socket if user logs out
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const joinProject = useCallback((projectId) => {
    activeProjectRef.current = projectId;
    if (socket) {
      socket.emit('project:join', projectId);
    }
  }, [socket]);

  const leaveProject = useCallback((projectId) => {
    if (activeProjectRef.current === projectId) {
      activeProjectRef.current = null;
    }
    if (socket) {
      socket.emit('project:leave', projectId);
    }
  }, [socket]);

  const joinWorkspace = useCallback((workspaceId) => {
    activeWorkspaceRef.current = workspaceId;
    if (socket) {
      socket.emit('workspace:join', workspaceId);
    }
  }, [socket]);

  const leaveWorkspace = useCallback((workspaceId) => {
    if (activeWorkspaceRef.current === workspaceId) {
      activeWorkspaceRef.current = null;
    }
    if (socket) {
      socket.emit('workspace:leave', workspaceId);
    }
  }, [socket]);

  const emitTaskViewing = useCallback((taskId, projectId) => {
    if (socket) {
      socket.emit('task:viewing', { taskId, projectId });
    }
  }, [socket]);

  const emitTaskStopViewing = useCallback((taskId, projectId) => {
    if (socket) {
      socket.emit('task:stop-viewing', { taskId, projectId });
    }
  }, [socket]);

  const onTaskUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('task:updated', callback);
      return () => socket.off('task:updated', callback);
    }
  }, [socket]);

  const onCommentAdded = useCallback((callback) => {
    if (socket) {
      socket.on('comment:added', callback);
      return () => socket.off('comment:added', callback);
    }
  }, [socket]);

  const onPresenceUpdate = useCallback((callback) => {
    if (socket) {
      socket.on('task:user-viewing', (data) => callback({ ...data, type: 'viewing' }));
      socket.on('task:user-stop-viewing', (data) => callback({ ...data, type: 'stop-viewing' }));
      return () => {
        socket.off('task:user-viewing');
        socket.off('task:user-stop-viewing');
      };
    }
  }, [socket]);

  const value = {
    socket,
    connected,
    joinProject,
    leaveProject,
    joinWorkspace,
    leaveWorkspace,
    emitTaskViewing,
    emitTaskStopViewing,
    onTaskUpdate,
    onCommentAdded,
    onPresenceUpdate,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};