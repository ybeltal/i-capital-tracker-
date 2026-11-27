import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './index.css'
import { BRAND, ROLE_CONFIGS } from './brandTheme'

// Core Governance & Dashboards
import SummaryDashboard from './SummaryDashboard'
import RoleManagerModal from './RoleManagerModal'
import UserGuideModal from './UserManualModal'
import SpotlightTour from './SpotlightTour'
import CrmAssistantChat from './CrmAssistantChat'
import NotificationBell from './NotificationBell'
import WinRateVelocityPanel from './components/WinRateVelocityPanel.jsx'

// Real Feature Components
import ProposalList from './ProposalList'
import ProposalForm from './ProposalForm'
import ProposalEditor from './ProposalEditor'
import ProjectTracker from './ProjectTracker'
import PartnerTracker from './PartnerTracker'
import LeadList from './LeadList'
import LeadForm from './LeadForm'
import LeadEditor from './LeadEditor'
import DigitalMarketingLeads from './DigitalMarketingLeads'
import ClientDirectory from './ClientDirectory'
import ClientForm from './ClientForm'
import FollowUpQueue from './FollowUpQueue'
import AiTenderParser from './AiTenderParser'

const TABS = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: '📊' },
  { id: 'proposals', label: 'Deals & Proposals', icon: '📑' },
  { id: 'projects', label: 'Project Delivery', icon: '🚀' },
  { id: 'leads', label: 'Lead Intake', icon: '🎯' },
  { id: 'marketing', label: 'Digital Marketing Leads', icon: '📣' },
  { id: 'clients', label: 'Client Directory', icon: '🏢' },
  { id: 'partners', label: 'Partners & Consortiums', icon: '🤝' },
  { id: 'queue', label: 'Follow-up Queue', icon: '⏰' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Default first-screen landing: Executive Dashboard
  const [activeTab, setActiveTab] = useState('dashboard')
  const [previewRole, setPreviewRole] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [globalToast, setGlobalToast] = useState('')

  // Live Notification Counts & Project Deep-Link State
  const [notifCounts, setNotifCounts] = useState({ total: 0, smealReview: 0 })
  const [focusProjectId, setFocusProjectId] = useState(null)

  // Active Modals & Selected Records
  const [showRoleManager, setShowRoleManager] = useState(false)
  const [showUserGuide, setShowUserGuide] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showNewProposalModal, setShowNewProposalModal] = useState(false)
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showAiParserModal, setShowAiParserModal] = useState(false)

  const [selectedProposal, setSelectedProposal] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)

  // Login Form States
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [submittingLogin, setSubmittingLogin] = useState(false)

  const triggerRefresh = () => setRefreshVersion((v) => v + 1)

  const showToast = (msg) => {
    setGlobalToast(msg)
    setTimeout(() => setGlobalToast(''), 4500)
  }

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
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN') {
        setActiveTab('dashboard')
      }
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
        setActiveTab('dashboard')
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials. Please verify your email and password.')
    } finally {
      setSubmittingLogin(false)
    }
  }

  async function handleGoogleLogin() {
    setLoginError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
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
    setActiveTab('dashboard')
  }

  const effectiveRole = previewRole || profile?.role || 'read_only'
  const activeRoleConfig = ROLE_CONFIGS[effectiveRole] || ROLE_CONFIGS.read_only
  const isActualAdmin =
    profile?.role === 'admin' ||
    profile?.email === 'ybeltalsemagn8899@gmail.com' ||
    profile?.email === 'ybeltal@icapitalafrica.org'
  const isEffectiveSuperAdmin = effectiveRole === 'admin'

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND.deepBlue,
          color: BRAND.lightBlueTint,
          fontFamily: BRAND.fontBody,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12, color: BRAND.orange }}>⚡</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.white, fontFamily: BRAND.fontHeading }}>
          THE i-CAPITAL AFRICA INSTITUTE
        </div>
        <div style={{ fontSize: 12, marginTop: 4, color: BRAND.lightBlueBorder }}>
          Authenticating institutional session…
        </div>
      </div>
    )
  }

  // Dual-Panel Login Gateway (Strict 3-Color Brand Identity)
  if (!session) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND.deepBlueDark,
          backgroundImage: `radial-gradient(ellipse at 50% 20%, ${BRAND.deepBlue} 0%, ${BRAND.deepBlueDark} 100%)`,
          padding: 16,
          fontFamily: BRAND.fontBody,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 960,
            background: BRAND.white,
            borderRadius: 18,
            overflow: 'hidden',
            display: 'flex',
            flexWrap: 'wrap',
            boxShadow: '0 25px 50px -12px rgba(26, 45, 69, 0.65)',
            borderTop: `4px solid ${BRAND.orange}`,
          }}
        >
          {/* Left Column — Deep Blue Anchor */}
          <div
            style={{
              flex: '1 1 420px',
              background: `linear-gradient(155deg, ${BRAND.deepBlue} 0%, ${BRAND.deepBlueDark} 100%)`,
              color: BRAND.white,
              padding: '42px 38px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 26, flexWrap: 'wrap' }}>
                <div
                  style={{
                    background: BRAND.white,
                    padding: '6px 12px',
                    borderRadius: 8,
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="The i-Capital Africa Institute"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.parentNode.innerText = 'The i-Capital'
                    }}
                    style={{ height: 32, width: 64, objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: 8.5, color: BRAND.deepBlue, fontWeight: 700, letterSpacing: '0.4px' }}>
                    ... transforming people ...
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    background: 'rgba(247, 128, 25, 0.16)',
                    color: BRAND.orange,
                    padding: '4px 10px',
                    borderRadius: 12,
                    border: `1px solid ${BRAND.orange}`,
                  }}
                >
                  • LIVE GOVERNANCE GATEWAY
                </span>
              </div>

              <h2 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.25, margin: '0 0 10px 0', fontFamily: BRAND.fontHeading }}>
                The i-Capital Africa Institute CRM
              </h2>
              <p style={{ fontSize: 13, color: BRAND.lightBlueTint, lineHeight: 1.55, margin: '0 0 28px 0' }}>
                Multi-SBU commercial pipeline tracking, post-win project delivery governance, and SMEAL reporting for The Firm (icapitalafrica.org).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ background: 'rgba(74, 125, 188, 0.25)', border: `1px solid ${BRAND.lightBlue}`, padding: 8, borderRadius: 8, fontSize: 16 }}>🏛️</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.white, fontFamily: BRAND.fontHeading }}>4 Strategic Business Units</div>
                    <div style={{ fontSize: 11.5, color: BRAND.lightBlueBorder }}>INST • IIP • DAS • CBS</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ background: 'rgba(74, 125, 188, 0.25)', border: `1px solid ${BRAND.lightBlue}`, padding: 8, borderRadius: 8, fontSize: 16 }}>✨</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.white, fontFamily: BRAND.fontHeading }}>Gemini Multimodal Document Engine</div>
                    <div style={{ fontSize: 11.5, color: BRAND.lightBlueBorder }}>Automated PDF/Word TOR &amp; RFP Extraction</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ background: 'rgba(247, 128, 25, 0.22)', border: `1px solid ${BRAND.orange}`, padding: 8, borderRadius: 8, fontSize: 16 }}>📈</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.white, fontFamily: BRAND.fontHeading }}>ETB 256.6M Target Realization</div>
                    <div style={{ fontSize: 11.5, color: BRAND.lightBlueBorder }}>3× Pipeline Coverage, SMEAL Sign-Off &amp; Audit Governance</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 36, borderTop: `1px solid rgba(74, 125, 188, 0.35)`, paddingTop: 18 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: BRAND.orange,
                  color: BRAND.white,
                  fontWeight: 800,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: BRAND.fontHeading,
                }}
              >
                YS
              </div>
              <div style={{ fontSize: 11, color: BRAND.lightBlueBorder }}>
                <div style={{ color: BRAND.white, fontWeight: 700 }}>Developed by Ybeltal Semagn</div>
                <div>The i-Capital Africa Institute • Addis Ababa, Ethiopia</div>
              </div>
            </div>
          </div>

          {/* Right Form */}
          <div
            style={{
              flex: '1 1 360px',
              padding: '42px 38px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              backgroundColor: BRAND.white,
            }}
          >
            <h3 style={{ margin: '0 0 4px 0', fontSize: 24, fontWeight: 700, color: BRAND.deepBlue, fontFamily: BRAND.fontHeading }}>
              Sign In
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 12, color: BRAND.textMuted }}>
              Access your executive dashboard, proposals, signed projects, and SMEAL reports.
            </p>

            {loginError && (
              <div
                role="alert"
                style={{
                  background: BRAND.orangeTint,
                  border: `1px solid ${BRAND.orange}`,
                  color: BRAND.deepBlue,
                  padding: '10px 12px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: BRAND.orange }}>⚠️</span>
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
                border: `1px solid ${BRAND.lightBlueBorder}`,
                background: BRAND.lightBlueTint,
                color: BRAND.deepBlue,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span style={{ fontWeight: 900, color: BRAND.lightBlue }}>G</span>
              <span>Continue with Google / Gmail</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 16px 0' }}>
              <div style={{ flex: 1, height: 1, background: BRAND.border }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: BRAND.textMuted }}>OR SIGN IN WITH EMAIL</span>
              <div style={{ flex: 1, height: 1, background: BRAND.border }} />
            </div>

            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: BRAND.deepBlue, marginBottom: 4 }}>
                  Corporate Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="firstname@icapitalafrica.org"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: `1px solid ${BRAND.border}`,
                    fontSize: 13,
                    color: BRAND.deepBlue,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: BRAND.deepBlue, marginBottom: 4 }}>
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
                    border: `1px solid ${BRAND.border}`,
                    fontSize: 13,
                    color: BRAND.deepBlue,
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
                  background: BRAND.deepBlue,
                  color: BRAND.white,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: submittingLogin ? 'not-allowed' : 'pointer',
                  fontFamily: BRAND.fontHeading,
                  letterSpacing: '0.3px',
                }}
              >
                {submittingLogin ? 'Verifying Credentials…' : 'Sign In to Platform →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated Platform
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BRAND.canvas,
        fontFamily: BRAND.fontBody,
        color: BRAND.deepBlue,
      }}
    >
      {/* 1. Header — Primary Deep Blue Anchor */}
      <header
        style={{
          background: `linear-gradient(90deg, ${BRAND.deepBlueDark} 0%, ${BRAND.deepBlue} 100%)`,
          color: BRAND.white,
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: `3px solid ${BRAND.orange}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: BRAND.white, padding: '3px 8px', borderRadius: 5, display: 'flex', alignItems: 'center' }}>
            <img
              src="/logo.png"
              alt="The i-Capital Africa Institute"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.parentNode.innerText = 'i-CAPITAL'
              }}
              style={{ height: 22, width: 44, objectFit: 'contain' }}
            />
          </div>

          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.6px', fontFamily: BRAND.fontHeading }}>
            THE i-CAPITAL CRM
          </span>

          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              background: activeRoleConfig.badgeBg,
              color: activeRoleConfig.badgeText,
              border: activeRoleConfig.badgeBorder,
              padding: '3px 9px',
              borderRadius: 4,
            }}
          >
            {activeRoleConfig.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* LIVE ROLE-TARGETED NOTIFICATION BELL */}
          <NotificationBell
            userProfile={profile}
            effectiveRole={effectiveRole}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onNavigateToProject={(projectId) => {
              setFocusProjectId(projectId)
              setActiveTab('projects')
            }}
            onUnreadCountChange={(counts) => setNotifCounts(counts)}
          />

          <button
            type="button"
            onClick={() => setShowTour(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(74, 125, 188, 0.25)',
              color: BRAND.white,
              border: `1px solid ${BRAND.lightBlue}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚡</span>
            <span>Take 60s Tour</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUserGuide(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: BRAND.lightBlue,
              color: BRAND.white,
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
            <span>📘</span>
            <span>User Manual &amp; SOP</span>
          </button>

          {isActualAdmin && (
            <button
              type="button"
              onClick={() => setShowRoleManager(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: BRAND.orange,
                color: BRAND.white,
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

          {isActualAdmin && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: BRAND.deepBlueDark,
                border: `1px solid ${BRAND.lightBlue}`,
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 10, color: BRAND.lightBlueBorder, fontWeight: 700 }}>VIEW:</span>
              <select
                value={previewRole || profile?.role || 'admin'}
                onChange={(e) => setPreviewRole(e.target.value === profile?.role ? '' : e.target.value)}
                style={{
                  background: 'transparent',
                  color: BRAND.white,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="admin" style={{ background: BRAND.deepBlue }}>Executive Admin</option>
                <option value="exec_mgmt" style={{ background: BRAND.deepBlue }}>Senior Management</option>
                <option value="smeal" style={{ background: BRAND.deepBlue }}>SMEAL Team</option>
                <option value="bd_manager" style={{ background: BRAND.deepBlue }}>BD Manager</option>
                <option value="tech_lead" style={{ background: BRAND.deepBlue }}>Technical Lead</option>
                <option value="sales_officer" style={{ background: BRAND.deepBlue }}>Sales Officer</option>
                <option value="read_only" style={{ background: BRAND.deepBlue }}>Reporting Viewer</option>
              </select>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: BRAND.deepBlueDark,
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 11,
              border: `1px solid rgba(74, 125, 188, 0.45)`,
            }}
          >
            <span style={{ fontWeight: 700, color: BRAND.white }}>{profile?.email?.split('@')[0]}</span>
            <span style={{ fontSize: 9.5, color: BRAND.orange, fontWeight: 700 }}>
              Scope: {profile?.assigned_sbu || 'All'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: `1px solid ${BRAND.lightBlueBorder}`,
              borderRadius: 6,
              color: BRAND.lightBlueTint,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* SMEAL LIVE ACTION BANNER — Highlight Orange */}
      {notifCounts.smealReview > 0 && activeRoleConfig.canApproveSmeal && activeTab !== 'projects' && (
        <div
          style={{
            background: BRAND.orangeTint,
            borderBottom: `1px solid ${BRAND.orangeBorder}`,
            padding: '9px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.deepBlue }}>
            <span style={{ color: BRAND.orange }}>🛡️ SMEAL Approval Required:</span>{' '}
            {notifCounts.smealReview} signed agreement{notifCounts.smealReview === 1 ? '' : 's'} awaiting verification to unlock project delivery.
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: BRAND.orange,
              color: BRAND.white,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Open SMEAL Approval Desk →
          </button>
        </div>
      )}

      {/* 2. Quick Actions Bar */}
      <section
        style={{
          background: BRAND.white,
          borderBottom: `1px solid ${BRAND.border}`,
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: BRAND.deepBlue, fontFamily: BRAND.fontHeading }}>
              Welcome back, {profile?.full_name || profile?.email?.split('@')[0]}
            </span>
            <span style={{ fontSize: 11, color: BRAND.lightBlue, fontWeight: 700 }}>
              Developed by Ybeltal Semagn
            </span>
          </div>
          <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 2 }}>
            The i-Capital Africa Institute • Commercial Governance &amp; Revenue Operations Platform
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowAiParserModal(true)}
            style={{
              padding: '7px 13px',
              background: BRAND.lightBlue,
              color: BRAND.white,
              border: 'none',
              borderRadius: 6,
              fontSize: 11.5,
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
              padding: '7px 13px',
              background: BRAND.orange,
              color: BRAND.white,
              border: 'none',
              borderRadius: 6,
              fontSize: 11.5,
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
              padding: '7px 13px',
              background: BRAND.white,
              color: BRAND.deepBlue,
              border: `1px solid ${BRAND.lightBlueBorder}`,
              borderRadius: 6,
              fontSize: 11.5,
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
              padding: '7px 13px',
              background: BRAND.white,
              color: BRAND.deepBlue,
              border: `1px solid ${BRAND.lightBlueBorder}`,
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + New Client
          </button>
        </div>
      </section>

      {/* 3. Navigation Tabs — Light Blue Active Indicator */}
      <nav
        style={{
          background: BRAND.white,
          padding: '0 24px',
          borderBottom: `1px solid ${BRAND.border}`,
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const showProjectsBadge = tab.id === 'projects' && notifCounts.total > 0
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: isActive ? BRAND.lightBlueTint : 'transparent',
                borderBottom: isActive ? `3px solid ${BRAND.lightBlue}` : '3px solid transparent',
                color: isActive ? BRAND.deepBlue : BRAND.textMuted,
                fontWeight: isActive ? 700 : 600,
                fontSize: 12.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {showProjectsBadge && (
                <span
                  style={{
                    background: BRAND.orange,
                    color: BRAND.white,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 999,
                    lineHeight: '14px',
                  }}
                >
                  {notifCounts.total}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* 4. Active Tab Content */}
      <main style={{ padding: '24px 28px', maxWidth: 1440, margin: '0 auto' }}>
        {activeTab === 'dashboard' && (
          <div key={`dash-${refreshVersion}`}>
            <SummaryDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
            <WinRateVelocityPanel />
          </div>
        )}

        {activeTab === 'proposals' && (
          <div>
            {selectedProposal ? (
              <ProposalEditor
                proposal={selectedProposal}
                userProfile={profile}
                effectiveRole={effectiveRole}
                isSuperAdmin={isEffectiveSuperAdmin}
                onRefresh={triggerRefresh}
                onClose={() => setSelectedProposal(null)}
              />
            ) : (
              <ProposalList
                userProfile={profile}
                effectiveRole={effectiveRole}
                isSuperAdmin={isEffectiveSuperAdmin}
                refreshVersion={refreshVersion}
                onRefresh={triggerRefresh}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectProposal={(p) => setSelectedProposal(p)}
                onNewProposal={() => setShowNewProposalModal(true)}
              />
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <ProjectTracker
            userProfile={profile}
            effectiveRole={effectiveRole}
            isSuperAdmin={isEffectiveSuperAdmin}
            focusProjectId={focusProjectId}
            onClearFocusProject={() => setFocusProjectId(null)}
            onRefresh={triggerRefresh}
          />
        )}

        {activeTab === 'leads' && (
          <div>
            {selectedLead ? (
              <LeadEditor
                lead={selectedLead}
                userProfile={profile}
                onClose={() => setSelectedLead(null)}
              />
            ) : (
              <LeadList
                key={`leads-${refreshVersion}`}
                userProfile={profile}
                onSelectLead={(l) => setSelectedLead(l)}
                onNewLead={() => setShowNewLeadModal(true)}
              />
            )}
          </div>
        )}

        {activeTab === 'marketing' && (
          <DigitalMarketingLeads
            userProfile={profile}
            onRefresh={triggerRefresh}
          />
        )}

        {activeTab === 'clients' && (
          <ClientDirectory
            userProfile={profile}
            refreshVersion={refreshVersion}
            onRefresh={triggerRefresh}
            onNewClient={() => setShowNewClientModal(true)}
          />
        )}

        {activeTab === 'partners' && (
          <PartnerTracker
            userProfile={profile}
            effectiveRole={effectiveRole}
            isSuperAdmin={isEffectiveSuperAdmin}
            onRefresh={triggerRefresh}
          />
        )}

        {activeTab === 'queue' && (
          <FollowUpQueue key={`queue-${refreshVersion}`} userProfile={profile} />
        )}
      </main>

      {/* ========================================================= */}
      {/* 5. PROTECTED FLOATING MODALS (NO OUTSIDE-CLICK CLOSE)     */}
      {/* ========================================================= */}

      {/* AI Tender Parser Modal */}
      {showAiParserModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 45, 69, 0.76)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: BRAND.white,
              borderRadius: 14,
              borderTop: `4px solid ${BRAND.lightBlue}`,
              width: '100%',
              maxWidth: 960,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(26, 45, 69, 0.5)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${BRAND.border}`, paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>✨</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BRAND.deepBlue, fontFamily: BRAND.fontHeading }}>
                  AI TOR / RFP Tender Document Parser
                </h3>
                <span style={{ fontSize: 10, fontWeight: 700, background: BRAND.lightBlueTint, color: BRAND.lightBlue, padding: '2px 8px', borderRadius: 10 }}>
                  Gemini Multimodal Engine
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiParserModal(false)}
                title="Close"
                style={{ background: BRAND.lightBlueTint, border: 'none', borderRadius: 6, width: 30, height: 30, fontSize: 18, color: BRAND.deepBlue, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <AiTenderParser
              userProfile={profile}
              onClose={() => {
                setShowAiParserModal(false)
                triggerRefresh()
              }}
            />
          </div>
        </div>
      )}

      {/* New Proposal Modal */}
      {showNewProposalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 45, 69, 0.76)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: BRAND.white,
              borderRadius: 14,
              borderTop: `4px solid ${BRAND.orange}`,
              width: '100%',
              maxWidth: 1080,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(26, 45, 69, 0.5)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${BRAND.border}`, paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>📑</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BRAND.deepBlue, fontFamily: BRAND.fontHeading }}>
                  Register New Proposal Mandate
                </h3>
                <span style={{ fontSize: 10, fontWeight: 700, background: BRAND.orangeTint, color: BRAND.orangeDark, padding: '2px 8px', borderRadius: 10 }}>
                  Stage-Gate Verification
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProposalModal(false)}
                title="Close"
                style={{ background: BRAND.lightBlueTint, border: 'none', borderRadius: 6, width: 30, height: 30, fontSize: 18, color: BRAND.deepBlue, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <ProposalForm
              userProfile={profile}
              onClose={() => {
                setShowNewProposalModal(false)
                triggerRefresh()
              }}
            />
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {showNewLeadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 45, 69, 0.76)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: BRAND.white,
              borderRadius: 14,
              borderTop: `4px solid ${BRAND.lightBlue}`,
              width: '100%',
              maxWidth: 780,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(26, 45, 69, 0.5)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${BRAND.border}`, paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🎯</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BRAND.deepBlue, fontFamily: BRAND.fontHeading }}>
                  Capture Pre-Tender Lead
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewLeadModal(false)}
                title="Close"
                style={{ background: BRAND.lightBlueTint, border: 'none', borderRadius: 6, width: 30, height: 30, fontSize: 18, color: BRAND.deepBlue, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <LeadForm
              userProfile={profile}
              onSuccess={(msg) => {
                showToast(msg)
                triggerRefresh()
              }}
              onClose={() => {
                setShowNewLeadModal(false)
                triggerRefresh()
              }}
            />
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 45, 69, 0.76)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: BRAND.white,
              borderRadius: 14,
              borderTop: `4px solid ${BRAND.deepBlue}`,
              width: '100%',
              maxWidth: 780,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(26, 45, 69, 0.5)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${BRAND.border}`, paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🏢</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BRAND.deepBlue, fontFamily: BRAND.fontHeading }}>
                  Register New Client / Procuring Entity
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                title="Close"
                style={{ background: BRAND.lightBlueTint, border: 'none', borderRadius: 6, width: 30, height: 30, fontSize: 18, color: BRAND.deepBlue, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <ClientForm
              userProfile={profile}
              onClose={() => {
                setShowNewClientModal(false)
                triggerRefresh()
              }}
            />
          </div>
        </div>
      )}

      {/* Other System Modals */}
      <SpotlightTour isOpen={showTour} onClose={() => setShowTour(false)} />
      <UserGuideModal isOpen={showUserGuide} onClose={() => setShowUserGuide(false)} />
      <RoleManagerModal isOpen={showRoleManager} onClose={() => setShowRoleManager(false)} />

      {/* Global Floating Confirmation Toast */}
      {globalToast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: BRAND.deepBlue,
            color: BRAND.white,
            borderLeft: `5px solid ${BRAND.orange}`,
            padding: '13px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 12px 30px rgba(26, 45, 69, 0.3)',
            zIndex: 1000000,
          }}
        >
          {globalToast}
        </div>
      )}

      {/* Movable CRM Assistant Chat Widget */}
      <CrmAssistantChat />
    </div>
  )
}