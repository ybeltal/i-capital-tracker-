import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import LeadList from './LeadList'
import ClientForm from './ClientForm'
import LeadForm from './LeadForm'
import ProposalForm from './ProposalForm'
import ProposalList from './ProposalList'
import FollowUpQueue from './FollowUpQueue'
import SummaryDashboard from './SummaryDashboard'
import ClientList from './ClientList'

export default function AccessCheck({ userId }) {
  const [leadVersion, setLeadVersion] = useState(0)
  const [clientVersion, setClientVersion] = useState(0)
  const [proposalVersion, setProposalVersion] = useState(0)

  // Workspace Navigation & Modal State
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'proposals' | 'leads' | 'clients' | 'queue'
  const [activeModal, setActiveModal] = useState(null) // 'proposal' | 'lead' | 'client' | null

  const [result, setResult] = useState({
    loading: true,
    member: null,
    error: '',
  })

  // Listen for hash changes from SummaryDashboard links (#proposal-tracking, #lead-management, etc.)
  useEffect(() => {
    function handleHash() {
      const hash = window.location.hash
      if (hash === '#client-directory') setActiveTab('clients')
      else if (hash === '#lead-management') setActiveTab('leads')
      else if (hash === '#proposal-tracking') setActiveTab('proposals')
      else if (hash === '#follow-up-queue') setActiveTab('queue')
    }
    window.addEventListener('hashchange', handleHash)
    handleHash()
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      try {
        const { data, error } = await supabase
          .from('memberships')
          .select('full_name, role, active')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) throw error

        if (!cancelled) {
          setResult({ loading: false, member: data, error: '' })
        }
      } catch (error) {
        if (!cancelled) {
          setResult({
            loading: false,
            member: null,
            error: error.message || 'Unable to check your access.',
          })
        }
      }
    }

    checkAccess()
    return () => {
      cancelled = true
    }
  }, [userId])

  if (result.loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Checking your tracker permissions…
      </div>
    )
  }

  if (result.error) {
    return <p role="alert" style={{ color: '#b91c1c' }}>Access check failed: {result.error}</p>
  }

  if (!result.member || !result.member.active) {
    return <p role="alert" style={{ color: '#b91c1c' }}>Your account does not have approved tracker access.</p>
  }

  const isAdmin = result.member.role === 'admin'

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* User Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
        }}
      >
        <div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
            Welcome, {result.member.full_name}
          </span>
          <span
            style={{
              marginLeft: '10px',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: isAdmin ? '#fef3c7' : '#e0f2fe',
              color: isAdmin ? '#92400e' : '#0369a1',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {result.member.role}
          </span>
        </div>

        {/* Quick Action Create Buttons */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveModal('proposal')}
              style={{
                backgroundColor: '#ff7a59',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + New Proposal
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('lead')}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + New Lead
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('client')}
              style={{
                backgroundColor: '#475569',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + New Client
            </button>
          </div>
        )}
      </div>

      {/* HubSpot Style Workspace Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid #cbd5e1',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'dashboard', label: '📊 Summary Dashboard' },
          { id: 'proposals', label: '📑 Deals & Proposals' },
          { id: 'leads', label: '🎯 Lead Intake' },
          { id: 'clients', label: '🏢 Client Directory' },
          { id: 'queue', label: '⏰ Follow-up Queue' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                background: isSelected ? '#ffffff' : 'transparent',
                borderTop: isSelected ? '2px solid #ff7a59' : '2px solid transparent',
                borderLeft: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                borderRight: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                borderBottom: isSelected ? '1px solid #ffffff' : '1px solid transparent',
                marginBottom: '-1px',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                fontSize: '13.5px',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Main Tab Views */}
      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
        {activeTab === 'dashboard' && <SummaryDashboard />}

        {activeTab === 'proposals' && (
          <div id="proposal-tracking">
            <ProposalList proposalVersion={proposalVersion} />
          </div>
        )}

        {activeTab === 'leads' && (
          <div id="lead-management">
            <LeadList key={leadVersion} />
          </div>
        )}

        {activeTab === 'clients' && (
          <div id="client-directory">
            <ClientList clientVersion={clientVersion} />
          </div>
        )}

        {activeTab === 'queue' && (
          <div id="follow-up-queue">
            <FollowUpQueue />
          </div>
        )}
      </div>

      {/* Modal Dialog for Clean Data Entry */}
      {activeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              padding: '24px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 'none',
                background: 'transparent',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#64748b',
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {activeModal === 'proposal' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a' }}>Create Proposal / RFP</h3>
                <ProposalForm
                  leadVersion={leadVersion}
                  onSaved={() => {
                    setProposalVersion((v) => v + 1)
                    setActiveModal(null)
                  }}
                />
              </div>
            )}

            {activeModal === 'lead' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a' }}>Capture New Lead</h3>
                <LeadForm
                  userId={userId}
                  clientVersion={clientVersion}
                  onSaved={() => {
                    setLeadVersion((v) => v + 1)
                    setActiveModal(null)
                  }}
                />
              </div>
            )}

            {activeModal === 'client' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a' }}>Add Client Account</h3>
                <ClientForm
                  onSaved={() => {
                    setClientVersion((v) => v + 1)
                    setActiveModal(null)
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}