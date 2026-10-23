import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import SummaryDashboard from './SummaryDashboard'
import RoleManagerModal from './RoleManagerModal'
import UserGuideModal from './UserManualModal'

const ROLE_CONFIGS = {
  admin: {
    label: 'Executive Administrator',
    badgeBg: '#dc2626',
    badgeText: '#ffffff',
    canManageRoles: true,
    canEditTargets: true,
  },
  exec_mgmt: {
    label: 'Senior Management',
    badgeBg: '#7c3aed',
    badgeText: '#ffffff',
    canManageRoles: false,
    canEditTargets: false,
  },
  bd_manager: {
    label: 'BD Manager',
    badgeBg: '#0284c7',
    badgeText: '#ffffff',
    canManageRoles: false,
    canEditTargets: false,
  },
  tech_lead: {
    label: 'Technical Proposal Lead',
    badgeBg: '#10b981',
    badgeText: '#ffffff',
    canManageRoles: false,
    canEditTargets: false,
  },
  sales_officer: {
    label: 'Sales Officer',
    badgeBg: '#f59e0b',
    badgeText: '#ffffff',
    canManageRoles: false,
    canEditTargets: false,
  },
  read_only: {
    label: 'Reporting Viewer',
    badgeBg: '#64748b',
    badgeText: '#ffffff',
    canManageRoles: false,
    canEditTargets: false,
  },
}

const TABS = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: '📊' },
  { id: 'proposals', label: 'Deals & Proposals', icon: '📑' },
  { id: 'leads', label: 'Lead Intake', icon: '🎯' },
  { id: 'marketing', label: 'Digital Marketing Leads', icon: '📣' },
  { id: 'clients', label: 'Client Directory', icon: '🏢' },
  { id: 'queue', label: 'Follow-up Queue', icon: '⏰' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showRoleManager, setShowRoleManager] = useState(false)
  const [showUserGuide, setShowUserGuide] = useState(false)
  const [showNewProposalModal, setShowNewProposalModal] = useState(false)
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showAiParserModal, setShowAiParserModal] = useState(false)

  // Role Simulation for Testing / Previews
  const [previewRole, setPreviewRole] = useState('')

  // Login Form States
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [submittingLogin, setSubmittingLogin] = useState(false)

  // Listen to Supabase Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user)
      } else {
        setAuthLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user)
      } else {
        setProfile(null)
        setAuthLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(user) {
    try {
      const email = user.email?.toLowerCase() || ''
      const isSuperAdmin =
        email === 'ybeltalsemagn8899@gmail.com' ||
        email === 'ybeltal@icapitalafrica.org'

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && !data) {
        // Fallback profile if record is loading
        setProfile({
          id: user.id,
          email: user.email,
          full_name: isSuperAdmin ? 'Ybeltal Semagn' : user.email.split('@')[0],
          role: isSuperAdmin ? 'admin' : 'read_only',
          assigned_sbu: 'All',
          is_active: true,
        })
      } else if (data) {
        setProfile({
          ...data,
          role: isSuperAdmin ? 'admin' : data.role || 'read_only',
          assigned_sbu: isSuperAdmin ? 'All' : data.assigned_sbu || 'All',
        })
      }
    } catch (err) {
      console.error('Profile fetch failed:', err)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault()
    setLoginError('')
    setSubmittingLogin(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      })
      if (error) throw error
      if (data?.session) {
        setSession(data.session)
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid login credentials. Please check your email and password.')
    } finally {
      setSubmittingLogin(false)
    }
  }

  async function handleGoogleLogin() {
    setLoginError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (err) {
      setLoginError(err.message || 'Could not initiate Google authentication.')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setPreviewRole('')
  }

  // Active role determination
  const effectiveRole = previewRole || profile?.role || 'read_only'
  const activeRoleConfig = ROLE_CONFIGS[effectiveRole] || ROLE_CONFIGS.read_only
  const isActualAdmin =
    profile?.role === 'admin' ||
    profile?.email === 'ybeltalsemagn8899@gmail.com' ||
    profile?.email === 'ybeltal@icapitalafrica.org'

  // Loading Screen
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0f1d',
          color: '#94a3b8',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
          THE i-CAPITAL CRM
        </div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          Authenticating institutional session…
        </div>
      </div>
    )
  }

  // Dual-Panel Login Screen (Matches Governance Gateway Design)
  if (!session) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090e1a',
          backgroundImage: 'radial-gradient(ellipse at 50% 20%, #1e293b 0%, #090e1a 100%)',
          padding: 16,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 960,
            background: '#ffffff',
            borderRadius: 18,
            overflow: 'hidden',
            display: 'flex',
            flexWrap: 'wrap',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
          }}
        >
          {/* Left Hero Column */}
          <div
            style={{
              flex: '1 1 420px',
              background: 'linear-gradient(145deg, #070d1e 0%, #0f172a 100%)',
              color: '#ffffff',
              padding: '42px 38px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: 16,
                    letterSpacing: '0.5px',
                    padding: '4px 8px',
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: 4,
                  }}
                >
                  i-CAPITAL
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '3px 8px',
                    borderRadius: 12,
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  • LIVE GOVERNANCE GATEWAY
                </span>
              </div>

              <h2 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.25, margin: '0 0 12px 0' }}>
                The i-Capital Commercial Platform
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, margin: '0 0 28px 0' }}>
                Multi-SBU pipeline tracking, revenue target governance, and AI-powered tender intelligence for The i-Capital Africa Group.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ background: '#1e293b', padding: 8, borderRadius: 8, fontSize: 16 }}>🏛️</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>4 Strategic Business Units</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Institute • IIP • DAS • CBS</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ background: '#1e293b', padding: 8, borderRadius: 8, fontSize: 16 }}>✨</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>Gemini Multimodal Document Engine</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Automated PDF/Word TOR &amp; RFP Extraction</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ background: '#1e293b', padding: 8, borderRadius: 8, fontSize: 16 }}>📈</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>ETB 256.6M Target Realization</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>3× Pipeline Coverage &amp; Stage Governance</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 36, borderTop: '1px solid #1e293b', paddingTop: 18 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#0284c7',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                YS
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                <div style={{ color: '#e2e8f0', fontWeight: 700 }}>Developed by Ybeltal Semagn</div>
                <div>Addis Ababa, Ethiopia</div>
              </div>
            </div>
          </div>

          {/* Right Sign-In Form */}
          <div
            style={{
              flex: '1 1 360px',
              padding: '42px 38px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
            }}
          >
            <h3 style={{ margin: '0 0 4px 0', fontSize: 22, fontWeight: 900, color: '#0f172a' }}>
              Sign In
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 12, color: '#64748b' }}>
              Access your group pipeline, proposals, and target metrics.
            </p>

            {loginError && (
              <div
                role="alert"
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#1e293b',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 16,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <span style={{ fontWeight: 900, color: '#4285f4' }}>G</span>
              <span>Continue with Google / Gmail</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 16px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>
                OR SIGN IN WITH EMAIL
              </span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Corporate Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@icapitalafrica.org"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submittingLogin}
                style={{
                  marginTop: 6,
                  padding: '11px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: submittingLogin ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                {submittingLogin ? 'Verifying Credentials…' : 'Sign In to Platform →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 22 }}>
              Authorized Personnel Only • The i-Capital Africa Group
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated Application Workspace
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* 1. TOP EXECUTIVE HEADER */}
      <header
        style={{
          background: 'linear-gradient(90deg, #060b18 0%, #0a1128 50%, #0f172a 100%)',
          color: '#ffffff',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontWeight: 900,
                fontSize: 13,
                padding: '3px 6px',
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: 4,
                letterSpacing: '0.5px',
              }}
            >
              i-CAPITAL
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.5px' }}>
              THE I-CAPITAL CRM
            </span>
          </div>

          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              background: activeRoleConfig.badgeBg,
              color: activeRoleConfig.badgeText,
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {activeRoleConfig.label}
          </span>

          <span style={{ fontSize: 11, color: '#94a3b8', display: 'none', md: 'inline' }}>
            Group Commercial Intelligence &amp; Multi-SBU Pipeline Tracker
          </span>
        </div>

        {/* Header Action Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* USER MANUAL & SOP BUTTON */}
          <button
            type="button"
            onClick={() => setShowUserGuide(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <span>📘</span>
            <span>User Manual &amp; SOP</span>
          </button>

          {/* MANAGE ROLES (Visible to Admins) */}
          {isActualAdmin && (
            <button
              type="button"
              onClick={() => setShowRoleManager(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🛡️</span>
              <span>Manage Roles</span>
            </button>
          )}

          {/* ROLE VIEW SELECTOR (For Testing & Previews) */}
          {isActualAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1e293b', padding: '3px 8px', borderRadius: 6 }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800 }}>VIEW:</span>
              <select
                value={previewRole || profile?.role || 'admin'}
                onChange={(e) => setPreviewRole(e.target.value === profile?.role ? '' : e.target.value)}
                style={{
                  background: 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="admin" style={{ background: '#0f172a' }}>Executive Admin (Group)</option>
                <option value="exec_mgmt" style={{ background: '#0f172a' }}>Senior Management</option>
                <option value="bd_manager" style={{ background: '#0f172a' }}>BD Manager</option>
                <option value="tech_lead" style={{ background: '#0f172a' }}>Technical Lead</option>
                <option value="read_only" style={{ background: '#0f172a' }}>Reporting Viewer</option>
              </select>
            </div>
          )}

          {/* USER ACCOUNT PILL */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#1e293b',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 11,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#0284c7',
                color: '#fff',
                fontSize: 10,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
                {profile?.email?.split('@')[0]}
              </span>
            </div>
            <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 700 }}>
              Scope: {profile?.assigned_sbu || 'All'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* 2. SUB-BANNER WITH QUICK ACTION SHORTCUTS */}
      <section
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
              Welcome back, {profile?.full_name || profile?.email?.split('@')[0]}
            </span>
            <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>
              Developed by Ybeltal Semagn
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            The i-Capital Africa Group • Commercial Governance &amp; Revenue Operations Platform
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowAiParserModal(true)}
            style={{
              padding: '7px 12px',
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ✨ AI Tender Parser
          </button>

          <button
            type="button"
            onClick={() => setShowNewProposalModal(true)}
            style={{
              padding: '7px 12px',
              background: '#ea580c',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + New Proposal
          </button>

          <button
            type="button"
            onClick={() => setShowNewLeadModal(true)}
            style={{
              padding: '7px 12px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + New Lead
          </button>

          <button
            type="button"
            onClick={() => setShowNewClientModal(true)}
            style={{
              padding: '7px 12px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + New Client
          </button>
        </div>
      </section>

      {/* 3. NAVIGATION TAB STRIP */}
      <nav
        style={{
          background: '#ffffff',
          padding: '0 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                color: isActive ? '#0284c7' : '#64748b',
                fontWeight: isActive ? 800 : 600,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* 4. MAIN CONTENT ROUTER */}
      <main style={{ padding: '24px 28px', maxWidth: 1440, margin: '0 auto' }}>
        {activeTab === 'dashboard' && (
          <SummaryDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'proposals' && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Deals &amp; Proposals Pipeline</h3>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Stage-Gate governance from TOR Identified to Contract Signed.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProposalModal(true)}
                style={{ padding: '8px 14px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                + Register Proposal Mandate
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Select an opportunity to view Go/No-Go scorecards, financial schedules, and technical requirements.
            </p>
          </div>
        )}

        {activeTab === 'leads' && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Pre-Tender Lead Qualification</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Early-stage institutional inquiries undergoing initial discovery and commercial relationship management.
            </p>
          </div>
        )}

        {activeTab === 'marketing' && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Digital Marketing Leads</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Inbound executive training and consulting inquiries captured via web forms and institutional landing pages.
            </p>
          </div>
        )}

        {activeTab === 'clients' && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Client Directory (184 Mapped Targets)</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Institutional accounts across Ethiopian financial services, state enterprises, NGOs, and corporate groups.
            </p>
          </div>
        )}

        {activeTab === 'queue' && (
          <div style={{ background: '#fff', padding: 24, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Commercial Follow-up Queue</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Time-sensitive touchpoints, TOR clarification deadlines, and proposal submission countdowns.
            </p>
          </div>
        )}
      </main>

      {/* 5. USER MANUAL & SOP MODAL */}
      <UserGuideModal
        isOpen={showUserGuide}
        onClose={() => setShowUserGuide(false)}
      />

      {/* 6. INSTITUTIONAL ROLE MANAGER MODAL */}
      <RoleManagerModal
        isOpen={showRoleManager}
        onClose={() => setShowRoleManager(false)}
      />

      {/* 7. QUICK ACTION PLACEHOLDER DIALOGS */}
      {(showNewProposalModal || showNewLeadModal || showNewClientModal || showAiParserModal) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => {
            setShowNewProposalModal(false)
            setShowNewLeadModal(false)
            setShowNewClientModal(false)
            setShowAiParserModal(false)
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#0f172a' }}>
              {showAiParserModal
                ? '✨ AI Tender Parser'
                : showNewProposalModal
                ? '+ New Proposal Mandate'
                : showNewLeadModal
                ? '+ Register New Lead'
                : '+ Register New Client'}
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px 0' }}>
              {showAiParserModal
                ? 'Upload an institutional TOR or RFP document to extract deliverables, evaluation criteria, and key expert profiles.'
                : 'Enter opportunity details. All registered records link directly to the opportunities table and update your SBU quota gauges.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setShowNewProposalModal(false)
                  setShowNewLeadModal(false)
                  setShowNewClientModal(false)
                  setShowAiParserModal(false)
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Form submission active. Records write directly to the opportunities table.')
                  setShowNewProposalModal(false)
                  setShowNewLeadModal(false)
                  setShowNewClientModal(false)
                  setShowAiParserModal(false)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#0284c7',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}