import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import SummaryDashboard from './SummaryDashboard'
import ProposalList from './ProposalList'
// Import other views as needed in your app
// import LeadIntake from './LeadIntake'
// import ClientDirectory from './ClientDirectory'
// import FollowUpQueue from './FollowUpQueue'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        setUserEmail(data.user.email)
      }
    }
    checkUser()
  }, [])

  const navItems = [
    { id: 'dashboard', label: 'Summary Dashboard', icon: '📊' },
    { id: 'proposals', label: 'Deals & Proposals', icon: '📋' },
    { id: 'leads', label: 'Lead Intake', icon: '🎯' },
    { id: 'clients', label: 'Client Directory', icon: '🏢' },
    { id: 'queue', label: 'Follow-up Queue', icon: '⏰' },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside
        style={{
          width: isCollapsed ? '72px' : '260px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          transition: 'width 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e293b',
          zIndex: 100,
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
        }}
      >
        {/* Sidebar Header / Logo */}
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.5px' }}>THE i-CAPITAL CRM</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Executive Governance</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: '#1e293b',
              border: 'none',
              color: '#cbd5e1',
              width: 28,
              height: 28,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
            }}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? '➡' : '⬅'}
          </button>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '16px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: isActive ? '#0284c7' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  textAlign: 'left',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
                title={isCollapsed ? item.label : ''}
              >
                <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{item.icon}</span>
                {!isCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer / User Info & Sign Out */}
        {!isCollapsed && (
          <div style={{ padding: '16px', borderTop: '1px solid #1e293b', fontSize: '11px', color: '#64748b' }}>
            <div style={{ marginBottom: 4 }}>Logged in as:</div>
            <div style={{ fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 10 }}>
              {userEmail || 'Ybeltal Semagn'}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #334155',
                background: 'transparent',
                color: '#f87171',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', boxSizing: 'border-box' }}>
        {activeTab === 'dashboard' && <SummaryDashboard />}
        {activeTab === 'proposals' && <ProposalList />}
        {activeTab === 'leads' && (
          <div style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h2>Lead Intake View</h2>
            <p style={{ color: '#64748b' }}>Manage exploratory client inquiries and lead qualification stages.</p>
          </div>
        )}
        {activeTab === 'clients' && (
          <div style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h2>Client Directory</h2>
            <p style={{ color: '#64748b' }}>Institutional client directory and organization profiles.</p>
          </div>
        )}
        {activeTab === 'queue' && (
          <div style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h2>Follow-up Queue</h2>
            <p style={{ color: '#64748b' }}>Scheduled touchpoints and CRM action items.</p>
          </div>
        )}
      </main>

    </div>
  )
}