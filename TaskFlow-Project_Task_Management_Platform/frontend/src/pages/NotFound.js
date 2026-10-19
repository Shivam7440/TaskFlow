import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center px-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="text-center relative z-10 max-w-lg">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-gray-200/50 dark:shadow-black/30 animate-float">
          <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
        </div>
        
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-400 dark:from-white dark:to-gray-600 mb-2">
          404
        </h1>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-sm mx-auto leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-gray-500/20"
        >
          <HomeIcon className="h-5 w-5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;