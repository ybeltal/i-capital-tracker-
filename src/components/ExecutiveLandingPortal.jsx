/**
 * THE i-CAPITAL AFRICA INSTITUTE — COMMERCIAL CRM PORTAL
 * Clean Brand-Aligned Landing Page & 2-Hour Auto-Lock Gateway
 * Brand Palette: Deep Blue (#253E5E), Light Blue (#4A7DBC), Orange (#F78019)
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

const BRAND_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  .icap-root {
    min-height: 100vh;
    width: 100%;
    background: linear-gradient(135deg, #1d314a 0%, #253E5E 55%, #2f4f75 100%);
    color: #ffffff;
    font-family: 'Century Gothic', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  .icap-root *, .icap-root *::before, .icap-root *::after {
    box-sizing: border-box;
  }
  .icap-layout {
    min-height: 100vh;
    max-width: 1240px;
    margin: 0 auto;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 40px;
  }
  @media (min-width: 960px) {
    .icap-layout {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 48px 40px;
      gap: 64px;
    }
  }

  /* Left Brand Column */
  .icap-brand-col {
    flex: 1.1;
    max-width: 560px;
  }
  .icap-logo-row {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 28px;
  }
  .icap-logo-box {
    background-color: #ffffff;
    padding: 8px 16px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
  }
  .icap-logo-img {
    height: 34px;
    width: auto;
    object-fit: contain;
    display: block;
  }
  .icap-tagline {
    font-size: 13px;
    font-style: italic;
    color: #cbd5e1;
    letter-spacing: 0.06em;
  }
  .icap-title {
    font-family: 'Josefin Sans', sans-serif;
    font-size: 38px;
    line-height: 1.18;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 16px 0;
  }
  .icap-title-accent {
    color: #F78019;
    display: block;
    margin-top: 4px;
  }
  .icap-subtitle {
    font-size: 15.5px;
    line-height: 1.65;
    color: #e2e8f0;
    margin: 0 0 32px 0;
    font-weight: 400;
  }

  /* Clean SBU Pills */
  .icap-sbu-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #93c5fd;
    margin-bottom: 12px;
  }
  .icap-sbu-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 36px;
  }
  @media (min-width: 540px) {
    .icap-sbu-list {
      grid-template-columns: 1fr 1fr;
    }
  }
  .icap-sbu-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    background-color: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(74, 125, 188, 0.35);
    border-radius: 10px;
    padding: 11px 14px;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }
  .icap-sbu-pill:hover {
    background-color: rgba(255, 255, 255, 0.11);
    border-color: #F78019;
  }
  .icap-sbu-code {
    background-color: #4A7DBC;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.04em;
  }
  .icap-sbu-title {
    font-size: 13.5px;
    font-weight: 600;
    color: #ffffff;
  }
  .icap-footer-note {
    font-size: 12px;
    color: #94a3b8;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 18px;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
  }

  /* Right White Sign-In Card */
  .icap-auth-col {
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
  }
  .icap-card {
    background-color: #ffffff;
    color: #1e293b;
    border-radius: 18px;
    padding: 36px 32px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
    border-top: 5px solid #F78019;
  }
  .icap-card-heading {
    font-family: 'Josefin Sans', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: #253E5E;
    margin: 0 0 6px 0;
  }
  .icap-card-desc {
    font-size: 13.5px;
    color: #64748b;
    margin: 0 0 24px 0;
    line-height: 1.5;
  }
  .icap-lock-banner {
    margin-bottom: 18px;
    padding: 12px 14px;
    border-radius: 10px;
    background-color: #fff7ed;
    border: 1px solid #fdba74;
    color: #9a3412;
    font-size: 12.5px;
    line-height: 1.45;
  }
  .icap-error-banner {
    margin-bottom: 16px;
    padding: 11px 14px;
    border-radius: 10px;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    font-size: 12.5px;
    font-weight: 600;
  }
  .icap-field {
    margin-bottom: 18px;
  }
  .icap-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .icap-label {
    font-size: 12px;
    font-weight: 700;
    color: #253E5E;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .icap-toggle-pw {
    background: none;
    border: none;
    color: #4A7DBC;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .icap-toggle-pw:hover {
    color: #253E5E;
    text-decoration: underline;
  }
  .icap-input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    background-color: #f8fafc;
    border: 1.5px solid #cbd5e1;
    color: #0f172a;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  }
  .icap-input:focus {
    background-color: #ffffff;
    border-color: #4A7DBC;
    box-shadow: 0 0 0 3px rgba(74, 125, 188, 0.18);
  }
  .icap-submit-btn {
    width: 100%;
    margin-top: 6px;
    padding: 13px 18px;
    border-radius: 10px;
    background-color: #F78019;
    color: #ffffff;
    font-weight: 700;
    font-size: 14.5px;
    border: none;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(247, 128, 25, 0.32);
    transition: background-color 0.2s ease, transform 0.15s ease;
  }
  .icap-submit-btn:hover {
    background-color: #e06d0b;
    transform: translateY(-1px);
  }
  .icap-submit-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
  .icap-card-footer {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
    color: #64748b;
  }

  /* Compact Top Security Bar Inside Workspace */
  .icap-topbar {
    background-color: #253E5E;
    color: #e2e8f0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    padding: 5px 18px;
    font-size: 11.5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'Century Gothic', 'Plus Jakarta Sans', sans-serif;
  }
  .icap-lock-btn {
    background-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .icap-lock-btn:hover {
    background-color: #F78019;
    border-color: #F78019;
  }
`;

export default function ExecutiveLandingPortal({ children }) {
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Sign-In Form States
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

  // 2-Hour Watchdog States
  const [remainingMs, setRemainingMs] = useState(SESSION_TIMEOUT_MS);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);

  // Verify 2-Hour Rule
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

  // 1. Initial Session Check & Auth Listener
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
        console.error('Auth verification error:', err);
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

  // 2. Activity & Tab-Close Watchdog while Logged In
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

  // Handle Password Sign-In (Goes directly to CRM Workspace)
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
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
            ? 'Incorrect email or password. Please try again.'
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
      }
    } catch (err) {
      setErrorMessage('Unable to connect. Please check your internet connection.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Manual Lock Button
  const handleManualLock = async () => {
    const reason = 'Session locked. Please enter your password to continue.';
    setLockReason(reason);
    setSession(null);
    await lockAndSignOutSession(reason);
  };

  if (authChecking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#253E5E',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Century Gothic, sans-serif',
          fontSize: '14px',
          letterSpacing: '0.05em',
        }}
      >
        Loading The i-Capital CRM...
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: CLEAN BRAND-ALIGNED LANDING & SIGN-IN PAGE
  // ============================================================================
  if (!session) {
    return (
      <div className="icap-root">
        <style>{BRAND_STYLES}</style>

        <div className="icap-layout">
          {/* LEFT: CLEAN BRAND INTRODUCTION */}
          <div className="icap-brand-col">
            <div className="icap-logo-row">
              <div className="icap-logo-box">
                <img
                  src="/logo.png"
                  alt="The i-Capital Africa Institute"
                  className="icap-logo-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.innerHTML =
                      '<span style="color:#253E5E;font-weight:800;font-size:15px;">The i-Capital</span>';
                  }}
                />
              </div>
              <span className="icap-tagline">... transforming people...</span>
            </div>

            <h1 className="icap-title">
              The i-Capital Africa Institute
              <span className="icap-title-accent">
                Commercial &amp; Proposal CRM
              </span>
            </h1>

            <p className="icap-subtitle">
              Unified workspace for managing institutional client relationships,
              lead qualification, and proposal delivery across our four business
              units.
            </p>

            <div className="icap-sbu-label">Strategic Business Units</div>
            <div className="icap-sbu-list">
              <div className="icap-sbu-pill">
                <span className="icap-sbu-code">INST</span>
                <span className="icap-sbu-title">The i-Capital Institute</span>
              </div>
              <div className="icap-sbu-pill">
                <span className="icap-sbu-code">CBS</span>
                <span className="icap-sbu-title">Cross Border Solutions</span>
              </div>
              <div className="icap-sbu-pill">
                <span className="icap-sbu-code">IIP</span>
                <span className="icap-sbu-title">Investment Partners</span>
              </div>
              <div className="icap-sbu-pill">
                <span className="icap-sbu-code">DAS</span>
                <span className="icap-sbu-title">Digital &amp; AI Solutions</span>
              </div>
            </div>

            <div className="icap-footer-note">
              <span>© {new Date().getFullYear()} The i-Capital Africa Institute</span>
              <span>icapitalafrica.org</span>
            </div>
          </div>

          {/* RIGHT: CRISP WHITE SIGN-IN CARD */}
          <div className="icap-auth-col">
            <div className="icap-card">
              <h2 className="icap-card-heading">Welcome Back</h2>
              <p className="icap-card-desc">
                Sign in with your institutional credentials to access your
                dashboard.
              </p>

              {lockReason && (
                <div className="icap-lock-banner">
                  <strong>🔒 Session Locked:</strong> {lockReason}
                </div>
              )}

              {errorMessage && (
                <div className="icap-error-banner">{errorMessage}</div>
              )}

              <form onSubmit={handleSignIn}>
                <div className="icap-field">
                  <div className="icap-label-row">
                    <label className="icap-label">Work Email</label>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@icapitalafrica.org"
                    className="icap-input"
                  />
                </div>

                <div className="icap-field">
                  <div className="icap-label-row">
                    <label className="icap-label">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="icap-toggle-pw"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus={Boolean(email)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="icap-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="icap-submit-btn"
                >
                  {loginLoading ? 'Signing in...' : 'Sign In to Workspace →'}
                </button>
              </form>

              <div className="icap-card-footer">
                <span>🔒 Auto-locks after 2 hours away</span>
                <span style={{ color: '#253E5E', fontWeight: 600 }}>
                  Authorized Access
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: DIRECT CRM WORKSPACE + COMPACT SECURITY BAR
  // ============================================================================
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{BRAND_STYLES}</style>

      {showExpiryWarning && (
        <div
          style={{
            backgroundColor: '#F78019',
            color: '#ffffff',
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
            ⚠️ Your CRM session will lock in {formatRemainingTime(remainingMs)}{' '}
            due to inactivity.
          </span>
          <button
            onClick={() => {
              recordUserActivity(true);
              setShowExpiryWarning(false);
              setRemainingMs(SESSION_TIMEOUT_MS);
            }}
            style={{
              backgroundColor: '#253E5E',
              color: '#ffffff',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Stay Signed In
          </button>
        </div>
      )}

      <div className="icap-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#F78019',
              display: 'inline-block',
            }}
          />
          <span>
            Session Active: <strong>{formatRemainingTime(remainingMs)}</strong>
          </span>
        </div>

        <button onClick={handleManualLock} className="icap-lock-btn">
          🔒 Lock Session
        </button>
      </div>

      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}