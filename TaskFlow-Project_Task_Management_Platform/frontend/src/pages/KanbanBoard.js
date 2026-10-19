import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { taskAPI, projectAPI, workspaceAPI, messageAPI } from '../services/api';
import NotificationBell from '../components/NotificationBell';
import {
  PlusIcon,
  EllipsisHorizontalIcon,
  CalendarDaysIcon,
  TrashIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  Squares2X2Icon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  UserGroupIcon,
  TableCellsIcon,
  PaperAirplaneIcon,

} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import TasksView from './TasksView';
import CalendarView from './CalendarView';
import Analytics from './Analytics';
import { getAvatarUrl } from '../utils/avatar';

import '../styles/KanbanBoard.css';
import '../styles/Dashboard.css';

const columns = [
  { id: 'col_todo', status: 'todo', name: 'Planned', icon: '◎', color: 'bg-slate-200/50 dark:bg-slate-800/50', textColor: 'text-slate-700 dark:text-slate-300' },
  { id: 'col_in_progress', status: 'in-progress', name: 'In Progress', icon: '❖', color: 'bg-blue-100/50 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-300' },
  { id: 'col_review', status: 'review', name: 'Done', icon: '✓', color: 'bg-emerald-100/50 dark:bg-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-300' },
  { id: 'col_completed', status: 'completed', name: 'On Hold', icon: '◷', color: 'bg-slate-100 dark:bg-slate-800/30', textColor: 'text-slate-500 dark:text-slate-400' },
];

// --- Custom Modals ---

const AddAssigneeModal = ({ onClose, onInvite }) => {
  const [emails, setEmails] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);

  const handleUpdate = (i, val) => {
    const newEmails = [...emails];
    newEmails[i] = val;
    setEmails(newEmails);
  };

  const handleConfirm = async () => {
    const validEmails = emails.filter(e => e.trim() !== '');
    if (validEmails.length === 0) {
      toast.error('Please enter at least one email');
      return;
    }
    setLoading(true);
    try {
      for (const email of validEmails) {
        await onInvite(email, 'editor');
      }
      toast.success('Invitations sent');
      onClose();
    } catch (e) {
      toast.error('Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Add Assignee</h2>
          <button onClick={onClose} className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <XMarkIcon className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl mb-5">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-500 leading-relaxed">
              Invite up to 3 people to join you! Once you've added all three, you'll be able to add more from your settings.
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            {emails.map((email, i) => (
              <div key={i}>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Members</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleUpdate(i, e.target.value)}
                  placeholder="Type email"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] font-semibold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 dark:text-slate-300"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Sending...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Project Settings Modal
const ProjectSettingsModal = ({ project, onClose, onUpdate, onAddMember, onRemoveMember, onUpdateRole, onDeleteProject, onRequestAccess, user }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = project.owner?._id === user?._id;
  const myMemberRecord = project.members?.find(m => m.user?._id === user?._id || m.user === user?._id);
  const isViewer = myMemberRecord?.role === 'viewer';

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onUpdate({ name, description });
      toast.success('Project updated');
    } catch (error) {} finally { setIsLoading(false); }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsLoading(true);
    try {
      await onAddMember(inviteEmail, inviteRole);
      toast.success('Invitation sent');
      setInviteEmail('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send invite');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'members', label: 'Members' },
    ...(isAdmin ? [{ id: 'danger', label: 'Danger Zone' }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[9998] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Project Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab.id 
                    ? tab.id === 'danger' 
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                      : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <form onSubmit={handleUpdateProject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Project Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none text-sm text-slate-900 dark:text-white transition-all disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isAdmin} rows="4" className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none text-sm text-slate-900 dark:text-white transition-all resize-none disabled:opacity-60" />
                  </div>
                  
                  {isAdmin && (
                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={isLoading} className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50">
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </form>

                {!isAdmin && isViewer && (
                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Need to edit this project?</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">You currently only have viewing rights. You can request edit access from the project owner.</p>
                    <button 
                      onClick={async () => {
                        try {
                          await onRequestAccess();
                          toast.success('Access request sent');
                        } catch (e) {
                          toast.error(e.response?.data?.message || 'Failed to request access');
                        }
                      }} 
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
                    >
                      Request Edit Access
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {isAdmin && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Invite Team Member</h3>
                    <form onSubmit={handleInvite} className="flex gap-2">
                      <input 
                        type="email" 
                        placeholder="Email address" 
                        value={inviteEmail} 
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                      <select 
                        value={inviteRole} 
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-28 px-2 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button type="submit" disabled={isLoading || !inviteEmail} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">
                        Invite
                      </button>
                    </form>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Project Members</h3>
                  <div className="space-y-2">
                    {/* Owner Row */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <img src={getAvatarUrl(project.owner)} alt="Owner" className="w-8 h-8 rounded-full" />
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{project.owner?.name}</div>
                          <div className="text-xs text-slate-500">{project.owner?.email}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded">Owner</span>
                    </div>

                    {/* Members List */}
                    {project.members?.map((member) => (
                      <div key={member.user?._id || member._id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <img src={getAvatarUrl(member.user)} alt="Member" className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{member.user?.name || 'Pending User'}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">{member.user?.email}</span>
                              {member.status === 'pending' && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">Pending</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isAdmin ? (
                            <select 
                              value={member.role}
                              onChange={(e) => onUpdateRole(member.user?._id, e.target.value)}
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none"
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 capitalize">{member.role}</span>
                          )}

                          {(isAdmin || member.user?._id === user?._id) && (
                            <button 
                              onClick={() => onRemoveMember(member.user?._id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                              title={member.user?._id === user?._id ? "Leave Project" : "Remove Member"}
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && isAdmin && (
              <div className="space-y-6">
                <div className="border border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 border-b border-red-200 dark:border-red-900/50">
                    <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Delete Project</h3>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Once you delete a project, there is no going back. Please be certain. All tasks, comments, and attachments will be permanently deleted.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">
                          Please type <strong className="text-slate-900 dark:text-white">{project.name}</strong> to confirm.
                        </label>
                        <input 
                          type="text" 
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder={project.name}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 outline-none text-sm text-slate-900 dark:text-white transition-all"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (deleteConfirmText === project.name) {
                            onDeleteProject();
                          }
                        }}
                        disabled={deleteConfirmText !== project.name}
                        className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete Project
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to clean HTML string from rich text descriptions
const getCleanDesc = (htmlStr) => {
  if (!htmlStr) return '';
  return htmlStr.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
};

// Task card component - Matching Mockup
const TaskCard = ({ task, onMoveTask, onDeleteTask, onOpenTask, columnIndex }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target) && buttonRef.current && !buttonRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setShowMenu(!showMenu);
  };

  // Mockup shows progress circle/text. We will simulate progress based on status for visual parity.
  const progressPct = task.status === 'completed' ? 100 : task.status === 'review' ? 80 : task.status === 'in-progress' ? 50 : 0;
  const progressColor = progressPct === 100 ? '#10b981' : progressPct >= 50 ? '#f59e0b' : '#94a3b8';
  
  // Simulated attachment / comment counts based on task ID length
  const attachmentCount = (task._id && typeof task._id === 'string') ? (task._id.charCodeAt(0) % 3 + 1) : 1;
  const commentCount = (task._id && typeof task._id === 'string') ? (task._id.charCodeAt(1) % 4 + 1) : 1;

  return (
    <div 
      onClick={() => onOpenTask(task)}
      className="rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
      style={{ background: '#141414', border: '1px solid #1E1E1E' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E1E1E'; }}
    >
      <h3 className="text-sm font-bold pr-6 leading-tight mb-2" style={{ color: '#D1D1D1' }}>
        {task.title}
      </h3>
      
      {getCleanDesc(task.description).length > 0 && (
        <p className="text-[11px] font-semibold line-clamp-2 mb-4 leading-relaxed" style={{ color: '#828383' }}>
          {getCleanDesc(task.description)}
        </p>
      )}

      {/* Center Row: Date and Progress */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold" style={{ background: '#1E1E1E', color: '#828383' }}>
          <CalendarDaysIcon className="w-3 h-3" style={{ color: '#605E5E' }} />
          {(() => {
            if (!task.dueDate) return 'No Date';
            const d = new Date(task.dueDate);
            if (isNaN(d.getTime())) return 'No Date';
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          })()}
        </div>
        
        <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: progressColor }}>
           {/* Simple SVG ring */}
           <svg width="12" height="12" viewBox="0 0 24 24" className="-rotate-90">
             <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" className="opacity-20" />
             <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${(progressPct / 100) * 62.8} 62.8`} strokeLinecap="round" />
           </svg>
           {progressPct}%
        </div>
      </div>

      {/* Bottom Row: Assignees & Icons */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#1E1E1E' }}>
        <div className="flex -space-x-1.5">
          {(() => {
            const validAssignees = (task.assignees || []).filter(a => a !== null && a !== undefined);
            if (validAssignees.length === 0) {
              return (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: '#1E1E1E', border: '1px solid #1E1E1E', color: '#605E5E' }}>
                   U
                </div>
              );
            }
            return validAssignees.slice(0, 3).map((a, i) => (
              <img
                key={i}
                src={getAvatarUrl(typeof a === 'string' ? { name: a } : a)}
                className="w-6 h-6 rounded-full object-cover relative z-10"
                style={{ border: '1px solid #2A2A2A', zIndex: 3 - i }}
                alt="Assignee"
              />
            ));
          })()}
        </div>
        <div className="flex items-center gap-2.5 text-[9px] font-bold" style={{ color: '#828383' }}>
           <span className="flex items-center gap-1"><PaperClipIcon className="w-3 h-3" /> {attachmentCount}</span>
           <span className="flex items-center gap-1"><ChatBubbleLeftRightIcon className="w-3 h-3" /> {commentCount}</span>
        </div>
      </div>

      {/* Menu Action */}
      <div className="absolute top-3 right-3 z-10">
        <button
          ref={buttonRef}
          onClick={toggleMenu}
          className="p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100 border-none cursor-pointer bg-transparent"
          style={{ color: '#605E5E' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#D1D1D1'; e.currentTarget.style.background = '#1E1E1E'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#605E5E'; e.currentTarget.style.background = 'transparent'; }}
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
        {showMenu && createPortal(
          <div 
            ref={menuRef}
            className="rounded-lg shadow-xl py-1 min-w-[140px]" 
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 999999, background: '#1E1E1E', border: '1px solid #1E1E1E' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: '#605E5E' }}>Move to</p>
            {columns.map((col, idx) => (
              <button
                key={col.id}
                disabled={idx === columnIndex}
                onClick={(e) => { e.stopPropagation(); onMoveTask(task._id, col.id, col.status); setShowMenu(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold border-none bg-transparent ${idx === columnIndex ? 'cursor-default' : 'cursor-pointer'}`}
                style={{ color: idx === columnIndex ? '#605E5E' : '#D1D1D1' }}
                onMouseEnter={(e) => { if(idx !== columnIndex) { e.currentTarget.style.background = '#2B2B2B'; } }}
                onMouseLeave={(e) => { if(idx !== columnIndex) { e.currentTarget.style.background = 'transparent'; } }}
              >
                {col.name}
              </button>
            ))}
            <div className="border-t my-1" style={{ borderColor: '#1E1E1E' }} />
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteTask(task._id); setShowMenu(false); }}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center gap-2 border-none bg-transparent cursor-pointer"
              style={{ color: '#EF4444' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <TrashIcon className="w-3.5 h-3.5" /> Delete
            </button>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

const KanbanBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { socket, joinProject, leaveProject } = useSocket();
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const formatMsgTime = (createdAt) => {
    try {
      if (!createdAt) return 'just now';
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return 'just now';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch (e) {
      return 'just now';
    }
  };
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddAssignee, setShowAddAssignee] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeView, setActiveView] = useState('board');

  // Clear unread count when chat is opened
  useEffect(() => {
    if (showChat) {
      setUnreadChatCount(0);
    }
  }, [showChat]);

  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskDefaultStatus, setCreateTaskDefaultStatus] = useState('todo');

  // --- Dynamic Dashboard-style Sidebar & Widgets State ---
  const [, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');

  // --- Static discussion chat state ---
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };



  // Sidebar Projects Filter
  const filteredProjects = useMemo(() => {
    let result = projects || [];
    if (activeWorkspace) {
      result = result.filter(p => {
        if (!p) return false;
        const pwId = p.workspace && typeof p.workspace === 'object' ? p.workspace._id : p.workspace;
        return pwId === activeWorkspace._id;
      });
    }
    if (sidebarSearchQuery.trim()) {
      const q = sidebarSearchQuery.toLowerCase();
      result = result.filter(p => {
        if (!p) return false;
        return (p.name || '').toLowerCase().includes(q) ||
               (p.description || '').toLowerCase().includes(q);
      });
    }
    return result;
  }, [projects, activeWorkspace, sidebarSearchQuery]);

  // Discussion Chat dynamic fetch & socket synchronization
  useEffect(() => {
    if (projectId) {
      const fetchMessages = async () => {
        try {
          const res = await messageAPI.getProjectMessages(projectId);
          setMessages(res.data.messages || []);
          setTimeout(scrollToBottom, 100);
        } catch (error) {
          console.error('Failed to fetch discussion messages', error);
        }
      };
      fetchMessages();
    }
  }, [projectId]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message) => {
        if (message.project === projectId) {
          setMessages(prev => [...prev.filter(m => m._id !== message._id), message]);
          setTimeout(scrollToBottom, 50);
          
          // Check if message is not from current user
          const msgSenderId = message.sender?._id || message.sender;
          if (!showChat && msgSenderId !== user?._id) {
            setUnreadChatCount(prev => prev + 1);
          }
        }
      };
      socket.on('message:new', handleNewMessage);
      return () => socket.off('message:new', handleNewMessage);
    }
  }, [socket, projectId, showChat, user?._id]);

  const handleSendProjectMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      await messageAPI.sendMessage({ content: newMessage, project: projectId });
      setNewMessage('');
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      toast.error('Failed to dispatch discussion message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Load project data only when projectId changes
  useEffect(() => {
    loadProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    joinProject(projectId);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:moved', handleTaskMoved);
    return () => {
      leaveProject(projectId);
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.off('task:moved');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, socket]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectRes, tasksRes] = await Promise.all([
        projectAPI.getProject(projectId),
        taskAPI.getTasks({ project: projectId })
      ]);
      
      const currentProject = projectRes.data.project;
      setProject(currentProject);
      setTasks(tasksRes.data.tasks || []);
      
      try {
        const [workspaceRes, projectsRes] = await Promise.all([
          workspaceAPI.getWorkspaces(),
          projectAPI.getProjects()
        ]);
        
        const loadedWorkspaces = workspaceRes.data.workspaces || [];
        setWorkspaces(loadedWorkspaces);
        
        const loadedProjects = projectsRes.data.projects || [];
        setProjects(loadedProjects);

        const currentWorkspaceId = typeof currentProject?.workspace === 'object' 
          ? currentProject.workspace?._id 
          : currentProject?.workspace;
          
        const activeWs = loadedWorkspaces.find(w => w._id === currentWorkspaceId);
        if (activeWs) {
          setActiveWorkspace(activeWs);
        } else if (loadedWorkspaces.length > 0) {
          setActiveWorkspace(loadedWorkspaces[0]);
        }
      } catch (secError) {
        console.error('Failed to load secondary sidebar metadata:', secError);
      }
    } catch (error) {
      console.error('Failed to load primary project data:', error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };


  
  const handleUpdateProject = async (data) => {
    await projectAPI.updateProject(projectId, data);
    setProject(prev => ({ ...prev, ...data }));
  };

  const handleAddMember = async (emailOrObj, role) => {
     let email = emailOrObj;
     let actualRole = role;
     if (emailOrObj && typeof emailOrObj === 'object') {
       email = emailOrObj.email;
       actualRole = emailOrObj.role;
     }
     await projectAPI.addMember(projectId, { email, role: actualRole });
     loadProjectData();
  };

  const handleRemoveMember = async (userId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
        await projectAPI.removeMember(projectId, userId);
        setProject(prev => ({ ...prev, members: prev.members.filter(m => m.user._id !== userId) }));
        toast.success('Member removed');
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await projectAPI.updateMemberRole(projectId, userId, role);
      setProject(prev => ({
        ...prev,
        members: prev.members.map(m => m.user._id === userId ? { ...m, role } : m)
      }));
      toast.success('Role updated');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await projectAPI.deleteProject(projectId);
      toast.success('Project deleted');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleRequestAccess = async () => {
    await projectAPI.requestEditAccess(projectId);
  };

  const handleTaskCreated = (newTask) => {
    if ((newTask.project?._id || newTask.project) === projectId) {
       setTasks(prev => [...prev, newTask]);
    }
  };

  const handleTaskUpdated = (updatedTask) => setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
  const handleTaskDeleted = ({ id }) => setTasks(prev => prev.filter(t => t._id !== id));
  const handleTaskMoved = (movedTask) => setTasks(prev => prev.map(t => t._id === movedTask._id ? movedTask : t));

  const getTasksByColumn = (col) => {
    if (!tasks) return [];
    return tasks.filter(task => {
      if (!task) return false;
      if (task.column === col.id) return true;
      if (task.column === col.name) return true;
      if (task.status === col.status) return true;
      const legacyId = col.id.startsWith('col_') ? col.id.substring(4) : col.id;
      if (task.column === legacyId) return true;
      return false;
    });
  };

  const moveTask = async (taskId, newColumnId, newStatus) => {
    const target = tasks.find(t => t._id === taskId);
    if (!target) return;
    const optimistic = { ...target, status: newStatus, column: newColumnId };
    setTasks(prev => prev.map(t => t._id === taskId ? optimistic : t));
    try {
      await taskAPI.updateTask(taskId, { status: newStatus, column: newColumnId });
    } catch (e) {
      loadProjectData();
    }
  };

  const deleteTask = async (taskId) => {
    if(!window.confirm('Delete this task?')) return;
    setTasks(prev => prev.filter(t => t._id !== taskId));
    try { await taskAPI.deleteTask(taskId); } catch (e) { loadProjectData(); }
  };
  
  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 dark:border-slate-800 border-t-blue-500 animate-spin" />
    </div>
  );

  if (!project) return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 ${theme === 'dark' ? 'dark' : ''} p-4`}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] p-8 max-w-md text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600 to-indigo-600" />
        <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
        <h3 className="text-[17px] font-black text-slate-800 dark:text-white mb-2 tracking-tight">Project Space Offline</h3>
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          The requested project workspace could not be fetched or does not exist. Ensure you are signed in and have access permissions for this resource.
        </p>
        <button onClick={() => navigate('/dashboard')} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-500/20 border-none cursor-pointer transition-all">
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className={`taskly-app-wrapper dark`}>
      
      {/* --- Main Structural Splitter --- */}
      <div className="taskly-main-container">
        
        {/* ─── Column 1: Left Sidebar ─── */}
          <aside className="taskly-sidebar flex flex-col shrink-0" style={{ gap: '16px', padding: '16px' }}>
          
          {/* Header */}
          <div className="flex flex-col gap-3 shrink-0">
            {/* Brand Header */}
            <div className="flex items-center px-2 select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white border-none" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: '0 0 12px rgba(99, 102, 241, 0.25)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#D1D1D1', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>TaskFlow</span>
              </div>
            </div>

            {/* Current Workspace Info (read-only) */}
            <div className="sidebar-workspace-card flex items-center p-2.5 rounded-xl select-none" style={{ background: '#141414', border: '1px solid #1E1E1E' }}>
              <div className="sidebar-workspace-info flex items-center gap-3">
                <div className="sidebar-workspace-logo w-7.5 h-7.5 rounded-lg text-white flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)' }}>
                  {activeWorkspace && activeWorkspace.name ? activeWorkspace.name.charAt(0).toUpperCase() : 'W'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="sidebar-workspace-name font-bold text-xs truncate max-w-[120px] mb-0.5" style={{ color: '#D1D1D1' }}>
                    {activeWorkspace && activeWorkspace.name ? activeWorkspace.name : 'Workspace'}
                  </div>
                  <div className="sidebar-workspace-status uppercase tracking-wide" style={{ fontSize: '9px', fontWeight: 700, color: '#605E5E' }}>
                    Enterprise Plan
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#605E5E' }} />
              <input
                type="text"
                placeholder="Search..."
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                className="w-full rounded-xl outline-none transition-all"
                style={{ height: '34px', background: '#141414', border: '1px solid #1E1E1E', paddingLeft: '36px', paddingRight: '32px', fontSize: '12px', color: '#D1D1D1' }}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1 py-0.5 rounded pointer-events-none" style={{ fontSize: '9px', fontWeight: 700, color: '#605E5E', background: '#1E1E1E', border: '1px solid #1E1E1E' }}>⌘K</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="sidebar-list-container shrink-0">
            <div className="sidebar-section-label">Main Menu</div>
            
            <button onClick={() => navigate('/dashboard')} className="sidebar-item-btn">
              <span className="flex items-center gap-3">
                <Squares2X2Icon className="w-4 h-4" />
                <span>Dashboard</span>
              </span>
            </button>

            <button onClick={() => setActiveView('tasks')} className={`sidebar-item-btn ${activeView === 'tasks' ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' : ''}`}>
              <span className="flex items-center gap-3">
                <TableCellsIcon className="w-4 h-4" />
                <span>Task Overview</span>
              </span>
            </button>

            <button onClick={() => setActiveView('calendar')} className={`sidebar-item-btn ${activeView === 'calendar' ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' : ''}`}>
              <span className="flex items-center gap-3">
                <CalendarDaysIcon className="w-4 h-4" />
                <span>Calendar</span>
              </span>
            </button>

            <button onClick={() => navigate('/profile')} className="sidebar-item-btn">
              <span className="flex items-center gap-3">
                <UserGroupIcon className="w-4 h-4" />
                <span>Team Directory</span>
              </span>
            </button>

            <button onClick={() => setActiveView('analytics')} className={`sidebar-item-btn ${activeView === 'analytics' ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' : ''}`}>
              <span className="flex items-center gap-3">
                <ChartBarIcon className="w-4 h-4" />
                <span>Analytics</span>
              </span>
            </button>
          </div>

          {/* Active Projects List */}
          <div className="sidebar-list-container flex-1 overflow-y-auto custom-scrollbar mb-2 pr-1">
            <div className="flex justify-between items-center mb-1 pr-1">
              <div className="sidebar-section-label" style={{ margin: 0 }}>Active Projects</div>
            </div>
            
            <div className="flex flex-col gap-1">
              {filteredProjects.map((proj) => {
                const isActive = project?._id === proj._id;
                return (
                  <div
                    key={proj._id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all"
                    style={{ 
                      color: isActive ? '#A5B4FC' : '#828383',
                      background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    }}
                    onClick={() => {
                      if (!isActive) navigate(`/projects/${proj._id}`);
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = '#141414'; e.currentTarget.style.color = '#D1D1D1'; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#828383'; } }}
                  >
                    <span className="truncate flex items-center gap-2">
                      <span className="text-[12px] opacity-45">#</span>
                      <span className="truncate">{proj.name}</span>
                    </span>
                  </div>
                );
              })}
              
              {filteredProjects.length === 0 && (
                <span className="italic pl-3 pt-1" style={{ fontSize: '10px', color: '#605E5E' }}>No projects in workspace</span>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto pt-3 shrink-0" style={{ borderTop: '1px solid #1E1E1E' }}>
            <div className="flex items-center justify-between">
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-85 transition-opacity min-w-0 pr-1 decoration-transparent">
                <img src={getAvatarUrl(user)} className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: '1px solid #1E1E1E' }} alt="Profile" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-extrabold leading-tight truncate" style={{ color: '#D1D1D1' }}>{user?.name ? user.name.split(' ')[0] : 'User'}</span>
                  <span className="text-[9px] font-semibold truncate" style={{ color: '#605E5E' }}>{user?.email ? user.email.split('@')[0] : 'guest'}</span>
                </div>
              </Link>

              <div className="flex items-center gap-0.5 shrink-0">
                <div className="relative">
                  <NotificationBell />
                </div>
                <button onClick={logout} className="p-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer" style={{ color: '#605E5E' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#605E5E'; e.currentTarget.style.background = 'transparent'; }}>
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          </aside>


        {/* ─── Column 2: Central Primary content area ─── */}
        <main className="taskly-center-content pt-0 px-6 pb-0 flex flex-col gap-6 select-none" style={{ background: '#0A0A0A' }}>
          
          {/* Unified Header Card */}
          <div className="rounded-2xl p-5 lg:p-6 shadow-sm flex flex-col gap-5 relative overflow-hidden" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
            {/* Subtle Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500/50 via-fuchsia-500/50 to-blue-500/50" />
            
            {/* Top Row: Breadcrumbs, Title, Settings */}
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex flex-col gap-1.5">
                {/* Breadcrumbs */}
                <div className="flex items-center text-[10px] font-bold uppercase tracking-widest" style={{ color: '#828383' }}>
                  <Link to="/dashboard" className="transition-colors decoration-transparent" style={{ color: '#828383' }} onMouseEnter={(e) => e.target.style.color = '#6366F1'} onMouseLeave={(e) => e.target.style.color = '#828383'}>
                    {activeWorkspace ? activeWorkspace.name : "Workspace"}
                  </Link>
                  <ChevronRightIcon className="w-3 h-3 mx-1.5" style={{ color: '#605E5E' }} />
                  <span>Kanban Project Space</span>
                </div>
                {/* Title & Badge */}
                <div className="flex items-center gap-3 mt-0.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none" style={{ color: '#D1D1D1' }}>
                    {project?.name}
                  </h1>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full shadow-sm self-end mb-0.5" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#A5B4FC', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    Active Sprint
                  </span>
                </div>
              </div>
              
              {/* Settings Button */}
              <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow mt-1 group" style={{ background: '#141414', border: '1px solid #1E1E1E', color: '#828383' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#6366F1'; e.currentTarget.style.borderColor = '#2A2A2A'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#828383'; e.currentTarget.style.borderColor = '#1E1E1E'; }} title="Project Settings">
                <Cog6ToothIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Divider */}
            <div className="w-full h-px relative z-10" style={{ background: '#1E1E1E' }}></div>

            {/* Bottom Row: Tabs & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
              {/* Tab Selector */}
              <div className="flex items-center p-1 rounded-xl" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
                <button onClick={() => setActiveView('board')} className="px-5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border-none" style={activeView === 'board' ? { background: '#1E1E1E', color: '#D1D1D1', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' } : { background: 'transparent', color: '#828383' }}>Board</button>
                <button onClick={() => setActiveView('tasks')} className="px-5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border-none" style={activeView === 'tasks' ? { background: '#1E1E1E', color: '#D1D1D1', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' } : { background: 'transparent', color: '#828383' }}>Tasks</button>
                <button onClick={() => setActiveView('calendar')} className="px-5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border-none" style={activeView === 'calendar' ? { background: '#1E1E1E', color: '#D1D1D1', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' } : { background: 'transparent', color: '#828383' }}>Calendar</button>
                <button onClick={() => setActiveView('analytics')} className="px-5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border-none" style={activeView === 'analytics' ? { background: '#1E1E1E', color: '#D1D1D1', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' } : { background: 'transparent', color: '#828383' }}>Analytics</button>
              </div>

              {/* Tools Actions */}
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 flex items-center gap-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors" style={{ background: '#141414', border: '1px solid #1E1E1E', color: '#D1D1D1' }} onMouseEnter={(e) => e.currentTarget.style.background = '#1E1E1E'} onMouseLeave={(e) => e.currentTarget.style.background = '#141414'}>
                  <ShareIcon className="w-3.5 h-3.5" /> Share
                </button>
                <button onClick={() => { setCreateTaskDefaultStatus('todo'); setShowCreateTask(true); }} className="px-4 py-2 flex items-center gap-1.5 rounded-xl font-bold text-xs shadow-md transition-all border-none cursor-pointer" style={{ background: '#6366F1', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                  <PlusIcon className="w-4 h-4" /> Add New
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Conditional Rendering */}
          {activeView === 'board' && (
            <div className="flex-1 rounded-2xl p-6 shadow-sm flex flex-col min-h-0 overflow-hidden" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
              {/* Board Scroll Grid */}
              <div className={`flex-1 custom-scrollbar pb-2 ${showChat ? 'overflow-y-auto overflow-x-hidden' : 'overflow-x-auto overflow-y-hidden'}`}>
                <div className={showChat ? 'grid grid-cols-2 gap-5 w-full pb-1' : 'flex items-start gap-5 h-full min-w-max pb-1'}>
                  {columns.map((col, colIndex) => {
                    const colTasks = getTasksByColumn(col);
                    return (
                      <div key={col.id} className={`flex flex-col rounded-2xl ${showChat ? 'w-full h-[380px]' : 'w-[285px] shrink-0 h-full'}`} style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
                        
                        {/* Column Header */}
                        <div className="flex items-center justify-between p-4 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px]" style={{ color: '#605E5E' }}>{col.icon}</span>
                            <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: '#D1D1D1' }}>{col.name}</h2>
                          </div>
                          <button onClick={() => { setCreateTaskDefaultStatus(col.status); setShowCreateTask(true); }} className="w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', color: '#828383' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#6366F1'; e.currentTarget.style.borderColor = '#2A2A2A'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#828383'; e.currentTarget.style.borderColor = '#1E1E1E'; }}>
                            <PlusIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Task Cards Area */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                          {colTasks.length === 0 ? (
                            <div className="h-24 flex flex-col items-center justify-center rounded-xl" style={{ background: '#141414', border: '1px dashed #1E1E1E' }}>
                              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#605E5E' }}>No tasks</span>
                            </div>
                          ) : (
                            colTasks.map(task => (
                              <TaskCard 
                                key={task._id} 
                                task={task} 
                                onMoveTask={moveTask} 
                                onDeleteTask={deleteTask}
                                onOpenTask={(t) => setSelectedTask(t)}
                                columnIndex={colIndex}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeView === 'tasks' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <TasksView projectId={projectId} isEmbedded={true} />
            </div>
          )}

          {activeView === 'calendar' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <CalendarView projectId={projectId} isEmbedded={true} />
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <Analytics projectId={projectId} isEmbedded={true} />
            </div>
          )}
        </main>

        {/* ─── Column 3: Static Discussion Chat Panel ─── */}
        {showChat && (
          <aside className="taskly-right-panel flex flex-col rounded-2xl overflow-hidden shadow-sm h-full max-h-[calc(100vh-32px)]" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
            {/* Header */}
            <div className="p-4 border-b shrink-0" style={{ borderColor: '#1E1E1E' }}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#828383' }}>Project Chat</span>
                  <h3 className="text-sm font-black" style={{ color: '#D1D1D1' }}>{project?.name || 'Discussion'}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full select-none" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{project?.members ? project.members.length + 1 : 1} online</span>
                  </div>
                  <button onClick={() => setShowChat(false)} className="p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors" style={{ color: '#605E5E' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#D1D1D1'; e.currentTarget.style.background = '#1E1E1E'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#605E5E'; e.currentTarget.style.background = 'transparent'; }} title="Hide Chat">
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages List Container */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3.5 animate-chat" style={{ background: '#0A0A0A' }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-grow py-8 text-center" style={{ color: '#605E5E' }}>
                  <ChatBubbleLeftRightIcon className="w-8 h-8 mb-2" style={{ color: '#2A2A2A' }} />
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#828383' }}>Start a conversation</h4>
                  <p className="text-[10px] max-w-[160px] leading-relaxed">
                    Your team collaboration happens here. Send a message to start!
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender?._id === user?._id || msg.sender === user?._id;
                  const senderName = msg.sender?.name || 'Unknown';
                  const timeAgo = formatMsgTime(msg.createdAt);
                  
                  return (
                    <div key={msg._id} className={`flex flex-col w-full max-w-[85%] ${isMine ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <div className="p-3.5 rounded-2xl border shadow-sm" style={{ 
                        background: isMine ? '#6366F1' : '#141414', 
                        borderColor: isMine ? '#4F46E5' : '#1E1E1E', 
                        color: isMine ? '#FFFFFF' : '#D1D1D1', 
                        borderTopRightRadius: isMine ? 0 : undefined, 
                        borderTopLeftRadius: !isMine ? 0 : undefined 
                      }}>
                        {/* Sender metadata inside bubble */}
                        <div className="flex items-center justify-between gap-3 mb-1 text-[9px] font-bold opacity-75">
                          <span style={{ color: isMine ? 'rgba(255,255,255,0.9)' : '#828383' }}>
                            {isMine ? 'You' : senderName}
                          </span>
                          <span style={{ color: isMine ? 'rgba(255,255,255,0.7)' : '#605E5E' }}>
                            {timeAgo}
                          </span>
                        </div>
                        <p className="text-[12px] leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Footer */}
            <div className="p-4 border-t shrink-0" style={{ borderColor: '#1E1E1E', background: '#0A0A0A' }}>
              <form onSubmit={handleSendProjectMessage} className="flex items-center gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-9 px-3.5 rounded-xl text-xs outline-none transition-all"
                  style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', color: '#D1D1D1' }}
                  onFocus={(e) => { e.target.style.borderColor = '#6366F1'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#1E1E1E'; }}
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || sendingMessage} 
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors border-none cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  style={{ background: '#6366F1', color: '#FFFFFF' }}
                  onMouseEnter={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background = '#4F46E5'; }}
                  onMouseLeave={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background = '#6366F1'; }}
                >
                  <PaperAirplaneIcon className="w-4 h-4 transform rotate-0" />
                </button>
              </form>
            </div>
          </aside>
        )}

        {/* Collapsed Chat Panel Vertical Bar */}
        {!showChat && (
          <div 
            onClick={() => setShowChat(true)} 
            className="w-12 shrink-0 h-full rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-sm group relative"
            style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.background = '#141414'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.background = '#0A0A0A'; }}
            title="Show Chat"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" style={{ color: '#605E5E' }} />
            {unreadChatCount > 0 && (
              <span className="absolute top-4 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 shadow-sm animate-pulse" style={{ borderColor: '#0A0A0A' }}>
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </div>
        )}

      </div>



      {/* Modals */}
      {showAddAssignee && (
         <AddAssigneeModal 
            onClose={() => setShowAddAssignee(false)}
            onInvite={handleAddMember}
         />
      )}

      {showSettings && (
        <ProjectSettingsModal 
           project={project} 
           user={user}
           onClose={() => setShowSettings(false)} 
           onUpdate={handleUpdateProject}
           onAddMember={handleAddMember}
           onRemoveMember={handleRemoveMember}
           onUpdateRole={handleUpdateRole}
           onDeleteProject={handleDeleteProject}
           onRequestAccess={handleRequestAccess}
           onTransferOwnership={() => {}}
        />
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask) => {
             setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
             setSelectedTask(updatedTask);
          }}
          onDelete={(taskId) => {
             deleteTask(taskId);
             setSelectedTask(null);
          }}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          defaultProjectId={projectId}
          defaultStatus={createTaskDefaultStatus}
          onClose={() => setShowCreateTask(false)}
          onCreated={() => loadProjectData()}
        />
      )}

    </div>
  );
};

export default KanbanBoard;