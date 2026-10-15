import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Core CRM Screens
import SummaryDashboard from './SummaryDashboard'
import ProposalList from './ProposalList'
import LeadList from './LeadList'
import ClientList from './ClientList'
import FollowUpQueue from './FollowUpQueue'

// Creation Modals
import ProposalForm from './ProposalForm'
import LeadForm from './LeadForm'
import ClientForm from './ClientForm'

// Team Avatar Component
import UserAvatar from './UserAvatar'

// Company Logo
import companyLogo from './logo.png'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)

  // User Profile State
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('Ybeltal')

  // Top Action Modals
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)

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

  const navItems = [
    { id: 'dashboard', label: 'Summary Dashboard', icon: '📊', desc: 'Forecast & Targets' },
    { id: 'proposals', label: 'Deals & Proposals', icon: '📋', desc: '6-Stage Kanban Board' },
    { id: 'leads', label: 'Lead Intake', icon: '🎯', desc: 'Pre-Tender Opportunities' },
    { id: 'clients', label: 'Client Directory', icon: '🏢', desc: 'Institutional Accounts' },
    { id: 'queue', label: 'Follow-up Queue', icon: '⏰', desc: 'Touchpoints & SLAs' },
  ]

  const activeNavItem = navItems.find((n) => n.id === activeTab) || navItems[0]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* ======================================================== */}
      {/* 1. EXECUTIVE COLLAPSIBLE SIDEBAR                         */}
      {/* ======================================================== */}
      <aside
        style={{
          width: isCollapsed ? '78px' : '265px',
          backgroundColor: '#0b1329',
          color: '#f8fafc',
          transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e293b',
          zIndex: 100,
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Brand & Logo Header */}
        <div
          style={{
            padding: isCollapsed ? '16px 12px' : '18px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid #1e293b',
            background: 'linear-gradient(180deg, #0f172a 0%, #0b1329 100%)',
          }}
        >
          {!isCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  flexShrink: 0,
                }}
              >
                <img
                  src={companyLogo}
                  alt="i-Capital Logo"
                  style={{ height: '26px', width: 'auto', display: 'block', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.6px' }}>
                  THE i-CAPITAL CRM
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                  Commercial Governance
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                padding: '4px 6px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={companyLogo}
                alt="Logo"
                style={{ height: '22px', width: 'auto', display: 'block' }}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              width: 26,
              height: 26,
              borderRadius: 6,
              cursor: 'pointer',
              display: isCollapsed ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              transition: 'background 0.15s ease',
            }}
            title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
          >
            ◀
          </button>
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div style={{ textAlign: 'center', padding: '10px 0 0 0' }}>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#38bdf8',
                width: 32,
                height: 26,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 11,
              }}
              title="Expand Sidebar"
            >
              ▶
            </button>
          </div>
        )}

        {/* Navigation Section */}
        <div style={{ padding: '16px 10px 6px 14px', fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {!isCollapsed && 'Navigation'}
        </div>

        <nav style={{ padding: '4px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: isCollapsed ? '12px 0' : '10px 14px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: isActive ? '#0284c7' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  textAlign: 'left',
                  boxShadow: isActive ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                title={isCollapsed ? `${item.label} (${item.desc})` : ''}
              >
                <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{item.icon}</span>
                {!isCollapsed && (
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ color: isActive ? '#ffffff' : '#e2e8f0', whiteSpace: 'nowrap' }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: isActive ? '#bae6fd' : '#64748b' }}>{item.desc}</div>
                  </div>
                )}
              </button>
            )
          })}
        </nav>

        {/* User Card & Sign Out Footer */}
        <div
          style={{
            padding: isCollapsed ? '14px 6px' : '14px 16px',
            borderTop: '1px solid #1e293b',
            background: '#070c1a',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <UserAvatar name={userName} size={32} />
            {!isCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{userName}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, background: '#f59e0b', color: '#000', padding: '1px 5px', borderRadius: 4 }}>
                    ADMIN
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {userEmail}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#f87171',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE WITH REINSTATED TOP ACTION BAR         */}
      {/* ======================================================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        
        {/* Top Header Bar */}
        <header
          style={{
            height: '66px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Active Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{activeNavItem.icon}</span>
            <div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{activeNavItem.label}</span>
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>• {activeNavItem.desc}</span>
            </div>
          </div>

          {/* Reinstated 3 Essential CTA Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowProposalModal(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>+</span> New Proposal
            </button>

            <button
              type="button"
              onClick={() => setShowLeadModal(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>+</span> New Lead
            </button>

            <button
              type="button"
              onClick={() => setShowClientModal(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>+</span> New Client
            </button>
          </div>
        </header>

        {/* Main Component Canvas */}
        <main style={{ flex: 1, padding: '24px 28px', boxSizing: 'border-box' }}>
          {activeTab === 'dashboard' && <SummaryDashboard />}

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
            <ClientList
              refreshVersion={refreshVersion}
              onRefresh={triggerGlobalRefresh}
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
      {/* 3. MODALS FOR CREATING PROPOSALS, LEADS & CLIENTS        */}
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
              maxWidth: 620,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Create New Proposal</h3>
              <button
                type="button"
                onClick={() => setShowProposalModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <ProposalForm
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
              maxWidth: 600,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Capture Pre-Tender Lead</h3>
              <button
                type="button"
                onClick={() => setShowLeadModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <LeadForm
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