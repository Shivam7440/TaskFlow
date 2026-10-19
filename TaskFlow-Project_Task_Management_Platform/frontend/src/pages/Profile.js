import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from '../components/NotificationBell';
import { getAvatarUrl } from '../utils/avatar';
import {
  SparklesIcon, BellIcon, ArrowRightOnRectangleIcon, ArrowLeftIcon,
  CheckCircleIcon, UserIcon, ShieldCheckIcon, Cog6ToothIcon, KeyIcon, EnvelopeIcon, UserGroupIcon, LockClosedIcon, 
  DocumentTextIcon, ChartBarIcon, PhotoIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { taskAPI, projectAPI } from '../services/api';
import '../styles/Dashboard.css';

const Profile = () => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { theme } = useTheme();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({ name: '', email: '', avatar: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [preferences, setPreferences] = useState({ emailNotifications: true, pushNotifications: true });
  const [userStats, setUserStats] = useState({ tasksCompleted: 0, wordsWritten: 0, projectProgress: 0 });

  useEffect(() => {
    if (user) {
      setProfileData({ 
        name: user.name || '', 
        email: user.email || '', 
        avatar: (user.avatar === 'Avatar' ? '' : user.avatar) || '' 
      });
      if (user.preferences) {
        setPreferences(prev => ({ ...prev, ...user.preferences }));
      }
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
      try {
          const [taskRes, projRes] = await Promise.all([
              taskAPI.getTasks(), 
              projectAPI.getProjects()
          ]);
          
          const tasks = taskRes.data.tasks || [];
          const projects = projRes.data.projects || [];
          
          const completed = tasks.filter(t => t.status === 'completed' || t.status === 'Completed').length;
          
          let chars = 0;
          tasks.forEach(t => {
              chars += (t.title?.length || 0);
              chars += (t.description?.length || 0);
          });
          const words = Math.round(chars / 5);
          
          let totalProjProgress = 0;
          let projCount = 0;
          projects.forEach(p => {
              const pTasks = tasks.filter(t => (t.project?._id || t.project) === p._id);
              if (pTasks.length > 0) {
                  const pComp = pTasks.filter(t => t.status === 'completed' || t.status === 'Completed').length;
                  totalProjProgress += (pComp / pTasks.length);
                  projCount++;
              }
          });
          const avgProgress = projCount > 0 ? Math.round((totalProjProgress / projCount) * 100) : 0;
          
          setUserStats({ tasksCompleted: completed, wordsWritten: words, projectProgress: avgProgress });
      } catch (err) {
          console.error("Failed fetching user stats", err);
      }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await updateProfile({ name: profileData.name, avatar: profileData.avatar, preferences });
      if (result.success) toast.success("Profile updated successfully!");
      else toast.error(result.message || "Failed to update profile");
    } catch {
      toast.error('An error occurred during update');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const result = await changePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      if (result.success) {
        toast.success("Password updated successfully!");
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePreference = (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    updateProfile({ preferences: newPrefs }).then(res => {
      if (!res.success) toast.error("Failed to save preference");
    });
  };

  const TABS = [
    { id: 'profile', icon: UserIcon, title: 'Identity', desc: 'Avatar, name & contact info' },
    { id: 'activity', icon: SparklesIcon, title: 'Activity', desc: 'Productivity and contributions' },
    { id: 'security', icon: ShieldCheckIcon, title: 'Security', desc: 'Password & access limits' },
    { id: 'preferences', icon: Cog6ToothIcon, title: 'Preferences', desc: 'Theme & alerts setup' }
  ];

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors ${theme === 'dark' ? 'dark' : ''}`}>
      
      {/* Navigation - Standardized Enterprise Header */}
      <nav className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">TaskFlow Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell isHeader={true} />

            <button onClick={logout} title="Logout" className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 transition-colors">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-6">
          {/* User Brief */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
              <img src={getAvatarUrl({ name: user?.name, avatar: profileData.avatar })} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate mt-0.5">Personal Space</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-col gap-1">
            {TABS.map(tab => {
               const isActive = activeTab === tab.id;
               return (
                 <button 
                   key={tab.id} 
                   onClick={() => setActiveTab(tab.id)}
                   className={`flex items-center gap-3 p-3 text-left rounded-lg transition-colors border-l-2 ${
                     isActive 
                       ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' 
                       : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80'
                   }`}
                 >
                   <tab.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                   <div>
                     <div className={`text-[13px] font-bold leading-none mb-1 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{tab.title}</div>
                     <div className={`text-[11px] font-semibold ${isActive ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-slate-500'}`}>{tab.desc}</div>
                   </div>
                 </button>
               );
            })}
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          
          <div className="p-6 md:p-8">
            
            {/* Identity Settings */}
            {activeTab === 'profile' && (
              <div className="animate-fade-in-up max-w-xl">
                <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Public Identity</h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Manage your outward-facing information and avatar.</p>
                </div>
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-5">
                    <div 
                      className="w-20 h-20 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors relative overflow-hidden group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <img src={getAvatarUrl({ name: profileData.name || user?.name, avatar: profileData.avatar })} alt="Avatar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PhotoIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                    
                    <div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                          Change Avatar
                        </button>
                        {profileData.avatar && (
                          <button type="button" onClick={() => setProfileData({...profileData, avatar: ''})} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 mt-2">Recommended: Square JPG, PNG, or GIF. Max 5MB.</p>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Display Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})}
                               className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors shadow-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Primary Email</label>
                      <div className="relative">
                        <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="email" value={profileData.email} disabled
                               className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-500 cursor-not-allowed shadow-sm" />
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 mt-1">Email cannot be changed directly through settings.</p>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Workspace Role</label>
                      <div className="relative">
                        <UserGroupIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="e.g. Senior Software Engineer"
                               className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors shadow-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                      {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                      Save Profile Updates
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="animate-fade-in-up max-w-xl">
                 <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Security Credentials</h2>
                   <p className="text-xs font-semibold text-slate-500 mt-1">Manage your authentication methods securely.</p>
                 </div>
                 
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Current Password</label>
                      <div className="relative">
                        <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                               className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors shadow-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                      <div className="relative">
                        <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                               className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors shadow-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                      <div className="relative">
                        <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                               className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors shadow-sm" />
                      </div>
                    </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" disabled={loading || !passwordData.currentPassword || !passwordData.newPassword} 
                      className="px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-colors disabled:opacity-50">
                      Set New Password
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Preferences Settings */}
            {activeTab === 'preferences' && (
              <div className="animate-fade-in-up max-w-xl">
                 <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">System Preferences</h2>
                   <p className="text-xs font-semibold text-slate-500 mt-1">Command your interface themes and alerts.</p>
                 </div>
                 
                <div className="space-y-4">
                  
                  {/* Email Notifications Toggle */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/50 shrink-0">
                        <BellIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Email Notifications</div>
                        <div className="text-xs font-semibold text-slate-500">Enable digests and direct updates.</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={preferences.emailNotifications} onChange={(e) => handleTogglePreference('emailNotifications', e.target.checked)} />
                      <div className={`w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${preferences.emailNotifications ? 'peer-checked:bg-blue-600' : ''}`}></div>
                    </label>
                  </div>



                </div>
              </div>
            )}
            
            {/* Activity Insights */}
            {activeTab === 'activity' && (
              <div className="animate-fade-in-up">
                 <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Contributions & Activity</h2>
                   <p className="text-xs font-semibold text-slate-500 mt-1">A timeline of your productivity across the platform.</p>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-5 shadow-sm">
                         <div className="flex items-center gap-2 mb-3">
                             <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                             <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest">Tasks Completed</span>
                         </div>
                         <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100">{userStats.tasksCompleted}</div>
                     </div>
                     <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-5 shadow-sm">
                         <div className="flex items-center gap-2 mb-3">
                             <DocumentTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                             <span className="text-[10px] font-bold text-blue-700 dark:text-blue-500 uppercase tracking-widest">Words Written</span>
                         </div>
                         <div className="text-3xl font-black text-blue-900 dark:text-blue-100">{userStats.wordsWritten.toLocaleString()}</div>
                     </div>
                     <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-5 shadow-sm">
                         <div className="flex items-center gap-2 mb-3">
                             <ChartBarIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                             <span className="text-[10px] font-bold text-purple-700 dark:text-purple-500 uppercase tracking-widest">Avg Project Progress</span>
                         </div>
                         <div className="text-3xl font-black text-purple-900 dark:text-purple-100">{userStats.projectProgress}%</div>
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

export default Profile;
