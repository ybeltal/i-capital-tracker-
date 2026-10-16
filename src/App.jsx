import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Core CRM Screens
import SummaryDashboard from './SummaryDashboard'
import ProposalList from './ProposalList'
import LeadList from './LeadList'
import ClientDirectory from './ClientDirectory'
import FollowUpQueue from './FollowUpQueue'

// Creation Modals
import ProposalForm from './ProposalForm'
import LeadForm from './LeadForm'
import ClientForm from './ClientForm'

// Team Avatar Component
import UserAvatar from './UserAvatar'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [refreshVersion, setRefreshVersion] = useState(0)

  // User State
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('Ybeltal')

  // Top Action Modals & Pre-fill State
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [targetContext, setTargetContext] = useState(null)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUserEmail(data.user.email || '')
        const metaName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0]
        if (metaName) setUserName(metaName)
      }
    }
    loadUser()
  }, [])

  function triggerGlobalRefresh() {
    setRefreshVersion((v) => v + 1)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.reload()
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

  const navTabs = [
    { id: 'dashboard', label: 'Summary Dashboard', icon: '📊' },
    { id: 'proposals', label: 'Deals & Proposals', icon: '📋' },
    { id: 'leads', label: 'Lead Intake', icon: '🎯' },
    { id: 'clients', label: 'Client Directory', icon: '🏢' },
    { id: 'queue', label: 'Follow-up Queue', icon: '⏰' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0f172a' }}>
      
      {/* ======================================================== */}
      {/* 1. TOP EXECUTIVE BRANDING & GOVERNANCE BAR               */}
      {/* ======================================================== */}
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
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. COMMAND HEADER: ATTRIBUTION & ACTIONS                 */}
      {/* ======================================================== */}
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
                border: 'none',
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
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

        {/* ======================================================== */}
        {/* 3. ACTIVE TAB CONTENT VIEW                               */}
        {/* ======================================================== */}
        <main style={{ paddingBottom: '40px' }}>
          {activeTab === 'dashboard' && (
            <SummaryDashboard onNavigateTab={setActiveTab} />
          )}

          {activeTab === 'proposals' && (
            <ProposalList
              refreshVersion={refreshVersion}
              onRefresh={triggerGlobalRefresh}
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

      {/* ======================================================== */}
      {/* 4. MODALS (PROPOSALS, LEADS & CLIENTS)                   */}
      {/* ======================================================== */}
      {showProposalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowProposalModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 640,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>
                {targetContext ? `Convert to Proposal: ${targetContext.client}` : 'Create Formal Proposal'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProposalModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
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
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowLeadModal(false)}
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
                {targetContext ? `Capture Pre-Tender Lead: ${targetContext.client}` : 'Log New Pre-Tender Lead'}
              </h3>
              <button
                type="button"
                onClick={() => setShowLeadModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
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
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowClientModal(false)}
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
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
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

    </div>
  )
}