import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDueStatus(dateStr) {
  if (!dateStr) return { label: 'DATE NEEDED', bg: '#f1f5f9', color: '#475569', type: 'NEEDED' }

  // Compare strictly on YYYY-MM-DD
  const parts = dateStr.slice(0, 10).split('-')
  const target = new Date(parts[0], parts[1] - 1, parts[2])
  target.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: `OVERDUE (${Math.abs(diffDays)}d)`, bg: '#fee2e2', color: '#b91c1c', type: 'OVERDUE' }
  }
  if (diffDays === 0) {
    return { label: 'DUE TODAY', bg: '#fef3c7', color: '#92400e', type: 'TODAY' }
  }
  return { label: `UPCOMING (${diffDays}d)`, bg: '#e0f2fe', color: '#0369a1', type: 'UPCOMING' }
}

export default function FollowUpQueue() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // 'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'NEEDED'
  const [completingId, setCompletingId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    loadQueue()
  }, [])

  async function loadQueue() {
    setLoading(true)
    setError('')
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
        .order('submission_deadline', { ascending: true, nullsFirst: false })

      if (err) throw err
      setProposals(data || [])
    } catch (err) {
      setError(err.message || 'Could not load follow-up queue.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateDeadline(id, newDate) {
    setUpdatingId(id)
    try {
      const { error: err } = await supabase
        .from('proposals')
        .update({ submission_deadline: newDate || null })
        .eq('id', id)

      if (err) throw err

      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, submission_deadline: newDate || null } : p))
      )
    } catch (err) {
      alert('Failed to update target date: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  function handleQuickSetDate(id, daysAhead) {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    handleUpdateDeadline(id, dateStr)
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
  const overdueCount = proposals.filter((p) => getDueStatus(p.submission_deadline).type === 'OVERDUE').length
  const todayCount = proposals.filter((p) => getDueStatus(p.submission_deadline).type === 'TODAY').length
  const upcomingCount = proposals.filter((p) => getDueStatus(p.submission_deadline).type === 'UPCOMING').length
  const neededCount = proposals.filter((p) => getDueStatus(p.submission_deadline).type === 'NEEDED').length

  const filtered = proposals.filter((p) => {
    const statusType = getDueStatus(p.submission_deadline).type
    if (filterStatus === 'OVERDUE') return statusType === 'OVERDUE'
    if (filterStatus === 'TODAY') return statusType === 'TODAY'
    if (filterStatus === 'UPCOMING') return statusType === 'UPCOMING'
    if (filterStatus === 'NEEDED') return statusType === 'NEEDED'
    return true
  })

  return (
    <div>
      {/* Header and Refresh */}
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
          style={{
            padding: '8px 14px',
            background: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Queue
        </button>
      </div>

      {/* Interactive Metric Cards (Click to Filter) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div
          onClick={() => setFilterStatus(filterStatus === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          style={{
            background: '#fff',
            border: filterStatus === 'OVERDUE' ? '2px solid #b91c1c' : '1px solid #fee2e2',
            borderRadius: 8,
            padding: 14,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>🔴 OVERDUE ACTIONS</span>
          <h2 style={{ margin: '4px 0 0 0', color: '#b91c1c' }}>{overdueCount}</h2>
        </div>

        <div
          onClick={() => setFilterStatus(filterStatus === 'TODAY' ? 'ALL' : 'TODAY')}
          style={{
            background: '#fff',
            border: filterStatus === 'TODAY' ? '2px solid #92400e' : '1px solid #fef3c7',
            borderRadius: 8,
            padding: 14,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>🟡 DUE TODAY</span>
          <h2 style={{ margin: '4px 0 0 0', color: '#92400e' }}>{todayCount}</h2>
        </div>

        <div
          onClick={() => setFilterStatus(filterStatus === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
          style={{
            background: '#fff',
            border: filterStatus === 'UPCOMING' ? '2px solid #0369a1' : '1px solid #e0f2fe',
            borderRadius: 8,
            padding: 14,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>🟢 UPCOMING ACTIONS</span>
          <h2 style={{ margin: '4px 0 0 0', color: '#0369a1' }}>{upcomingCount}</h2>
        </div>

        <div
          onClick={() => setFilterStatus(filterStatus === 'NEEDED' ? 'ALL' : 'NEEDED')}
          style={{
            background: '#fff',
            border: filterStatus === 'NEEDED' ? '2px solid #475569' : '1px solid #cbd5e1',
            borderRadius: 8,
            padding: 14,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>⚪ DATE NEEDED</span>
          <h2 style={{ margin: '4px 0 0 0', color: '#475569' }}>{neededCount}</h2>
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
                <th style={{ padding: '10px 14px', color: '#475569' }}>Target Deadline / SLA</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>SLA Due Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const statusBadge = getDueStatus(item.submission_deadline)
                const isItemUpdating = updatingId === item.id

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0369a1' }}>
                      {item.proposal_code || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>
                        {item.opportunities?.clients?.name || '—'}
                      </strong>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{item.title}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        {item.opportunities?.sbus?.name || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334155' }}>
                      {item.status}
                    </td>

                    {/* Interactive Date Picker & Presets */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          type="date"
                          value={item.submission_deadline ? item.submission_deadline.slice(0, 10) : ''}
                          onChange={(e) => handleUpdateDeadline(item.id, e.target.value)}
                          disabled={isItemUpdating}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
                            backgroundColor: isItemUpdating ? '#f1f5f9' : '#fff'
                          }}
                        />

                        {/* Quick Presets */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleQuickSetDate(item.id, 0)}
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 3,
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: '#475569'
                            }}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickSetDate(item.id, 3)}
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 3,
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: '#475569'
                            }}
                          >
                            +3d
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickSetDate(item.id, 7)}
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 3,
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: '#475569'
                            }}
                          >
                            +1w
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: statusBadge.bg,
                          color: statusBadge.color,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Complete Button */}
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
                          whiteSpace: 'nowrap'
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
                    🎉 No follow-up actions matching this filter.
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