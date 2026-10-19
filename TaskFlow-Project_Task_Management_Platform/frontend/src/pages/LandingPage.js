import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { contactAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import '../styles/LandingPage.css';

/* ─────────────────────────────────────────────────────────────
   KPI Count-Up Hook — quartic ease-out over 2000ms
   ───────────────────────────────────────────────────────────── */
const useCountUp = (end, decimals = 0, duration = 2000) => {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4); // quartic ease-out
            setValue(parseFloat((eased * end).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, decimals, duration]);

  return [ref, value];
};

/* ─────────────────────────────────────────────────────────────
   Intersection Observer hook for fade-in-up reveals
   ───────────────────────────────────────────────────────────── */
const useReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
};

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const LandingPage = () => {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Contact form state
  const [formData, setFormData] = useState({
    name: '', email: '', subject: '', message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nav scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [faqPhone, setFaqPhone] = useState('');

  // Contact form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFaqSubmit = (e) => {
    e.preventDefault();
    if (!faqPhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }
    toast.success("Thanks! We will text you within 24 hours.");
    setFaqPhone('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await contactAPI.submitForm(formData);
      if (response.data.success) {
        toast.success(response.data.message || 'Message sent successfully!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPI refs
  const [kpi1Ref, kpi1Val] = useCountUp(12847, 0);
  const [kpi2Ref, kpi2Val] = useCountUp(99.97, 2);
  const [kpi3Ref, kpi3Val] = useCountUp(2400000, 0);
  const [kpi4Ref, kpi4Val] = useCountUp(186, 0);

  // Reveal refs
  const revealModules = useReveal();
  const revealStats = useReveal();
  const revealSecurity = useReveal();
  const revealFaq = useReveal();
  const revealCta = useReveal();
  const revealContact = useReveal();

  // Modules data
  const modules = [
    {
      icon: 'users', color: 'blue', title: 'User Management',
      desc: 'Role-based access control with SSO integration. Manage teams, permissions, and audit trails in one place.'
    },
    {
      icon: 'shield', color: 'emerald', title: 'Security & Compliance',
      desc: 'Enterprise-grade encryption, SOC2 compliance, and automated security policy enforcement.'
    },
    {
      icon: 'chart', color: 'amber', title: 'Advanced Analytics',
      desc: 'Real-time dashboards with custom reports. Track KPIs, team velocity, and project health metrics.'
    },
    {
      icon: 'kanban', color: 'purple', title: 'Kanban & Workflows',
      desc: 'Drag-and-drop boards with customizable swim lanes, WIP limits, and automated stage transitions.'
    },
    {
      icon: 'ai', color: 'rose', title: 'AI Task Intelligence',
      desc: 'Gemini-powered task prioritization, smart suggestions, and automated workload balancing.'
    },
    {
      icon: 'realtime', color: 'cyan', title: 'Real-time Collaboration',
      desc: 'Socket.io powered live updates. See changes instantly with in-context chat and @mentions.'
    },
  ];

  // FAQ data
  const faqs = [
    {
      q: 'How does TaskFlow handle data security?',
      a: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We support SOC2 Type II, GDPR, and HIPAA compliance with comprehensive audit logging and role-based access controls.',
      tag: 'Security'
    },
    {
      q: 'Can I integrate TaskFlow with existing tools?',
      a: 'Absolutely. TaskFlow offers REST APIs and webhooks for integration with Slack, GitHub, Jira, and 50+ other tools. Our SDK supports custom integrations with full documentation.',
      tag: 'Integrations'
    },
    {
      q: 'What AI features are available?',
      a: 'We use Google Gemini AI for intelligent task prioritization, automated sprint planning, workload analysis, and predictive deadline forecasting. AI suggestions are contextual and learn from your team\'s patterns.',
      tag: 'Gemini AI'
    },
    {
      q: 'Is there a free tier available?',
      a: 'Yes. Our Starter plan is free forever for teams up to 10 members with 5 projects and 5GB storage. Upgrade anytime to unlock unlimited projects, advanced analytics, and priority support.',
      tag: 'Pricing'
    },
    {
      q: 'How does real-time collaboration work?',
      a: 'TaskFlow uses Socket.io for bi-directional real-time communication. All board changes, task updates, comments, and notifications are pushed instantly to all connected team members.',
      tag: 'Real-time'
    },
  ];

  // Icon renderer
  const renderIcon = useCallback((type) => {
    const icons = {
      users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
      chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
      kanban: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
      ai: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
      realtime: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    };
    return icons[type] || null;
  }, []);

  return (
    <div className="lp-page">

      {/* ═══════════ NAVIGATION ═══════════ */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <Link 
            to={user ? "/dashboard" : "/"} 
            className="lp-nav-logo"
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <div className="lp-nav-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span className="lp-nav-logo-text">TaskFlow</span>
          </Link>

          <ul className="lp-nav-links">
            <li><a href="#modules">Platform</a></li>
            <li><a href="#security">Security</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>

          <div className="lp-nav-cta">
            <Link to="/login" className="lp-btn lp-btn-ghost">Log in</Link>
            <Link to="/register" className="lp-btn lp-btn-primary">Book Demo</Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="lp-hero">
        <div className="lp-hero-grid-bg" />
        <div className="lp-hero-grid-fade" />

        {/* ═══ Animated Connector Lines ═══ */}
        <svg className="lp-hero-connectors" viewBox="0 0 1440 900" preserveAspectRatio="none">
          {/* Top-left card → center */}
          <path d="M 180 200 Q 400 180, 600 350" />
          <circle cx="180" cy="200" r="3" />
          {/* Top-right card → center */}
          <path d="M 1280 160 Q 1050 200, 840 350" />
          <circle cx="1280" cy="160" r="3" />
          {/* Left-mid card → center */}
          <path d="M 140 480 Q 350 420, 580 400" />
          <circle cx="140" cy="480" r="3" />
          {/* Right-mid card → center */}
          <path d="M 1320 440 Q 1100 400, 860 400" />
          <circle cx="1320" cy="440" r="3" />
          {/* Bottom-right card → center */}
          <path d="M 1200 620 Q 1000 550, 820 450" />
          <circle cx="1200" cy="620" r="3" />
        </svg>

        {/* ═══ Floating UI Cards ═══ */}
        <div className="lp-hero-floats">

          {/* Float 1: Sprint Backlog — top left */}
          <div className="lp-float-card lp-float-1">
            <div className="lp-float-header">
              <div className="lp-float-icon indigo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
              </div>
              <div>
                <div className="lp-float-title">Sprint Backlog</div>
                <div className="lp-float-subtitle">8 tasks remaining</div>
              </div>
            </div>
            <div className="lp-float-tasks">
              <div className="lp-float-task done">
                <span className="lp-float-task-check done">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                API integration
              </div>
              <div className="lp-float-task done">
                <span className="lp-float-task-check done">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                Auth middleware
              </div>
              <div className="lp-float-task">
                <span className="lp-float-task-check" />
                Dashboard charts
              </div>
            </div>
            <div className="lp-float-progress">
              <div className="lp-float-progress-bar" style={{ width: '65%' }} />
            </div>
          </div>

          {/* Float 2: Deployed Badge — top right */}
          <div className="lp-float-card lp-float-2">
            <div className="lp-float-header">
              <div className="lp-float-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div className="lp-float-title">Deployed to Production</div>
                <div className="lp-float-meta">
                  <span className="lp-float-badge success"><span className="badge-dot" /> v2.4.1 Live</span>
                </div>
              </div>
            </div>
          </div>

          {/* Float 3: Team Online — left mid */}
          <div className="lp-float-card lp-float-3">
            <div className="lp-float-title">Team Online</div>
            <div className="lp-float-avatars">
              <div className="lp-float-avatar" style={{ background: '#6366F1' }}>SC</div>
              <div className="lp-float-avatar" style={{ background: '#10B981' }}>AK</div>
              <div className="lp-float-avatar" style={{ background: '#F59E0B' }}>MR</div>
              <div className="lp-float-avatar" style={{ background: '#EF4444' }}>JL</div>
              <div className="lp-float-avatar" style={{ background: '#8B5CF6' }}>+5</div>
            </div>
            <div className="lp-float-subtitle" style={{ marginTop: 6 }}>8 members active</div>
          </div>

          {/* Float 4: AI Suggestion — right mid */}
          <div className="lp-float-card lp-float-4">
            <div className="lp-float-header">
              <div className="lp-float-icon rose">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <div className="lp-float-title">AI Suggestion</div>
                <div className="lp-float-subtitle">Reassign 3 tasks to balance load</div>
              </div>
            </div>
          </div>

          {/* Float 5: Approvals — bottom right */}
          <div className="lp-float-card lp-float-5">
            <div className="lp-float-header">
              <div className="lp-float-icon amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div>
                <div className="lp-float-title">2 Approvals Pending</div>
                <div className="lp-float-meta">
                  <span className="lp-float-badge warning"><span className="badge-dot" /> Review required</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="lp-container">
          <div className="lp-hero-content">
            <div className="lp-hero-badge">
              <span className="lp-pulse-dot" />
              Enterprise-Ready Platform
            </div>

            <h1>Project management<br /><span className="lp-gradient">built for scale</span></h1>

            <p className="lp-hero-subtitle">
              The enterprise workspace for modern engineering teams. Organize, prioritize, and ship with full visibility — from sprint planning to deployment.
            </p>

            <div className="lp-hero-buttons">
              <Link to="/register" className="lp-btn lp-btn-blue">
                Start Free Trial
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <button className="lp-btn lp-btn-outline">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
                Watch Demo
              </button>
            </div>
          </div>

          {/* ═══ Dashboard Preview ═══ */}
          <div className="lp-preview">
            <div className="lp-preview-shadow" />
            <div className="lp-browser">
              {/* Browser Bar */}
              <div className="lp-browser-bar">
                <div className="lp-browser-dots">
                  <div className="lp-browser-dot red" />
                  <div className="lp-browser-dot yellow" />
                  <div className="lp-browser-dot green" />
                </div>
                <div className="lp-browser-url">taskflow.app/dashboard</div>
              </div>

              {/* Dashboard UI */}
              <div className="lp-dash">
                {/* Sidebar */}
                <div className="lp-dash-sidebar">
                  <div className="lp-dash-sidebar-title">Main Menu</div>
                  <div className="lp-dash-sidebar-item active">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    Dashboard
                  </div>
                  <div className="lp-dash-sidebar-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    Tasks
                  </div>
                  <div className="lp-dash-sidebar-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                    Kanban
                  </div>
                  <div className="lp-dash-sidebar-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Calendar
                  </div>
                  <div className="lp-dash-sidebar-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    Analytics
                  </div>
                  <div className="lp-dash-sidebar-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    Team
                  </div>
                </div>

                {/* Main Content */}
                <div className="lp-dash-main">
                  <div className="lp-dash-header">
                    <div className="lp-dash-header-left">
                      <h3>Project Overview</h3>
                      <p>Sprint 4 · 24 active tasks</p>
                    </div>
                    <div className="lp-status-badge online">
                      <span className="dot" />
                      All Systems Operational
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="lp-dash-stats">
                    <div className="lp-dash-stat">
                      <div className="lp-dash-stat-label">Active Users</div>
                      <div className="lp-dash-stat-value">1,247<span className="up">↑ 12%</span></div>
                    </div>
                    <div className="lp-dash-stat">
                      <div className="lp-dash-stat-label">API Requests</div>
                      <div className="lp-dash-stat-value">84.2K<span className="up">↑ 8%</span></div>
                    </div>
                    <div className="lp-dash-stat">
                      <div className="lp-dash-stat-label">Uptime</div>
                      <div className="lp-dash-stat-value">99.97%</div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="lp-dash-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>User</th>
                          <th>Status</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Deploy v2.4.1 to production</td>
                          <td>Sarah Chen</td>
                          <td><span className="lp-table-badge success">Success</span></td>
                          <td>2 min ago</td>
                        </tr>
                        <tr>
                          <td>Database migration #847</td>
                          <td>Alex Kumar</td>
                          <td><span className="lp-table-badge success">Success</span></td>
                          <td>14 min ago</td>
                        </tr>
                        <tr>
                          <td>API rate limit exceeded</td>
                          <td>System</td>
                          <td><span className="lp-table-badge warning">Warning</span></td>
                          <td>28 min ago</td>
                        </tr>
                        <tr>
                          <td>Auth token refresh failed</td>
                          <td>Mike Rivera</td>
                          <td><span className="lp-table-badge failed">Failed</span></td>
                          <td>45 min ago</td>
                        </tr>
                        <tr>
                          <td>SSL certificate renewed</td>
                          <td>DevOps Bot</td>
                          <td><span className="lp-table-badge success">Success</span></td>
                          <td>1 hr ago</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ MODULES / FEATURES ═══════════ */}
      <section className="lp-modules" id="modules" ref={revealModules}>
        <div className="lp-container lp-reveal visible">
          <div className="lp-section-header">
            <div className="lp-section-label">Core Platform</div>
            <h2 className="lp-section-title">Everything your team needs</h2>
            <p className="lp-section-desc">
              Six integrated modules designed for enterprise-scale project management, security, and real-time collaboration.
            </p>
          </div>

          <div className="lp-modules-grid">
            {modules.map((mod, idx) => (
              <div key={idx} className="lp-module-card">
                <div className={`lp-module-icon ${mod.color}`}>
                  {renderIcon(mod.icon)}
                </div>
                <h3>{mod.title}</h3>
                <p>{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ KPI STATS ═══════════ */}
      <section className="lp-stats" ref={revealStats}>
        {/* Decorative concentric circles */}
        <svg className="lp-stats-circles" width="800" height="800" viewBox="0 0 800 800">
          <circle cx="400" cy="400" r="100" />
          <circle cx="400" cy="400" r="200" />
          <circle cx="400" cy="400" r="300" />
          <circle cx="400" cy="400" r="400" />
        </svg>

        <div className="lp-container">
          <div className="lp-stats-grid">
            <div ref={kpi1Ref}>
              <div className="lp-kpi-value">{kpi1Val.toLocaleString()}</div>
              <div className="lp-kpi-label">Active Users</div>
            </div>
            <div ref={kpi2Ref}>
              <div className="lp-kpi-value">{kpi2Val}%</div>
              <div className="lp-kpi-label">Uptime SLA</div>
            </div>
            <div ref={kpi3Ref}>
              <div className="lp-kpi-value">{(kpi3Val / 1000000).toFixed(1)}M+</div>
              <div className="lp-kpi-label">Tasks Completed</div>
            </div>
            <div ref={kpi4Ref}>
              <div className="lp-kpi-value">{kpi4Val}</div>
              <div className="lp-kpi-label">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SECURITY ═══════════ */}
      <section className="lp-security" id="security" ref={revealSecurity}>
        <div className="lp-container lp-reveal visible">
          <div className="lp-section-header">
            <div className="lp-section-label">Enterprise Security</div>
            <h2 className="lp-section-title">Built for compliance</h2>
            <p className="lp-section-desc">
              Industry-leading security infrastructure with continuous monitoring and automated compliance enforcement.
            </p>
          </div>

          <div className="lp-security-grid">
            {/* Left: Certifications */}
            <div>
              <ul className="lp-check-list">
                {[
                  'SOC 2 Type II Certified',
                  'GDPR Compliant',
                  'HIPAA Ready',
                  'ISO 27001 Certified',
                  '256-bit AES Encryption',
                  '99.99% Uptime SLA',
                ].map((item, i) => (
                  <li key={i}>
                    <span className="lp-check-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Policy Toggles */}
            <div style={{ position: 'relative' }}>
              <div className="lp-policy-card">
                <h4>Security Policies</h4>
                {[
                  { label: 'Multi-Factor Authentication', desc: 'Require MFA for all users', on: true },
                  { label: 'IP Whitelisting', desc: 'Restrict access by IP range', on: true },
                  { label: 'Key Rotation', desc: 'Auto-rotate API keys every 90 days', on: true },
                  { label: 'Session Timeout', desc: 'Auto-logout after 30 min inactivity', on: false },
                ].map((policy, i) => (
                  <div key={i} className="lp-policy-item">
                    <div>
                      <div className="lp-policy-item-label">{policy.label}</div>
                      <div className="lp-policy-item-desc">{policy.desc}</div>
                    </div>
                    <div className={`lp-toggle ${policy.on ? 'on' : ''}`} />
                  </div>
                ))}
              </div>

              {/* Threat Blocked floating card */}
              <div className="lp-threat-card">
                <div className="threat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <div style={{ marginBottom: 2 }}>Threat Blocked</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>Brute-force attempt from 192.168.1.x</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="lp-faq" id="faq" ref={revealFaq}>
        <div className="lp-container lp-reveal visible">
          <div className="lp-faq-wrapper">
            
            {/* Left Side: Header & Phone Submission Form */}
            <div className="lp-faq-info-panel">
              <div className="lp-faq-info-top">
                <div className="lp-faq-badge-capsule">FAQ</div>
                <h2 className="lp-faq-title-main">Frequently Asked Questions</h2>
                <p className="lp-faq-desc-main">
                  Have questions about TaskFlow? Find quick answers here about data security, integration capabilities, Gemini AI features, pricing tiers, and real-time collaboration. Can't find what you need? Text our support team directly.
                </p>
              </div>

              <div className="lp-faq-info-bottom">
                <form onSubmit={handleFaqSubmit} className="lp-faq-phone-form">
                  <div className="lp-faq-phone-input-group">
                    <div className="lp-faq-flag-selector">
                      <svg width="18" height="12" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="lp-faq-flag">
                        <rect width="20" height="15" rx="2" fill="#0A0A0C" />
                        <circle cx="10" cy="7.5" r="6.5" fill="#3B82F6" opacity="0.8" />
                        <path d="M10 2a8 8 0 0 0-8 8h16a8 8 0 0 0-8-8z" fill="#FFFFFF" opacity="0.3" />
                        <path d="M10 0v15M0 7.5h20" stroke="#FFFFFF" strokeWidth="1.5" />
                      </svg>
                      <svg width="8" height="5" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lp-faq-flag-arrow">
                        <polyline points="1 1 5 5 9 1" />
                      </svg>
                    </div>
                    <div className="lp-faq-phone-divider" />
                    <input
                      type="tel"
                      value={faqPhone}
                      onChange={(e) => setFaqPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="lp-faq-phone-field"
                      required
                    />
                    <div className="lp-faq-info-icon" title="We will reply directly to your phone number within 24 hours">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                  </div>
                  <button type="submit" className="lp-btn lp-btn-blue lp-faq-phone-submit">Submit</button>
                </form>
                <div className="lp-faq-phone-caption">We reply within 24 hours.</div>
              </div>
            </div>

            {/* Right Side: Accordion list */}
            <div className="lp-faq-accordion">
              {faqs.map((faq, i) => (
                <div key={i} className={`lp-faq-item-new ${openFaq === i ? 'open' : ''}`}>
                  <button className="lp-faq-question-new" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <div className="lp-faq-q-left">
                      <div className="lp-faq-q-circle">?</div>
                      <span className="lp-faq-q-text-new">{faq.q}</span>
                      {faq.tag && <span className="lp-faq-tag-badge">{faq.tag}</span>}
                    </div>
                    <span className="lp-faq-toggle-arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>
                  <div className="lp-faq-answer-new">
                    <div className="lp-faq-answer-inner-new">
                      <p>{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

          <p className="lp-faq-help-footer">
            Still have questions? <a href="#contact">Get in touch with our team</a>
          </p>
        </div>
      </section>

      {/* ═══════════ CONTACT ═══════════ */}
      <section id="contact" className="lp-contact" ref={revealContact}>
        <div className="lp-container lp-reveal visible">
          <div className="lp-contact-wrapper">
            
            {/* Left Side: Contact Information & Headers */}
            <div className="lp-contact-info-panel">
              <div className="lp-section-header lp-contact-header">
                <div className="lp-section-label">Contact</div>
                <h2 className="lp-section-title">Get in touch</h2>
                <p className="lp-section-desc">
                  Have a question or need a demo? Our team is ready to help you optimize your workflow.
                </p>
              </div>

              <div className="lp-contact-info-cards">
                <div className="lp-contact-info-card">
                  <div className="lp-contact-info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="lp-contact-info-text">
                    <div className="lp-contact-info-label">Phone number</div>
                    <div className="lp-contact-info-value">+1 (232) 343-4455</div>
                  </div>
                </div>

                <div className="lp-contact-info-card">
                  <div className="lp-contact-info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div className="lp-contact-info-text">
                    <div className="lp-contact-info-label">Email</div>
                    <div className="lp-contact-info-value lp-contact-info-email">sample@info.com</div>
                  </div>
                </div>
              </div>

              <div className="lp-contact-location">
                <div className="lp-contact-location-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <span className="lp-contact-location-text">Broadway Str 72, New York, NY 10010</span>
              </div>
            </div>

            {/* Right Side: Modern Glassmorphic Form Card */}
            <div className="lp-contact-form-card">
              <form onSubmit={handleSubmit} className="lp-contact-form">
                <div className="lp-contact-row">
                  <div className="lp-contact-field">
                    <label>Name</label>
                    <input
                      type="text" name="name" value={formData.name} onChange={handleInputChange}
                      placeholder="Your name" required
                    />
                  </div>
                  <div className="lp-contact-field">
                    <label>Email</label>
                    <input
                      type="email" name="email" value={formData.email} onChange={handleInputChange}
                      placeholder="you@company.com" required
                    />
                  </div>
                </div>
                <div className="lp-contact-field">
                  <label>Subject</label>
                  <select
                    name="subject" value={formData.subject} onChange={handleInputChange} required
                  >
                    <option value="">Select a topic</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Sales &amp; Pricing">Sales &amp; Pricing</option>
                    <option value="Enterprise Plan">Enterprise Plan</option>
                  </select>
                </div>
                <div className="lp-contact-field">
                  <label>Message</label>
                  <textarea
                    name="message" value={formData.message} onChange={handleInputChange}
                    placeholder="Tell us how we can help..." rows={4} required
                  />
                </div>
                <div className="lp-contact-submit">
                  <button type="submit" disabled={isSubmitting} className="lp-btn lp-btn-blue">
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section className="lp-pricing" id="pricing" ref={revealCta}>
        <div className="lp-container lp-reveal visible">
          <div className="lp-section-header">
            <div className="lp-section-label">Pricing</div>
            <h2 className="lp-section-title">Simple and transparent pricing</h2>
            <p className="lp-section-desc">
              Start free, upgrade when you're ready. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="lp-pricing-grid">

            {/* ── Free Plan ── */}
            <div className="lp-pricing-card">
              <div className="lp-pricing-header">
                <div className="lp-pricing-header-top">
                  <span className="lp-pricing-plan">Free</span>
                </div>
                <div className="lp-pricing-price">
                  <span className="lp-pricing-amount">$0</span>
                  <span className="lp-pricing-period">/month</span>
                </div>
                <p className="lp-pricing-desc">Perfect for individuals and small teams getting started with project management.</p>
              </div>
              <Link to="/register" className="lp-pricing-cta lp-pricing-cta-outline">Start for Free</Link>
              <div className="lp-pricing-divider"><span>Features</span></div>
              <ul className="lp-pricing-features">
                {['Up to 10 team members', 'Up to 5 projects', 'Kanban & list views', 'Basic analytics', '5 GB storage'].map((f, i) => (
                  <li key={i}>
                    <span className="lp-pricing-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Persuasion Card (Middle) ── */}
            <div className="lp-pricing-card featured">
              <div className="lp-pricing-header">
                <div className="lp-pricing-header-top">
                  <span className="lp-pricing-plan">Why upgrade?</span>
                  <span className="lp-pricing-badge">Recommended</span>
                </div>
              </div>

              <div className="lp-pricing-highlight" style={{ marginBottom: 16 }}>
                <p>⚡ Teams that upgrade see a <strong>40% increase</strong> in shipping velocity within the first month.</p>
              </div>

              <div className="lp-pricing-divider"><span>What you're missing</span></div>

              <ul className="lp-pricing-features" style={{ marginBottom: 24 }}>
                {[
                  'Unlimited projects & team members',
                  'AI-powered smart prioritization',
                  'Advanced analytics & custom reports',
                  'Real-time collaboration & live sync',
                  'Priority support & SLA guarantee',
                ].map((f, i) => (
                  <li key={i}>
                    <span className="lp-pricing-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="lp-pricing-highlight">
                <p>🏆 Trusted by 12,000+ teams worldwide. Rated 4.9/5 by engineering leaders.</p>
              </div>

              <div style={{ marginTop: 24 }}>
                <Link to="/register" className="lp-pricing-cta lp-pricing-cta-primary">Unlock Professional →</Link>
              </div>
            </div>

            {/* ── Professional Plan ── */}
            <div className="lp-pricing-card">
              <div className="lp-pricing-header">
                <div className="lp-pricing-header-top">
                  <span className="lp-pricing-plan">Professional</span>
                </div>
                <div className="lp-pricing-price">
                  <span className="lp-pricing-amount">$19</span>
                  <span className="lp-pricing-period">/month per user</span>
                </div>
                <p className="lp-pricing-desc">Everything your team needs to manage projects at scale and ship faster.</p>
              </div>
              <Link to="/register" className="lp-pricing-cta lp-pricing-cta-outline">Upgrade to Professional</Link>
              <div className="lp-pricing-divider"><span>Everything in Free, plus</span></div>
              <ul className="lp-pricing-features">
                {['Unlimited projects & members', 'AI task prioritization & suggestions', 'Advanced analytics & reports', 'Real-time collaboration & chat', 'Priority email & chat support', 'SSO & advanced security', 'Custom integrations & API access', '99.99% uptime SLA'].map((f, i) => (
                  <li key={i}>
                    <span className="lp-pricing-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="lp-footer">
        <div className="lp-container-wide">
          <div className="lp-footer-grid">
            
            {/* Brand/Logo Column */}
            <div className="lp-footer-brand">
              <Link 
                to={user ? "/dashboard" : "/"} 
                className="lp-footer-brand-header"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                style={{ textDecoration: 'none' }}
              >
                <div className="lp-footer-brand-logo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-footer-brand-icon">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <span className="lp-footer-brand-name">TaskFlow</span>
              </Link>
              <p className="lp-footer-brand-desc">
                Next-generation collaborative workspace powered by real-time intelligence. Streamline your project engineering, tracking, and automation.
              </p>
              <div className="lp-footer-brand-badges">
                <span className="lp-footer-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                    <line x1="6" y1="6" x2="6.01" y2="6"/>
                    <line x1="6" y1="18" x2="6.01" y2="18"/>
                  </svg>
                  MERN Stack
                </span>
                <span className="lp-footer-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Gemini AI
                </span>
              </div>
            </div>

            {/* Product */}
            <div className="lp-footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#modules">Features</a></li>
                <li><Link to="/register">Pricing</Link></li>
                <li><a href="#security">Security</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="lp-footer-col">
              <h4>Resources</h4>
              <ul>
                <li><button className="hover:text-indigo-400">Documentation</button></li>
                <li><button className="hover:text-indigo-400">API Reference</button></li>
                <li><button className="hover:text-indigo-400">Changelog</button></li>
                <li><button className="hover:text-indigo-400">Blog</button></li>
              </ul>
            </div>

            {/* Company */}
            <div className="lp-footer-col">
              <h4>Company</h4>
              <ul>
                <li><button className="hover:text-indigo-400" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit'}}>About</button></li>
                <li><button className="hover:text-indigo-400" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit'}}>Careers</button></li>
                <li><button className="hover:text-indigo-400" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit'}}>Contact</button></li>
                <li><button className="hover:text-indigo-400" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit'}}>Partners</button></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="lp-footer-col">
              <h4>Legal</h4>
              <ul>
                <li><button className="hover:text-indigo-400" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit'}}>Privacy Policy</button></li>
                <li><button className="hover:text-indigo-400" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit'}}>Terms of Service</button></li>
                <li><button className="hover:text-indigo-400" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit'}}>Cookie Policy</button></li>
                <li><button className="hover:text-indigo-400" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit'}}>GDPR</button></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom Bar */}
          <div className="lp-footer-bottom">
            <div className="lp-footer-bottom-left">
              <span>© {new Date().getFullYear()} TaskFlow, Inc.</span>
              <div className="lp-footer-lang">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>English</span>
              </div>
            </div>

            <div className="lp-footer-social-bar">
              <a href="https://github.com" target="_blank" rel="noreferrer" title="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" title="Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" title="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.23 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.43c-1.14 0-2.06-.92-2.06-2.06 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.06-2.06 2.06zm15.11 13.02h-3.56v-5.6c0-1.34-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.7H9.33V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              </a>
              <a href="mailto:support@taskflow.app" title="Email">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </a>
            </div>

            <div className="lp-footer-bottom-right">
              <button className="lp-footer-privacy-link" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit'}}>Terms &amp; Privacy</button>
              <div className="lp-footer-divider-dot" />
              <div className="lp-footer-status">
                <span className="pulse" />
                All Systems Operational
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══ Auth Modals removed — login/register are now standalone pages ═══ */}
    </div>
  );
};

export default LandingPage;