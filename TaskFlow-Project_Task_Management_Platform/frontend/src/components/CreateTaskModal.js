import React, { useState, useEffect } from 'react';
import { projectAPI, taskAPI } from '../services/api';
import {
  CheckCircleIcon,
  XMarkIcon,
  FolderIcon,
  SwatchIcon,
  FlagIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const CreateTaskModal = ({ onClose, onCreated, defaultProjectId = '', defaultStatus = 'todo' }) => {
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    project: defaultProjectId,
    priority: 'medium',
    status: defaultStatus,
    dueDate: '',
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await projectAPI.getProjects();
        const list = res.data.projects || [];
        setProjects(list);
        if (!form.project && list.length > 0) {
          setForm(prev => ({ ...prev, project: list[0]._id }));
        }
      } catch {
        toast.error('Failed to load projects');
      }
    };
    fetchProjects();
  }, [form.project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Task title is required'); return; }
    // Project is now optional, so we remove the requirement check
    try {
      setCreating(true);
      const statusToColumn = { 
        'todo': 'col_todo', 
        'in-progress': 'col_in_progress', 
        'review': 'col_review', 
        'completed': 'col_completed' 
      };
      // If no project selected, we send it as undefined so it becomes null in the backend
      const payload = { ...form, column: statusToColumn[form.status] || 'col_todo' };
      if (!payload.project) delete payload.project;
      
      await taskAPI.createTask(payload);
      toast.success('Task created successfully!');
      if (onCreated) onCreated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-45 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <div 
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-300 transform scale-100 ease-out"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">New Task</h3>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Task Title *</label>
              <input 
                autoFocus 
                type="text" 
                value={form.title} 
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Redesign homepage hero section" 
                required 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-650 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
              />
            </div>

            {/* Project + Status */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FolderIcon className="w-4 h-4" /> Project
                </label>
                <div className="relative">
                  <select 
                    value={form.project} 
                    onChange={e => setForm(p => ({ ...p, project: e.target.value }))} 
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                  >
                    <option value="" className="text-violet-600 dark:text-violet-400 font-semibold bg-violet-50 dark:bg-violet-900/20">
                      Personal Todo (No Project)
                    </option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 dark:text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <SwatchIcon className="w-4 h-4" /> Status
                </label>
                <div className="relative">
                  <select 
                    value={form.status} 
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))} 
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 dark:text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority + Due Date */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FlagIcon className="w-4 h-4" /> Priority
                </label>
                <div className="flex bg-slate-50 dark:bg-slate-950 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
                  {['low', 'medium', 'high', 'urgent'].map(p => (
                    <button 
                      key={p} 
                      type="button" 
                      onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center capitalize transition-all cursor-pointer border-none ${
                        form.priority === p 
                          ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                          : 'text-slate-405 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-300 bg-transparent'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CalendarDaysIcon className="w-4 h-4" /> Due Date
                </label>
                <input 
                  type="date" 
                  value={form.dueDate} 
                  onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer" 
                />
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <DocumentTextIcon className="w-4 h-4" /> Description
              </label>
              <textarea 
                value={form.description} 
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Add any extra details..." 
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-650 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" 
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-sm bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-white transition-all duration-200 text-center"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={creating || !form.title.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-violet-500/20 border-none transition-all duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {creating ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateTaskModal;
