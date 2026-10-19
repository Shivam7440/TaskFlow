import React, { useState, useEffect, useRef } from 'react';
import { notificationAPI, projectAPI } from '../services/api';
import { XMarkIcon, BellIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';

const NotificationsPopover = ({ onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const popoverRef = useRef(null);
    const { setUnreadNotificationsCount } = useSocket();

    useEffect(() => {
        loadNotifications();
        
        const handleClick = (e) => {
             if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                 onClose();
             }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClose]);

    const loadNotifications = async () => {
        try {
            const res = await notificationAPI.getNotifications();
            setNotifications(res.data.notifications);
            setUnreadNotificationsCount(res.data.unreadCount || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (notification) => {
        try {
            await projectAPI.respondToInvitation(notification.relatedProject._id, 'active');
            toast.success('Joined project!');
            await notificationAPI.markAsRead(notification._id);
            setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.filter(n => n._id !== notification._id));
            window.location.reload(); 
        } catch (e) {
            toast.error('Failed to accept');
        }
    };

    const handleDecline = async (notification) => {
        try {
            await projectAPI.respondToInvitation(notification.relatedProject._id, 'declined');
            toast.success('Invitation declined');
            await notificationAPI.markAsRead(notification._id);
            setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.filter(n => n._id !== notification._id));
        } catch (e) {
            toast.error('Failed to decline');
        }
    };

    return (
        <div className="w-72 bg-[#141414]/90 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-[#1E1E1E] overflow-hidden animate-fade-in-up text-[#D1D1D1]" ref={popoverRef}>
            <div className="p-4 border-b border-[#1E1E1E] flex justify-between items-center bg-[#0A0A0A]/40">
                <h3 className="font-bold text-sm text-[#D1D1D1]">Notifications</h3>
                <button onClick={onClose} className="text-[#605E5E] hover:text-[#D1D1D1] transition-colors"><XMarkIcon className="w-4 h-4"/></button>
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-8 text-center text-[#605E5E] text-xs">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-[#605E5E] text-xs flex flex-col items-center gap-2">
                        <BellIcon className="w-8 h-8 opacity-20"/>
                        No notifications
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n._id} className={`p-4 border-b border-[#1E1E1E]/50 hover:bg-[#1C1C1E]/50 transition-colors ${n.isRead ? 'opacity-50' : ''}`}>
                             <div className="flex gap-3">
                                <div className="mt-0.5 min-w-[28px]">
                                     <div className="w-7 h-7 rounded-full bg-[#6366F1]/10 text-[#A5B4FC] flex items-center justify-center font-extrabold text-[11px] border border-[#6366F1]/20">
                                         {n.sender?.name?.charAt(0).toUpperCase()}
                                     </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-[#D1D1D1] leading-relaxed mb-1.5">
                                        <span className="font-bold text-white">{n.sender?.name}</span> invited you to <span className="font-bold text-white">{n.relatedProject?.name}</span>
                                    </p>
                                    <p className="text-[9px] font-semibold text-[#605E5E] mb-3">{new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    
                                    {n.type === 'project-invited' && !n.isRead && (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleAccept(n)}
                                                className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#4f46e5] text-white rounded-lg text-[10px] font-extrabold transition-all shadow-sm shadow-[#6366F1]/20"
                                            >
                                                Accept
                                            </button>
                                            <button 
                                                onClick={() => handleDecline(n)}
                                                className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#363636] text-[#D1D1D1] rounded-lg text-[10px] font-extrabold transition-all border border-[#363636]"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPopover;
