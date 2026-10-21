import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { AuthRoleProvider, useAuthRole, ROLE_DEFINITIONS } from './AuthRoleContext'
import RoleManagerModal from './RoleManagerModal'

// Governance Drawers & Modals
import TorClarificationChat from './TorClarificationChat'
import ProposalDocumentEditor from './ProposalDocumentEditor'
import StageGateEvidenceModal from './StageGateEvidenceModal'
import DigitalMarketingLeads from './DigitalMarketingLeads'

// Authentication Screen
import Login from './Login'

// Core CRM Screens
import SummaryDashboard from './SummaryDashboard'
import SbuWorkbench from './SbuWorkbench'
import ProposalList from './ProposalList'
import LeadList from './LeadList'
import ClientDirectory from './ClientDirectory'
import FollowUpQueue from './FollowUpQueue'

// Creation Modals
import ProposalForm from './ProposalForm'
import LeadForm from './LeadForm'
import ClientForm from './ClientForm'
import AiTenderParser from './AiTenderParser'

// Team Avatar Component
import UserAvatar from './UserAvatar'

function DashboardShell() {
  const { role, roleMeta, assignedSbu, isAdmin, isReadOnly } = useAuthRole()

  const [session, setSession] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)

  const [activeTab, setActiveTab] = useState('dashboard')
  const [refreshVersion, setRefreshVersion] = useState(0)

  // Executive Role & View Switcher
  const [viewMode, setViewMode] = useState('group')
  const [selectedSbu, setSelectedSbu] = useState(assignedSbu !== 'All' ? assignedSbu : 'Institute')

  // User Identity
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('Ybeltal')

  // Modals State
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showAiParserModal, setShowAiParserModal] = useState(false)
  const [targetContext, setTargetContext] = useState(null)

  // Governance Modules State
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [showTorChat, setShowTorChat] = useState(false)
  const [showProposalStudio, setShowProposalStudio] = useState(false)

  // Stage-Gate Evidence State
  const [gateDeal, setGateDeal] = useState(null)
  const [gateTargetStage, setGateTargetStage] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession)
      if (existingSession?.user) {
        setUserEmail(existingSession.user.email || '')
        const metaName =
          existingSession.user.user_metadata?.full_name ||
          existingSession.user.user_metadata?.name ||
          existingSession.user.email?.split('@')[0]
        if (metaName) setUserName(metaName)
      }
      setAuthChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (currentSession?.user) {
        setUserEmail(currentSession.user.email || '')
        const metaName =
          currentSession.user.user_metadata?.full_name ||
          currentSession.user.user_metadata?.name ||
          currentSession.user.email?.split('@')[0]
        if (metaName) setUserName(metaName)
      }
      setAuthChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Global listeners for child drawers
  useEffect(() => {
    function handleGlobalOpenChat(e) {
      if (e.detail) {
        setSelectedProposal(e.detail)
        setShowTorChat(true)
      }
    }
    function handleGlobalOpenStudio(e) {
      if (e.detail) {
        setSelectedProposal(e.detail)
        setShowProposalStudio(true)
      }
    }
    function handleGlobalStageGate(e) {
      if (e.detail?.deal && e.detail?.targetStage) {
        setGateDeal(e.detail.deal)
        setGateTargetStage(e.detail.targetStage)
      }
    }

    window.addEventListener('crm:open-tor-chat', handleGlobalOpenChat)
    window.addEventListener('crm:open-proposal-studio', handleGlobalOpenStudio)
    window.addEventListener('crm:stage-gate-advance', handleGlobalStageGate)

    return () => {
      window.removeEventListener('crm:open-tor-chat', handleGlobalOpenChat)
      window.removeEventListener('crm:open-proposal-studio', handleGlobalOpenStudio)
      window.removeEventListener('crm:stage-gate-advance', handleGlobalStageGate)
    }
  }, [])

  function triggerGlobalRefresh() {
    setRefreshVersion((v) => v + 1)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
  }

  function handleConvertTargetToLead(targetData) {
    if (isReadOnly) return
    const ctx = typeof targetData === 'string' ? { client: targetData } : targetData
    setTargetContext(ctx)
    setShowLeadModal(true)
  }

  function handleConvertTargetToProposal(targetData) {
    if (isReadOnly) return
    const ctx = typeof targetData === 'string' ? { client: targetData } : targetData
    setTargetContext(ctx)
    setShowProposalModal(true)
  }

  function handleApplyAiToProposal(aiData) {
    if (isReadOnly) return
    setTargetContext(aiData)
    setShowAiParserModal(false)
    setShowProposalModal(true)
  }

  function handleOpenTorChat(proposal) {
    setSelectedProposal(proposal)
    setShowTorChat(true)
  }

  function handleOpenProposalStudio(proposal) {
    setSelectedProposal(proposal)
    setShowProposalStudio(true)
  }

  function handleRequestStageAdvance(deal, targetStage) {
    if (isReadOnly) {
      alert('Read-only accounts cannot advance pipeline stages.')
      return
    }
    setGateDeal(deal)
    setGateTargetStage(targetStage)
  }

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070d1e', color: '#fff' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Verifying institutional access credentials…</div>
      </div>
    )
  }

  if (!session) {
    return <Login onLoginSuccess={(newSession) => setSession(newSession)} />
  }

  const navTabs = [
    { id: 'dashboard', label: viewMode === 'group' ? 'Executive Dashboard' : `${selectedSbu} Workbench`, icon: viewMode === 'group' ? '📊' : '💼' },
    { id: 'proposals', label: 'Deals & Proposals', icon: '📋' },
    { id: 'leads', label: 'Lead Intake', icon: '🎯' },
    { id: 'marketing', label: 'Digital Marketing Leads', icon: '📣' },
    { id: 'clients', label: 'Client Directory', icon: '🏢' },
    { id: 'queue', label: 'Follow-up Queue', icon: '⏰' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* 1. TOP BRANDING & ROLE STATUS BAR */}
      <header
        style={{
          background: 'linear-gradient(90deg, #070d1e 0%, #0f172a 60%, #1e293b 100%)',
          borderBottom: '1px solid #1e293b',
          padding: '12px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: '#ffffff', padding: '4px 10px', borderRadius: 8 }}>
            <img
              src="/logo.png"
              alt="i-Capital Africa Logo"
              style={{ height: '32px', width: 'auto', display: 'block', objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.6px' }}>
                THE i-CAPITAL CRM
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  background: roleMeta.badgeBg,
                  color: roleMeta.badgeText,
                  padding: '2px 8px',
                  borderRadius: 12,
                  textTransform: 'uppercase',
                }}
              >
                ● {roleMeta.label}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 1 }}>
              Group Commercial Intelligence &amp; Multi-SBU Pipeline Tracker
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Executive Administrator User Role Console Trigger */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowRoleModal(true)}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🛡️</span> Manage Roles
            </button>
          )}

          {/* View Switcher */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '4px 8px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
              View:
            </span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <option value="group">🏛️ Executive Admin (Group)</option>
              <option value="sbu">💼 SBU BD Workbench</option>
            </select>

            {viewMode === 'sbu' && (
              <select
                value={selectedSbu}
                onChange={(e) => setSelectedSbu(e.target.value)}
                style={{
                  background: '#0f172a',
                  color: '#fbbf24',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <option value="Institute">The i-Capital Institute</option>
                <option value="CBS">Cross Border Solutions (CBS)</option>
                <option value="IIP">Investment Partners (IIP)</option>
                <option value="DAS">Digital &amp; AI Solutions (DAS)</option>
              </select>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserAvatar name={userName} size={34} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>{userName}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Scope: {assignedSbu}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#f87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* 2. ACTIONS HEADER (Restricted for Read-Only) */}
      <div style={{ padding: '20px 28px 0 28px', maxWidth: '1600px', margin: '0 auto' }}>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Welcome back, {userName}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, background: '#f1f5f9', color: '#0284c7', padding: '2px 8px', borderRadius: 6 }}>
                Developed by Ybeltal Semagn
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: 3 }}>
              The i-Capital Africa Group • Commercial Governance &amp; Revenue Operations Platform
            </div>
          </div>

          {!isReadOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowAiParserModal(true)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #0284c7',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>✨</span> AI Tender Parser
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetContext(null)
                  setShowProposalModal(true)
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>+</span> New Proposal
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetContext(null)
                  setShowLeadModal(true)
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                + New Lead
              </button>

              <button
                type="button"
                onClick={() => setShowClientModal(true)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                + New Client
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{ background: '#ffffff', padding: '6px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'inline-flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: isActive ? '#0284c7' : 'transparent',
                  color: isActive ? '#ffffff' : '#475569',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* 3. ACTIVE TAB CONTENT VIEW */}
        <main style={{ paddingBottom: '40px' }}>
          {activeTab === 'dashboard' && (
            viewMode === 'group' ? (
              <SummaryDashboard onNavigateTab={setActiveTab} />
            ) : (
              <SbuWorkbench
                userSbu={selectedSbu}
                onNavigateTab={setActiveTab}
                onOpenAiParser={() => setShowAiParserModal(true)}
                onOpenTorChat={handleOpenTorChat}
                onOpenProposalStudio={handleOpenProposalStudio}
                onStageGateAdvance={handleRequestStageAdvance}
              />
            )
          )}

          {activeTab === 'proposals' && (
            <ProposalList
              refreshVersion={refreshVersion}
              onRefresh={triggerGlobalRefresh}
              onOpenTorChat={handleOpenTorChat}
              onOpenProposalStudio={handleOpenProposalStudio}
              onStageGateAdvance={handleRequestStageAdvance}
            />
          )}

          {activeTab === 'leads' && (
            <LeadList refreshVersion={refreshVersion} onRefresh={triggerGlobalRefresh} />
          )}

          {activeTab === 'marketing' && (
            <DigitalMarketingLeads
              onConvertToProposal={(leadCtx) => {
                if (!isReadOnly) {
                  setTargetContext(leadCtx)
                  setShowProposalModal(true)
                }
              }}
            />
          )}

          {activeTab === 'clients' && (
            <ClientDirectory
              refreshVersion={refreshVersion}
              onRefresh={triggerGlobalRefresh}
              onConvertToLead={handleConvertTargetToLead}
              onConvertToProposal={handleConvertTargetToProposal}
            />
          )}

          {activeTab === 'queue' && (
            <FollowUpQueue refreshVersion={refreshVersion} onRefresh={triggerGlobalRefresh} />
          )}
        </main>
      </div>

      {/* ADMIN ROLE MANAGEMENT MODAL */}
      <RoleManagerModal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} />

      {/* CORE CREATION MODALS */}
      {showAiParserModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 720, padding: 24, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button type="button" onClick={() => setShowAiParserModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <AiTenderParser onApplyToProposal={handleApplyAiToProposal} onClose={() => setShowAiParserModal(false)} />
          </div>
        </div>
      )}

      {showProposalModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 680, padding: 24, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>{targetContext ? `Convert to Proposal: ${targetContext.client || targetContext.name}` : 'Create Formal Proposal'}</h3>
              <button type="button" onClick={() => setShowProposalModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <ProposalForm
              targetContext={targetContext}
              currentUser={userName}
              onSaved={() => {
                setShowProposalModal(false)
                triggerGlobalRefresh()
              }}
              onClose={() => setShowProposalModal(false)}
            />
          </div>
        </div>
      )}

      {showLeadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 620, padding: 24, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Capture Pre-Tender Lead</h3>
              <button type="button" onClick={() => setShowLeadModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <LeadForm targetContext={targetContext} currentUser={userName} onSaved={() => { setShowLeadModal(false); triggerGlobalRefresh() }} onClose={() => setShowLeadModal(false)} />
          </div>
        </div>
      )}

      {showClientModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 540, padding: 24, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Add Institutional Client</h3>
              <button type="button" onClick={() => setShowClientModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <ClientForm onSaved={() => { setShowClientModal(false); triggerGlobalRefresh() }} onClose={() => setShowClientModal(false)} />
          </div>
        </div>
      )}

      {/* LIVE TOR CHAT */}
      <TorClarificationChat
        isOpen={showTorChat}
        onClose={() => setShowTorChat(false)}
        opportunityId={selectedProposal?.id}
        tenderCode={selectedProposal?.code || 'TENDER'}
        clientName={selectedProposal?.client || selectedProposal?.client_name || 'Client Target'}
        currentUserEmail={userEmail || 'ybeltalsemagn8899@gmail.com'}
        currentUserName={userName || 'Ybeltal Semagn'}
      />

      {/* PROPOSAL STUDIO */}
      {showProposalStudio && (
        <ProposalDocumentEditor
          proposal={selectedProposal}
          onClose={() => setShowProposalStudio(false)}
          onSave={() => {
            triggerGlobalRefresh()
            setShowProposalStudio(false)
          }}
        />
      )}

      {/* STAGE-GATE EVIDENCE AUDIT */}
      <StageGateEvidenceModal
        isOpen={Boolean(gateDeal)}
        deal={gateDeal}
        targetStage={gateTargetStage}
        onClose={() => {
          setGateDeal(null)
          setGateTargetStage(null)
        }}
        onSuccess={() => {
          triggerGlobalRefresh()
          setGateDeal(null)
          setGateTargetStage(null)
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthRoleProvider>
      <DashboardShell />
    </AuthRoleProvider>
  )
}