import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { BellIcon } from '@heroicons/react/24/outline';
import NotificationsPopover from './NotificationsPopover';

const NotificationBell = ({ isHeader = false }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadNotificationsCount } = useSocket();

  if (isHeader) {
    return (
      <div className="relative">
        <button 
          onClick={() => setShowNotifications(!showNotifications)} 
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 transition-colors relative"
        >
          <BellIcon className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
        {showNotifications && (
          <div className="absolute right-0 top-12 z-50">
            <NotificationsPopover onClose={() => setShowNotifications(false)} />
          </div>
        )}
      </div>
    );
  }

  // Sidebar footer version (compact, dark styling)
  return (
    <div className="relative">
      <button 
        onClick={() => setShowNotifications(!showNotifications)} 
        className="p-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer relative" 
        style={{ color: '#605E5E' }} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.color = '#D1D1D1'; 
          e.currentTarget.style.background = '#141414'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.color = '#605E5E'; 
          e.currentTarget.style.background = 'transparent'; 
        }}
      >
        <BellIcon className="w-4 h-4" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse" />
        )}
      </button>
      {showNotifications && (
        <div className="absolute bottom-full left-0 mb-2.5 z-50">
          <NotificationsPopover onClose={() => setShowNotifications(false)} />
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
