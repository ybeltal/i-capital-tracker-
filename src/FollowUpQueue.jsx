import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function formatDate(dateStr) {
  if (!dateStr) return 'No target date'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getDueStatus(dateStr) {
  if (!dateStr) return { label: 'DATE NEEDED', bg: '#f1f5f9', color: '#475569' }
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: `OVERDUE (${Math.abs(diffDays)}d)`, bg: '#fee2e2', color: '#b91c1c' }
  if (diffDays === 0) return { label: 'DUE TODAY', bg: '#fef3c7', color: '#92400e' }
  return { label: `UPCOMING (${diffDays}d)`, bg: '#e0f2fe', color: '#0369a1' }
}

export default function FollowUpQueue() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // 'ALL' | 'OVERDUE' | 'TODAY'
  const [completingId, setCompletingId] = useState(null)

  useEffect(() => {
    loadQueue()
  }, [])

  async function loadQueue() {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('proposals')
        .select(`
          id,
          proposal_code,
          title,
          status,
          submission_deadline,
          follow_up_required,
          notes,
          opportunities (
            lead_code,
            sbus (name),
            clients (name, sector)
          )
        `)
        .eq('follow_up_required', true)
        .order('submission_deadline', { ascending: true })

      if (err) throw err
      setProposals(data || [])
    } catch (err) {
      setError(err.message || 'Could not load follow-up queue.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCompleteFollowUp(id) {
    setCompletingId(id)
    try {
      const { error: err } = await supabase
        .from('proposals')
        .update({ follow_up_required: false })
        .eq('id', id)

      if (err) throw err
      setProposals((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert('Failed to complete follow-up: ' + err.message)
    } finally {
      setCompletingId(null)
    }
  }

  // Calculate status counts
  const overdueCount = proposals.filter((p) => getDueStatus(p.submission_deadline).label.startsWith('OVERDUE')).length
  const todayCount = proposals.filter((p) => getDueStatus(p.submission_deadline).label === 'DUE TODAY').length
  const upcomingCount = proposals.filter((p) => getDueStatus(p.submission_deadline).label.startsWith('UPCOMING')).length

  const filtered = proposals.filter((p) => {
    const status = getDueStatus(p.submission_deadline).label
    if (filterStatus === 'OVERDUE') return status.startsWith('OVERDUE')
    if (filterStatus === 'TODAY') return status === 'DUE TODAY'
    return true
  })

  return (
    <div>
      {/* Metric Counters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Live Follow-up & SLA Queue</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Action items requiring client contact, proposal revision, or board decision monitoring.
          </p>
        </div>

        <button
          type="button"
          onClick={loadQueue}
          style={{ padding: '8px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          🔄 Refresh Queue
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: 8, padding: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>🔴 OVERDUE ACTIONS</span>
          <h2 style={{ margin: '4px 0 0 0', color: '#b91c1c' }}>{overdueCount}</h2>
        </div>
        <div style={{ background: '#fff', border: '1px solid #fef3c7', borderRadius: 8, padding: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>🟡 DUE TODAY</span>
          <h2 style={{ margin: '4px 0 0 0', color: '#92400e' }}>{todayCount}</h2>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0f2fe', borderRadius: 8, padding: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>🟢 UPCOMING ACTIONS</span>
          <h2 style={{ margin: '4px 0 0 0', color: '#0369a1' }}>{upcomingCount}</h2>
        </div>
      </div>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>Scanning open follow-up actions…</p>}

      {!loading && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Proposal / Code</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Client Organization</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>SBU</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Pipeline Stage</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Target Deadline</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>SLA Due Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const statusBadge = getDueStatus(item.submission_deadline)

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0369a1' }}>
                      {item.proposal_code}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {item.opportunities?.clients?.name}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        {item.opportunities?.sbus?.name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334155' }}>
                      {item.status}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {formatDate(item.submission_deadline)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: statusBadge.bg,
                          color: statusBadge.color,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        disabled={completingId === item.id}
                        onClick={() => handleCompleteFollowUp(item.id)}
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {completingId === item.id ? 'Saving…' : '✓ Mark Complete'}
                      </button>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: '#94a3b8' }}>
                    🎉 No pending follow-ups in this queue. All commitments are up to date!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}