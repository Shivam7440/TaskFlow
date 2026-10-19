import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { taskAPI, projectAPI, workspaceAPI, aiAPI } from '../services/api';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  FolderIcon,
  SparklesIcon,
  FlagIcon,
  CalendarDaysIcon,
  BoltIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ActivityCalendar } from 'react-activity-calendar';
import NotificationBell from '../components/NotificationBell';
import { getAvatarUrl } from '../utils/avatar';
import '../styles/Dashboard.css';

const statusConfig = {
  'todo': { label: 'To Do', color: '#94a3b8', bg: 'bg-slate-100 dark:bg-slate-900' },
  'in-progress': { label: 'In Progress', color: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'review': { label: 'Review', color: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  'completed': { label: 'Completed', color: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  'blocked': { label: 'Blocked', color: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/30' },
};

const priorityColors = {
  'urgent': '#e11d48',
  'high': '#f59e0b',
  'medium': '#eab308',
  'low': '#22c55e',
};

// Simple bar chart
const BarChart = ({ data, maxValue, height = 200 }) => {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-3 justify-between" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
          <div className="relative w-full flex justify-center">
            <span className="absolute -top-6 text-xs font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">{item.value}</span>
          </div>
          <div
            className="w-full rounded-t-lg transition-all duration-700 ease-out hover:opacity-80 relative overflow-hidden"
            style={{
              height: `${Math.max((item.value / max) * (height - 40), 4)}px`,
              backgroundColor: item.color,
              minWidth: '24px',
            }}
          >
             <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center uppercase tracking-wider truncate w-full">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// Donut chart
const DonutChart = ({ data, size = 180 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 drop-shadow-md">
        {data.map((item, i) => {
          const strokeLen = (item.value / total) * circumference;
          const currentOffset = offset;
          offset += strokeLen;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="18"
              strokeDasharray={`${strokeLen} ${circumference - strokeLen}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out hover:brightness-110 cursor-pointer"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{total}</span>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Total</span>
      </div>
    </div>
  );
};

// Progress ring
const ProgressRing = ({ value, max, size = 100, color = '#3B82F6', label }) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 group">
      <div className="relative drop-shadow-sm" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 transform group-hover:scale-105 transition-transform duration-300">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-900 dark:text-white">{percentage}%</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
};

const Analytics = ({ projectId, isEmbedded }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(projectId || 'all');

  // AI Insights State
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoadingInsights(true);
      const res = await workspaceAPI.getWorkspaces();
      const workspaces = res.data.workspaces;
      if (!workspaces || workspaces.length === 0) {
         toast.error("No workspaces found to generate insights for.");
         return;
      }
      const wsId = workspaces[0]._id;
      const aiRes = await aiAPI.getWorkspaceInsights(wsId);
      setAiInsights(aiRes.data.insights);
    } catch (e) {
      toast.error("Failed to fetch AI insights");
      console.error(e);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (projectId) setSelectedProject(projectId);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [taskRes, projectRes] = await Promise.all([
        taskAPI.getTasks(),
        projectAPI.getProjects(),
      ]);
      setTasks(taskRes.data.tasks || []);
      setProjects(projectRes.data.projects || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (selectedProject === 'all') return tasks;
    return tasks.filter(t => (t.project?._id || t.project) === selectedProject);
  }, [tasks, selectedProject]);

  const analytics = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in-progress').length;
    const review = filteredTasks.filter(t => t.status === 'review').length;
    const todo = filteredTasks.filter(t => t.status === 'todo').length;
    const blocked = filteredTasks.filter(t => t.status === 'blocked').length;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdue = filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed').length;
    const noDueDate = filteredTasks.filter(t => !t.dueDate).length;

    const urgent = filteredTasks.filter(t => t.priority === 'urgent').length;
    const high = filteredTasks.filter(t => t.priority === 'high').length;
    const medium = filteredTasks.filter(t => t.priority === 'medium').length;
    const low = filteredTasks.filter(t => t.priority === 'low').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const engagementScore = total > 0 ? Math.min(100, Math.round(
      (completed * 3 + inProgress * 2 + review * 1.5) / (total * 3) * 100
    )) : 0;

    const tasksWithDue = filteredTasks.filter(t => t.dueDate);
    const completedOnTime = filteredTasks.filter(t =>
      t.status === 'completed' && t.dueDate && t.completedAt &&
      new Date(t.completedAt) <= new Date(t.dueDate)
    ).length;
    const onTimeRate = tasksWithDue.filter(t => t.status === 'completed').length > 0
      ? Math.round((completedOnTime / tasksWithDue.filter(t => t.status === 'completed').length) * 100)
      : 0;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const thisWeekCompleted = filteredTasks.filter(t =>
      t.completedAt && new Date(t.completedAt) >= weekStart
    ).length;

    const projectStats = projects.map(p => {
      const projectTasks = tasks.filter(t => (t.project?._id || t.project) === p._id);
      const projCompleted = projectTasks.filter(t => t.status === 'completed').length;
      const projTotal = projectTasks.length;
      return {
        id: p._id,
        name: p.name,
        color: p.color || '#64748b',
        total: projTotal,
        completed: projCompleted,
        inProgress: projectTasks.filter(t => t.status === 'in-progress').length,
        review: projectTasks.filter(t => t.status === 'review').length,
        todo: projectTasks.filter(t => t.status === 'todo').length,
        blocked: projectTasks.filter(t => t.status === 'blocked').length,
        overdue: projectTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed').length,
        progress: projTotal > 0 ? Math.round((projCompleted / projTotal) * 100) : 0,
      };
    });

    return {
      total, completed, inProgress, review, todo, blocked,
      overdue, noDueDate,
      urgent, high, medium, low,
      completionRate, engagementScore, onTimeRate, thisWeekCompleted,
      projectStats,
    };
  }, [filteredTasks, projects, tasks]);

  const activityData = useMemo(() => {
    const end = new Date();
    const start = new Date(new Date().setFullYear(end.getFullYear() - 1));
    start.setHours(0,0,0,0);
    
    const dateCounts = {};
    filteredTasks.forEach(task => {
        if (task.createdAt) {
            const d = new Date(task.createdAt).toISOString().split('T')[0];
            dateCounts[d] = (dateCounts[d] || 0) + 1;
        }
        if (task.updatedAt) {
            const d = new Date(task.updatedAt).toISOString().split('T')[0];
            dateCounts[d] = (dateCounts[d] || 0) + 1;
        }
        if (task.completedAt) {
            const d = new Date(task.completedAt).toISOString().split('T')[0];
            dateCounts[d] = (dateCounts[d] || 0) + 2; 
        }
    });

    const data = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const count = dateCounts[dateStr] || 0;
        
        let level = 0;
        if (count >= 10) level = 4;
        else if (count >= 5) level = 3;
        else if (count >= 2) level = 2;
        else if (count >= 1) level = 1;
        
        data.push({
            date: dateStr,
            count: count,
            level: level
        });
    }
    return data;
  }, [filteredTasks]);

  const statusDonutData = [
    { label: 'To Do', value: analytics.todo, color: statusConfig['todo'].color },
    { label: 'In Progress', value: analytics.inProgress, color: statusConfig['in-progress'].color },
    { label: 'Review', value: analytics.review, color: statusConfig['review'].color },
    { label: 'Completed', value: analytics.completed, color: statusConfig['completed'].color },
    { label: 'Blocked', value: analytics.blocked, color: statusConfig['blocked'].color },
  ].filter(d => d.value > 0);

  const priorityBarData = [
    { label: 'Urgent', value: analytics.urgent, color: priorityColors.urgent },
    { label: 'High', value: analytics.high, color: priorityColors.high },
    { label: 'Medium', value: analytics.medium, color: priorityColors.medium },
    { label: 'Low', value: analytics.low, color: priorityColors.low },
  ];

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 dark:border-slate-800" />
            <div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-t-blue-500 animate-spin" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 animate-pulse uppercase tracking-widest">Gathering insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isEmbedded ? 'h-full bg-transparent rounded-2xl border border-slate-200 dark:border-slate-800' : 'min-h-screen bg-slate-50 dark:bg-slate-950'} font-sans selection:bg-blue-500/30 ${theme === 'dark' ? 'dark' : ''} overflow-y-auto custom-scrollbar`}>
      {/* Nav */}
      {!isEmbedded && (
      <nav className="sticky top-0 z-30 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 transition-colors"><ArrowLeftIcon className="w-5 h-5" /></Link>
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">TaskFlow Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="pl-3 pr-8 py-1.5 text-xs font-bold uppercase tracking-wider border-none ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mr-2"
                >
                  <option value="all">All Projects</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              <NotificationBell isHeader={true} />

              <button onClick={logout} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 transition-colors"><ArrowRightOnRectangleIcon className="w-5 h-5" /></button>
              <Link to="/profile" className="ml-2 flex items-center">
                <img src={getAvatarUrl(user)} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" alt="Avatar" />
              </Link>
            </div>
          </div>
        </div>
      </nav>
      )}

      {/* Main Content */}
      <div className={`${isEmbedded ? 'w-full' : 'max-w-[1400px] mx-auto'} px-6 py-6`}>
        
        {/* AI Insights Card */}
        <div className="mb-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-6 transition-colors">
            <div className="flex-1">
                <h2 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2 uppercase tracking-wider">
                    <SparklesIcon className="w-4 h-4 text-blue-500" />
                    AI Workspace Insights
                </h2>
                {aiInsights ? (
                    <ul className="space-y-2 mt-4">
                        {aiInsights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                                <span>{insight}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 max-w-2xl mt-1">
                        Unlock AI-powered analysis of your team's workflow, potential bottlenecks, and intelligent recommendations to improve productivity.
                    </p>
                )}
            </div>
            <div className="shrink-0 flex items-center justify-center">
                <button 
                    onClick={fetchInsights} 
                    disabled={loadingInsights}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all focus:ring-2 focus:ring-blue-500 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                    {loadingInsights ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Analyzing
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-4 h-4" />
                            {aiInsights ? 'Refresh' : 'Generate'}
                        </>
                    )}
                </button>
            </div>
        </div>
        
        {/* Dynamic Activity Heatmap */}
        <div className="mb-6 bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors overflow-hidden">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
               <CalendarDaysIcon className="w-4 h-4 text-blue-500" />
               Workspace Activity
            </h3>
            <div className="w-full flex justify-center pb-2 overflow-x-auto custom-scrollbar">
                <ActivityCalendar 
                     data={activityData}
                     colorScheme={theme === 'dark' ? 'dark' : 'light'}
                     theme={{
                         light: ['#f1f5f9', '#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'],
                         dark: ['#1e293b', '#1e3a8a', '#1e40af', '#2563eb', '#60a5fa']
                     }}
                     blockSize={14}
                     blockRadius={4}
                     blockMargin={4}
                     fontSize={12}
                />
            </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-950 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors hover:border-blue-500 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tasks</span>
              <div className="w-7 h-7 rounded bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center transition-colors">
                <FolderIcon className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{analytics.total}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{analytics.noDueDate} no due date</p>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors hover:border-emerald-500 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
              <div className="w-7 h-7 rounded bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center transition-colors">
                <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{analytics.completed}</p>
            <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-wider">
              <ArrowTrendingUpIcon className="w-3 h-3" />
              {analytics.completionRate}% rate
            </p>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors hover:border-amber-500 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Progress</span>
              <div className="w-7 h-7 rounded bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center transition-colors">
                <ClockIcon className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{analytics.inProgress}</p>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{analytics.review} in review</p>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors hover:border-red-500 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overdue</span>
              <div className="w-7 h-7 rounded bg-red-50 dark:bg-red-900/30 flex items-center justify-center transition-colors">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{analytics.overdue}</p>
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{analytics.blocked} blocked</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Performance Score */}
          <div className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
              <SparklesIcon className="w-4 h-4 text-blue-500" />
              Team Performance
            </h3>
            <div className="flex justify-between items-end mb-6">
               <ProgressRing value={analytics.completionRate} max={100} size={90} color="#10b981" label="Complete" />
               <ProgressRing value={analytics.engagementScore} max={100} size={90} color="#3b82f6" label="Engage" />
               <ProgressRing value={analytics.onTimeRate} max={100} size={90} color="#8b5cf6" label="On-Time" />
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BoltIcon className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Velocity (Week)</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{analytics.thisWeekCompleted} tasks</span>
              </div>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <ChartBarIcon className="w-4 h-4 text-blue-500" />
              Status Breakdown
            </h3>
            <div className="flex justify-center mb-6 py-2 flex-1 items-center">
              {statusDonutData.length > 0 ? (
                <DonutChart data={statusDonutData} size={150} />
              ) : (
                <div className="w-[150px] h-[150px] rounded-full border-4 border-slate-100 dark:border-slate-800 border-dashed flex items-center justify-center text-slate-400">
                  <p className="text-[10px] font-bold uppercase tracking-wider">No Data</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {statusDonutData.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-900 text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label} <span className="opacity-60 text-slate-400">({item.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <FlagIcon className="w-4 h-4 text-blue-500" />
              Priorities
            </h3>
            <div className="flex-1 flex items-end mb-6">
              <BarChart data={priorityBarData} height={140} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-auto">
              {priorityBarData.map(item => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${!projectId ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-4 pb-6`}>
          {/* Project Health */}
          {!projectId && (
          <div className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <FolderIcon className="w-4 h-4 text-blue-500" />
              Project Health
            </h3>

            {analytics.projectStats.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No projects found</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[80vh] custom-scrollbar pr-2">
                {analytics.projectStats.map(project => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="group flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-white dark:bg-slate-950 hover:shadow-md transition-all duration-200"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: project.color }}>
                      {project.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                          {project.name}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${project.total > 0 ? (project.completed / project.total) * 100 : 0}%` }} />
                          <div className="bg-blue-500 transition-all duration-500" style={{ width: `${project.total > 0 ? (project.inProgress / project.total) * 100 : 0}%` }} />
                          <div className="bg-amber-500 transition-all duration-500" style={{ width: `${project.total > 0 ? (project.review / project.total) * 100 : 0}%` }} />
                          <div className="bg-red-500 transition-all duration-500" style={{ width: `${project.total > 0 ? (project.blocked / project.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {[
                        { count: project.completed, color: 'var(--emerald-500, #10b981)', bg: 'rgba(16, 185, 129, 0.1)' },
                        { count: project.inProgress, color: 'var(--blue-500, #3b82f6)', bg: 'rgba(59, 130, 246, 0.1)' },
                        { count: project.overdue, color: 'var(--red-500, #ef4444)', bg: 'rgba(239, 68, 68, 0.1)' },
                      ].filter(s => s.count > 0).map((s, i) => (
                        <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: s.color, background: s.bg }}>
                          {s.count}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Latest Tasks */}
          <div className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <CalendarDaysIcon className="w-4 h-4 text-blue-500" />
              Latest Activity
            </h3>
            
            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 custom-scrollbar pr-1">
              {filteredTasks.slice(0, 10).map((task) => {
                const sc = statusConfig[task.status] || statusConfig['todo'];
                const project = projects.find(p => p._id === (task.project?._id || task.project));
                return (
                  <div key={task._id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-900/50 transition-colors group cursor-default">
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: sc.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          {project?.name || 'No Project'}
                        </span>
                        {task.priority && ['urgent', 'high'].includes(task.priority) && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ color: task.priority === 'urgent' ? '#ef4444' : '#f59e0b', background: task.priority === 'urgent' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {filteredTasks.length > 10 && (
              <div className="pt-4 mt-2 text-center">
                 <Link to="/tasks" className="text-[10px] font-bold text-blue-600 hover:text-blue-500 uppercase tracking-widest">View All Tasks →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
