import axios from 'axios';
import { getAndResetPending } from '../hooks/usePlatformTracker';

/**
 * Axios instance configured for API requests
 * Handles authentication tokens and error responses
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Piggyback platform usage flush on any outgoing request
    // (skip the platform-usage/log endpoint itself to avoid infinite recursion)
    if (!config.url?.includes('platform-usage/log')) {
      const pending = getAndResetPending();
      if (pending) {
        // Fire-and-forget — don't await, don't block the original request
        api.post('/platform-usage/log', pending).catch(() => {});
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          sessionStorage.setItem('accessToken', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } else {
          // No refresh token available, force redirect
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          sessionStorage.removeItem('user');
          window.location.href = '/';
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
};

// Task API
export const taskAPI = {
  getTasks: (params) => api.get('/tasks', { params }),
  getTask: (id) => api.get(`/tasks/${id}`),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  moveTask: (id, data) => api.put(`/tasks/${id}/move`, data),
  addAttachment: (id, formData) =>
    api.post(`/tasks/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Workspace API (placeholder - needs backend implementation)
export const workspaceAPI = {
  getWorkspaces: () => api.get('/workspaces'),
  getWorkspace: (id) => api.get(`/workspaces/${id}`),
  createWorkspace: (data) => api.post('/workspaces', data),
  updateWorkspace: (id, data) => api.put(`/workspaces/${id}`, data),
  deleteWorkspace: (id) => api.delete(`/workspaces/${id}`),
  inviteMember: (id, data) => api.post(`/workspaces/${id}/invite`, data),
};

// Project API
export const projectAPI = {
  getProjects: (params) => api.get('/projects', { params }),
  getProject: (id) => api.get(`/projects/${id}`),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data), // data: { email, role }
  removeMember: (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`),
  updateMemberRole: (projectId, userId, role) => api.put(`/projects/${projectId}/members/${userId}/role`, { role }),
  requestEditAccess: (projectId) => api.post(`/projects/${projectId}/request-access`),
  respondToInvitation: (id, status) => api.post(`/projects/${id}/invitation`, { status }), // status: 'active' | 'declined'
  transferOwnership: (id, newOwnerId) => api.put(`/projects/${id}/transfer-ownership`, { newOwnerId }),
};

// Comment API
export const commentAPI = {
  getComments: (taskId) => api.get(`/comments/task/${taskId}`),
  createComment: (data) => api.post('/comments', data),
  deleteComment: (id) => api.delete(`/comments/${id}`),
};

// Message API
export const messageAPI = {
  getDirectMessages: (userId, params) => api.get(`/messages/direct/${userId}`, { params }),
  getProjectMessages: (projectId, params) => api.get(`/messages/project/${projectId}`, { params }),
  sendMessage: (data) => api.post('/messages', data),
  markAsRead: (messageIds) => api.put('/messages/read', { messageIds }),
};

// Notification API
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};
// Template API
export const templateAPI = {
  getTemplates: (params) => api.get('/templates', { params }),
  getTemplate: (id) => api.get(`/templates/${id}`),
  createTemplate: (data) => api.post('/templates', data),
  deleteTemplate: (id) => api.delete(`/templates/${id}`),
};

// Document API
export const documentAPI = {
  getDocuments: (params) => api.get('/documents', { params }),
  getDocument: (id) => api.get(`/documents/${id}`),
  createDocument: (data) => api.post('/documents', data),
  updateDocument: (id, data) => api.put(`/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/documents/${id}`),
};

// AI API
export const aiAPI = {
  convertNotesToTasks: (data) => api.post('/ai/meeting-to-tasks', data),
  rewriteTask: (data) => api.post('/ai/rewrite-task', data),
  generateKanban: (data) => api.post('/ai/generate-kanban', data),
  createProjectWithKanban: (data) => api.post('/ai/create-project-with-kanban', data),
  getWorkspaceInsights: (workspaceId) => api.get(`/ai/insights/${workspaceId}`),
};

// Contact API
export const contactAPI = {
  submitForm: (data) => api.post('/contact', data),
};

// Platform Usage API
export const platformUsageAPI = {
  logUsage: (data) => api.post('/platform-usage/log', data),
  getUsage: (date) => api.get('/platform-usage', { params: { date } }),
};

export default api;