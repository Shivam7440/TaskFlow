import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { templateAPI } from '../services/api';
import toast from 'react-hot-toast';
import '../styles/Dashboard.css';
import {
  SparklesIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

const TemplateGallery = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

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
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await templateAPI.getTemplates();
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template) => {
    toast.success(`Started new project from ${template.name}! (Placeholder)`);
    // Logic to navigate to new project creation with template data
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

      {/* Navigation - simplified for brevity, identical style to dashboard */}
      <nav className="dashboard-nav sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-16 items-center">
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
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 animate-fade-in-up">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-2 leading-tight">
              Template Gallery
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Start your next project quickly with a pre-built template.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <DocumentDuplicateIcon className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No templates found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-5 text-sm">There are currently no templates available.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template._id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <DocumentDuplicateIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{template.name}</h3>
                    <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">{template.category}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2">
                  {template.description || 'No description provided.'}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handleUseTemplate(template)} className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-colors text-center">
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGallery;
