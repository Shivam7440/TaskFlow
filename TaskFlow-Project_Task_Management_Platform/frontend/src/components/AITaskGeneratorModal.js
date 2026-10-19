import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI, taskAPI, aiAPI, workspaceAPI } from '../services/api';
import { SparklesIcon, XMarkIcon, FolderIcon, DocumentTextIcon, Squares2X2Icon, ListBulletIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AITaskGeneratorModal = ({ onClose, onCreated, defaultProjectId = '' }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('tasks'); // 'tasks' or 'kanban'
  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [workspaceId, setWorkspaceId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, workRes] = await Promise.all([
          projectAPI.getProjects(),
          workspaceAPI.getWorkspaces()
        ]);
        
        const projList = projRes.data.projects || [];
        const workList = workRes.data.workspaces || [];
        
        setProjects(projList);
        setWorkspaces(workList);
        
        if (!projectId && projList.length > 0) setProjectId(projList[0]._id);
        if (workList.length > 0) setWorkspaceId(workList[0]._id);
      } catch (err) {
        toast.error('Failed to load projects and workspaces');
      }
    };
    fetchData();
  }, [defaultProjectId, projectId]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!notes.trim()) { toast.error('Please enter details or notes'); return; }
    
    if (mode === 'tasks') {
        if (!projectId) { toast.error('Please select a project'); return; }
        try {
          setIsGenerating(true);
          const aiResponse = await aiAPI.convertNotesToTasks({ notes });
          const tasks = aiResponse.data.tasks || [];
          if (!tasks.length) {
              toast.error("No actionable tasks found in these notes.");
              return;
          }
          let successCount = 0;
          for (const t of tasks) {
              try {
                  const validPriorities = ['urgent', 'high', 'medium', 'low'];
                  const validStatuses = ['todo', 'in-progress', 'review', 'completed'];
                  const priority = validPriorities.includes(t.priority) ? t.priority : 'medium';
                  const status = validStatuses.includes(t.status) ? t.status : 'todo';
                  const columnMap = { 'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'Review', 'completed': 'Completed' };

                  const checklist = Array.isArray(t.subtasks) ? t.subtasks.map((s, i) => ({
                    text: s, completed: false
                  })) : [];

                  await taskAPI.createTask({
                      title: t.title,
                      description: t.description || '',
                      dueDate: t.dueDate || null,
                      project: projectId,
                      priority,
                      status,
                      column: columnMap[status] || 'To Do',
                      checklist,
                  });
                  successCount++;
              } catch (err) { console.error("Failed creating task", err); }
          }
          toast.success(`Created ${successCount} AI-analyzed task(s) with priorities & subtasks!`);
          if (onCreated) onCreated();
          onClose();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to generate tasks');
        } finally {
          setIsGenerating(false);
        }
    } else {
        if (!workspaceId) { toast.error('Please select a workspace'); return; }
        if (!projectName.trim()) { toast.error('Please enter a project name'); return; }
        try {
            setIsGenerating(true);
            toast.success('🎨 Creating Kanban board with AI...', { duration: 3000 });
            
            const res = await aiAPI.createProjectWithKanban({
                name: projectName,
                description: notes,
                workspace: workspaceId,
                color: '#8B5CF6',
                aiDescription: notes
            });
            
            const newProject = res.data.project;
            toast.success(`Project "${projectName}" created with ${res.data.tasksCreated} AI-analyzed tasks!`);
            
            if (onCreated) onCreated(newProject);
            onClose();
            
            // Navigate to the newly created project
            if (newProject?._id) {
                navigate(`/projects/${newProject._id}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to generate Kanban board');
        } finally {
            setIsGenerating(false);
        }
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 14,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff', fontSize: '0.875rem', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box',
  };

  const selectStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', appearance: 'none', boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
  };

  const handleFocus = (e) => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.15)'; };
  const handleBlur = (e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
        <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 520, background: '#151B2E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', margin: 'auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}>
                <SparklesIcon style={{ width: 22, height: 22, color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>Generate with AI</h3>
            </div>
            <button type="button" onClick={onClose} style={{ padding: 6, borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
              <XMarkIcon style={{ width: 20, height: 20 }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 16 }}>
             <button type="button" onClick={() => setMode('tasks')}
               style={{ flex: 1, padding: '10px 0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', ...(mode === 'tasks' ? { background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' } : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }) }}
             >
                <ListBulletIcon style={{ width: 16, height: 16 }} /> Generate Tasks
             </button>
             <button type="button" onClick={() => setMode('kanban')}
               style={{ flex: 1, padding: '10px 0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', ...(mode === 'kanban' ? { background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' } : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }) }}
             >
                <Squares2X2Icon style={{ width: 16, height: 16 }} /> Generate Kanban Board
             </button>
          </div>

          <form onSubmit={handleGenerate}>
            {mode === 'tasks' ? (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}><FolderIcon style={{ width: 14, height: 14 }} /> Project to assign tasks</label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} required style={selectStyle}>
                    <option value="" disabled>Select project</option>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
            ) : (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}><BuildingOfficeIcon style={{ width: 14, height: 14 }} /> Workspace</label>
                    <select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} required style={selectStyle}>
                      <option value="" disabled>Select workspace</option>
                      {workspaces.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}><FolderIcon style={{ width: 14, height: 14 }} /> New Project Name</label>
                    <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Q4 Marketing Campaign" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                </>
            )}

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}><DocumentTextIcon style={{ width: 14, height: 14 }} /> {mode === 'tasks' ? 'Meeting Notes' : 'Project Description / Idea'}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={mode === 'tasks' ? "Paste unstructured meeting notes, emails, or chat logs here..." : "Describe the project and what needs to be tracked..."} rows={6}
                style={{ ...inputStyle, resize: 'vertical' }} onFocus={handleFocus} onBlur={handleBlur} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={onClose}
                style={{ flex: 1, padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >Cancel</button>
              <button type="submit" disabled={isGenerating || !notes.trim() || (mode==='kanban' && !projectName.trim())}
                style={{ flex: 1, padding: 14, borderRadius: 14, background: 'linear-gradient(135deg, #8B5CF6, #4F46E5)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 4px 16px rgba(139,92,246,0.35)', opacity: (isGenerating || !notes.trim()) ? 0.5 : 1, transition: 'all 0.2s' }}
              >{isGenerating ? 'Analyzing & Creating...' : `Generate ${mode === 'tasks' ? 'Tasks' : 'Board'} ✨`}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AITaskGeneratorModal;
