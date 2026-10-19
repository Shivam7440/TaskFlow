import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { taskAPI, projectAPI } from '../services/api';
import {
  ListBulletIcon, Squares2X2Icon, ChartBarIcon,
  PhotoIcon, FunnelIcon, ArrowsUpDownIcon, ChevronDownIcon,
  XMarkIcon, PlusIcon, ArrowLeftIcon, ClockIcon, 
  BookmarkIcon,CheckCircleIcon,
  ArrowRightOnRectangleIcon, EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import NotificationBell from '../components/NotificationBell';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import toast from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatar';
import '../styles/TasksView.css';
import '../styles/Dashboard.css';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-400', dot: 'bg-gray-400' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-blue-500', dot: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-amber-500', dot: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500', dot: 'bg-emerald-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { value: 'high', label: 'High', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  { value: 'low', label: 'Low', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'dueDate-asc', label: 'Due Date (Earliest)' },
  { value: 'dueDate-desc', label: 'Due Date (Latest)' },
  { value: 'priority-desc', label: 'Priority (High → Low)' },
  { value: 'priority-asc', label: 'Priority (Low → High)' },
  { value: 'title-asc', label: 'Alphabetical (A-Z)' },
  { value: 'title-desc', label: 'Alphabetical (Z-A)' },
];

const GROUP_OPTIONS = [
  { value: 'none', label: 'No Grouping' },
  { value: 'project', label: 'By Project' },
  { value: 'status', label: 'By Status' },
  { value: 'priority', label: 'By Priority' },
  { value: 'assignee', label: 'By Assignee' },
];

const VIEW_MODES = [
  { id: 'list', label: 'List', icon: ListBulletIcon },
  { id: 'kanban', label: 'Kanban', icon: Squares2X2Icon },
  { id: 'timeline', label: 'Timeline', icon: ChartBarIcon },
  { id: 'gallery', label: 'Gallery', icon: PhotoIcon },
];

const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };

const TasksView = ({ projectId, isEmbedded }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ status: [], priority: [], project: projectId ? [projectId] : [], dueDateRange: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt-desc');
  const [groupBy, setGroupBy] = useState('none');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  // Filter presets
  const [savedPresets, setSavedPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('taskFilterPresets') || '[]'); } catch { return []; }
  });
  const [presetName, setPresetName] = useState('');
  const [showPresetSave, setShowPresetSave] = useState(false);

  // Timeline Filter
  const [timelineStatusFilter, setTimelineStatusFilter] = useState('todo');

  const [searchParams] = useSearchParams();

  // Apply filters from URL query params (e.g. from AI suggestions on Dashboard)
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    const dueDateParam = searchParams.get('dueDateRange');

    if (statusParam || priorityParam || dueDateParam) {
      setFilters(prev => ({
        ...prev,
        status: statusParam ? statusParam.split(',') : prev.status,
        priority: priorityParam ? priorityParam.split(',') : prev.priority,
        dueDateRange: dueDateParam || prev.dueDateRange,
      }));
      setShowFilters(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (projectId) {
      setFilters(prev => ({ ...prev, project: [projectId] }));
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [taskRes, projectRes] = await Promise.all([taskAPI.getTasks(), projectAPI.getProjects()]);
      setTasks(taskRes.data.tasks || []);
      setProjects(projectRes.data.projects || []);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value) ? prev[type].filter(v => v !== value) : [...prev[type], value],
    }));
  };

  const clearFilters = () => setFilters({ status: [], priority: [], project: [], dueDateRange: '' });

  const activeFilterCount = filters.status.length + filters.priority.length + filters.project.length + (filters.dueDateRange ? 1 : 0);

  // Filtered + Sorted tasks
  const processedTasks = useMemo(() => {
    let result = [...tasks];

    if (filters.status.length) result = result.filter(t => filters.status.includes(t.status));
    if (filters.priority.length) result = result.filter(t => filters.priority.includes(t.priority));
    if (filters.project.length) {
      result = result.filter(t => {
        const pid = typeof t.project === 'object' ? t.project?._id : t.project;
        return filters.project.includes(pid);
      });
    }
    if (filters.dueDateRange) {
      const now = new Date();
      result = result.filter(t => {
        if (!t.dueDate) return filters.dueDateRange === 'none';
        const due = new Date(t.dueDate);
        switch (filters.dueDateRange) {
          case 'overdue': return due < now && t.status !== 'completed';
          case 'today': return due.toDateString() === now.toDateString();
          case 'week': { const end = new Date(now); end.setDate(end.getDate() + 7); return due >= now && due <= end; }
          case 'month': { const end = new Date(now); end.setMonth(end.getMonth() + 1); return due >= now && due <= end; }
          case 'none': return !t.dueDate;
          default: return true;
        }
      });
    }

    // Sort
    const [field, dir] = sortBy.split('-');
    result.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'title': cmp = (a.title || '').localeCompare(b.title || ''); break;
        case 'priority': cmp = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0); break;
        case 'dueDate': cmp = (new Date(a.dueDate || '9999') - new Date(b.dueDate || '9999')); break;
        default: cmp = new Date(a.createdAt) - new Date(b.createdAt);
      }
      return dir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [tasks, filters, sortBy]);

  // Grouped tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return { 'All Tasks': processedTasks };
    const map = {};
    processedTasks.forEach(t => {
      let key;
      switch (groupBy) {
        case 'status': key = STATUS_OPTIONS.find(s => s.value === t.status)?.label || t.status; break;
        case 'priority': key = PRIORITY_OPTIONS.find(p => p.value === t.priority)?.label || t.priority; break;
        case 'project': {
          const pid = typeof t.project === 'object' ? t.project?._id : t.project;
          key = projects.find(p => p._id === pid)?.name || 'Unknown Project'; break;
        }
        case 'assignee': key = t.assignees?.length > 0 ? 'Assigned' : 'Unassigned'; break;
        default: key = 'All';
      }
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [processedTasks, groupBy, projects]);

  const getProjectName = (t) => {
    const pid = typeof t.project === 'object' ? t.project?._id : t.project;
    return projects.find(p => p._id === pid)?.name || '';
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const preset = { name: presetName.trim(), filters: { ...filters }, sortBy, groupBy, id: Date.now() };
    const updated = [...savedPresets, preset];
    setSavedPresets(updated);
    localStorage.setItem('taskFilterPresets', JSON.stringify(updated));
    setPresetName('');
    setShowPresetSave(false);
    toast.success('Filter preset saved!');
  };

  const loadPreset = (preset) => {
    setFilters(preset.filters);
    setSortBy(preset.sortBy);
    setGroupBy(preset.groupBy);
    toast.success(`Loaded "${preset.name}"`);
  };

  const deletePreset = (id) => {
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('taskFilterPresets', JSON.stringify(updated));
  };

  // Helper to grab matching pastel and deep background colors based on a string
  const getGalleryColors = (title) => {
    const pairs = [
      { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
      { bg: 'rgba(236, 72, 153, 0.1)', text: '#EC4899' },
      { bg: 'rgba(10, 185, 129, 0.1)', text: '#10B981' },
      { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' },
      { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6' },
      { bg: 'rgba(6, 182, 212, 0.1)', text: '#06B6D4' },
    ];
    let hash = 0;
    const str = title || 'X';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return pairs[Math.abs(hash) % pairs.length];
  };

  // Helper to clean HTML string from rich text descriptions
  const getCleanDesc = (htmlStr) => {
    if (!htmlStr) return '';
    return htmlStr.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
  };

  const getPriorityColor = (p) => {
    switch(p) {
      case 'urgent': return 'var(--urgent)';
      case 'high': return 'var(--accent-amber)';
      case 'medium': return '#facc15';
      case 'low': return 'var(--low-priority)';
      default: return '#facc15';
    }
  };

  // === RENDER HELPERS ===
  const TaskRow = ({ task }) => {
    const priorityColor = getPriorityColor(task.priority);

    return (
      <div 
        onClick={() => setSelectedTask(task)} 
        className="tasks-view-list-row group relative cursor-pointer"
        style={{ overflow: 'hidden' }}
      >
        {/* Priority Strip */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: priorityColor, borderRadius: '4px 0 0 4px' }} />
        
        {/* Avatar */}
        <img 
          src={getAvatarUrl(task.assignees && task.assignees.length > 0 ? task.assignees[0] : { name: 'Unassigned' })} 
          className="w-10 h-10 rounded-full object-cover shrink-0" 
          alt="Assignee" 
        />

        {/* Content Stack */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="tasks-view-list-title line-clamp-1">{task.title}</p>
          <p className="tasks-view-list-subtitle line-clamp-1">
            {getProjectName(task) || 'No Project'} • {getCleanDesc(task.description) || 'No description'}
          </p>
        </div>

        {/* Action button */}
        <button 
          onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }} 
          className="tasks-view-list-action"
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
      </div>
    );
  };
  const KanbanColumn = ({ status, tasks: colTasks }) => {
    return (
      <div className="tasks-view-kanban-column">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full`} style={{ background: status.color?.replace('bg-', '') || 'var(--text-slate)' }} />
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">{status.label}</span>
          </div>
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 text-[10px] font-bold">
            {colTasks.length}
          </span>
        </div>
        
        {/* Task List */}
        <div className="space-y-3 overflow-y-auto max-h-[75vh] custom-scrollbar pr-1 pb-2">
          {colTasks.map(task => {
            const priorityColor = getPriorityColor(task.priority);
            const tempTag = task.tags && task.tags.length > 0 ? task.tags[0] : (status.value === 'in-progress' ? 'Frontend' : (status.value === 'review' ? 'Backend' : 'Docs'));
            const isCompleted = status.value === 'completed';

            return (
              <div key={task._id} onClick={() => setSelectedTask(task)} className="tasks-view-kanban-card">
                
                {!isCompleted && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" 
                          style={{ color: priorityColor, background: `var(--bg-canvas)` }}>
                      {task.priority || 'medium'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-slate-500 bg-slate-50 dark:bg-slate-900">
                      {tempTag}
                    </span>
                  </div>
                )}

                <h4 className="tasks-view-kanban-card-title mb-2">
                  {task.title}
                </h4>
                
                {status.value === 'in-progress' && (
                  <div className="w-full mb-3">
                     <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: '75%' }} />
                     </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                  </div>

                  <img 
                    src={getAvatarUrl(task.assignees && task.assignees.length > 0 ? task.assignees[0] : { name: 'Unassigned' })} 
                    className="w-5 h-5 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-900" 
                    alt="Assignee" 
                  />
                </div>
              </div>
            );
          })}
          
          <button className="w-full py-2.5 mt-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
               onClick={() => setShowCreateTask(true)}>
            <PlusIcon className="w-3.5 h-3.5 mr-1" /> Add Task
          </button>
        </div>
      </div>
    );
  };

  // Timeline helpers
  const timelineTasks = useMemo(() => {
    let filtered = processedTasks;
    if (timelineStatusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === timelineStatusFilter);
    }
    return filtered.filter(t => t.dueDate || t.startDate).sort((a, b) => new Date(a.startDate || a.dueDate) - new Date(b.startDate || b.dueDate));
  }, [processedTasks, timelineStatusFilter]);

  const timelineRange = useMemo(() => {
    if (!timelineTasks.length) return { start: new Date(), end: new Date(), days: 30 };
    const dates = timelineTasks.flatMap(t => [t.startDate, t.dueDate].filter(Boolean).map(d => new Date(d)));
    const min = new Date(Math.min(...dates)); min.setDate(min.getDate() - 2);
    const max = new Date(Math.max(...dates)); max.setDate(max.getDate() + 5);
    return { start: min, end: max, days: Math.max(14, Math.ceil((max - min) / (1000 * 60 * 60 * 24))) };
  }, [timelineTasks]);



  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative"><div className="w-10 h-10 rounded-full border-[3px] border-slate-200 dark:border-slate-800" /><div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-t-blue-500 animate-spin" /></div>
          <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-wider">Loading tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`tasks-view-page flex ${isEmbedded ? 'h-full bg-transparent' : 'h-screen bg-slate-50 dark:bg-slate-950'} overflow-hidden dark`}>

      {/* NEW SIDEBAR */}
      {!isEmbedded && (
      <aside className="taskly-sidebar flex flex-col shrink-0" style={{ gap: '16px', padding: '16px', zIndex: 30 }}>
        
        {/* Sidebar Header */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-3 px-2 select-none">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white border-none" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: '0 0 12px rgba(99, 102, 241, 0.25)' }}>
              <CheckCircleIcon className="w-5 h-5" />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 900, color: '#D1D1D1', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Tasks</span>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="sidebar-list-container shrink-0 mt-4">
          
          <div className="flex flex-col gap-1">
            <Link to="/dashboard" className="sidebar-item-btn">
              <span className="flex items-center gap-3">
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </span>
            </Link>
            
            <button 
              onClick={() => {
                if (filters.project.length === 0) return;
                setFilters(prev => ({ ...prev, project: [] }));
              }}
              className={`sidebar-item-btn ${filters.project.length === 0 ? 'active' : ''}`}
            >
              <span className="flex items-center gap-3">
                <Squares2X2Icon className="w-4 h-4" />
                <span>All Tasks</span>
              </span>
              <span className="sidebar-pill-badge">{tasks.length}</span>
            </button>
          </div>
          
          {/* Projects List in Sidebar */}
          <div className="sidebar-list-container flex-1 overflow-y-auto custom-scrollbar mb-2 pr-1">
          {projects.length > 0 && (
            <div className="flex flex-col gap-1 mt-4">
              <div className="sidebar-section-label" style={{ margin: 0, paddingBottom: '4px' }}>Projects</div>
              {projects.map(p => {
                const isActive = filters.project.includes(p._id);
                const pTasksCount = tasks.filter(t => {
                  const pid = typeof t.project === 'object' ? t.project?._id : t.project;
                  return pid === p._id;
                }).length;

                return (
                  <div 
                    key={p._id}
                    onClick={() => {
                      // Toggle this project filter exclusively
                      setFilters(prev => ({ ...prev, project: [p._id] }));
                    }}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all"
                    style={{ 
                      color: isActive ? '#A5B4FC' : '#828383',
                      background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = '#141414'; e.currentTarget.style.color = '#D1D1D1'; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#828383'; } }}
                  >
                    <div className="flex items-center gap-3 truncate min-w-0 pr-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'}`} style={isActive ? {} : {background: '#434343'}} />
                      <span className="truncate">{p.name}</span>
                    </div>
                    {pTasksCount > 0 && (
                      <span className="sidebar-pill-badge" style={{ background: '#1E1E1E', color: '#828383' }}>
                        {pTasksCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
          
          <div className="px-3">
            <div className="w-full h-px" style={{ background: '#1E1E1E' }}></div>
          </div>

          <div className="flex flex-col gap-1 mt-2 shrink-0 pb-2">
            <div className="sidebar-section-label" style={{ margin: 0, paddingBottom: '4px' }}>Quick Actions</div>
            <button onClick={() => setShowCreateTask(true)} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-white font-bold text-[13px] transition-colors border-none cursor-pointer" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)' }}>
              <PlusIcon className="w-4 h-4" />
              New Task
            </button>
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-3 shrink-0" style={{ borderTop: '1px solid #1E1E1E' }}>
          <div className="flex items-center justify-between">
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-85 transition-opacity min-w-0 pr-1 decoration-transparent">
              <img src={getAvatarUrl(user)} className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: '1px solid #2A2A2A' }} alt="Profile" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-extrabold leading-tight truncate" style={{ color: '#D1D1D1' }}>{user?.name || 'User'}</span>
                <span className="text-[9px] font-semibold truncate" style={{ color: '#605E5E' }}>{user?.email?.split('@')[0]}</span>
              </div>
            </Link>

            <div className="flex items-center gap-0.5 shrink-0">
               <NotificationBell />
               <button onClick={logout} className="p-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer" style={{ color: '#605E5E' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#605E5E'; e.currentTarget.style.background = 'transparent'; }}>
                 <ArrowRightOnRectangleIcon className="w-4.5 h-4.5" />
               </button>
            </div>
          </div>
        </div>

      </aside>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative z-10 ${isEmbedded ? 'rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950' : ''}`}>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className={`${isEmbedded ? 'w-full p-6' : 'max-w-[1400px] mx-auto px-8 py-8'} h-full flex flex-col`}>
        {/* Toolbar */}
        <div className="tasks-view-toolbar">
          {/* View Switcher */}
          <div className="tasks-view-switcher">
            {VIEW_MODES.map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className={`tasks-view-switcher-btn ${
                  viewMode === v.id ? 'tasks-view-switcher-btn-active' : 'tasks-view-switcher-btn-inactive'
                }`}>
                <v.icon className="w-4 h-4" /> <span className="hidden md:inline">{v.label}</span>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* New Task Button */}
            <button onClick={() => setShowCreateTask(true)} className="tasks-view-action-btn tasks-view-btn-primary">
              <PlusIcon className="w-4 h-4" /> New Task
            </button>

            {/* Filter Button */}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`tasks-view-action-btn ${
                activeFilterCount > 0 ? 'tasks-view-btn-active' : 'tasks-view-btn-secondary'
              }`}>
              <FunnelIcon className="w-4 h-4" /> Filter {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px]">{activeFilterCount}</span>}
            </button>

            {/* Sort */}
            <div className="relative">
              <button onClick={() => { setShowSortMenu(!showSortMenu); setShowGroupMenu(false); }}
                className="tasks-view-action-btn tasks-view-btn-secondary">
                <ArrowsUpDownIcon className="w-4 h-4" /> Sort <ChevronDownIcon className="w-3 h-3" />
              </button>
              {showSortMenu && (
                <><div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="tasks-view-dropdown-menu">
                  {SORT_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => { setSortBy(o.value); setShowSortMenu(false); }}
                      className="tasks-view-dropdown-item">
                      {o.label}
                    </button>
                  ))}
                </div></>
              )}
            </div>

            {/* Group */}
            <div className="relative">
              <button onClick={() => { setShowGroupMenu(!showGroupMenu); setShowSortMenu(false); }}
                className="tasks-view-action-btn tasks-view-btn-secondary">
                <Squares2X2Icon className="w-4 h-4" /> Group <ChevronDownIcon className="w-3 h-3" />
              </button>
              {showGroupMenu && (
                <><div className="fixed inset-0 z-40" onClick={() => setShowGroupMenu(false)} />
                <div className="tasks-view-dropdown-menu">
                  {GROUP_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => { setGroupBy(o.value); setShowGroupMenu(false); }}
                      className="tasks-view-dropdown-item">
                      {o.label}
                    </button>
                  ))}
                </div></>
              )}
            </div>

            {/* Save Preset */}
            {activeFilterCount > 0 && (
              <button onClick={() => setShowPresetSave(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors uppercase tracking-wider">
                <BookmarkIcon className="w-3.5 h-3.5" /> Save
              </button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="tasks-view-filter-panel animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] uppercase tracking-wider font-bold text-slate-900 dark:text-white">Active Filters</h3>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && <button onClick={clearFilters} className="text-[11px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider">Clear All</button>}
                <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded"><XMarkIcon className="w-4 h-4 text-slate-400" /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Status */}
              <div>
                <p className="tasks-view-filter-label">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.value} onClick={() => toggleFilter('status', s.value)}
                      className={`tasks-view-filter-tag ${
                        filters.status.includes(s.value) ? 'tasks-view-filter-tag-active' : 'tasks-view-filter-tag-inactive'
                      }`}>
                      <div className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Priority */}
              <div>
                <p className="tasks-view-filter-label">Priority</p>
                <div className="flex flex-wrap gap-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button key={p.value} onClick={() => toggleFilter('priority', p.value)}
                      className={`tasks-view-filter-tag ${
                        filters.priority.includes(p.value) ? 'tasks-view-filter-tag-active' : 'tasks-view-filter-tag-inactive'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Project */}
              {!projectId && (
                <div>
                  <p className="tasks-view-filter-label">Project</p>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar pr-2">
                    {projects.map(p => (
                      <button key={p._id} onClick={() => toggleFilter('project', p._id)}
                        className={`tasks-view-filter-tag truncate max-w-[140px] ${
                          filters.project.includes(p._id) ? 'tasks-view-filter-tag-active' : 'tasks-view-filter-tag-inactive'
                        }`}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Due Date */}
              <div>
                <p className="tasks-view-filter-label">Due Date</p>
                <div className="flex flex-wrap gap-2">
                  {[{ v: 'overdue', l: 'Overdue' }, { v: 'today', l: 'Today' }, { v: 'week', l: 'This Week' }, { v: 'month', l: 'This Month' }, { v: 'none', l: 'No Due Date' }].map(d => (
                    <button key={d.v} onClick={() => setFilters(prev => ({ ...prev, dueDateRange: prev.dueDateRange === d.v ? '' : d.v }))}
                      className={`tasks-view-filter-tag ${
                        filters.dueDateRange === d.v ? 'tasks-view-filter-tag-active' : 'tasks-view-filter-tag-inactive'
                      }`}>
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Saved Presets */}
            {savedPresets.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="tasks-view-filter-label">Saved Presets</p>
                <div className="flex flex-wrap gap-2">
                  {savedPresets.map(p => (
                    <div key={p.id} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg overflow-hidden">
                      <button onClick={() => loadPreset(p)} className="px-3 py-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors uppercase tracking-wider">{p.name}</button>
                      <button onClick={() => deletePreset(p.id)} className="px-2 py-1.5 text-blue-400 hover:text-red-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"><XMarkIcon className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Preset Modal */}
        {showPresetSave && (
          <><div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPresetSave(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl w-full max-w-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">Save Preset</h3>
              <input autoFocus value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="e.g. My Urgent Tasks" className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-white outline-none focus:border-blue-500 mb-6" onKeyDown={e => e.key === 'Enter' && savePreset()} />
              <div className="flex gap-3">
                <button onClick={() => setShowPresetSave(false)} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-[13px]">Cancel</button>
                <button onClick={savePreset} disabled={!presetName.trim()} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] disabled:opacity-50">Save</button>
              </div>
            </div>
          </div></>
        )}

        {/* ═══ VIEW CONTENT ═══ */}
        {viewMode === 'list' && (
          <div>
            {Object.entries(groupedTasks).map(([group, gTasks]) => (
              <div key={group} className="mb-8">
                {groupBy !== 'none' && (
                  <div className="tasks-view-group-header">
                    <h3 className="tasks-view-group-title">{group}</h3>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded uppercase font-bold">{gTasks.length} tasks</span>
                  </div>
                )}
                <div className="tasks-view-list-container">
                  {gTasks.length === 0 ? <p className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No tasks match criteria</p> : gTasks.map(t => <TaskRow key={t._id} task={t} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'kanban' && (
          <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 items-start">
            {STATUS_OPTIONS.map(s => (
              <KanbanColumn key={s.value} status={s} tasks={processedTasks.filter(t => t.status === s.value)} />
            ))}
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" style={{ height: '600px' }}>
             {/* Left Active Tasks Sidebar */}
             <div className="w-[300px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 timeline-sidebar-bg flex flex-col z-20">
                  <div className="h-[60px] flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 timeline-header-bg">
                    <span className="font-bold text-[10px] text-slate-500 tracking-widest uppercase">Active Tasks</span>
                    <select 
                      className="bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold rounded px-1.5 py-1 outline-none cursor-pointer"
                      value={timelineStatusFilter}
                      onChange={e => setTimelineStatusFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="todo">Todo</option>
                      <option value="in-progress">In Prog</option>
                      <option value="review">Review</option>
                    </select>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-transparent">
                    {timelineTasks.length === 0 && (
                      <div className="p-8 text-center text-xs text-slate-400">No active tasks with dates</div>
                    )}
                    {timelineTasks.map(task => (
                      <div key={`sidebar-${task._id}`} className="h-[80px] border-b border-slate-200 dark:border-slate-800 p-4 relative group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>
                        <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-1 truncate pr-6">{task.title}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                           <span className="truncate max-w-[120px]">{getProjectName(task) || 'No Project'}</span>
                           <span>•</span>
                           <span className="text-blue-500">
                             {task.status.replace('-', ' ')}
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
             </div>

             {/* Right Timeline Grid Area */}
             <div className="flex-1 overflow-auto custom-scrollbar timeline-grid-bg relative">
               {timelineTasks.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-400 uppercase tracking-wider z-10">
                     No Data
                  </div>
               ) : (
                  <>
                    <div className="absolute inset-0 min-w-max flex flex-col pointer-events-none">
                      {/* Header Dates Row */}
                      <div className="flex h-[60px] border-b border-slate-200 dark:border-slate-800 pointer-events-auto timeline-header-bg z-10 sticky top-0">
                        {Array.from({ length: Math.min(timelineRange.days, 60) }, (_, i) => {
                          const d = new Date(timelineRange.start); d.setDate(d.getDate() + i);
                          const isToday = d.toDateString() === new Date().toDateString();
                          const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                          return (
                            <div key={i} className={`w-[120px] flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 min-w-[120px] transition-colors ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                              <span className={`text-[12px] font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>{d.getDate()}</span>
                              <span className={`text-[9px] uppercase tracking-widest mt-0.5 ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>{months[d.getMonth()]}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Grid Lines Body */}
                      <div className="flex-1 flex relative">
                        {Array.from({ length: Math.min(timelineRange.days, 60) }, (_, i) => (
                           <div key={`grid-${i}`} className="w-[120px] flex-shrink-0 min-w-[120px] border-r border-slate-200 dark:border-slate-800 border-dashed h-full" />
                        ))}
                        
                        {/* Interactive Task Graph Markers */}
                        <div className="absolute inset-x-0 top-0 flex flex-col pointer-events-auto">
                           {timelineTasks.map((task, idx) => {
                              const start = new Date(task.startDate || task.dueDate);
                              const startOffset = Math.max(0, (start - timelineRange.start) / (1000 * 60 * 60 * 24));
                              
                              const leftPx = startOffset * 120 + 20; 
                              const isRed = task.priority === 'urgent' || task.priority === 'high';
                              const barBg = isRed ? 'var(--urgent-bg)' : 'var(--bg-card)';
                              const barColor = isRed ? 'var(--urgent)' : 'var(--text-main)';
                              const barBorder = isRed ? 'var(--urgent)' : 'var(--primary-cobalt)';
                              const titleShort = task.title.length > 14 ? task.title.substring(0, 14) + '...' : task.title;
                              
                              return (
                                <div key={`timeline-row-${task._id}`} className="h-[80px] border-b border-transparent relative w-full group cursor-pointer" onClick={() => setSelectedTask(task)}>
                                  <div className="absolute top-1/2 -translate-y-1/2 flex items-center h-[32px] rounded-md px-3 text-[11px] font-bold transition-all z-10 shadow-sm"
                                       style={{ 
                                         left: `${leftPx}px`, 
                                         background: barBg,
                                         color: barColor,
                                         borderLeft: `4px solid ${barBorder}`,
                                         borderTop: '1px solid var(--border-color)',
                                         borderRight: '1px solid var(--border-color)',
                                         borderBottom: '1px solid var(--border-color)',
                                         whiteSpace: 'nowrap'
                                       }}>
                                    <span className="tracking-wide">{titleShort}</span>
                                  </div>
                                </div>
                              );
                           })}
                        </div>
                      </div>
                    </div>
                  </>
               )}
             </div>
          </div>
        )}

        {viewMode === 'gallery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {processedTasks.map(task => {
              const galleryColors = getGalleryColors(task.title);

              return (
                <div key={task._id} onClick={() => setSelectedTask(task)}
                  className="tasks-view-gallery-card group">
                  
                  {/* Big Color Block Header */}
                  <div className="relative h-32 w-full flex items-center justify-center transition-all bg-slate-100 dark:bg-slate-900" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <span className="text-[60px] font-black" style={{ color: galleryColors.text, opacity: 0.8 }}>{task.title?.charAt(0).toUpperCase()}</span>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }} 
                      className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                      style={{ background: 'transparent', border: 'none', padding: 0 }}
                    >
                      <EllipsisHorizontalIcon className="w-5 h-5 opacity-70 hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                  
                  {/* Content Area */}
                  <div className="p-4 flex flex-col flex-1 bg-white dark:bg-slate-950">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                        {getProjectName(task) || 'No Project'}
                      </span>
                    </div>
                    
                    <h3 className="text-[14px] leading-tight font-bold text-slate-900 dark:text-white line-clamp-1 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.title}</h3>
                    <p className="text-[12px] text-slate-500 line-clamp-2 mb-4" style={{ minHeight: '36px', lineHeight: '1.5' }}>
                      {getCleanDesc(task.description) || 'No description provided.'}
                    </p>
                    
                    {/* Footer Metrics */}
                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                        </div>
                        <div className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-white transition-colors">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          <span>{task.comments?.length || 0}</span>
                        </div>
                      </div>

                      <img 
                        src={getAvatarUrl(task.assignees && task.assignees.length > 0 ? task.assignees[0] : { name: 'Unassigned' })} 
                        className="w-5 h-5 rounded-full object-cover" 
                        alt="Assignee" 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {processedTasks.length === 0 && (
              <div className="col-span-full p-12 text-center text-sm font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">No tasks</div>
            )}
          </div>
        )}
      </div>
        </div>
      </main>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask) => {
            setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
            setSelectedTask(updatedTask);
          }}
          onDelete={(taskId) => {
             setTasks(prev => prev.filter(t => t._id !== taskId));
             setSelectedTask(null);
             toast.success('Task deleted');
          }}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onCreated={() => fetchData()}
        />
      )}
    </div>
  );
};

export default TasksView;
