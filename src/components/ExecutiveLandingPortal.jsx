/**
 * THE i-CAPITAL AFRICA GROUP — COMMERCIAL GOVERNANCE & REVOPS PLATFORM
 * Split-Screen Institutional Landing Portal, 2-Hour Security Gate & Welcome Hub
 * (100% Self-Contained Embedded CSS — Zero External Framework Dependencies)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  supabaseAuthClient,
  SESSION_TIMEOUT_MS,
  WARNING_THRESHOLD_MS,
  STORAGE_KEYS,
  recordUserActivity,
  initializeFreshLoginSession,
  recordPlatformClosed,
  evaluateSessionStatus,
  lockAndSignOutSession,
  formatRemainingTime,
} from '../utils/sessionSecurity';

const PORTAL_STYLES = `
  .icap-portal-root {
    min-height: 100vh;
    width: 100%;
    background-color: #070b14;
    color: #f8fafc;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  .icap-portal-root *, .icap-portal-root *::before, .icap-portal-root *::after {
    box-sizing: border-box;
  }
  .icap-split-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    width: 100%;
  }
  @media (min-width: 1024px) {
    .icap-split-container {
      flex-direction: row;
    }
  }
  .icap-left-showcase {
    flex: 1.35;
    padding: 40px 48px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-bottom: 1px solid #1e293b;
    background:
      radial-gradient(circle at 12% 18%, rgba(16, 185, 129, 0.16), transparent 45%),
      radial-gradient(circle at 85% 82%, rgba(59, 130, 246, 0.14), transparent 50%),
      #090d16;
  }
  @media (min-width: 1024px) {
    .icap-left-showcase {
      border-bottom: none;
      border-right: 1px solid #1e293b;
      padding: 48px 56px;
    }
  }
  .icap-right-auth {
    flex: 1;
    padding: 40px 28px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: #050811;
  }
  .icap-badge-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 28px;
  }
  .icap-brand-pill {
    background-color: #ffffff;
    color: #090d16;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 0.04em;
    padding: 6px 14px;
    border-radius: 8px;
    box-shadow: 0 4px 14px rgba(255, 255, 255, 0.12);
  }
  .icap-gov-pill {
    background-color: rgba(16, 185, 129, 0.14);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.35);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 5px 12px;
    border-radius: 999px;
  }
  .icap-lock-pill {
    background-color: #1e293b;
    color: #cbd5e1;
    border: 1px solid #334155;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 11px;
    border-radius: 999px;
  }
  .icap-hero-title {
    font-size: 32px;
    line-height: 1.2;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 14px 0;
    letter-spacing: -0.02em;
  }
  .icap-hero-highlight {
    display: block;
    color: #34d399;
    margin-top: 4px;
  }
  .icap-hero-sub {
    font-size: 14.5px;
    line-height: 1.65;
    color: #cbd5e1;
    max-width: 640px;
    margin: 0 0 28px 0;
  }
  .icap-section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: #94a3b8;
    margin-bottom: 12px;
  }
  .icap-sbu-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 26px;
  }
  @media (min-width: 640px) {
    .icap-sbu-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .icap-sbu-card {
    background-color: rgba(15, 23, 42, 0.85);
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 15px 16px;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }
  .icap-sbu-card:hover {
    border-color: rgba(52, 211, 153, 0.45);
    transform: translateY(-1px);
  }
  .icap-sbu-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .icap-sbu-tag {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 5px;
  }
  .icap-sbu-meta {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 500;
  }
  .icap-sbu-name {
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 4px;
  }
  .icap-sbu-desc {
    font-size: 12px;
    line-height: 1.45;
    color: #94a3b8;
    margin: 0;
  }
  .icap-metrics-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    background-color: rgba(15, 23, 42, 0.7);
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 14px 18px;
  }
  .icap-metric-item {
    border-left: 1px solid #1e293b;
    padding-left: 14px;
  }
  .icap-metric-item:first-child {
    border-left: none;
    padding-left: 0;
  }
  .icap-metric-label {
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 2px;
  }
  .icap-metric-val {
    font-size: 15px;
    font-weight: 800;
    color: #ffffff;
  }
  .icap-metric-sub {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
  .icap-left-footer {
    margin-top: 28px;
    padding-top: 16px;
    border-top: 1px solid #1e293b;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: #94a3b8;
  }
  .icap-auth-box {
    width: 100%;
    max-width: 430px;
  }
  .icap-alert-amber {
    margin-bottom: 18px;
    padding: 14px 16px;
    border-radius: 12px;
    background-color: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.45);
    color: #fde68a;
    font-size: 12.5px;
    line-height: 1.5;
  }
  .icap-alert-error {
    margin-bottom: 16px;
    padding: 12px 14px;
    border-radius: 10px;
    background-color: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.45);
    color: #fecaca;
    font-size: 12.5px;
    font-weight: 500;
  }
  .icap-auth-card {
    background-color: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 18px;
    padding: 32px 28px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75);
  }
  .icap-input-group {
    margin-bottom: 18px;
  }
  .icap-input-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #cbd5e1;
    margin-bottom: 7px;
  }
  .icap-input-field {
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    background-color: #020617;
    border: 1px solid #334155;
    color: #ffffff;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .icap-input-field:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
  }
  .icap-btn-primary {
    width: 100%;
    padding: 13px 18px;
    border-radius: 10px;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: #ffffff;
    font-weight: 700;
    font-size: 14px;
    border: none;
    cursor: pointer;
    box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
    transition: opacity 0.2s ease, transform 0.15s ease;
  }
  .icap-btn-primary:hover {
    opacity: 0.95;
    transform: translateY(-1px);
  }
  .icap-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .icap-security-strip {
    background-color: #090d16;
    color: #cbd5e1;
    border-bottom: 1px solid #1e293b;
    padding: 6px 18px;
    font-size: 11.5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .icap-strip-btn {
    background-color: #1e293b;
    color: #f8fafc;
    border: 1px solid #334155;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    margin-left: 8px;
  }
  .icap-strip-btn:hover {
    background-color: #7f1d1d;
    border-color: #ef4444;
  }
  .icap-hub-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin: 24px 0;
  }
  @media (min-width: 768px) {
    .icap-hub-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .icap-hub-card {
    background-color: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 14px;
    padding: 22px;
    cursor: pointer;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }
  .icap-hub-card:hover {
    border-color: #10b981;
    transform: translateY(-2px);
  }
`;

export default function ExecutiveLandingPortal({ children }) {
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Login Form States
  const [email, setEmail] = useState(
    () => localStorage.getItem(STORAGE_KEYS.LAST_EMAIL) || ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockReason, setLockReason] = useState(
    () => localStorage.getItem(STORAGE_KEYS.LOCK_REASON) || ''
  );

  // 2-Hour Watchdog & Welcome Hub States
  const [remainingMs, setRemainingMs] = useState(SESSION_TIMEOUT_MS);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [showWelcomeHub, setShowWelcomeHub] = useState(false);
  const [skipHubNextTime, setSkipHubNextTime] = useState(
    () => localStorage.getItem(STORAGE_KEYS.SKIP_WELCOME_HUB) === 'true'
  );

  // Verify 2-hour rule and sign out if expired
  const verifyTwoHourCompliance = useCallback(async (activeSession) => {
    if (!activeSession) return false;
    const status = evaluateSessionStatus();

    if (status.isExpired) {
      setLockReason(status.reason);
      setSession(null);
      await lockAndSignOutSession(status.reason);
      return false;
    }

    setRemainingMs(status.remainingMs);
    setShowExpiryWarning(status.remainingMs <= WARNING_THRESHOLD_MS);
    return true;
  }, []);

  // 1. Check Initial Session & Subscribe to Auth Changes
  useEffect(() => {
    let mounted = true;

    async function checkInitialAuth() {
      try {
        const {
          data: { session: currentSession },
        } = await supabaseAuthClient.auth.getSession();

        if (!mounted) return;

        if (currentSession) {
          const isValid = await verifyTwoHourCompliance(currentSession);
          if (isValid && mounted) {
            setSession(currentSession);
            if (currentSession.user?.email) {
              setEmail(currentSession.user.email);
              localStorage.setItem(
                STORAGE_KEYS.LAST_EMAIL,
                currentSession.user.email
              );
            }
          }
        }
      } catch (err) {
        console.error('Initial auth check error:', err);
      } finally {
        if (mounted) setAuthChecking(false);
      }
    }

    checkInitialAuth();

    const {
      data: { subscription },
    } = supabaseAuthClient.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !newSession) {
        setSession(null);
        setPassword('');
        setShowWelcomeHub(false);
        const storedReason = localStorage.getItem(STORAGE_KEYS.LOCK_REASON);
        if (storedReason) setLockReason(storedReason);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const status = evaluateSessionStatus();
        if (!status.isExpired) {
          setSession(newSession);
          if (newSession.user?.email) {
            setEmail(newSession.user.email);
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [verifyTwoHourCompliance]);

  // 2. Attach Activity Listeners & 10-Second Watchdog Timer while Logged In
  useEffect(() => {
    if (!session) return;

    const handleUserInteraction = () => {
      recordUserActivity(false);
      if (showExpiryWarning) {
        setShowExpiryWarning(false);
        setRemainingMs(SESSION_TIMEOUT_MS);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordPlatformClosed();
      } else if (document.visibilityState === 'visible') {
        verifyTwoHourCompliance(session);
      }
    };

    const handleBeforeUnload = () => {
      recordPlatformClosed();
    };

    const events = ['mousedown', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) =>
      window.addEventListener(evt, handleUserInteraction, { passive: true })
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    const intervalId = setInterval(() => {
      verifyTwoHourCompliance(session);
    }, 10000);

    return () => {
      events.forEach((evt) =>
        window.removeEventListener(evt, handleUserInteraction)
      );
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(intervalId);
    };
  }, [session, showExpiryWarning, verifyTwoHourCompliance]);

  // Handle Password Sign-In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your institutional email and password.');
      return;
    }

    setLoginLoading(true);
    try {
      const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(
          error.message === 'Invalid login credentials'
            ? 'Invalid email or password. Please verify your credentials and try again.'
            : error.message
        );
        setLoginLoading(false);
        return;
      }

      if (data?.session) {
        initializeFreshLoginSession(email.trim());
        setLockReason('');
        setPassword('');
        setRemainingMs(SESSION_TIMEOUT_MS);
        setSession(data.session);

        const shouldSkip =
          localStorage.getItem(STORAGE_KEYS.SKIP_WELCOME_HUB) === 'true';
        setShowWelcomeHub(!shouldSkip);
      }
    } catch (err) {
      setErrorMessage('Network error while connecting to authentication server.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Manual Lock Platform Action
  const handleManualLock = async () => {
    const reason =
      'Platform manually locked by user. Please re-enter your password to resume.';
    setLockReason(reason);
    setSession(null);
    await lockAndSignOutSession(reason);
  };

  // Toggle "Skip Welcome Hub next time"
  const handleToggleSkipHub = (checked) => {
    setSkipHubNextTime(checked);
    localStorage.setItem(STORAGE_KEYS.SKIP_WELCOME_HUB, String(checked));
  };

  if (authChecking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#070b14',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#34d399',
            textTransform: 'uppercase',
          }}
        >
          🔒 Verifying i-Capital Security Session...
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: SPLIT-SCREEN INSTITUTIONAL LANDING & PASSWORD LOGIN PORTAL
  // ============================================================================
  if (!session) {
    return (
      <div className="icap-portal-root">
        <style>{PORTAL_STYLES}</style>
        <div className="icap-split-container">
          {/* LEFT PANEL: INSTITUTIONAL GOVERNANCE & SBU SHOWCASE */}
          <div className="icap-left-showcase">
            <div>
              <div className="icap-badge-row">
                <span className="icap-brand-pill">i-CAPITAL AFRICA</span>
                <span className="icap-gov-pill">
                  Commercial Governance &amp; RevOps Gateway
                </span>
                <span className="icap-lock-pill">🔒 2-Hour Auto-Lock Active</span>
              </div>

              <h1 className="icap-hero-title">
                The i-Capital Africa Group
                <span className="icap-hero-highlight">
                  Executive Pipeline &amp; Proposal Intelligence
                </span>
              </h1>

              <p className="icap-hero-sub">
                Centralized institutional CRM governing pre-tender lead intake,
                4-point Go/No-Go qualification scorecards, stage-gated proposal
                defense, and contracted revenue realization across all four
                Strategic Business Units.
              </p>

              <div className="icap-section-label">
                Integrated Strategic Business Units (SBUs)
              </div>

              <div className="icap-sbu-grid">
                <div className="icap-sbu-card">
                  <div className="icap-sbu-top">
                    <span
                      className="icap-sbu-tag"
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: '#6ee7b7',
                      }}
                    >
                      INST
                    </span>
                    <span className="icap-sbu-meta">
                      Executive Education &amp; Training
                    </span>
                  </div>
                  <div className="icap-sbu-name">The i-Capital Institute</div>
                  <p className="icap-sbu-desc">
                    Master Builder Leadership (MBLDP), S-OJT, Change Management
                    &amp; Institutional Capacity Building.
                  </p>
                </div>

                <div className="icap-sbu-card">
                  <div className="icap-sbu-top">
                    <span
                      className="icap-sbu-tag"
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: '#93c5fd',
                      }}
                    >
                      CBS
                    </span>
                    <span className="icap-sbu-meta">
                      Advisory &amp; Restructuring
                    </span>
                  </div>
                  <div className="icap-sbu-name">Cross Border Solutions</div>
                  <p className="icap-sbu-desc">
                    Corporate Strategy, Organizational Design, Competency
                    Frameworks &amp; IFRS Technical Implementation.
                  </p>
                </div>

                <div className="icap-sbu-card">
                  <div className="icap-sbu-top">
                    <span
                      className="icap-sbu-tag"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        color: '#fcd34d',
                      }}
                    >
                      IIP
                    </span>
                    <span className="icap-sbu-meta">
                      Transaction &amp; Capital Markets
                    </span>
                  </div>
                  <div className="icap-sbu-name">
                    i-Capital Investment Partners
                  </div>
                  <p className="icap-sbu-desc">
                    Thematic Bond Advisory, Sharia-Compliant Finance, Deal
                    Structuring &amp; Investment Readiness.
                  </p>
                </div>

                <div className="icap-sbu-card">
                  <div className="icap-sbu-top">
                    <span
                      className="icap-sbu-tag"
                      style={{
                        backgroundColor: 'rgba(168, 85, 247, 0.2)',
                        color: '#d8b4fe',
                      }}
                    >
                      DAS
                    </span>
                    <span className="icap-sbu-meta">
                      AI &amp; Enterprise Systems
                    </span>
                  </div>
                  <div className="icap-sbu-name">Digital &amp; AI Solutions</div>
                  <p className="icap-sbu-desc">
                    Digital Transformation Roadmaps, AI Tender Parsing, Data
                    Analytics &amp; Knowledge Platforms.
                  </p>
                </div>
              </div>

              <div className="icap-metrics-strip">
                <div className="icap-metric-item">
                  <div className="icap-metric-label">Pipeline Standard</div>
                  <div
                    className="icap-metric-val"
                    style={{ color: '#34d399' }}
                  >
                    3.0× Coverage Rule
                  </div>
                  <div className="icap-metric-sub">
                    ETB 769.78M Group Benchmark
                  </div>
                </div>

                <div className="icap-metric-item">
                  <div className="icap-metric-label">Stage Probabilities</div>
                  <div className="icap-metric-val">30% • 70% • 100%</div>
                  <div className="icap-metric-sub">
                    TOR → Defense → Signed Won
                  </div>
                </div>

                <div className="icap-metric-item">
                  <div className="icap-metric-label">Inbound Automation</div>
                  <div
                    className="icap-metric-val"
                    style={{ color: '#60a5fa' }}
                  >
                    Live Webhooks
                  </div>
                  <div className="icap-metric-sub">
                    Google Forms → CRM Register
                  </div>
                </div>
              </div>
            </div>

            <div className="icap-left-footer">
              <span>
                © {new Date().getFullYear()} The i-Capital Africa Institute •
                Addis Ababa, Ethiopia
              </span>
              <span>
                Developed by{' '}
                <strong style={{ color: '#34d399' }}>Ybeltal Semagn</strong>
              </span>
            </div>
          </div>

          {/* RIGHT PANEL: HIGH-TRUST PASSWORD AUTHENTICATION PORTAL */}
          <div className="icap-right-auth">
            <div className="icap-auth-box">
              {lockReason && (
                <div className="icap-alert-amber">
                  <div
                    style={{
                      fontWeight: 800,
                      color: '#fbbf24',
                      marginBottom: '4px',
                      fontSize: '13px',
                    }}
                  >
                    🔒 Session Locked (2-Hour Security Policy)
                  </div>
                  <div>{lockReason}</div>
                </div>
              )}

              <div className="icap-auth-card">
                <div style={{ marginBottom: '22px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#34d399',
                      marginBottom: '6px',
                    }}
                  >
                    ● Authorized Personnel Sign-In
                  </div>
                  <h2
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#ffffff',
                      margin: '0 0 6px 0',
                    }}
                  >
                    Sign in to i-Capital CRM
                  </h2>
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: '#94a3b8',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    Enter your institutional credentials to unlock the
                    commercial workspace. Sessions auto-lock after 2 hours away.
                  </p>
                </div>

                {errorMessage && (
                  <div className="icap-alert-error">⚠️ {errorMessage}</div>
                )}

                <form onSubmit={handleSignIn}>
                  <div className="icap-input-group">
                    <div className="icap-input-label">
                      <span>Work Email Address</span>
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@icapitalafrica.org"
                      className="icap-input-field"
                    />
                  </div>

                  <div className="icap-input-group">
                    <div className="icap-input-label">
                      <span>Password</span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#34d399',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {showPassword ? 'Hide Password' : 'Show Password'}
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus={Boolean(email)}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="icap-input-field"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="icap-btn-primary"
                  >
                    {loginLoading
                      ? 'Authenticating Credentials...'
                      : '🔓 Unlock & Enter CRM Workspace →'}
                  </button>
                </form>

                <div
                  style={{
                    marginTop: '22px',
                    paddingTop: '16px',
                    borderTop: '1px solid #1e293b',
                    fontSize: '11.5px',
                    color: '#94a3b8',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span>🛡️ Session Policy:</span>
                    <strong style={{ color: '#e2e8f0' }}>
                      Password Required After 2 Hours
                    </strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>🔑 Access Control:</span>
                    <strong style={{ color: '#e2e8f0' }}>
                      Executive Admin • SBU • BD
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: POST-LOGIN EXECUTIVE WELCOME & QUICK-LAUNCH HUB
  // ============================================================================
  if (showWelcomeHub) {
    const userEmail = session?.user?.email || 'Executive User';
    return (
      <div className="icap-portal-root" style={{ padding: '36px 24px' }}>
        <style>{PORTAL_STYLES}</style>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingBottom: '20px',
              borderBottom: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="icap-brand-pill">THE I-CAPITAL CRM</span>
              <span className="icap-gov-pill">
                🛡️ Session Active ({formatRemainingTime(remainingMs)} remaining)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                Signed in as <strong style={{ color: '#fff' }}>{userEmail}</strong>
              </span>
              <button onClick={handleManualLock} className="icap-strip-btn">
                🔒 Lock Platform
              </button>
            </div>
          </div>

          <div
            style={{
              margin: '28px 0',
              padding: '32px',
              borderRadius: '18px',
              background:
                'linear-gradient(135deg, #0f172a 0%, #064e3b 100%)',
              border: '1px solid #1e293b',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
            }}
          >
            <div style={{ maxWidth: '640px' }}>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#34d399',
                  marginBottom: '8px',
                }}
              >
                Welcome to The i-Capital Commercial Governance Hub
              </div>
              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: '0 0 8px 0',
                }}
              >
                Ready for Commercial Execution
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: '#cbd5e1',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                All historical Master Tracker mandates, 4-SBU revenue targets,
                and live Google Form inbound leads are synchronized. Launch into
                your full CRM workspace below.
              </p>
            </div>

            <button
              onClick={() => setShowWelcomeHub(false)}
              className="icap-btn-primary"
              style={{ width: 'auto', padding: '14px 26px' }}
            >
              🚀 Enter Full CRM Workspace →
            </button>
          </div>

          <div className="icap-hub-grid">
            <div
              onClick={() => setShowWelcomeHub(false)}
              className="icap-hub-card"
            >
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '8px',
                }}
              >
                📊 Executive Dashboard &amp; 3× Gauge
              </div>
              <p
                style={{
                  fontSize: '12.5px',
                  color: '#94a3b8',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Monitor the ETB 769.78M 3× pipeline coverage benchmark, weighted
                tender valuations, and contracted won revenue across all 4 SBUs.
              </p>
            </div>

            <div
              onClick={() => setShowWelcomeHub(false)}
              className="icap-hub-card"
            >
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '8px',
                }}
              >
                🗂️ Deals &amp; Proposals Kanban
              </div>
              <p
                style={{
                  fontSize: '12.5px',
                  color: '#94a3b8',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Track active bids across Stage 1 (TOR Identified), Stage 2
                (Proposal In Defense), and Stage 3 (Contract Won / Signed).
              </p>
            </div>

            <div
              onClick={() => setShowWelcomeHub(false)}
              className="icap-hub-card"
            >
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '8px',
                }}
              >
                📣 Digital Marketing &amp; Lead Intake
              </div>
              <p
                style={{
                  fontSize: '12.5px',
                  color: '#94a3b8',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Review live inbound Google Form inquiries (&quot;Let&apos;s Work
                Together&quot;), qualify leads with the 4-point scorecard, and
                convert to deals.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid #1e293b',
              fontSize: '12.5px',
              color: '#94a3b8',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={skipHubNextTime}
                onChange={(e) => handleToggleSkipHub(e.target.checked)}
              />
              <span>
                Go straight to the main CRM Dashboard after password login next
                time
              </span>
            </label>
            <span>2-Hour Session Auto-Lock Enforced</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 3: FULL EXISTING CRM WORKSPACE + COMPACT 2-HOUR SECURITY BAR
  // ============================================================================
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{PORTAL_STYLES}</style>

      {showExpiryWarning && (
        <div
          style={{
            backgroundColor: '#f59e0b',
            color: '#090d16',
            padding: '8px 18px',
            fontSize: '12.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 9999,
          }}
        >
          <span>
            ⚠️ Security Notice: Your 2-hour CRM session will lock in{' '}
            {formatRemainingTime(remainingMs)} due to inactivity.
          </span>
          <button
            onClick={() => {
              recordUserActivity(true);
              setShowExpiryWarning(false);
              setRemainingMs(SESSION_TIMEOUT_MS);
            }}
            style={{
              backgroundColor: '#090d16',
              color: '#ffffff',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Stay Signed In (Reset 2h Timer)
          </button>
        </div>
      )}

      <div className="icap-security-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#34d399', fontWeight: 700 }}>
            ● 2-Hour Security Timer: {formatRemainingTime(remainingMs)}
          </span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#94a3b8' }}>
            Auto-locks requiring password after 2h away
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setShowWelcomeHub(true)}
            className="icap-strip-btn"
            style={{ backgroundColor: 'transparent' }}
          >
            🏛️ Landing Hub
          </button>
          <button onClick={handleManualLock} className="icap-strip-btn">
            🔒 Lock Now
          </button>
        </div>
      </div>

      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}