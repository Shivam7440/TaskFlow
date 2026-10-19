import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Authentication failed');
        navigate('/login');
        return;
      }

      if (accessToken && refreshToken) {
        // Store tokens
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);

        try {
            // Fetch user data to ensure valid session and populate context
            // Note: In a real app, we might call a context method setAuth(user) instead of relying on page reload or context auto-fetch
            // But since our AuthContext checks token on mount, we can force a reload or just redirect
            // Let's try to fetch user first
            const response = await authAPI.getMe();
            sessionStorage.setItem('user', JSON.stringify(response.data.user));
            
            toast.success('Successfully logged in!');
            // Reload to ensure AuthContext picks up the new user state if it doesn't listen to sessionStorage changes dynamically
            // Or if AuthContext exposes a setUser method, we could use that.
            // For simplicity and robustness:
            window.location.href = '/dashboard'; 
        } catch (err) {
            console.error('Failed to fetch user:', err);
            toast.error('Failed to verify login');
            navigate('/login');
        }
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 dark:text-gray-400">Completing login...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
