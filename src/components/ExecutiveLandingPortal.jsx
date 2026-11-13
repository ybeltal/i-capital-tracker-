/**
 * THE i-CAPITAL AFRICA GROUP — COMMERCIAL GOVERNANCE & REVOPS PLATFORM
 * Split-Screen Institutional Landing Portal, 2-Hour Security Gate & Welcome Hub
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

  // Perform 2-hour check and lock if expired
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

  // 1. Initial Session & 2-Hour Expiry Verification
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

    // Listen to Supabase Auth state changes (including Sign Out button inside App.jsx)
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

  // 2. Attach Activity Listeners & 15-Second Watchdog Timer while Logged In
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
        // Immediately verify 2-hour rule when user returns to the tab
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
    }, 10000); // Check every 10 seconds

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

        // Open Executive Welcome Hub unless user opted to skip straight to workspace
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

  // Loading Splash Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-300">
          Verifying i-Capital Security Session...
        </p>
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: SPLIT-SCREEN INSTITUTIONAL LANDING & PASSWORD LOGIN PORTAL
  // ============================================================================
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950 text-slate-100 font-sans">
        {/* LEFT PANEL: INSTITUTIONAL GOVERNANCE & SBU SHOWCASE */}
        <div
          className="lg:w-7/12 p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800"
          style={{
            background:
              'radial-gradient(circle at 15% 20%, rgba(16, 185, 129, 0.14), transparent 45%), radial-gradient(circle at 85% 80%, rgba(59, 130, 246, 0.12), transparent 50%), #090d16',
          }}
        >
          {/* Top Brand Header */}
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <div className="bg-white text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-sm tracking-tight shadow-md">
                i-CAPITAL AFRICA
              </div>
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Commercial Governance &amp; RevOps Gateway
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                🔒 2-Hour Auto-Lock Active
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
              The i-Capital Africa Group{' '}
              <span className="text-emerald-400 block mt-1">
                Executive Pipeline &amp; Proposal Intelligence
              </span>
            </h1>

            <p className="text-slate-300 text-sm lg:text-base max-w-2xl leading-relaxed mb-8">
              Centralized institutional CRM governing pre-tender lead intake,
              4-point Go/No-Go qualification scorecards, stage-gated proposal
              defense, and contracted revenue realization across all four
              Strategic Business Units.
            </p>

            {/* 4 Strategic Business Units (SBU) Architecture Grid */}
            <div className="mb-8">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Integrated Strategic Business Units (SBUs)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      INST
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Executive Education &amp; Training
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">
                    The i-Capital Institute
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Master Builder Leadership (MBLDP), S-OJT, Change Management
                    &amp; Institutional Capacity Building.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      CBS
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Advisory &amp; Restructuring
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">
                    Cross Border Solutions
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Corporate Strategy, Organizational Design, Competency
                    Frameworks &amp; IFRS Technical Implementation.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      IIP
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Transaction &amp; Capital Markets
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">
                    i-Capital Investment Partners
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Thematic Bond Advisory, Sharia-Compliant Finance, Deal
                    Structuring &amp; Investment Readiness.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      DAS
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      AI &amp; Enterprise Systems
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">
                    Digital &amp; AI Solutions
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Digital Transformation Roadmaps, AI Tender Parsing, Data
                    Analytics &amp; Knowledge Platforms.
                  </p>
                </div>
              </div>
            </div>

            {/* Governance Pillars Strip */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/90">
              <div>
                <div className="text-xs text-slate-400">Pipeline Standard</div>
                <div className="text-base font-extrabold text-emerald-400">
                  3.0× Coverage Rule
                </div>
                <div className="text-[11px] text-slate-400">
                  ETB 769.78M Group Benchmark
                </div>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <div className="text-xs text-slate-400">Stage Probabilities</div>
                <div className="text-base font-extrabold text-white">
                  30% • 70% • 100%
                </div>
                <div className="text-[11px] text-slate-400">
                  TOR → Defense → Signed Won
                </div>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <div className="text-xs text-slate-400">Inbound Automation</div>
                <div className="text-base font-extrabold text-blue-400">
                  Live Webhooks
                </div>
                <div className="text-[11px] text-slate-400">
                  Google Forms → CRM Register
                </div>
              </div>
            </div>
          </div>

          {/* Footer Attribution */}
          <div className="mt-8 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <span>
              © {new Date().getFullYear()} The i-Capital Africa Institute •
              Addis Ababa, Ethiopia
            </span>
            <span className="text-slate-300 font-medium">
              Developed by <strong className="text-emerald-400">Ybeltal Semagn</strong>
            </span>
          </div>
        </div>

        {/* RIGHT PANEL: HIGH-TRUST PASSWORD AUTHENTICATION PORTAL */}
        <div className="lg:w-5/12 p-8 lg:p-14 flex flex-col justify-center bg-slate-950">
          <div className="w-full max-w-md mx-auto">
            {/* 2-Hour Session Lock Alert Banner (If redirected after timeout) */}
            {lockReason && (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs leading-relaxed shadow-lg">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm mb-1">
                  <span>🔒 Session Locked (2-Hour Security Policy)</span>
                </div>
                <p>{lockReason}</p>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 lg:p-8 shadow-2xl">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Authorized Personnel Sign-In
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Sign in to i-Capital CRM
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your institutional credentials to unlock the commercial
                  workspace. Sessions auto-lock after 2 hours away.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs font-medium">
                  ⚠️ {errorMessage}
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@icapitalafrica.org"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loginLoading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Authenticating Credentials...
                    </>
                  ) : (
                    <>🔓 Unlock &amp; Enter CRM Workspace →</>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>🛡️ Session Policy:</span>
                  <span className="text-slate-300 font-semibold">
                    Mandatory Password Re-Entry After 2 Hours
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🔑 Access Control:</span>
                  <span className="text-slate-300 font-semibold">
                    Executive Admin • SBU Director • BD Officer
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: POST-LOGIN EXECUTIVE WELCOME & QUICK-LAUNCH HUB (OPTIONAL OVERLAY)
  // ============================================================================
  if (showWelcomeHub) {
    const userEmail = session?.user?.email || 'Executive User';
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 lg:p-12">
        <div className="max-w-6xl w-full mx-auto">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-white text-slate-950 font-black px-3 py-1 rounded-lg text-sm">
                THE I-CAPITAL CRM
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🛡️ Session Active ({formatRemainingTime(remainingMs)} remaining)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                Signed in as <strong className="text-white">{userEmail}</strong>
              </span>
              <button
                onClick={handleManualLock}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/80 text-slate-200 hover:text-red-200 border border-slate-700 transition cursor-pointer"
              >
                🔒 Lock Platform
              </button>
            </div>
          </div>

          {/* Hero Banner */}
          <div className="my-8 p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
                Welcome to The i-Capital Commercial Governance Hub
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white mb-2">
                Ready for Commercial Execution
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl">
                All historical Master Tracker mandates, 4-SBU revenue targets,
                and live Google Form inbound leads are synchronized. Launch into
                your full CRM workspace below.
              </p>
            </div>

            <button
              onClick={() => setShowWelcomeHub(false)}
              className="px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 whitespace-nowrap cursor-pointer transition"
            >
              🚀 Enter Full CRM Workspace →
            </button>
          </div>

          {/* Quick-Launch Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div
              onClick={() => setShowWelcomeHub(false)}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition group"
            >
              <div className="text-lg font-bold text-white group-hover:text-emerald-400 transition">
                📊 Executive Dashboard &amp; 3× Gauge
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Monitor the ETB 769.78M 3× pipeline coverage benchmark, weighted
                tender valuations, and contracted won revenue across all 4 SBUs.
              </p>
            </div>

            <div
              onClick={() => setShowWelcomeHub(false)}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition group"
            >
              <div className="text-lg font-bold text-white group-hover:text-blue-400 transition">
                🗂️ Deals &amp; Proposals Kanban
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Track active bids across Stage 1 (TOR Identified), Stage 2
                (Proposal In Defense), and Stage 3 (Contract Won / Signed).
              </p>
            </div>

            <div
              onClick={() => setShowWelcomeHub(false)}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition group"
            >
              <div className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                📣 Digital Marketing &amp; Lead Intake
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Review live inbound Google Form inquiries (&quot;Let&apos;s Work
                Together&quot;), qualify leads with the 4-point scorecard, and
                convert to deals.
              </p>
            </div>
          </div>

          {/* Preference Checkbox */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipHubNextTime}
                onChange={(e) => handleToggleSkipHub(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0"
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
    <div className="min-h-screen flex flex-col">
      {/* 5-Minute Expiry Warning Banner */}
      {showExpiryWarning && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md z-50">
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
            className="px-3 py-1 rounded bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold cursor-pointer"
          >
            Stay Signed In (Reset 2h Timer)
          </button>
        </div>
      )}

      {/* Subtle Security & Landing Hub Strip above the Top Navbar */}
      <div className="bg-slate-950 text-slate-300 border-b border-slate-800 px-4 py-1 text-[11px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            2-Hour Security Timer: {formatRemainingTime(remainingMs)}
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">
            Auto-locks requiring password after 2h away
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWelcomeHub(true)}
            className="text-slate-300 hover:text-white underline cursor-pointer"
          >
            🏛️ Landing Hub
          </button>
          <button
            onClick={handleManualLock}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-red-900/80 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer"
          >
            🔒 Lock Now
          </button>
        </div>
      </div>

      {/* Render 100% of Your Existing CRM Application Untouched */}
      <div className="flex-1">{children}</div>
    </div>
  );
}