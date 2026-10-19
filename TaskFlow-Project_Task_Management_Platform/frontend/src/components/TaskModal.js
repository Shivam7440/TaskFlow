import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useDropzone } from 'react-dropzone';
import { taskAPI, projectAPI, aiAPI } from '../services/api'; // Ensure projectAPI is imported to fetch members
import { useAuth } from '../context/AuthContext';
import {
  XMarkIcon, CalendarDaysIcon, PaperClipIcon, CheckCircleIcon, TrashIcon,
  PlayIcon, PauseIcon, ListBulletIcon, ArrowPathIcon, SparklesIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../context/SocketContext';
import Comments from './Comments';
import { getAvatarUrl } from '../utils/avatar';
import toast from 'react-hot-toast';
import '../styles/TaskModal.css';

const STATUS_CONFIG = {
  'todo': { label: 'To Do', color: 'bg-gray-200 text-gray-700' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  'review': { label: 'Review', color: 'bg-amber-100 text-amber-700' },
  'completed': { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
};

const PRIORITY_CONFIG = {
  'urgent': { label: 'Urgent', color: 'text-red-600 bg-red-50' },
  'high': { label: 'High', color: 'text-orange-600 bg-orange-50' },
  'medium': { label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
  'low': { label: 'Low', color: 'text-green-600 bg-green-50' },
};

const TaskModal = ({ task, onClose, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const { emitTaskViewing, emitTaskStopViewing, onTaskUpdate, onPresenceUpdate } = useSocket();
  const [editedTask, setEditedTask] = useState({ ...task });
  const [, setLoading] = useState(false);
  const [checklistItem, setChecklistItem] = useState('');
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectCustomFields, setProjectCustomFields] = useState([]);
  const [viewingUsers, setViewingUsers] = useState({}); // { userId: { name, avatar } }
  
  // Time Tracking
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(task.actualTime || 0); // In minutes
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    // Fetch project members for assignee selection
    const fetchMembers = async () => {
        if (task.project) {
            try {
                const pid = typeof task.project === 'object' ? task.project._id : task.project;
                const res = await projectAPI.getProject(pid);
                // Combine owner and members
                const members = res.data.project.members.map(m => m.user);
                if (res.data.project.owner) members.push(res.data.project.owner);
                // Remove duplicates by ID
                const unique = [...new Map(members.map(item => [item['_id'], item])).values()];
                setProjectMembers(unique);
                setProjectCustomFields(res.data.project.customFields || []);
            } catch (error) {
                console.error("Failed to load members", error);
            }
        }
    };
    fetchMembers();

    // Socket.io: Presence and Updates
    const projectId = typeof task.project === 'object' ? task.project._id : task.project;
    emitTaskViewing(task._id, projectId);

    const cleanupPresence = onPresenceUpdate((data) => {
      if (data.taskId === task._id && data.userId !== user._id) {
        setViewingUsers(prev => {
          const next = { ...prev };
          if (data.type === 'viewing') {
            next[data.userId] = { name: data.name, avatar: data.avatar };
          } else {
            delete next[data.userId];
          }
          return next;
        });
      }
    });

    const cleanupTaskUpdate = onTaskUpdate((updatedTask) => {
      if (updatedTask._id === task._id) {
        setEditedTask(updatedTask);
        if (onUpdate) onUpdate(updatedTask);
      }
    });

    return () => {
      emitTaskStopViewing(task._id, projectId);
      if (cleanupPresence) cleanupPresence();
      if (cleanupTaskUpdate) cleanupTaskUpdate();
    };
  }, [task._id, task.project, user._id, emitTaskViewing, emitTaskStopViewing, onPresenceUpdate, onTaskUpdate, onUpdate]);

  // Timer Logic
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        // We only update visual if needed, but here we just track logic
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStart]);

  const toggleTimer = () => {
    if (isTimerRunning) {
      // Stop
      const now = Date.now();
      const sessionMins = Math.floor((now - timerStart) / 60000); // Simple minute tracking
      const newTotal = elapsedTime + Math.max(0, sessionMins); // Ensure no negative
      setElapsedTime(newTotal);
      setEditedTask(prev => ({ ...prev, actualTime: newTotal }));
      handleSaveField('actualTime', newTotal);
      setIsTimerRunning(false);
      setTimerStart(null);
    } else {
      // Start
      setTimerStart(Date.now());
      setIsTimerRunning(true);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: async (acceptedFiles) => {
      setLoading(true);
      try {
        for (const file of acceptedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          const res = await taskAPI.addAttachment(task._id, formData);
          setEditedTask(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), res.data.attachment]
          }));
          toast.success(`Uploaded ${file.name}`);
        }
      } catch (error) {
        toast.error('Failed to upload file');
      } finally {
        setLoading(false);
      }
    }
  });

  const handleCustomFieldChange = async (fieldId, value) => {
    const updatedCustomFields = (editedTask.customFields || []).map(cf => 
        cf.field === fieldId ? { ...cf, value } : cf
    );
    
    // If field doesn't exist in task yet, add it
    if (!updatedCustomFields.find(cf => cf.field === fieldId)) {
        updatedCustomFields.push({ field: fieldId, value });
    }

    setEditedTask(prev => ({ ...prev, customFields: updatedCustomFields }));
    try {
        await taskAPI.updateTask(task._id, { customFields: updatedCustomFields });
        if(onUpdate) onUpdate({ ...editedTask, customFields: updatedCustomFields });
    } catch (e) {
        toast.error('Failed to update custom field');
    }
  };
  const handleSaveField = async (field, value) => {
    try {
      setEditedTask(prev => ({ ...prev, [field]: value }));
      // Optimistic update to parent
      if(onUpdate) onUpdate({ ...editedTask, [field]: value });
      
      await taskAPI.updateTask(task._id, { [field]: value });
    } catch (error) {
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleEnhanceDescription = async () => {
    if (!editedTask.title && !editedTask.description) {
        toast.error("Please provide at least a title or basic description to enhance.");
        return;
    }
    
    setIsEnhancing(true);
    try {
        const response = await aiAPI.rewriteTask({
            title: editedTask.title,
            description: editedTask.description || ''
        });
        
        const enhancedText = response.data.enhancedDescription;
        setEditedTask(prev => ({ ...prev, description: enhancedText }));
        handleSaveField('description', enhancedText);
        toast.success("Description enhanced with AI ✨");
    } catch (error) {
        toast.error("Failed to enhance description with AI.");
        console.error(error);
    } finally {
        setIsEnhancing(false);
    }
  };


  const addChecklistItem = async (e) => {
    e.preventDefault();
    if (!checklistItem.trim()) return;
    const newItem = { text: checklistItem, completed: false };
    const newChecklist = [...(editedTask.checklist || []), newItem];
    
    setChecklistItem('');
    setEditedTask(prev => ({ ...prev, checklist: newChecklist }));
    
    try {
        await taskAPI.updateTask(task._id, { checklist: newChecklist });
        if(onUpdate) onUpdate({ ...editedTask, checklist: newChecklist });
    } catch (e) {
        toast.error('Failed to add item');
    }
  };

  const toggleChecklist = async (index) => {
    const newChecklist = [...editedTask.checklist];
    newChecklist[index].completed = !newChecklist[index].completed;
    setEditedTask(prev => ({ ...prev, checklist: newChecklist }));
    
    try {
        await taskAPI.updateTask(task._id, { checklist: newChecklist });
        if(onUpdate) onUpdate({ ...editedTask, checklist: newChecklist });
    } catch (e) {
        toast.error('Failed to update item');
    }
  };

  const deleteChecklistItem = async (index) => {
    const newChecklist = editedTask.checklist.filter((_, i) => i !== index);
    setEditedTask(prev => ({ ...prev, checklist: newChecklist }));
    try {
        await taskAPI.updateTask(task._id, { checklist: newChecklist });
        if(onUpdate) onUpdate({ ...editedTask, checklist: newChecklist });
    } catch (e) {
        toast.error('Failed to delete item');
    }
  };

  const toggleAssignee = async (userId) => {
      let newAssignees = [...(editedTask.assignees || [])];
      // Check if populated objects or IDs
      const currentIds = newAssignees.map(a => a._id || a);
      
      if (currentIds.includes(userId)) {
          newAssignees = newAssignees.filter(a => (a._id || a) !== userId);
      } else {
          newAssignees.push(userId);
      }
      
      setEditedTask(prev => ({ ...prev, assignees: newAssignees }));
      try {
          await taskAPI.updateTask(task._id, { assignees: newAssignees });
           // Ideally we'd need to re-fetch to get populated user objects back, 
           // but for now we'll rely on parent refresh or optimistic ID usage
           if(onUpdate) onUpdate({ ...editedTask, assignees: newAssignees }); 
      } catch (e) {
        toast.error('Failed to update assignees');
      }
  };

  return (
    <div className="task-modal-overlay">
      <div className="task-modal-container bg-white dark:bg-gray-800">
        
        {/* Header */}
        <div className="task-modal-header">
           <div className="flex items-center gap-4 flex-1">
             <div className="flex items-center gap-2">
               <select
                 value={editedTask.status}
                 onChange={(e) => handleSaveField('status', e.target.value)}
                 className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-primary-500 cursor-pointer appearance-none ${STATUS_CONFIG[editedTask.status]?.color || 'bg-gray-100'}`}
               >
                 {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                   <option key={key} value={key}>{cfg.label}</option>
                 ))}
               </select>
             </div>
           </div>
           
           <div className="flex items-center gap-3">
              {/* Presence Indicators */}
              <div className="flex -space-x-2 mr-2">
                 {Object.entries(viewingUsers).map(([id, u]) => (
                   <img 
                     key={id} 
                     title={`${u.name} is viewing`}
                     src={getAvatarUrl(u)}
                     className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 object-cover"
                     alt={u.name}
                   />
                 ))}
              </div>
             <button
               onClick={() => { if(window.confirm('Delete this task?')) { onDelete(task._id); onClose(); } }}
               className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
             >
               <TrashIcon className="w-5 h-5" />
             </button>
             <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
               <XMarkIcon className="w-6 h-6" />
             </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
           
           {/* Left Col: Main Content */}
           <div className="task-modal-main-col custom-scrollbar">
              <input
                type="text"
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                onBlur={(e) => handleSaveField('title', e.target.value)}
                className="task-modal-title-input"
                placeholder="Task Title"
              />

              {/* Description */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="task-modal-section-label mb-0">
                    <ListBulletIcon className="w-4 h-4" /> Description
                  </label>
                  <button 
                    onClick={handleEnhanceDescription} 
                    disabled={isEnhancing}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border focus:outline-none transition-all ${isEnhancing ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-400 border-indigo-200 dark:border-indigo-800 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                  >
                    {isEnhancing ? (
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <SparklesIcon className="w-3.5 h-3.5" />
                    )}
                    {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
                  </button>
                </div>
                <div className="task-modal-editor-container">
                  <ReactQuill
                    theme="snow"
                    value={editedTask.description || ''}
                    onChange={(val) => setEditedTask(prev => ({ ...prev, description: val }))}
                    onBlur={() => handleSaveField('description', editedTask.description)}
                    className="dark:text-white"
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="mb-8">
                 <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    <CheckCircleIcon className="w-4 h-4" /> Checklist
                 </label>
                 <div className="space-y-2 mb-3">
                    {editedTask.checklist?.map((item, idx) => (
                      <div key={idx} className="task-modal-checklist-item group">
                        <button onClick={() => toggleChecklist(idx)} className={`task-modal-checklist-checkbox ${item.completed ? 'bg-primary-500 border-primary-500' : 'border-gray-300 dark:border-gray-600'}`}>
                           {item.completed && <CheckCircleIcon className="w-4 h-4 text-white" />}
                        </button>
                        <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                           {item.text}
                        </span>
                        <button onClick={() => deleteChecklistItem(idx)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity">
                           <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                 </div>
                 <form onSubmit={addChecklistItem} className="flex gap-2">
                   <input
                     value={checklistItem}
                     onChange={e => setChecklistItem(e.target.value)}
                     placeholder="Add an item..."
                     className="task-modal-checklist-input"
                   />
                   <button type="submit" className="task-modal-add-btn">Add</button>
                 </form>
              </div>

              {/* Attachments */}
              <div className="mb-8">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                     <PaperClipIcon className="w-4 h-4" /> Attachments
                  </label>
                  <div {...getRootProps()} className="task-modal-dropzone mb-4">
                     <input {...getInputProps()} />
                     <p className="text-sm text-gray-500 dark:text-gray-400">Drag & drop files here, or click to select files</p>
                  </div>
                  <div className="space-y-4">
                    {editedTask.attachments?.map((file, idx) => {
                      const isImage = file.mimeType && file.mimeType.startsWith('image/');
                      return (
                        <div key={idx} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <PaperClipIcon className="w-5 h-5 text-gray-400 shrink-0" />
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 hover:underline truncate">
                                {file.name}
                              </a>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                               <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                               <button 
                                 onClick={() => {
                                    const newAttachments = editedTask.attachments.filter((_, i) => i !== idx);
                                    handleSaveField('attachments', newAttachments);
                                 }}
                                 className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                               >
                                 <TrashIcon className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                          {isImage && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 max-h-48 flex justify-center bg-gray-100 dark:bg-gray-900">
                               <a href={file.url} target="_blank" rel="noopener noreferrer">
                                  <img src={file.url} alt={file.name} className="max-h-48 object-contain hover:opacity-90 transition-opacity" />
                               </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
              </div>

              {/* Comments/Discussion */}
              <div className="mt-8 mb-4">
                <Comments 
                  taskId={task._id} 
                  projectId={typeof task.project === 'object' ? task.project._id : task.project} 
                />
              </div>
           </div>

           {/* Right Col: Meta */}
           <div className="task-modal-sidebar custom-scrollbar">
              
              {/* Properties Panel */}
              <div className="space-y-6">
                 
                 {/* Priority */}
                 <div>
                    <label className="task-modal-property-label">Priority</label>
                    <div className="flex flex-wrap gap-2">
                       {['low', 'medium', 'high', 'urgent'].map(p => (
                          <button
                            key={p}
                            onClick={() => handleSaveField('priority', p)}
                            className={`task-modal-tag ${
                                editedTask.priority === p 
                                  ? `${PRIORITY_CONFIG[p].color} border-transparent shadow-sm` 
                                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-700'
                            }`}
                          >
                            {p}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Assignees */}
                 <div>
                    <label className="task-modal-property-label">Assignees</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {editedTask.assignees?.map((a, i) => {
                            const userObj = typeof a === 'object' ? a : projectMembers.find(m => m._id === a);
                            return (
                                <div key={i} className="task-modal-assignee-chip">
                                    <img 
                                      src={getAvatarUrl(userObj || { name: '?' })} 
                                      className="w-5 h-5 rounded-full object-cover" 
                                      alt="Assignee" 
                                    />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{userObj?.name}</span>
                                    <button onClick={() => toggleAssignee(userObj?._id || a)} className="text-gray-400 hover:text-red-500"><XMarkIcon className="w-3 h-3" /></button>
                                </div>
                            );
                        })}
                     </div>
                    
                    {/* Assignee Dropdown */}
                    <select
                        onChange={(e) => {
                             if(e.target.value) {
                                 toggleAssignee(e.target.value);
                                 e.target.value = '';
                             }
                        }}
                        className="task-modal-select"
                    >
                        <option value="">+ Add Assignee</option>
                        {projectMembers.map(m => (
                            <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                        ))}
                    </select>
                 </div>

                 {/* Dates */}
                 <div>
                    <label className="task-modal-property-label">Dates</label>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                           <span className="text-xs font-medium text-gray-500 flex items-center gap-2"><CalendarDaysIcon className="w-4 h-4"/> Due Date</span>
                           <DatePicker
                               selected={editedTask.dueDate ? new Date(editedTask.dueDate) : null}
                               onChange={(date) => handleSaveField('dueDate', date)}
                               className="w-24 text-right bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 dark:text-gray-200 p-0"
                               placeholderText="Set date"
                           />
                        </div>
                    </div>
                 </div>

                 {/* Time Tracking */}
                 <div>
                    <label className="task-modal-property-label">Time Tracking</label>
                    <div className="task-modal-timer-card">
                       <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                              {Math.floor(elapsedTime / 60)}h {elapsedTime % 60}m
                          </span>
                          <button
                            onClick={toggleTimer}
                            className={`p-2 rounded-full ${isTimerRunning ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                          >
                             {isTimerRunning ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                          </button>
                       </div>
                       <input
                           type="number"
                           placeholder="Add minutes manually"
                           onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                   const val = parseInt(e.target.value) || 0;
                                   const newTotal = elapsedTime + val;
                                   handleSaveField('actualTime', newTotal);
                                   setElapsedTime(newTotal);
                                   e.target.value = '';
                               }
                           }}
                           className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border-none rounded-lg"
                       />
                    </div>
                 </div>

                 {/* Custom Fields */}
                 {projectCustomFields.length > 0 && (
                    <div>
                       <label className="task-modal-property-label mt-4">Custom Fields</label>
                       <div className="space-y-3">
                          {projectCustomFields.map((field) => {
                              const currentValueObj = (editedTask.customFields || []).find(cf => cf.field === field.name || cf.field === field._id);
                              const currentValue = currentValueObj ? currentValueObj.value : '';

                              return (
                                  <div key={field._id || field.name} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{field.name} {field.required && <span className="text-red-500">*</span>}</label>
                                      
                                      {field.type === 'text' && (
                                          <input
                                              type="text"
                                              value={currentValue}
                                              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                          />
                                      )}
                                      {field.type === 'number' && (
                                          <input
                                              type="number"
                                              value={currentValue}
                                              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                          />
                                      )}
                                      {field.type === 'dropdown' && (
                                          <select
                                              value={currentValue}
                                              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                          >
                                              <option value="">Select option</option>
                                              {field.options?.map((opt, i) => (
                                                  <option key={i} value={opt}>{opt}</option>
                                              ))}
                                          </select>
                                      )}
                                      {field.type === 'date' && (
                                          <DatePicker
                                              selected={currentValue ? new Date(currentValue) : null}
                                              onChange={(date) => handleCustomFieldChange(field.name, date)}
                                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                              placeholderText="Select date"
                                          />
                                      )}
                                      {field.type === 'checkbox' && (
                                          <div className="flex items-center gap-2 mt-1">
                                              <input
                                                  type="checkbox"
                                                  checked={!!currentValue}
                                                  onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
                                                  className="rounded text-primary-600 focus:ring-primary-500 bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                                              />
                                              <span className="text-sm text-gray-700 dark:text-gray-300">{currentValue ? 'Yes' : 'No'}</span>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                       </div>
                    </div>
                 )}

              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default TaskModal;
