import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import TorClarificationChat from './TorClarificationChat'
import ProposalDocumentEditor from './ProposalDocumentEditor'
import StageGateEvidenceModal from './StageGateEvidenceModal'

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

export default function App() {
  const [session, setSession] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)

  const [activeTab, setActiveTab] = useState('dashboard')
  const [refreshVersion, setRefreshVersion] = useState(0)

  // Executive Role & View Switcher
  const [viewMode, setViewMode] = useState('group') // 'group' (Executive Admin) | 'sbu' (BD Workbench)
  const [selectedSbu, setSelectedSbu] = useState('Institute') // 'Institute' | 'CBS' | 'IIP' | 'DAS'

  // User State
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('Ybeltal')

  // Top Action Modals & Pre-fill State
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showAiParserModal, setShowAiParserModal] = useState(false)
  const [targetContext, setTargetContext] = useState(null)

  // Live Governance & Proposal Studio State
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [showTorChat, setShowTorChat] = useState(false)
  const [showProposalStudio, setShowProposalStudio] = useState(false)

  // Stage-Gate Evidence Audit State
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (currentSession?.user) {
        setUserEmail(currentSession.user.email || '')
        const metaName =
          currentSession.user.user_metadata?.full_name ||
          currentSession.user.user_metadata?.name ||
          currentSession.user.email?.split('@')[0]
        if (metaName) setUserName(metaName)
      } else {
        setUserEmail('')
        setUserName('User')
      }
      setAuthChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Listen for global custom events to trigger governance tools from any child screen
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
    const ctx = typeof targetData === 'string' ? { client: targetData } : targetData
    setTargetContext(ctx)
    setShowLeadModal(true)
  }

  function handleConvertTargetToProposal(targetData) {
    const ctx = typeof targetData === 'string' ? { client: targetData } : targetData
    setTargetContext(ctx)
    setShowProposalModal(true)
  }

  function handleApplyAiToProposal(aiData) {
    setTargetContext({
      client: aiData.client,
      sbu: aiData.sbu,
      product: aiData.product,
      dealValue: aiData.dealValue,
      deadline: aiData.deadline,
      notes: aiData.notes,
    })
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
    setGateDeal(deal)
    setGateTargetStage(targetStage)
  }

  if (authChecking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070d1e',
          color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 28 }}>⚡</div>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.5px' }}>
          Verifying security credentials…
        </div>
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
    { id: 'clients', label: 'Client Directory', icon: '🏢' },
    { id: 'queue', label: 'Follow-up Queue', icon: '⏰' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0f172a' }}>
      {/* 1. TOP EXECUTIVE BRANDING & GOVERNANCE BAR */}
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
          <div
            style={{
              background: '#ffffff',
              padding: '4px 10px',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/logo.png"
              alt="i-Capital Africa Logo"
              style={{ height: '32px', width: 'auto', display: 'block', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
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
                  background: '#10b981',
                  color: '#ffffff',
                  padding: '2px 7px',
                  borderRadius: 12,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                ● Live Governance
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 1 }}>
              Group Commercial Intelligence &amp; Multi-SBU Pipeline Tracker
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* VIEW MODE TOGGLE (Executive Admin vs SBU Workbench) */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>{userName}</span>
                <span style={{ fontSize: '9px', fontWeight: 800, background: '#f59e0b', color: '#000', padding: '1px 5px', borderRadius: 4 }}>
                  ADMIN
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{userEmail || 'Addis Ababa, ET'}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f87171',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* 2. COMMAND HEADER & ACTIONS */}
      <div style={{ padding: '20px 28px 0 28px', maxWidth: '1600px', margin: '0 auto' }}>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
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
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#f1f5f9',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                Developed by Ybeltal Semagn
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: 3 }}>
              The i-Capital Africa Group • Commercial Governance &amp; Revenue Operations Platform
            </div>
          </div>

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
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
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
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: '14px' }}>+</span> New Proposal
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
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: '14px' }}>+</span> New Lead
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
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: '14px' }}>+</span> New Client
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            background: '#ffffff',
            padding: '6px',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            display: 'inline-flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 20,
          }}
        >
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
                  boxShadow: isActive ? '0 3px 10px rgba(2, 132, 199, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
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
            <LeadList
              refreshVersion={refreshVersion}
              onRefresh={triggerGlobalRefresh}
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
            <FollowUpQueue
              refreshVersion={refreshVersion}
              onRefresh={triggerGlobalRefresh}
            />
          )}
        </main>
      </div>

      {/* CORE MODALS WITH PERSISTENCE (WILL NOT DISMISS ACCIDENTALLY ON BACKDROP CLICKS) */}
      {showAiParserModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 720,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setShowAiParserModal(false)}
                title="Close (X)"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>
            <AiTenderParser
              onApplyToProposal={handleApplyAiToProposal}
              onClose={() => setShowAiParserModal(false)}
            />
          </div>
        </div>
      )}

      {showProposalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 680,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>
                {targetContext ? `Convert to Proposal: ${targetContext.client || targetContext.name}` : 'Create Formal Proposal'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProposalModal(false)}
                title="Close (X)"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b', padding: '4px 8px' }}
              >
                ✕
              </button>
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 620,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>
                {targetContext ? `Capture Pre-Tender Lead: ${targetContext.client || targetContext.name}` : 'Log New Pre-Tender Lead'}
              </h3>
              <button
                type="button"
                onClick={() => setShowLeadModal(false)}
                title="Close (X)"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>
            <LeadForm
              targetContext={targetContext}
              currentUser={userName}
              onSaved={() => {
                setShowLeadModal(false)
                triggerGlobalRefresh()
              }}
              onClose={() => setShowLeadModal(false)}
            />
          </div>
        </div>
      )}

      {showClientModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Add Institutional Client</h3>
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                title="Close (X)"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>
            <ClientForm
              onSaved={() => {
                setShowClientModal(false)
                triggerGlobalRefresh()
              }}
              onClose={() => setShowClientModal(false)}
            />
          </div>
        </div>
      )}

      {/* LIVE TOR CLARIFICATION CHAT DRAWER */}
      <TorClarificationChat
        isOpen={showTorChat}
        onClose={() => setShowTorChat(false)}
        opportunityId={selectedProposal?.id}
        tenderCode={selectedProposal?.code || 'TENDER'}
        clientName={selectedProposal?.client || selectedProposal?.client_name || 'Client Target'}
        currentUserEmail={userEmail || 'ybeltalsemagn8899@gmail.com'}
        currentUserName={userName || 'Ybeltal Semagn'}
      />

      {/* PROPOSAL DOCUMENT EDITOR STUDIO */}
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

      {/* STAGE-GATE EVIDENCE AUDIT MODAL */}
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