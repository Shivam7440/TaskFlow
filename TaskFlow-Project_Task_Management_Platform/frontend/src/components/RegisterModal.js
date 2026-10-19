import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return alert('Passwords do not match');
    }
    setLoading(true);
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  // Password strength calculator
  const getPasswordStrength = () => {
    const pwd = formData.password;
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (score === 2) return { level: 2, label: 'Fair', color: '#f59e0b' };
    if (score === 3) return { level: 3, label: 'Good', color: '#3b82f6' };
    return { level: 4, label: 'Strong', color: '#22c55e' };
  };

  const passwordStrength = getPasswordStrength();
  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  if (!isOpen) return null;

  // Shared input style
  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit',
    color: '#0f172a', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
  };

  const inputWithIconStyle = { ...inputStyle, paddingRight: 42 };

  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: 960,
          maxHeight: '94vh',
          borderRadius: 16,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 25px 60px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)',
          fontFamily: "'Satoshi', 'Plus Jakarta Sans', system-ui, sans-serif",
          animation: 'authModalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* ═══ Left Branding Panel ═══ */}
        <div
          className="hidden lg:flex"
          style={{
            width: '44%',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            position: 'relative',
            overflow: 'hidden',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '40px 36px',
          }}
        >
          {/* Grid pattern */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.06,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '32px 32px', pointerEvents: 'none',
          }} />

          {/* Glow orb */}
          <div style={{
            position: 'absolute', bottom: '-20%', left: '-30%', width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', position: 'relative', zIndex: 2 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>TaskFlow</span>
          </Link>

          {/* Center visual — Setup flow */}
          <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
            {/* Progress card */}
            <div style={{
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Workspace Setup</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '2px 10px', borderRadius: 100 }}>Step 1/3</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 100, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ width: '33%', height: '100%', background: 'linear-gradient(90deg, #2563eb, #60a5fa)', borderRadius: 100, transition: 'width 1s ease' }} />
              </div>
              {/* Steps */}
              {[
                { label: 'Create your account', done: false, active: true },
                { label: 'Set up workspace', done: false, active: false },
                { label: 'Invite your team', done: false, active: false },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: step.active ? '2px solid #2563eb' : '1.5px solid #334155',
                    background: step.done ? '#2563eb' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {step.active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: step.active ? '#e2e8f0' : '#475569' }}>{step.label}</span>
                </div>
              ))}
            </div>

            {/* Security badge */}
            <div style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: 'rgba(37,99,235,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Enterprise Security</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>SOC2, GDPR compliant · End-to-end encryption</div>
              </div>
            </div>
          </div>

          {/* Bottom text */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Start building<br />something great
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Join thousands of teams who trust TaskFlow to manage their sprints and deployments.
            </p>
          </div>
        </div>

        {/* ═══ Right Form Panel ═══ */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', background: '#fff',
          position: 'relative', overflowY: 'auto',
        }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', flexShrink: 0 }}>
            <button onClick={onClose} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#64748b', fontFamily: 'inherit',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to home
            </button>
            <Link to="/login" onClick={onClose} style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
              Sign in instead →
            </Link>
          </div>

          {/* Form */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px 32px' }}>
            <div style={{ width: '100%', maxWidth: 380 }}>
              {/* Mobile logo */}
              <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: 28 }}>
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>TaskFlow</span>
                </Link>
              </div>

              <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.02em' }}>Create your account</h2>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Start managing your projects in minutes</p>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/google`}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#334155', fontFamily: 'inherit',
                  transition: 'all 0.2s', marginBottom: 18,
                }}
                onMouseEnter={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; }}
                onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e2e8f0'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>or sign up with email</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Full Name</label>
                  <input name="name" type="text" required placeholder="John Doe" value={formData.name} onChange={handleChange} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                {/* Email */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Email address</label>
                  <input name="email" type="email" required placeholder="you@example.com" value={formData.email} onChange={handleChange} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input name="password" type={showPassword ? 'text' : 'password'} required placeholder="Create a strong password" value={formData.password} onChange={handleChange} style={inputWithIconStyle}
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0,
                    }}>
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {formData.password && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4].map((level) => (
                          <div key={level} style={{
                            height: 4, flex: 1, borderRadius: 100,
                            background: level <= passwordStrength.level ? passwordStrength.color : '#e2e8f0',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: passwordStrength.color }}>{passwordStrength.label}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: 4 }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required
                      placeholder="Confirm your password"
                      value={formData.confirmPassword} onChange={handleChange}
                      style={{
                        ...inputWithIconStyle,
                        borderColor: passwordsMismatch ? '#fca5a5' : passwordsMatch ? '#86efac' : '#e2e8f0',
                      }}
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = passwordsMismatch ? '#fca5a5' : passwordsMatch ? '#86efac' : '#e2e8f0'}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0,
                    }}>
                      {showConfirmPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  {passwordsMatch && (
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Passwords match
                    </p>
                  )}
                  {passwordsMismatch && (
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginTop: 4 }}>Passwords do not match</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || passwordsMismatch}
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 10, border: 'none',
                    background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: (loading || passwordsMismatch) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    opacity: (loading || passwordsMismatch) ? 0.6 : 1, transition: 'all 0.2s', marginTop: 18,
                    boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                  }}
                  onMouseEnter={e => { if (!loading && !passwordsMismatch) { e.target.style.background = '#1d4ed8'; e.target.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={e => { e.target.style.background = '#2563eb'; e.target.style.transform = 'translateY(0)'; }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      Creating account...
                    </span>
                  ) : 'Create account'}
                </button>

                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 14 }}>
                  By creating an account, you agree to our{' '}
                  <a href="#" style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>Terms</a> and{' '}
                  <a href="#" style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>Privacy Policy</a>
                </p>
              </form>

              {/* Footer */}
              <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 24 }}>
                Already have an account?{' '}
                <Link to="/login" onClick={onClose} style={{ fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes authModalIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RegisterModal;