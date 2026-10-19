import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { documentAPI, projectAPI } from '../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import toast from 'react-hot-toast';
import '../styles/Dashboard.css';
import {
  SparklesIcon,

  DocumentTextIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const Documentation = () => {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showEditor, setShowEditor] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docType, setDocType] = useState('wiki');
  const [saving, setSaving] = useState(false);

  const stardustParticles = useMemo(() => {
    return [...Array(30)].map((_, i) => ({
      id: `stardust-${i}`,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      animationDuration: `${15 + Math.random() * 15}s`,
      animationDelay: `-${Math.random() * 15}s`,
      opacity: 0.3 + Math.random() * 0.5
    }));
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeProject) {
      fetchDocuments(activeProject);
    } else {
      setDocuments([]);
    }
  }, [activeProject]);

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getProjects();
      const userProjects = res.data.projects || [];
      setProjects(userProjects);
      if (userProjects.length > 0) {
        setActiveProject(userProjects[0]._id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      toast.error('Failed to load projects');
      setLoading(false);
    }
  };

  const fetchDocuments = async (projectId) => {
    setLoading(true);
    try {
      const res = await documentAPI.getDocuments({ project: projectId });
      setDocuments(res.data.documents || []);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = () => {
    setEditingDoc(null);
    setDocTitle('');
    setDocContent('');
    setDocType('wiki');
    setShowEditor(true);
  };

  const handleEditDocument = (doc) => {
    setEditingDoc(doc);
    setDocTitle(doc.title);
    setDocContent(doc.content);
    setDocType(doc.type);
    setShowEditor(true);
  };

  const handleSaveDocument = async () => {
    if (!docTitle.trim() || !docContent.trim() || !activeProject) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      const docData = {
        title: docTitle,
        content: docContent,
        type: docType,
        project: activeProject,
      };

      if (editingDoc) {
        await documentAPI.updateDocument(editingDoc._id, docData);
        toast.success('Document updated');
      } else {
        await documentAPI.createDocument(docData);
        toast.success('Document created');
      }
      
      setShowEditor(false);
      fetchDocuments(activeProject);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentAPI.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d._id !== id));
      toast.success('Document deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Ambient Background Blobs & Fireflies */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="dashboard-bg-blob-1" />
        <div className="dashboard-bg-blob-2" />
        <div className="dashboard-bg-blob-3" />
        
        {/* Stardust Particles */}
        {stardustParticles.map((pt) => (
          <div
            key={pt.id}
            className="stardust"
            style={{
              top: pt.top,
              left: pt.left,
              animationDuration: pt.animationDuration,
              animationDelay: pt.animationDelay,
              '--particle-opacity': pt.opacity
            }}
          />
        ))}
      </div>
      {/* Navigation */}
      <nav className="dashboard-nav sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 flex justify-between h-16 items-center">
            <Link to="/" className="dashboard-logo-container group">
              <div className="dashboard-logo-icon">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <span className="dashboard-title">TaskFlow</span>
            </Link>

            <div className="flex items-center gap-1 mx-6">
              <Link to="/dashboard" className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                Dashboard
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme toggle removed */}
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-2 leading-tight">
              Documentation & Meetings
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Wiki-style knowledge base and meeting notes.
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <select
                value={activeProject}
                onChange={(e) => setActiveProject(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
                {projects.length === 0 && <option value="">No projects</option>}
                {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                ))}
            </select>
            <button 
                onClick={handleCreateDocument}
                disabled={!activeProject}
                className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm flex items-center gap-2 hover:bg-primary-700 disabled:opacity-50"
            >
                <PlusIcon className="w-4 h-4" /> New Doc
            </button>
          </div>
        </div>

        {showEditor ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {editingDoc ? 'Edit Document' : 'Create Document'}
                    </h2>
                    <button onClick={() => setShowEditor(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="space-y-4 mb-6">
                    <input 
                        type="text" 
                        placeholder="Document Title" 
                        value={docTitle} 
                        onChange={(e) => setDocTitle(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white font-bold outline-none focus:border-primary-500"
                    />
                    <select 
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white outline-none focus:border-primary-500"
                    >
                        <option value="wiki">Wiki / General</option>
                        <option value="meeting-note">Meeting Note</option>
                        <option value="documentation">Technical Documentation</option>
                    </select>
                    <div className="h-64 mb-10">
                        <ReactQuill 
                            theme="snow" 
                            value={docContent} 
                            onChange={setDocContent} 
                            style={{ height: '100%' }}
                            className="bg-white dark:text-white dark:bg-gray-800"
                        />
                    </div>
                </div>
                
                <div className="flex justify-end mt-12 gap-3">
                    <button onClick={() => setShowEditor(false)} className="px-6 py-2 rounded-xl text-sm font-bold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white">Cancel</button>
                    <button onClick={handleSaveDocument} disabled={saving} className="px-6 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700">{saving ? 'Saving...' : 'Save Document'}</button>
                </div>
            </div>
        ) : (
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? <p className="text-gray-500">Loading documents...</p> : documents.length === 0 ? (
                    <div className="p-8 col-span-2 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                        No documents found for this project.
                    </div>
                ) : documents.map(doc => (
                    <div key={doc._id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                    <DocumentTextIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{doc.title}</h3>
                                    <span className="text-xs font-semibold text-gray-500 uppercase">{doc.type}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditDocument(doc)} className="text-sm text-primary-600 hover:text-primary-700 font-semibold">Edit</button>
                                <button onClick={() => handleDeleteDocument(doc._id)} className="text-sm text-red-600 hover:text-red-700 font-semibold">Delete</button>
                            </div>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-300 line-clamp-3" dangerouslySetInnerHTML={{ __html: doc.content }} />
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;
