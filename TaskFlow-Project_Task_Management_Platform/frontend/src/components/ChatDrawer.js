import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { messageAPI, projectAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { 
  XMarkIcon, 
  PaperAirplaneIcon, 
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ChatDrawer = ({ projectId, isOpen, onClose }) => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && projectId) {
      const fetchMessages = async () => {
        try {
          const res = await messageAPI.getProjectMessages(projectId);
          setMessages(res.data.messages);
          setTimeout(scrollToBottom, 100);
        } catch (error) {
          console.error('Failed to fetch messages', error);
        }
      };
      const fetchProject = async () => {
        try {
          const res = await projectAPI.getProject(projectId);
          setProject(res.data.project);
        } catch (error) {
          console.error('Failed to fetch project', error);
        }
      };
      fetchMessages();
      fetchProject();
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (socket && connected) {
      const handleNewMessage = (message) => {
        if (message.project === projectId) {
          setMessages(prev => [...prev.filter(m => m._id !== message._id), message]);
          scrollToBottom();
        }
      };
      socket.on('message:new', handleNewMessage);
      return () => socket.off('message:new', handleNewMessage);
    }
  }, [socket, connected, projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;
    setLoading(true);
    try {
      await messageAPI.sendMessage({ content: newMessage, project: projectId });
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const pc = project?.color || '#6366F1';

  // ── Premium Minimalist SaaS ChatDrawer ──
  const s = {
    panel: {
      position: 'fixed',
      right: 20,
      top: 16,
      bottom: 16,
      width: isOpen ? 400 : 0,
      minWidth: isOpen ? 400 : 0,
      flexShrink: 0,
      opacity: isOpen ? 1 : 0,
      transition: 'width 300ms cubic-bezier(.4,0,.2,1), min-width 300ms cubic-bezier(.4,0,.2,1), opacity 200ms ease',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 32px)',
      // Enhanced Glassmorphism Base Match
      background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      border: isOpen ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
      borderRadius: isOpen ? '24px' : 0,
      overflow: 'hidden',
      boxShadow: isOpen ? '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
      zIndex: 9999,
      pointerEvents: isOpen ? 'auto' : 'none',
    },
    inner: {
      display: 'flex', flexDirection: 'column', height: '100%', width: 400, position: 'relative', zIndex: 10,
    },
    header: {
      padding: '24px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      flexShrink: 0,
    },
    closeBtn: {
      width: 32, height: 32, borderRadius: '50%',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer', color: '#94a3b8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.2s ease',
    },
    msgArea: {
      flex: 1, overflowY: 'auto', padding: '32px',
      display: 'flex', flexDirection: 'column', gap: 6,
    },
    empty: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, gap: 12, padding: 32,
    },
    inputWrap: {
      padding: '32px',
      flexShrink: 0,
      borderTop: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(15, 23, 42, 0.5)', // Match deeper gradients below
    },
    form: {
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(255,255,255,0.03)', // Frosted Input
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 100, padding: '8px 8px 8px 24px',
      transition: 'all 0.3s ease',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
    },
    input: {
      flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
      color: '#F8FAFC', fontSize: '15px', outline: 'none',
      fontFamily: 'inherit',
    },
    sendBtn: (active) => ({
      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
      background: active ? '#FACC15' : '#334155', // Yellow button
      color: '#fff',
      border: 'none',
      cursor: active ? 'pointer' : 'default',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.2s ease',
    }),
  };

  return (
    <div style={s.panel} className="chat-drawer-modern">
      <div style={s.inner}>
        {/* ═══ HEADER ═══ */}
        <div style={s.header}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              {project?.name || 'Project Chat'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%' }} />
              <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500 }}>
                {(project?.members?.length || 0) + 1} Online
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={s.closeBtn}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <XMarkIcon style={{ width: 22, height: 22 }} />
          </button>
        </div>

        {/* ═══ MESSAGES ═══ */}
        <div style={s.msgArea} className="custom-scrollbar relative">
          {messages.length === 0 && (
            <div style={s.empty}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '24px', color: '#fff', fontWeight: 700, margin: '0 0 12px 0' }}>
                  Start a conversation
                </h3>
                <p style={{ fontSize: '15px', color: '#94A3B8', margin: 0 }}>
                  Your team collaboration happens here.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isMine = msg.sender?._id === user._id || msg.sender === user._id;
            const prev = messages[idx - 1];
            const prevId = prev?.sender?._id || prev?.sender;
            const curId = msg.sender?._id || msg.sender;
            const sameSender = prevId === curId;
            const isFirst = !sameSender;
            const senderName = msg.sender?.name || 'Unknown';

            return (
              <div key={msg._id} style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                marginTop: isFirst ? 20 : 8,
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '24px',
                  border: isMine ? '1px solid rgba(250, 204, 21, 0.4)' : '1px solid rgba(255,255,255,0.02)',
                  background: isMine ? 'transparent' : 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  {/* Header: Sender and Timestamp */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: isMine ? '#94A3B8' : '#64748B',
                      fontWeight: 500,
                    }}>
                      {isMine ? 'You' : senderName}
                    </span>
                    <span style={{
                      fontSize: '13px',
                      color: '#64748B',
                      fontWeight: 400,
                    }}>
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Message Body */}
                  <div 
                    className="break-words whitespace-pre-wrap"
                    style={{
                    fontSize: '15px',
                    lineHeight: '1.5',
                    color: '#F8FAFC',
                  }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ═══ INPUT ═══ */}
        <div style={s.inputWrap}>
          <form
            onSubmit={handleSubmit}
            style={s.form}
            onFocus={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)'; }}
            onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.02)'; }}
          >
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              style={s.input}
              className="chat-invisible-input"
            />
            <button type="submit" disabled={!newMessage.trim()||loading} style={s.sendBtn(!!newMessage.trim())}
              onMouseOver={e=>{
                if(newMessage.trim()) e.currentTarget.style.background = '#eab308'; // darker yellow on hover
              }}
              onMouseOut={e=>{
                if(newMessage.trim()) e.currentTarget.style.background = '#FACC15';
              }}
            >
              <PaperAirplaneIcon style={{ width: 22, height: 22, transform: 'translateX(-1px)' }} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-invisible-input:focus {
          outline: none !important;
          box-shadow: none !important;
          border-color: transparent !important;
          border-width: 0 !important;
        }
      `}</style>
    </div>
  );
};

export default ChatDrawer;
