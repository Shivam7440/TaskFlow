import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI, workspaceAPI, taskAPI, aiAPI } from '../services/api';
import {
  FolderIcon,
  XMarkIcon,
  DocumentTextIcon,
  SwatchIcon,
  BuildingOfficeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PROJECT_COLORS = [
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#8B5CF6', name: 'Purple' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#06B6D4', name: 'Cyan' },
];

const CreateProjectModal = ({ onClose, onCreated, defaultWorkspaceId = '' }) => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    workspace: defaultWorkspaceId,
    color: '#3B82F6',
  });
  const [useAI, setUseAI] = useState(false);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await workspaceAPI.getWorkspaces();
        const list = res.data.workspaces || [];
        setWorkspaces(list);
        if (!form.workspace && list.length > 0) {
          setForm(prev => ({ ...prev, workspace: list[0]._id }));
        }
      } catch {
        toast.error('Failed to load workspaces');
      }
    };
    fetchWorkspaces();
  }, [form.workspace]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    if (!form.workspace) { toast.error('Please select a workspace'); return; }
    if (useAI && !form.description.trim()) { toast.error('AI generation requires a project description'); return; }

    let newProject = null;

    try {
      setCreating(true);
      
      if (useAI) {
          toast.success('🎨 Creating Kanban board with AI...', { duration: 3000 });
          
          // Use the new combined endpoint for better reliability
          try {
              const res = await aiAPI.createProjectWithKanban({
                  name: form.name,
                  description: form.description,
                  workspace: form.workspace,
                  color: form.color,
                  aiDescription: form.description || form.name
              });
              
              newProject = res.data.project;
              toast.success(`✨ Project created with ${res.data.tasksCreated} AI-generated tasks!`);
          } catch (combinedErr) {
              // Fallback to sequential creation if combined endpoint fails
              console.warn('Combined endpoint failed, using sequential approach:', combinedErr);
              toast.info('Generating Kanban structure...');
              
              const aiRes = await aiAPI.generateKanban({ text: form.description || form.name });
              const structure = aiRes.data.structure || [];
              
              if (!structure || structure.length === 0) {
                  throw new Error('Failed to generate Kanban structure from AI');
              }
              
              // Validate structure has tasks
              const totalTasks = structure.reduce((sum, col) => sum + (col.tasks?.length || 0), 0);
              if (totalTasks === 0) {
                  console.warn('AI generated structure with no tasks, using defaults');
                  toast.warning('AI generated an empty structure, adding sample tasks...');
              }
              
              // Create project with AI-generated columns
              const columnsForProject = structure.map((col, idx) => ({
                  columnId: col.columnId || `col_${idx}`,
                  name: col.name || col.title || 'Column',
                  order: col.order !== undefined ? col.order : idx,
                  color: col.color || '#94A3B8'
              }));
              
              toast.info('Creating project...');
              const projRes = await projectAPI.createProject({
                  ...form,
                  columns: columnsForProject
              });
              newProject = projRes.data.project;
              
              let taskCount = 0;
              toast.info('Creating tasks...');
              for (let colIdx = 0; colIdx < structure.length; colIdx++) {
                  const col = structure[colIdx];
                  const projectCol = columnsForProject[colIdx];
                  
                  for (const taskObj of col.tasks || []) {
                      if (!taskObj || !taskObj.title) continue;
                      
                      try {
                          const checklist = (taskObj.subtasks || []).map((subtask, sIdx) => ({
                              text: subtask,
                              completed: false,
                              order: sIdx
                          }));
                          
                          const colId = projectCol.columnId;
                          
                          // Map columnId to status
                          let status = 'todo';
                          if (col.columnId === 'col_in_progress') status = 'in-progress';
                          else if (col.columnId === 'col_review') status = 'review';
                          else if (col.columnId === 'col_completed') status = 'completed';
                          
                          await taskAPI.createTask({
                              title: taskObj.title,
                              description: taskObj.description || '',
                              project: newProject._id,
                              column: colId,
                              status: status,
                              priority: taskObj.priority || 'medium',
                              checklist: checklist
                          });
                          taskCount++;
                      } catch (err) {
                          console.error('Failed creating task:', err.response?.data?.message || err.message);
                      }
                  }
              }
              
              if (taskCount === 0) {
                  toast.warning('Project created but no tasks were generated. You can add them manually.');
              } else {
                  toast.success(`Project created with ${taskCount} AI-generated tasks!`);
              }
          }
      } else {
          const res = await projectAPI.createProject(form);
          newProject = res.data.project;
          toast.success('Project created successfully!');
      }

      if (onCreated) onCreated(newProject);
      onClose();
      
      // Navigate to the newly created project
      if (newProject?._id) {
          navigate(`/projects/${newProject._id}`, { replace: false });
      }
    } catch (error) {
      console.error('Project creation error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-45 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <div 
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-300 transform scale-100 ease-out"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                <FolderIcon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">New Project</h3>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Project Name */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Project Name *</label>
              <input 
                autoFocus 
                type="text" 
                value={form.name} 
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Q4 Marketing Campaign" 
                required 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-650 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
            </div>

            {/* Workspace */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BuildingOfficeIcon className="w-4 h-4" /> Workspace
              </label>
              <div className="relative">
                <select 
                  value={form.workspace} 
                  onChange={e => setForm(p => ({ ...p, workspace: e.target.value }))} 
                  required 
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-650 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="" disabled>Select workspace</option>
                  {workspaces.map(ws => (
                    <option key={ws._id} value={ws._id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {ws.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 dark:text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
              {workspaces.length === 0 && (
                <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-2 font-medium">No workspaces found. Create one first.</p>
              )}
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <DocumentTextIcon className="w-4 h-4" /> Description
              </label>
              <textarea 
                value={form.description} 
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What is this project about?" 
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-650 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none"
              />
                
              {/* Premium AI Magic Switch Toggle Card */}
              <div 
                onClick={() => setUseAI(!useAI)}
                className={`mt-4 p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  useAI 
                    ? 'border-violet-500 bg-violet-500/5 dark:bg-violet-500/10' 
                    : 'border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/50 hover:bg-slate-50 dark:hover:bg-slate-950/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${useAI ? 'bg-violet-550 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-550'}`}>
                    <SparklesIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className={`text-xs font-semibold transition-colors ${useAI ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      AI Magic Assistant
                    </h4>
                    <p className="text-[11px] text-slate-405 dark:text-slate-500">
                      Generate a full Kanban board and tasks from your description.
                    </p>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-200 ${useAI ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${useAI ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            {/* Theme Color */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <SwatchIcon className="w-4 h-4" /> Theme Color
              </label>
              <div className="flex flex-wrap gap-3">
                {PROJECT_COLORS.map(c => (
                  <button 
                    key={c.hex} 
                    type="button" 
                    onClick={() => setForm(p => ({ ...p, color: c.hex }))}
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all duration-200 ${
                      form.color === c.hex 
                        ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-400 dark:ring-white scale-110 shadow-md' 
                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: c.hex,
                      boxShadow: form.color === c.hex ? `0 0 12px ${c.hex}60` : 'none'
                    }}
                    title={c.name}
                  />
                ))}
              </div>
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
                disabled={creating || !form.name.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-violet-500/20 border-none transition-all duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateProjectModal;
