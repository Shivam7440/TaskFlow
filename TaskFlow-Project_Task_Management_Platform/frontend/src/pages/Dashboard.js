import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import { getAvatarUrl } from '../utils/avatar';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateProjectModal from '../components/CreateProjectModal';
import AITaskGeneratorModal from '../components/AITaskGeneratorModal';
import { projectAPI, taskAPI, workspaceAPI, platformUsageAPI } from '../services/api';
import {
  PlusIcon,
  FolderIcon,
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  XMarkIcon,
  TableCellsIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { SiReact, SiTailwindcss, SiNodedotjs, SiExpress, SiMongodb, SiSocketdotio } from 'react-icons/si';

import '../styles/Dashboard.css';



const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [, setLoading] = useState(true);
  const { workspaceId } = useParams();
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const workspaceDropdownRef = React.useRef(null);
  const [platformUsageData, setPlatformUsageData] = useState(null); // hourlyData map from DB

  // --- Dynamic Calendar Widget State & Computations ---
  const today = useMemo(() => new Date(), []);
  const currentMonthValue = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }, [today]);
  const [calendarSelectedMonth, setCalendarSelectedMonth] = useState(currentMonthValue);

  const calendarMonths = useMemo(() => {
    const options = [];
    for (let i = -6; i <= 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, [today]);

  const calendarGridDays = useMemo(() => {
    if (!calendarSelectedMonth) return [];
    const [year, month] = calendarSelectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, isPadding: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, isPadding: false });
    }
    return cells;
  }, [calendarSelectedMonth]);

  const tasksDueByDay = useMemo(() => {
    const map = {};
    if (!calendarSelectedMonth) return map;
    const [year, month] = calendarSelectedMonth.split('-').map(Number);
    
    allTasks.forEach(task => {
      if (!task.dueDate) return;
      const d = new Date(task.dueDate);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === year && (d.getMonth() + 1) === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(task);
      }
    });
    return map;
  }, [allTasks, calendarSelectedMonth]);

  const getCalendarDayHighlightClass = (day) => {
    const dayTasks = tasksDueByDay[day];
    if (!dayTasks || dayTasks.length === 0) return '';
    const hasUrgentOrHigh = dayTasks.some(t => t.priority === 'urgent' || t.priority === 'high');
    if (hasUrgentOrHigh) return 'highlight-pink';
    return 'highlight-purple';
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showWorkspaceDropdown && workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target)) {
        setShowWorkspaceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showWorkspaceDropdown]);

  useEffect(() => {
    if (activeWorkspace && !workspaceId) {
      navigate(`/workspaces/${activeWorkspace._id}`, { replace: true });
    }
  }, [activeWorkspace, workspaceId, navigate]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Custom Widgets State
  const [timerSeconds, setTimerSeconds] = useState(1210); // 20:10 tracker


  // Decrement timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds(prev => (prev > 0 ? prev - 1 : 1210));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTimer = useMemo(() => {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, [timerSeconds]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch today's platform usage from the backend
  useEffect(() => {
    const fetchPlatformUsage = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await platformUsageAPI.getUsage(todayStr);
        if (res.data?.success && res.data?.data?.hourlyData) {
          // Convert Map-like object to a plain object
          const hd = res.data.data.hourlyData;
          const plain = (hd instanceof Map) ? Object.fromEntries(hd) : (typeof hd.toJSON === 'function' ? hd.toJSON() : hd);
          setPlatformUsageData(plain);
        } else {
          setPlatformUsageData({});
        }
      } catch {
        setPlatformUsageData({});
      }
    };
    fetchPlatformUsage();
    // Re-fetch every 2 minutes so the chart updates while the user is on the page
    const interval = setInterval(fetchPlatformUsage, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (workspaceId && workspaces.length > 0) {
      const found = workspaces.find(w => w._id === workspaceId);
      if (found && activeWorkspace?._id !== found._id) {
        setActiveWorkspace(found);
        
        // Also auto-select the first project of this workspace
        const wsProjects = projects.filter(p => {
          const pwId = typeof p.workspace === 'object' ? p.workspace?._id : p.workspace;
          return pwId === found._id;
        });
        if (wsProjects.length > 0) {
          setActiveProject(wsProjects[0]);
        } else {
          setActiveProject(null);
        }
      }
    }
  }, [workspaceId, workspaces, projects, activeWorkspace]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projectRes, taskRes, workspaceRes] = await Promise.all([
        projectAPI.getProjects(),
        taskAPI.getTasks(),
        workspaceAPI.getWorkspaces(),
      ]);
      const fetchedProjects = projectRes.data.projects || [];
      setProjects(fetchedProjects);
      setAllTasks(taskRes.data.tasks || []);
      setWorkspaces(workspaceRes.data.workspaces || []);
      
      // Auto-select workspace and project if available
      const wsList = workspaceRes.data.workspaces || [];
      if (wsList.length > 0) {
        let selectedWs = wsList[0];
        if (workspaceId) {
          const found = wsList.find(w => w._id === workspaceId);
          if (found) selectedWs = found;
        }
        setActiveWorkspace(selectedWs);
        
        const defaultWsProjects = fetchedProjects.filter(p => {
          const pwId = typeof p.workspace === 'object' ? p.workspace?._id : p.workspace;
          return pwId === selectedWs._id;
        });
        
        if (defaultWsProjects.length > 0) {
          setActiveProject(defaultWsProjects[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (activeWorkspace) {
      result = result.filter(p => {
        const pwId = typeof p.workspace === 'object' ? p.workspace?._id : p.workspace;
        return pwId === activeWorkspace._id;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [projects, activeWorkspace, searchQuery]);

  useEffect(() => {
    if (filteredProjects.length > 0) {
      const match = filteredProjects.find(p => activeProject && p._id === activeProject._id);
      if (!match) {
        setActiveProject(filteredProjects[0]);
      }
    } else {
      setActiveProject(null);
    }
  }, [filteredProjects, activeProject]);

  const filteredTasks = useMemo(() => {
    if (!activeWorkspace) return allTasks;
    const projectIds = new Set(filteredProjects.map(p => p._id));
    return allTasks.filter(t => {
      const pid = typeof t.project === 'object' ? t.project?._id : t.project;
      return projectIds.has(pid);
    });
  }, [allTasks, activeWorkspace, filteredProjects]);

  // --- Productivity Widget Computations ---
  const productivityData = useMemo(() => {
    console.log("DEBUG: filteredProjects =", filteredProjects);
    console.log("DEBUG: projects =", projects);
    console.log("DEBUG: filteredTasks =", filteredTasks);
    const projectMap = {};
    projects.forEach(p => {
      projectMap[p._id] = p;
    });

    const projectMinsMapToday = {};
    filteredProjects.forEach(p => {
      projectMinsMapToday[p._id] = {
        id: p._id,
        name: p.name,
        color: p.color || '#818CF8',
        minutes: 0
      };
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      totalMins: 0,
      projectSegments: []
    }));

    let todayTotalMinutes = 0;

    filteredTasks.forEach(t => {
      const mins = Number(t.actualTime) || 0;
      if (mins <= 0) return;

      const date = t.updatedAt ? new Date(t.updatedAt) : (t.createdAt ? new Date(t.createdAt) : null);
      if (date && !isNaN(date.getTime()) && date >= todayStart) {
        todayTotalMinutes += mins;
        const hr = date.getHours();
        const pid = typeof t.project === 'object' ? t.project?._id : t.project;
        if (!pid) return;

        const proj = projectMinsMapToday[pid] || projectMap[pid] || { name: 'Unnamed Project', color: '#818CF8' };
        const pColor = proj.color || '#818CF8';
        const pName = proj.name || 'Unnamed Project';

        // Add to today's project mins
        if (projectMinsMapToday[pid]) {
          projectMinsMapToday[pid].minutes += mins;
        } else {
          projectMinsMapToday[pid] = {
            id: pid,
            name: pName,
            color: pColor,
            minutes: mins
          };
        }

        // Add to hourly distribution
        const hourData = hourlyDistribution[hr];
        hourData.totalMins += mins;
        
        let seg = hourData.projectSegments.find(s => s.projectId === pid);
        if (seg) {
          seg.minutes += mins;
        } else {
          hourData.projectSegments.push({
            projectId: pid,
            color: pColor,
            name: pName,
            minutes: mins
          });
        }
      }
    });

    // Sort projects by today's logged minutes
    const sortedProjects = Object.values(projectMinsMapToday).sort((a, b) => b.minutes - a.minutes);
    const finalProjectList = sortedProjects.slice(0, 4);

    // If there are less than 4 projects, fill the list from the remaining filteredProjects
    if (finalProjectList.length < 4) {
      filteredProjects.forEach(p => {
        if (finalProjectList.length < 4 && !finalProjectList.some(item => item.id === p._id)) {
          finalProjectList.push({
            id: p._id,
            name: p.name,
            color: p.color || '#818CF8',
            minutes: 0
          });
        }
      });
    }

    // Fill remaining slots up to 5 total items (1 platform + 4 projects max) to keep height static
    const totalSlots = 4; // We will add Platform Usage later, so we need 4 project slots
    while (finalProjectList.length < totalSlots) {
      finalProjectList.push({
        id: `empty-slot-${finalProjectList.length}`,
        isEmpty: true
      });
    }

    // --- Merge Platform Usage into hourly distribution ---
    let platformTotalMinutes = 0;
    if (platformUsageData && typeof platformUsageData === 'object') {
      Object.entries(platformUsageData).forEach(([hourKey, mins]) => {
        const hr = parseInt(hourKey, 10);
        if (isNaN(hr) || hr < 0 || hr > 23) return;
        const m = Number(mins) || 0;
        if (m <= 0) return;
        platformTotalMinutes += m;

        const hourData = hourlyDistribution[hr];
        hourData.totalMins += m;

        let seg = hourData.projectSegments.find(s => s.projectId === '__platform__');
        if (seg) {
          seg.minutes += m;
        } else {
          hourData.projectSegments.push({
            projectId: '__platform__',
            color: '#A855F7',
            name: 'Platform Usage',
            minutes: m
          });
        }
      });
    }

    // Always add Platform Usage to the project legend
    finalProjectList.unshift({
      id: '__platform__',
      name: 'Platform Usage',
      color: '#A855F7',
      minutes: platformTotalMinutes
    });

    const maxHourMins = Math.max(...hourlyDistribution.map(h => h.totalMins));
    const maxScale = maxHourMins > 60 ? Math.ceil(maxHourMins / 60) * 60 : 60;

    return {
      totalMinutes: todayTotalMinutes + platformTotalMinutes,
      projects: finalProjectList,
      hourlyDistribution,
      maxScale,
      isSimulated: false
    };
  }, [projects, filteredTasks, filteredProjects, platformUsageData]);

  const formattedFocusTime = useMemo(() => {
    const hrs = Math.floor(productivityData.totalMinutes / 60);
    const mins = productivityData.totalMinutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  }, [productivityData.totalMinutes]);



  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      setCreatingWorkspace(true);
      const res = await workspaceAPI.createWorkspace({
        name: newWorkspaceName.trim(),
        description: newWorkspaceDesc.trim(),
      });
      const newWs = res.data.workspace;
      setWorkspaces(prev => [newWs, ...prev]);
      setActiveWorkspace(newWs);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      setShowCreateWorkspace(false);
      toast.success(`Workspace "${newWs.name}" created!`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };



  // --- REDESIGN DYNAMIC DATA CALCULATIONS ---
  
  // Helper for generating diverse avatar colors
  const getAvatarBgColor = (name) => {
    const colors = [
      'bg-indigo-500 text-white',
      'bg-emerald-500 text-white',
      'bg-pink-500 text-white',
      'bg-blue-500 text-white',
      'bg-violet-500 text-white',
      'bg-amber-500 text-white'
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // 1. Today's Date formatted like "Monday, 2 June 2025 · TaskFlow Workspace"
  const todayFormattedDate = useMemo(() => {
    const wsName = activeWorkspace ? activeWorkspace.name : 'Personal Workspace';
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ` · ${wsName}`;
  }, [activeWorkspace]);

  // 2. Assigned to you count
  const assignedCount = useMemo(() => {
    return allTasks.filter(t => 
      t.status !== 'completed' &&
      (t.assignees?.some(a => a._id === user?._id || a === user?._id) || 
       (t.assignee && (t.assignee._id === user?._id || t.assignee === user?._id)))
    ).length;
  }, [allTasks, user]);

  const assignedSubtitle = useMemo(() => {
    const assignedProjectsCount = new Set(
      allTasks.filter(t => 
        t.status !== 'completed' &&
        (t.assignees?.some(a => a._id === user?._id || a === user?._id) || 
         (t.assignee && (t.assignee._id === user?._id || t.assignee === user?._id)))
      ).map(t => typeof t.project === 'object' ? t.project?._id : t.project)
    ).size;
    return `across ${assignedProjectsCount} ${assignedProjectsCount === 1 ? 'project' : 'projects'}`;
  }, [allTasks, user]);

  // 3. Overdue Count
  const overdueCount = useMemo(() => {
    return allTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;
  }, [allTasks]);

  // 4. Due Today Count
  const dueTodayCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return allTasks.filter(t => 
      t.dueDate && new Date(t.dueDate).toDateString() === todayStr && t.status !== 'completed'
    ).length;
  }, [allTasks]);

  // 5. Completed this week
  const completedThisWeekCount = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return allTasks.filter(t => 
      (t.status === 'completed' || t.status === 'Completed') && 
      new Date(t.updatedAt || t.createdAt) >= oneWeekAgo
    ).length;
  }, [allTasks]);

  // 6. Priority Tasks List (Up to 6)
  const priorityTasksList = useMemo(() => {
    return allTasks
      .filter(t => t.status !== 'completed')
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      })
      .slice(0, 6);
  }, [allTasks]);

  // 7. Dynamic Team Activity Feed (In a real app, this would be fetched from an API)
  const dynamicActivityFeed = useMemo(() => {
    return [];
  }, []);

  // 8. Project list with progress ratios
  const projectsListWithRatios = useMemo(() => {
    const icons = [SiReact, SiTailwindcss, SiNodedotjs, SiExpress, SiMongodb, SiSocketdotio];
    
    return filteredProjects.map((project, idx) => {
      const pTasks = allTasks.filter(t => (typeof t.project === 'object' ? t.project?._id : t.project) === project._id);
      const completedCount = pTasks.filter(t => t.status === 'completed' || t.status === 'Completed').length;
      const progressPct = pTasks.length > 0 ? Math.round((completedCount / pTasks.length) * 100) : 0;
      const tasksLeft = pTasks.length - completedCount;
      const projectStatus = idx % 3 === 0 ? { label: 'Active', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' } 
                          : idx % 3 === 1 ? { label: 'In review', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' }
                          : { label: 'Planning', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' };
      
      return {
        ...project,
        icon: icons[idx % icons.length],
        progress: progressPct,
        tasksLeft,
        status: projectStatus,
        color: project.color || '#6366F1'
      };
    });
  }, [filteredProjects, allTasks]);

  return (
    <div className={`taskly-app-wrapper dark`}>
      
      {/* --- Main Structural Splitter --- */}
      <div className="taskly-main-container">
        
        {/* ─── Column 1: Left Sidebar ─── */}
        <aside className="taskly-sidebar flex flex-col dashboard-glow-card" style={{ gap: '16px', padding: '16px' }}>
          
          {/* Header & Workspace Card Grouped to avoid double gap */}
          <div className="flex flex-col gap-3 shrink-0">
            {/* Brand Header */}
            <div className="flex items-center gap-3 px-2 select-none">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white border-none" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: '0 0 12px rgba(99, 102, 241, 0.25)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#D1D1D1', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>TaskFlow</span>
            </div>

            {/* Active Workspace profile card */}
            <div className="relative" ref={workspaceDropdownRef}>
              <div 
                className="sidebar-workspace-card flex items-center justify-between cursor-pointer transition-all p-2.5 rounded-xl select-none" 
                style={{ background: '#141414', border: '1px solid #1E1E1E' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWorkspaceDropdown(!showWorkspaceDropdown);
                }}
              >
                <div className="sidebar-workspace-info flex items-center gap-3">
                  <div className="sidebar-workspace-logo w-7.5 h-7.5 rounded-lg text-white flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)' }}>
                    {activeWorkspace ? activeWorkspace.name?.charAt(0).toUpperCase() : 'W'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="sidebar-workspace-name font-bold text-xs truncate max-w-[120px] mb-0.5" style={{ color: '#D1D1D1' }}>
                      {activeWorkspace ? activeWorkspace.name : 'Engineering Pool'}
                    </div>
                    <div className="sidebar-workspace-status uppercase tracking-wide" style={{ fontSize: '9px', fontWeight: 700, color: '#605E5E' }}>
                      Enterprise Plan
                    </div>
                  </div>
                </div>
                <ChevronRightIcon className={`w-4 h-4 transition-transform duration-200 ${showWorkspaceDropdown ? 'rotate-[270deg]' : 'rotate-90'}`} style={{ color: '#605E5E' }} />
              </div>

              {/* Switch Workspace Dropdown Popover */}
              {showWorkspaceDropdown && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl animate-fade-in-up max-h-60 overflow-y-auto custom-scrollbar" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)', padding: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#605E5E', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px', borderBottom: '1px solid #1E1E1E', marginBottom: '6px' }}>
                    Switch Workspace
                  </div>
                  
                  <div className="space-y-0.5">
                    {workspaces.map((ws) => {
                      const isActive = activeWorkspace?._id === ws._id;
                      return (
                        <button
                          key={ws._id}
                          onClick={() => {
                            setActiveWorkspace(ws);
                            setShowWorkspaceDropdown(false);
                            navigate(`/workspaces/${ws._id}`);
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl text-left border-none bg-transparent cursor-pointer transition-colors"
                          style={{ 
                            background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#141414'; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: isActive ? 'linear-gradient(135deg, #6366F1, #818CF8)' : '#434343' }}>
                              {ws.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[12px] font-bold truncate max-w-[110px]" style={{ color: isActive ? '#A5B4FC' : '#828383' }}>
                              {ws.name}
                            </span>
                          </div>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full mr-1" style={{ background: '#6366F1' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ borderTop: '1px solid #1E1E1E', marginTop: '8px', paddingTop: '8px' }}>
                    <button
                      onClick={() => {
                        setShowWorkspaceDropdown(false);
                        setShowCreateWorkspace(true);
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left border-none bg-transparent cursor-pointer transition-colors font-bold text-[12px]"
                      style={{ color: '#A5B4FC' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <PlusIcon className="w-4 h-4 shrink-0" />
                      <span>Create Workspace</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Search Widget */}
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#605E5E' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl outline-none transition-all"
                style={{ height: '34px', background: '#141414', border: '1px solid #1E1E1E', paddingLeft: '36px', paddingRight: '32px', fontSize: '12px', color: '#D1D1D1' }}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1 py-0.5 rounded pointer-events-none" style={{ fontSize: '9px', fontWeight: 700, color: '#605E5E', background: '#1E1E1E', border: '1px solid #1E1E1E' }}>⌘K</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="sidebar-list-container shrink-0">
            <div className="sidebar-section-label">Main Menu</div>
            
            <button className="sidebar-item-btn active">
              <span className="flex items-center gap-3">
                <Squares2X2Icon className="w-4 h-4" />
                <span>Dashboard</span>
              </span>
            </button>

            <button onClick={() => navigate('/tasks')} className="sidebar-item-btn">
              <span className="flex items-center gap-3">
                <TableCellsIcon className="w-4 h-4" />
                <span>Task Overview</span>
              </span>
              <span className="sidebar-pill-badge">{filteredTasks.length}</span>
            </button>

            <button onClick={() => navigate('/calendar')} className="sidebar-item-btn">
              <span className="flex items-center gap-3">
                <CalendarDaysIcon className="w-4 h-4" />
                <span>Calendar</span>
              </span>
            </button>

            <button onClick={() => navigate('/profile')} className="sidebar-item-btn">
              <span className="flex items-center gap-3">
                <UserGroupIcon className="w-4 h-4" />
                <span>Team Directory</span>
              </span>
            </button>

            <button onClick={() => navigate('/analytics')} className="sidebar-item-btn">
              <span className="flex items-center gap-3">
                <ChartBarIcon className="w-4 h-4" />
                <span>Analytics</span>
              </span>
            </button>
          </div>

          {/* Active Projects Dropdown */}
          <div className="sidebar-list-container flex-1 overflow-y-auto custom-scrollbar mb-2 pr-1">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, paddingRight: 4 }}>
              <div className="sidebar-section-label" style={{ margin: 0 }}>Active Projects</div>
              <button onClick={() => setShowCreateProject(true)} className="p-1 rounded-md transition-colors border-none bg-transparent cursor-pointer" style={{ color: '#605E5E' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#A5B4FC'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#605E5E'; }}>
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-1">
              {filteredProjects.map((project) => (
                <div
                  key={project._id}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all"
                  style={{ 
                    color: activeProject?._id === project._id ? '#A5B4FC' : '#828383',
                    background: activeProject?._id === project._id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  }}
                  onClick={() => setActiveProject(project)}
                  onMouseEnter={(e) => { if (activeProject?._id !== project._id) { e.currentTarget.style.background = '#141414'; e.currentTarget.style.color = '#D1D1D1'; } }}
                  onMouseLeave={(e) => { if (activeProject?._id !== project._id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#828383'; } }}
                >
                  <span className="truncate flex items-center gap-2">
                    <span className="text-[12px] opacity-45">#</span>
                    <span className="truncate">{project.name}</span>
                  </span>
                </div>
              ))}
              
              {filteredProjects.length === 0 && (
                <span className="italic pl-3 pt-1" style={{ fontSize: '10px', color: '#605E5E' }}>No projects in workspace</span>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto pt-3 shrink-0" style={{ borderTop: '1px solid #1E1E1E' }}>
            <div className="flex items-center justify-between">
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-85 transition-opacity min-w-0 pr-1 decoration-transparent">
                <img src={getAvatarUrl(user)} className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: '1px solid #1E1E1E' }} alt="Profile" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-extrabold leading-tight truncate" style={{ color: '#D1D1D1' }}>{user?.name?.split(' ')[0] || 'User'}</span>
                  <span className="text-[9px] font-semibold truncate" style={{ color: '#605E5E' }}>{user?.email?.split('@')[0]}</span>
                </div>
              </Link>

              <div className="flex items-center gap-0.5 shrink-0">
                 <NotificationBell />
                 <button onClick={logout} className="p-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer" style={{ color: '#605E5E' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#605E5E'; e.currentTarget.style.background = 'transparent'; }}>
                   <ArrowRightOnRectangleIcon className="w-4 h-4" />
                 </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── Column 2: Central Primary content area ─── */}
        <main className="taskly-center-content custom-scrollbar pt-4 px-6 pb-6 flex flex-col gap-6" style={{ background: '#0A0A0A' }}>
          
          {/* Section 1: GREETING HEADER */}
          <div className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 dashboard-glow-card" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight leading-none mb-2 flex items-center gap-2" style={{ color: '#D1D1D1' }}>
                {getGreeting()}, {user?.name || 'Member'} 👋
              </h1>
              <p className="text-[13px] font-medium" style={{ color: '#828383' }}>
                {todayFormattedDate}
              </p>
            </div>

            {/* Right side decorative pill */}
            <div className="shrink-0 hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#6366F1' }} />
              <span className="text-[11px] font-bold" style={{ color: '#818CF8' }}>
                {activeWorkspace ? activeWorkspace.name : 'Personal Workspace'}
              </span>
            </div>
          </div>

          {/* Section 2: STATS ROW — enclosed in a card so it stands out from the background */}
          <div className="rounded-2xl p-5 relative overflow-hidden shrink-0 dashboard-glow-card" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
            {/* Section label inside card */}
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: '#605E5E' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#605E5E' }}>Today at a glance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Assigned to you (Indigo) */}
              <div className="p-5 rounded-2xl flex flex-col gap-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group relative overflow-hidden" 
                   style={{ 
                     background: 'linear-gradient(145deg, rgba(20,20,20,0.8) 0%, rgba(10,10,10,0.95) 100%)', 
                     border: '1px solid rgba(255,255,255,0.05)',
                     boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 20px rgba(0,0,0,0.3)'
                   }}>
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500 pointer-events-none"></div>
                <div className="flex items-center gap-2.5 relative z-10 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                    <DocumentTextIcon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-300 transition-colors">
                    Assigned to you
                  </span>
                </div>
                <div className="relative z-10 flex flex-col">
                  <div className="text-4xl font-black tracking-tighter text-white drop-shadow-md">
                    {assignedCount}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    {assignedSubtitle}
                  </div>
                </div>
              </div>

              {/* Card 2: Overdue (Red) */}
              <div className="p-5 rounded-2xl flex flex-col gap-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group relative overflow-hidden" 
                   style={{ 
                     background: 'linear-gradient(145deg, rgba(25,15,15,0.8) 0%, rgba(15,10,10,0.95) 100%)', 
                     border: '1px solid rgba(239,68,68,0.1)',
                     boxShadow: 'inset 0 1px 0 rgba(239,68,68,0.05), 0 4px 20px rgba(0,0,0,0.3)'
                   }}>
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500 pointer-events-none"></div>
                <div className="flex items-center gap-2.5 relative z-10 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                    <ClockIcon className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80 group-hover:text-red-400 transition-colors">
                    Overdue
                  </span>
                </div>
                <div className="relative z-10 flex flex-col">
                  <div className="text-4xl font-black tracking-tighter text-white drop-shadow-md">
                    {overdueCount}
                  </div>
                  <div className="text-[11px] font-medium text-red-400/60 mt-1 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${overdueCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-red-500/30'}`}></span>
                    {overdueCount > 0 ? 'need your attention' : 'all caught up'}
                  </div>
                </div>
              </div>

              {/* Card 3: Due today (Amber) */}
              <div className="p-5 rounded-2xl flex flex-col gap-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group relative overflow-hidden" 
                   style={{ 
                     background: 'linear-gradient(145deg, rgba(25,20,10,0.8) 0%, rgba(15,12,8,0.95) 100%)', 
                     border: '1px solid rgba(245,158,11,0.1)',
                     boxShadow: 'inset 0 1px 0 rgba(245,158,11,0.05), 0 4px 20px rgba(0,0,0,0.3)'
                   }}>
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-500 pointer-events-none"></div>
                <div className="flex items-center gap-2.5 relative z-10 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                    <CalendarDaysIcon className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80 group-hover:text-amber-400 transition-colors">
                    Due today
                  </span>
                </div>
                <div className="relative z-10 flex flex-col">
                  <div className="text-4xl font-black tracking-tighter text-white drop-shadow-md">
                    {dueTodayCount}
                  </div>
                  <div className="text-[11px] font-medium text-amber-400/60 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></span>
                    finish before EOD
                  </div>
                </div>
              </div>

              {/* Card 4: Completed this week (Emerald) */}
              <div className="p-5 rounded-2xl flex flex-col gap-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group relative overflow-hidden" 
                   style={{ 
                     background: 'linear-gradient(145deg, rgba(15,25,20,0.8) 0%, rgba(10,15,12,0.95) 100%)', 
                     border: '1px solid rgba(16,185,129,0.1)',
                     boxShadow: 'inset 0 1px 0 rgba(16,185,129,0.05), 0 4px 20px rgba(0,0,0,0.3)'
                   }}>
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500 pointer-events-none"></div>
                <div className="flex items-center gap-2.5 relative z-10 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 group-hover:text-emerald-400 transition-colors">
                    Completed this week
                  </span>
                </div>
                <div className="relative z-10 flex flex-col">
                  <div className="text-4xl font-black tracking-tighter text-white drop-shadow-md">
                    {completedThisWeekCount}
                  </div>
                  <div className="text-[11px] font-medium text-emerald-400/60 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                    ↑ {completedThisWeekCount > 0 ? 2 : 0} vs last week
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: PROJECTS GRID */}
          <div className="rounded-2xl p-6 mt-2 relative overflow-hidden shrink-0 dashboard-glow-card" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
            <div className="flex items-center gap-2 mb-4">
              <FolderIcon className="w-4 h-4" style={{ color: '#605E5E' }} />
              <h2 className="text-[11px] font-bold uppercase tracking-widest m-0" style={{ color: '#605E5E' }}>Projects</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1.5rem' }}>
              {projectsListWithRatios.map((project, index) => {
                const ProjectIcon = project.icon;
                const total = projectsListWithRatios.length;

                // Compute how many items share the same row as this card
                const rowStart = Math.floor(index / 3) * 3;
                const rowEnd = Math.min(rowStart + 3, total);
                const itemsInThisRow = rowEnd - rowStart;

                // Map row count → column span (grid has 6 cols)
                // 1 item in row → span 6 (full width)
                // 2 items in row → span 3 (50% each)
                // 3 items in row → span 2 (33% each)
                const spanMap = { 1: 6, 2: 3, 3: 2 };
                const colSpan = spanMap[itemsInThisRow] || 2;

                return (
                  <div 
                    key={project._id}
                    onClick={() => navigate(`/projects/${project._id}`)}
                    style={{ gridColumn: `span ${colSpan}`, background: '#141414', border: '1px solid #1E1E1E' }}
                    className="rounded-xl p-5 transition-all cursor-pointer flex flex-col gap-4 select-none group"
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#434343'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1E1E1E'}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/10" style={{ backgroundColor: project.color || '#6366F1' }}>
                        <ProjectIcon className="w-4.5 h-4.5" />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${project.status?.bg}`}>
                        {project.status?.label}
                      </span>
                    </div>

                    {/* Info Row */}
                    <div>
                      <h4 className="text-sm font-bold transition-colors" style={{ color: '#D1D1D1' }}>
                        {project.name}
                      </h4>
                      <p className="text-[11px] mt-1 leading-relaxed font-semibold line-clamp-2" style={{ color: '#828383' }}>
                        {project.description || 'Enterprise project repository.'}
                      </p>
                    </div>

                    {/* Progress Bar (4px height) */}
                    <div className="w-full h-1 rounded-full overflow-hidden mt-1" style={{ background: '#1E1E1E' }}>
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${project.progress}%`, backgroundColor: project.color || '#6366F1' }}
                      />
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between mt-1 pt-3.5" style={{ borderTop: '1px solid #1E1E1E' }}>
                      {/* Overlapping member bubbles */}
                      <div className="flex items-center -space-x-2">
                        {project.members?.slice(0, 4).map((member, i) => (
                          <div 
                            key={i} 
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-extrabold shadow-sm ${getAvatarBgColor(member.user?.name)}`}
                            style={{ border: '2px solid #0A0A0A' }}
                          >
                            {member.user?.name ? member.user.name.split(' ').map(n=>n.charAt(0)).join('').toUpperCase() : 'M'}
                          </div>
                        ))}
                        {(!project.members || project.members.length === 0) && (
                          <div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[8px] font-bold shadow-sm" style={{ background: '#6366F1', border: '2px solid #0A0A0A' }}>
                            AR
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: '#828383' }}>
                        {project.progress}% · {project.tasksLeft} {project.tasksLeft === 1 ? 'task' : 'tasks'} left
                      </span>
                    </div>

                  </div>
                );
              })}

              {projectsListWithRatios.length === 0 && (
                <div style={{ gridColumn: 'span 6', background: '#141414', border: '1px dashed #1E1E1E' }} className="rounded-xl py-8 px-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: '#1E1E1E', color: '#828383', border: '1px solid #2A2A2A' }}>
                    <FolderIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold mb-1" style={{ color: '#D1D1D1' }}>No active projects</h4>
                  <p className="text-[11px] mb-4 max-w-[250px] leading-relaxed" style={{ color: '#828383' }}>
                    Create a project to start organizing your work and collaborating with your team.
                  </p>
                  <button 
                    onClick={() => setShowCreateProject(true)}
                    className="px-4 py-1.5 rounded-lg text-white font-bold text-[11px] transition-colors shadow-sm cursor-pointer border-none"
                    style={{ background: '#6366F1' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#818CF8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#6366F1'}
                  >
                    + Create Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: TWO COLUMN SECTION */}
          <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full mt-2 shrink-0">
            
            {/* LEFT — Priority tasks list inside a bordered card */}
            <div className="flex-1 w-full rounded-2xl p-6 flex flex-col dashboard-glow-card" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: '#605E5E' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-[11px] font-bold uppercase tracking-widest m-0" style={{ color: '#605E5E' }}>Your priority tasks</h3>
              </div>
              
              <div className="flex flex-col gap-3 flex-1">
                {priorityTasksList.map((task) => {
                  const pid = typeof task.project === 'object' ? task.project?._id : task.project;
                  const pName = typeof task.project === 'object' ? task.project?.name : (projects.find(p => p._id === task.project)?.name || 'General');
                  
                  const dotColor = task.priority === 'urgent' ? 'bg-red-500' 
                                 : task.priority === 'high' ? 'bg-amber-500' 
                                 : 'bg-blue-500';

                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                  const isToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString();

                  return (
                    <div 
                      key={task._id} 
                      onClick={() => { if (pid) navigate(`/projects/${pid}`); }}
                      className="flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer select-none group"
                      style={{ background: '#141414', border: '1px solid #1E1E1E' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#434343'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#1E1E1E'}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                        <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                        <span className="text-[13px] font-bold truncate transition-colors" style={{ color: '#D1D1D1' }}>
                          {task.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[11px] font-bold" style={{ color: '#828383' }}>
                          {pName}
                        </span>
                        {task.dueDate ? (
                          isOverdue ? (
                            <span className="bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                              Overdue
                            </span>
                          ) : isToday ? (
                            <span className="bg-amber-500/10 text-amber-655 dark:text-amber-400 border border-amber-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                              Today
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ background: '#1E1E1E', color: '#828383' }}>
                            No Date
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {priorityTasksList.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 rounded-xl" style={{ background: '#141414', border: '1px dashed #1E1E1E' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: '#1E1E1E', color: '#828383', border: '1px solid #2A2A2A' }}>
                      <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold mb-1" style={{ color: '#D1D1D1' }}>All caught up!</h4>
                    <p className="text-[11px] mb-4 max-w-[200px] text-center leading-relaxed" style={{ color: '#828383' }}>
                      You don't have any priority tasks right now. Enjoy the peace or create a new one.
                    </p>
                    <button 
                      onClick={() => setShowCreateTask(true)}
                      className="px-4 py-1.5 rounded-lg text-white font-bold text-[11px] transition-colors shadow-sm cursor-pointer border-none"
                      style={{ background: '#6366F1' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#818CF8'}
                      onMouseLeave={e => e.currentTarget.style.background = '#6366F1'}
                    >
                      + Add Task
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Team activity feed inside a bordered card */}
            <div className="w-full lg:w-[320px] shrink-0 rounded-2xl p-6 flex flex-col gap-4 dashboard-glow-card" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: '#605E5E' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h3l2-5 3 10 2-7 2 4h3" />
                  </svg>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest m-0" style={{ color: '#605E5E' }}>Team activity</h3>
                </div>
                {dynamicActivityFeed.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    4 online
                  </div>
                )}
              </div>

              {dynamicActivityFeed.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {dynamicActivityFeed.map((act, i) => (
                    <div key={i} className="flex gap-3 p-4 select-none bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 rounded-xl">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm ${act.color}`}>
                        {act.initials}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-[12px] text-slate-700 dark:text-slate-300 font-medium leading-snug">
                          <span className="font-extrabold text-slate-900 dark:text-white">{act.name}</span> {act.action}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                          {act.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center h-full rounded-xl" style={{ background: '#141414', border: '1px dashed #1E1E1E' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: '#1E1E1E', border: '1px solid #2A2A2A' }}>
                    <UserGroupIcon className="w-6 h-6" style={{ color: '#828383' }} />
                  </div>
                  <h4 className="text-sm font-bold mb-1" style={{ color: '#D1D1D1' }}>It's quiet here...</h4>
                  <p className="text-[11px] mb-4 leading-relaxed" style={{ color: '#828383' }}>
                    Great things happen when teams work together. Invite your team to get started!
                  </p>
                  <button 
                    onClick={() => navigate('/profile')} 
                    className="flex items-center gap-2 text-xs font-bold text-white px-4 py-2 rounded-xl transition-colors shadow-sm border-none cursor-pointer"
                    style={{ background: '#6366F1' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#818CF8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#6366F1'}
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Invite Teammates
                  </button>
                </div>
                )}
            </div>
          </div>

        </main>

        {/* ─── Column 3: Right Panel ─── */}
        <aside className="taskly-right-panel custom-scrollbar">
          
          {/* Calendar Widget */}
          <div className="calendar-widget-card relative overflow-hidden shrink-0 dashboard-glow-card">
            <header className="widget-header" style={{ marginBottom: 4 }}>
              <span className="widget-title">
                <CalendarDaysIcon className="w-4 h-4 text-blue-500" />
                Calendar
              </span>
              <select 
                className="calendar-month-select"
                value={calendarSelectedMonth}
                onChange={(e) => setCalendarSelectedMonth(e.target.value)}
              >
                {calendarMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </header>

            <div className="calendar-grid">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                <div key={i} className="calendar-day-header">{d}</div>
              ))}
              
              {calendarGridDays.map((cell, i) => {
                if (cell.isPadding) {
                  return <div key={`p-${i}`} className="calendar-day-cell opacity-0 pointer-events-none" />;
                }
                const day = cell.day;
                const highlightClass = getCalendarDayHighlightClass(day);
                const dayTasks = tasksDueByDay[day] || [];
                const tooltipText = dayTasks.length > 0 ? `${dayTasks.length} task(s) due:\n${dayTasks.map(t => `• ${t.title}`).join('\n')}` : '';

                return (
                  <div 
                    key={`d-${day}`} 
                    className={`calendar-day-cell ${highlightClass}`}
                    title={tooltipText}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timer Widget */}
          <div className="timer-widget-card relative overflow-hidden shrink-0 dashboard-glow-card">
            <div className="timer-widget-left">
              <div className="timer-widget-icon-box">
                <ClockIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="timer-title">Focus Session</div>
                <div className="timer-clock">{formattedTimer}</div>
              </div>
            </div>
            <button
              onClick={() => toast.success('Timer paused')}
              className="timer-stop-btn"
            >
              <div style={{ width: 12, height: 12, backgroundColor: 'currentColor', borderRadius: 3 }} />
            </button>
          </div>

          {/* Productivity Widget */}
          <div className="productivity-widget-card relative overflow-hidden shrink-0 dashboard-glow-card">
            <header className="productivity-widget-header flex items-center justify-between">
              <span className="productivity-widget-title flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-indigo-500" />
                <span>Productivity</span>
              </span>
            </header>
            
            <div className="productivity-widget-body flex flex-col justify-between">
              
              {/* Stat focus time */}
              <div className="productivity-stat-row">
                <span className="productivity-stat-time">{formattedFocusTime}</span>
              </div>

              {/* Chart container */}
              <div className="productivity-chart-outer">
                {/* Horizontal reference lines */}
                <div className="productivity-y-grid">
                  <div className="productivity-grid-line-h"><span className="productivity-grid-label">{productivityData.maxScale}m</span></div>
                  <div className="productivity-grid-line-h"><span className="productivity-grid-label">{productivityData.maxScale / 2}m</span></div>
                  <div className="productivity-grid-line-h"><span className="productivity-grid-label">0</span></div>
                </div>

                {/* Dashed vertical grid lines at 3 AM, 9 AM, 3 PM */}
                <div className="productivity-x-grid">
                  <div className="productivity-grid-line-v" style={{ left: '14.5%' }}>
                    <span className="productivity-grid-x-label">3 AM</span>
                  </div>
                  <div className="productivity-grid-line-v" style={{ left: '39.5%' }}>
                    <span className="productivity-grid-x-label">9 AM</span>
                  </div>
                  <div className="productivity-grid-line-v" style={{ left: '64.5%' }}>
                    <span className="productivity-grid-x-label">3 PM</span>
                  </div>
                </div>

                {/* 24-bars chart grid */}
                <div className="productivity-bars-grid">
                  {productivityData.hourlyDistribution.map((hourData, idx) => {
                    const barHeightPct = Math.min(100, (hourData.totalMins / productivityData.maxScale) * 100);
                    return (
                      <div key={idx} className="productivity-bar-col">
                        <div className="productivity-bar-track">
                          {barHeightPct > 0 && (
                            <div 
                              className="productivity-bar" 
                              style={{ height: `${barHeightPct}%` }}
                              title={`${hourData.totalMins}m logged at ${idx === 0 ? '12 AM' : idx < 12 ? `${idx} AM` : idx === 12 ? '12 PM' : `${idx - 12} PM`}`}
                            >
                              {hourData.projectSegments.map((seg, sIdx) => {
                                const segHeightPct = (seg.minutes / hourData.totalMins) * 100;
                                return (
                                  <div
                                    key={sIdx}
                                    className="productivity-bar-segment"
                                    style={{ 
                                      height: `${segHeightPct}%`, 
                                      backgroundColor: seg.color 
                                    }}
                                    title={`${seg.name}: ${seg.minutes}m`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Legend list (Recent 4 projects displayed vertically) */}
              <div className="productivity-project-list">
                {productivityData.projects.map((proj) => {
                  if (proj.isEmpty) {
                    return (
                      <div key={proj.id} className="productivity-project-row" style={{ opacity: 0.5 }}>
                        <div className="productivity-project-info flex items-center gap-2">
                          <div 
                            className="productivity-project-icon flex items-center justify-center text-[10px] font-bold" 
                            style={{ 
                              background: 'transparent',
                              border: '1px dashed #333',
                              color: '#666'
                            }}
                          >
                            +
                          </div>
                          <span className="productivity-project-name text-xs font-semibold truncate italic" style={{ color: '#666' }}>
                            Available Slot
                          </span>
                        </div>
                        <span className="productivity-project-duration text-[11px] font-medium" style={{ color: '#666' }}>
                          --
                        </span>
                      </div>
                    );
                  }

                  const formatMinutes = (m) => {
                    const hrs = Math.floor(m / 60);
                    const mins = m % 60;
                    if (hrs > 0) {
                      return `${hrs}h ${mins > 0 ? mins + 'm' : ''}`;
                    }
                    return `${mins}m`;
                  };
                  return (
                    <div key={proj.id} className="productivity-project-row">
                      <div className="productivity-project-info flex items-center gap-2">
                        <div 
                          className="productivity-project-icon flex items-center justify-center text-[10px] font-bold" 
                          style={{ 
                            background: `linear-gradient(135deg, ${proj.color}, ${proj.color}CC)`,
                            color: '#FFFFFF',
                            boxShadow: `0 2px 6px ${proj.color}40`
                          }}
                        >
                          {proj.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="productivity-project-name text-xs font-semibold truncate">
                          {proj.name}
                        </span>
                      </div>
                      <span className="productivity-project-duration text-[11px] font-medium">
                        {formatMinutes(proj.minutes)}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>


        </aside>

      </div>

      {/* ═══════ CREATE WORKSPACE MODAL ═══════ */}
      {showCreateWorkspace && (
        <>
          <div className="fixed inset-0 z-45 backdrop-blur-md transition-opacity duration-300" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowCreateWorkspace(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowCreateWorkspace(false)}>
            <div className="relative w-full max-w-md rounded-[24px] p-8 transition-all duration-300" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
              <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                    <Squares2X2Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight" style={{ color: '#D1D1D1' }}>New Workspace</h3>
                </div>
                <button 
                  onClick={() => setShowCreateWorkspace(false)} 
                  className="p-1.5 rounded-xl border-none bg-transparent cursor-pointer transition-colors"
                  style={{ color: '#828383' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#D1D1D1'; e.currentTarget.style.background = '#1E1E1E'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#828383'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </header>
              <form onSubmit={handleCreateWorkspace}>
                <div className="mb-5">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#828383' }}>Workspace Name *</label>
                  <input
                    autoFocus
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g., Engineering Guild"
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: '#141414', border: '1px solid #1E1E1E', color: '#D1D1D1' }}
                    onFocus={e => e.target.style.borderColor = '#6366F1'}
                    onBlur={e => e.target.style.borderColor = '#1E1E1E'}
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#828383' }}>Description</label>
                  <textarea
                    value={newWorkspaceDesc}
                    onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                    placeholder="Brief overview..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                    style={{ background: '#141414', border: '1px solid #1E1E1E', color: '#D1D1D1' }}
                    onFocus={e => e.target.style.borderColor = '#6366F1'}
                    onBlur={e => e.target.style.borderColor = '#1E1E1E'}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateWorkspace(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 text-center cursor-pointer"
                    style={{ background: 'transparent', border: '1px solid #1E1E1E', color: '#D1D1D1' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#141414'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingWorkspace || !newWorkspaceName.trim()}
                    className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm border-none transition-all duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}
                  >
                    {creatingWorkspace ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ═══════ MODALS ═══════ */}
      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onCreated={fetchDashboardData}
          defaultProjectId={activeProject ? activeProject._id : (projects.length > 0 ? projects[0]._id : null)}
        />
      )}

      {showAIGenerator && (
        <AITaskGeneratorModal
          onClose={() => setShowAIGenerator(false)}
          onCreated={fetchDashboardData}
          defaultProjectId={activeProject ? activeProject._id : (projects.length > 0 ? projects[0]._id : null)}
        />
      )}

      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onCreated={fetchDashboardData}
        />
      )}
    </div>
  );
};

export default Dashboard;
