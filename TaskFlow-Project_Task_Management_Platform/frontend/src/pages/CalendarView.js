import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { taskAPI, projectAPI } from '../services/api';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';
import { getAvatarUrl } from '../utils/avatar';
import '../styles/Dashboard.css';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const statusConfig = {
  'todo': { label: 'To Do', dot: '#94a3b8' },
  'in-progress': { label: 'In Progress', dot: '#3b82f6' },
  'review': { label: 'In Review', dot: '#f59e0b' },
  'completed': { label: 'Completed', dot: '#10b981' },
  'blocked': { label: 'Blocked', dot: '#ef4444' },
};

const CalendarView = ({ projectId, isEmbedded }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => { fetchData(); }, []);

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
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const projectTasks = useMemo(() => {
    if (!projectId) return tasks;
    return tasks.filter(t => {
      const pId = typeof t.project === 'object' ? t.project?._id : t.project;
      return pId === projectId;
    });
  }, [tasks, projectId]);

  const tasksByDate = useMemo(() => {
    const map = {};
    const filtered = filterStatus === 'all' ? projectTasks : projectTasks.filter(t => t.status === filterStatus);
    filtered.forEach(task => {
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push({ ...task, dateType: 'due' });
      }
      if (task.startDate) {
        const d = new Date(task.startDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        if (!task.dueDate || new Date(task.dueDate).toDateString() !== d.toDateString()) {
          map[key].push({ ...task, dateType: 'start' });
        }
      }
      if (task.completedAt) {
        const d = new Date(task.completedAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        const dueSame = task.dueDate && new Date(task.dueDate).toDateString() === d.toDateString();
        const startSame = task.startDate && new Date(task.startDate).toDateString() === d.toDateString();
        if (!dueSame && !startSame) {
          map[key].push({ ...task, dateType: 'completed' });
        }
      }
    });
    return map;
  }, [projectTasks, filterStatus]);

  const getTasksForDate = (day) => tasksByDate[`${year}-${month}-${day}`] || [];
  const getProjectName = (id) => projects.find(p => p._id === id)?.name || 'Unknown';
  const getProjectColor = (id) => projects.find(p => p._id === id)?.color || '#64748b';
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isPast = (day) => new Date(year, month, day) < today;
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const numRows = cells.length / 7;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 dark:border-slate-800" />
            <div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-t-blue-500 animate-spin" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 animate-pulse uppercase tracking-widest">Loading calendar</p>
        </div>
      </div>
    );
  }

  const overdueTasks = projectTasks.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed');

  return (
    <div className={`${isEmbedded ? 'h-full bg-transparent rounded-2xl border border-slate-200 dark:border-slate-800' : 'h-screen bg-slate-50 dark:bg-slate-950'} flex flex-col font-sans overflow-hidden transition-colors ${theme === 'dark' ? 'dark' : ''}`}>
      
      {/* Nav */}
      {!isEmbedded && (
      <nav className="shrink-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 transition-colors"><ArrowLeftIcon className="w-5 h-5" /></Link>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">TaskFlow Calendar</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell isHeader={true} />

            <button onClick={logout} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 transition-colors"><ArrowRightOnRectangleIcon className="w-5 h-5" /></button>
            <Link to="/profile" className="ml-2 flex items-center">
              <img src={getAvatarUrl(user)} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" alt="Avatar" />
            </Link>
          </div>
        </div>
      </nav>
      )}

      <div className={`flex-1 flex overflow-hidden ${isEmbedded ? 'w-full' : 'max-w-[1400px] w-full mx-auto'}`}>
        {/* Left Calendar Grid */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Controls */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight m-0">
                {MONTHS[month]} <span className="text-slate-500 font-medium">{year}</span>
              </h1>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 border-r border-slate-200 dark:border-slate-700 transition-colors">
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
              <button onClick={goToToday} className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border border-blue-100 dark:border-blue-800/50 transition-colors shadow-sm uppercase tracking-wider">
                Today
              </button>
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-3 pr-8 py-1.5 text-xs font-bold uppercase tracking-wider border-none ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors relative z-10">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50">
              {DAYS.map(day => (
                <div key={day} className="py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>

            {/* Date Cells */}
            <div 
              className="flex-1 grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-900"
              style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
            >
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`e-${i}`} className="bg-slate-50 dark:bg-slate-950/50" />;
                }

                const dayTasks = getTasksForDate(day);
                const isTodayCell = isToday(day);
                const isSelected = selectedDate === day;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`flex flex-col p-1.5 md:p-2 cursor-pointer transition-colors overflow-hidden border-l-2 ${
                      isSelected 
                        ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-500' 
                        : 'bg-white dark:bg-slate-950 border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/80'
                    }`}
                  >
                    {/* Day Number Row */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center text-[11px] md:text-xs font-bold ${
                        isTodayCell
                          ? 'bg-blue-500 text-white shadow-sm'
                          : isPast(day)
                            ? 'text-slate-400 dark:text-slate-600'
                            : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {day}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Task Pills */}
                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                      {dayTasks.slice(0, 3).map((task, idx) => {
                        const cfg = statusConfig[task.status] || statusConfig['todo'];
                        return (
                          <div
                            key={`${task._id}-${idx}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedDate(day); }}
                            className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer overflow-hidden transition-colors"
                          >
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis">
                              {task.title}
                            </span>
                          </div>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <span className="text-[9px] font-bold text-slate-400 pl-1">
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[320px] shrink-0 flex flex-col pt-16 pr-6 pb-6 pl-0 z-10 transition-colors bg-transparent">
          <div className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden transition-colors">
          {selectedDate ? (
            /* Sidebar: Selected Date Details */
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight m-0">
                    {MONTHS[month]} {selectedDate}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                    {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedDate(null); }}
                  className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-500 transition-colors flex items-center justify-center"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {selectedDateTasks.length === 0 ? (
                <div className="flex flex-col items-center p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <CalendarDaysIcon className="w-8 h-8 text-slate-400 mb-3" />
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider m-0">No tasks on this date</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedDateTasks.map((task, idx) => {
                    const cfg = statusConfig[task.status] || statusConfig['todo'];
                    const pColor = getProjectColor(task.project?._id || task.project);
                    const isOverdue = task.dueDate && new Date(task.dueDate) < today && task.status !== 'completed';
                    return (
                      <Link
                        key={`${task._id}-${idx}`}
                        to={`/projects/${task.project?._id || task.project}`}
                        className="block p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all cursor-pointer no-underline"
                      >
                        {/* Title */}
                        <div className="flex items-start gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: cfg.dot }} />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0 leading-tight">
                            {task.title}
                          </h4>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {cfg.label}
                          </span>
                          {task.priority && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              task.priority === 'urgent' || task.priority === 'high' 
                                ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50' 
                                : task.priority === 'medium'
                                  ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50'
                            }`}>
                              {task.priority}
                            </span>
                          )}
                          {task.dateType && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50">
                              {task.dateType === 'due' ? 'Due' : task.dateType === 'start' ? 'Start' : 'Done'}
                            </span>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pColor }} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {getProjectName(task.project?._id || task.project)}
                            </span>
                          </div>
                          {task.dueDate && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                              {isOverdue ? '⚠ ' : ''}
                              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Sidebar: Default Overview */
            <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-center custom-scrollbar">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { label: 'Total', value: projectTasks.length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Done', value: projectTasks.filter(t => t.status === 'completed').length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { label: 'Overdue', value: overdueTasks.length, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                ].map(s => (
                  <div key={s.label} className={`p-3 rounded-xl text-center border border-transparent ${s.bg}`}>
                    <p className={`text-xl font-bold m-0 ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 m-0">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              {projectTasks.length > 0 && (() => {
                const done = projectTasks.filter(t => t.status === 'completed').length;
                const pct = Math.round((done / projectTasks.length) * 100);
                return (
                  <div className="mb-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completion</span>
                      <span className={`text-[11px] font-bold ${pct === 100 ? 'text-emerald-500' : 'text-blue-500'}`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* Status breakdown */}
              <div className="mb-6">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">By Status</h4>
                <div className="flex flex-col gap-2.5">
                  {Object.entries(statusConfig).map(([key, cfg]) => {
                    const count = projectTasks.filter(t => t.status === key).length;
                    const pct = projectTasks.length > 0 ? (count / projectTasks.length) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{cfg.label}</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white">{count}</span>
                        </div>
                        <div className="h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cfg.dot, opacity: 0.8 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overdue Section */}
              {overdueTasks.length > 0 && (
                <div className="rounded-xl p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <h4 className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    Overdue ({overdueTasks.length})
                  </h4>
                  <div className="flex flex-col gap-2">
                    {overdueTasks
                      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                      .slice(0, 3)
                      .map(task => (
                        <div
                          key={task._id}
                          onClick={() => {
                            const d = new Date(task.dueDate);
                            setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
                            setSelectedDate(d.getDate());
                          }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/50 cursor-pointer hover:border-red-300 transition-colors"
                        >
                          <div className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-900 dark:text-white m-0 truncate">
                              {task.title}
                            </p>
                            <p className="text-[9px] font-bold text-red-500 m-0 uppercase tracking-wider mt-0.5">
                              Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
