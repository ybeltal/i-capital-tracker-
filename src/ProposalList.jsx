import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const STAGES = [
  'Initiated',
  'In Progress',
  'Submitted',
  'Under Review',
  'Shortlisted',
  'Negotiation',
  'Won',
  'Lost'
]

const ACTIVITY_TYPES = [
  '📞 Phone Call',
  '🤝 In-Person Meeting',
  '💻 Virtual Presentation',
  '📧 Email / Scope Sent',
  '💬 WhatsApp / Message',
  '🏛️ Board / Committee Feedback',
  '📝 Contract Negotiation'
]

function formatMoney(amount) {
  if (!amount || isNaN(amount)) return 'ETB 0.00'
  return `ETB ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function getDealHealth(deal) {
  if (['Won', 'Lost', 'Cancelled'].includes(deal.status)) {
    return { label: '⚪ Closed', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', status: 'closed', days: 0 }
  }

  const createdTime = deal.created_at ? new Date(deal.created_at).getTime() : Date.now()
  const days = Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)))

  if (days <= 14) {
    return { label: `🟢 Active (${days}d)`, color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', status: 'active', days }
  } else if (days <= 30) {
    return { label: `🟡 Follow-Up (${days}d)`, color: '#b45309', bg: '#fffbeb', border: '#fde68a', status: 'attention', days }
  } else {
    return { label: `🔴 Stale (${days}d)`, color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', status: 'stale', days }
  }
}

export default function ProposalList({ proposalVersion }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSBU, setFilterSBU] = useState('ALL')
  const [filterHealth, setFilterHealth] = useState('ALL')

  // Drag-and-Drop state
  const [draggedDealId, setDraggedDealId] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)

  // Slide-over Drawer State
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [saving, setSaving] = useState(false)

  // Quick Activity Log State
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0])
  const [activityNote, setActivityNote] = useState('')
  const [nextActionCommitment, setNextActionCommitment] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')
  const [loggingActivity, setLoggingActivity] = useState(false)

  useEffect(() => {
    loadProposals()
  }, [proposalVersion])

  async function loadProposals() {
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
          deal_value_etb,
          submission_deadline,
          actual_submission_date,
          document_url,
          notes,
          created_at,
          opportunities (
            id,
            lead_code,
            sbus (name),
            clients (name, sector)
          )
        `)
        .order('created_at', { ascending: false })

      if (err) throw err
      setProposals(data || [])
    } catch (err) {
      setError(err.message || 'Could not load proposals.')
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickStatusChange(id, newStatus) {
    try {
      const { error: updateErr } = await supabase
        .from('proposals')
        .update({ status: newStatus })
        .eq('id', id)

      if (updateErr) throw updateErr
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      )
    } catch (err) {
      alert('Could not update status: ' + err.message)
    }
  }

  // Drag & Drop Handlers
  function handleDragStart(e, id) {
    setDraggedDealId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggedDealId(null)
    setDragOverStage(null)
  }

  function handleDragOver(e, stage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stage) {
      setDragOverStage(stage)
    }
  }

  function handleDragLeave(e, stage) {
    if (e.currentTarget.contains(e.relatedTarget)) return
    if (dragOverStage === stage) {
      setDragOverStage(null)
    }
  }

  async function handleDrop(e, targetStage) {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId
    setDragOverStage(null)
    setDraggedDealId(null)

    if (!dealId) return
    const deal = proposals.find((p) => p.id === dealId)
    if (deal && deal.status !== targetStage) {
      await handleQuickStatusChange(dealId, targetStage)
    }
  }

  async function handleSaveDealDossier(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error: updateErr } = await supabase
        .from('proposals')
        .update({
          title: selectedDeal.title,
          deal_value_etb: parseFloat(selectedDeal.deal_value_etb) || 0,
          status: selectedDeal.status,
          submission_deadline: selectedDeal.submission_deadline || null,
          document_url: selectedDeal.document_url || null,
          notes: selectedDeal.notes || null
        })
        .eq('id', selectedDeal.id)

      if (updateErr) throw updateErr

      setProposals((prev) =>
        prev.map((p) => (p.id === selectedDeal.id ? { ...p, ...selectedDeal } : p))
      )
      setSelectedDeal(null)
    } catch (err) {
      alert('Failed to save deal changes: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogActivity(e) {
    e.preventDefault()
    if (!activityNote.trim() && !nextActionCommitment.trim()) {
      alert('Please enter a note or next action commitment.')
      return
    }

    setLoggingActivity(true)
    try {
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16)
      let logEntry = `[${timestamp}] ${activityType}: ${activityNote.trim()}`
      if (nextActionCommitment.trim()) {
        logEntry += ` | Next: ${nextActionCommitment.trim()}`
      }
      if (nextActionDate) {
        logEntry += ` (Due: ${nextActionDate})`
      }

      const updatedNotes = selectedDeal.notes
        ? `${logEntry}\n\n${selectedDeal.notes}`
        : logEntry

      const { error: propErr } = await supabase
        .from('proposals')
        .update({ notes: updatedNotes })
        .eq('id', selectedDeal.id)

      if (propErr) throw propErr

      try {
        await supabase.from('follow_up_logs').insert([
          {
            proposal_id: selectedDeal.id,
            activity_type: activityType,
            remarks: activityNote,
            next_action: nextActionCommitment || null,
            next_action_date: nextActionDate || null
          }
        ])
      } catch (logTableErr) {
        // Fallback silently if table schema differs
      }

      const updatedDeal = { ...selectedDeal, notes: updatedNotes }
      setSelectedDeal(updatedDeal)
      setProposals((prev) =>
        prev.map((p) => (p.id === selectedDeal.id ? updatedDeal : p))
      )

      setActivityNote('')
      setNextActionCommitment('')
      setNextActionDate('')
      alert('Activity logged successfully!')
    } catch (err) {
      alert('Could not log activity: ' + err.message)
    } finally {
      setLoggingActivity(false)
    }
  }

  const filteredProposals = proposals.filter((p) => {
    const clientName = p.opportunities?.clients?.name?.toLowerCase() || ''
    const title = p.title?.toLowerCase() || ''
    const code = p.proposal_code?.toLowerCase() || ''
    const sbu = p.opportunities?.sbus?.name || ''
    const health = getDealHealth(p)

    const matchesSearch =
      clientName.includes(searchQuery.toLowerCase()) ||
      title.includes(searchQuery.toLowerCase()) ||
      code.includes(searchQuery.toLowerCase())

    const matchesSBU = filterSBU === 'ALL' || sbu === filterSBU
    const matchesHealth = filterHealth === 'ALL' || health.status === filterHealth

    return matchesSearch && matchesSBU && matchesHealth
  })

  return (
    <div>
      {/* Top Filter Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by client, title, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              width: '240px',
              fontSize: 13,
            }}
          />

          <select
            value={filterSBU}
            onChange={(e) => setFilterSBU(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              backgroundColor: '#fff',
            }}
          >
            <option value="ALL">All SBUs</option>
            <option value="Institute">Institute</option>
            <option value="CBS">CBS</option>
            <option value="DAS">DAS</option>
            <option value="IIP">IIP</option>
          </select>

          <select
            value={filterHealth}
            onChange={(e) => setFilterHealth(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              backgroundColor: '#fff',
            }}
          >
            <option value="ALL">All Deal Health</option>
            <option value="active">🟢 Active (&lt; 14d)</option>
            <option value="attention">🟡 Follow-Up (14–30d)</option>
            <option value="stale">🔴 Stale (&gt; 30d)</option>
            <option value="closed">⚪ Closed</option>
          </select>
        </div>

        <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
          <button
            type="button"
            onClick={() => setViewMode('board')}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              backgroundColor: viewMode === 'board' ? '#fff' : 'transparent',
              color: viewMode === 'board' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            📊 Pipeline Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              backgroundColor: viewMode === 'table' ? '#fff' : 'transparent',
              color: viewMode === 'table' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            📋 Table View
          </button>
        </div>
      </div>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>Loading pipeline data…</p>}

      {/* 1. KANBAN BOARD WITH NATIVE DRAG AND DROP */}
      {!loading && viewMode === 'board' && (
        <div
          style={{
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 16,
            minHeight: '620px',
          }}
        >
          {STAGES.map((stage) => {
            const stageDeals = filteredProposals.filter((p) => p.status === stage)
            const stageValue = stageDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
            const isTargeted = dragOverStage === stage

            return (
              <div
                key={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={(e) => handleDragLeave(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                style={{
                  width: 285,
                  minWidth: 285,
                  background: isTargeted ? '#f0f9ff' : '#f8fafc',
                  borderRadius: 8,
                  border: isTargeted ? '2px dashed #0284c7' : '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '75vh',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #e2e8f0',
                    background: isTargeted ? '#e0f2fe' : '#ffffff',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{stage}</span>
                    <span
                      style={{
                        background: isTargeted ? '#bae6fd' : '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#475569',
                      }}
                    >
                      {stageDeals.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
                    {formatMoney(stageValue)}
                  </div>
                </div>

                <div
                  style={{
                    padding: 10,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flex: 1,
                  }}
                >
                  {stageDeals.map((deal) => {
                    const clientName = deal.opportunities?.clients?.name || 'Unassigned Client'
                    const sbuName = deal.opportunities?.sbus?.name || 'SBU'
                    const health = getDealHealth(deal)
                    const isBeingDragged = draggedDealId === deal.id

                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedDeal({ ...deal })}
                        style={{
                          background: '#ffffff',
                          padding: 12,
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          cursor: 'grab',
                          opacity: isBeingDragged ? 0.45 : 1,
                          transition: 'opacity 0.15s ease, transform 0.1s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {sbuName}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                background: health.bg,
                                color: health.color,
                                border: `1px solid ${health.border}`,
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {health.label}
                            </span>
                          </div>

                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                            {deal.proposal_code || 'PROPOSAL'}
                          </span>
                        </div>

                        <strong style={{ fontSize: 13, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                          {clientName}
                        </strong>

                        <p
                          style={{
                            fontSize: 12,
                            color: '#475569',
                            margin: '0 0 10px 0',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {deal.title}
                        </p>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: 8,
                            marginTop: 4,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                            {formatMoney(deal.deal_value_etb)}
                          </span>

                          <select
                            value={deal.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleQuickStatusChange(deal.id, e.target.value)}
                            style={{
                              fontSize: 11,
                              padding: '2px 4px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              backgroundColor: '#f8fafc',
                              cursor: 'pointer',
                            }}
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}

                  {stageDeals.length === 0 && (
                    <div
                      style={{
                        padding: '24px 10px',
                        textAlign: 'center',
                        color: isTargeted ? '#0284c7' : '#94a3b8',
                        fontSize: 12,
                        border: isTargeted ? '1px dashed #0284c7' : '1px dashed #cbd5e1',
                        borderRadius: 6,
                        backgroundColor: isTargeted ? '#e0f2fe' : 'transparent',
                        fontWeight: isTargeted ? 600 : 400,
                      }}
                    >
                      {isTargeted ? 'Drop deal here' : 'No deals in this stage'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 2. TABLE VIEW */}
      {!loading && viewMode === 'table' && (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Code</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Client</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Scope / Title</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>SBU</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Deal Health</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Status</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Deadline</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Value (ETB)</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((deal) => {
                const health = getDealHealth(deal)
                return (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedDeal({ ...deal })}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0369a1' }}>
                      {deal.proposal_code || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      {deal.opportunities?.clients?.name || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{deal.title}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          background: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {deal.opportunities?.sbus?.name || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: health.bg,
                          color: health.color,
                          border: `1px solid ${health.border}`,
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {health.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={deal.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleQuickStatusChange(deal.id, e.target.value)}
                        style={{
                          fontSize: 12,
                          padding: '3px 6px',
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      {deal.submission_deadline || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {formatMoney(deal.deal_value_etb)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. HUBSPOT DEAL DOSSIER (SLIDE-OVER DRAWER) */}
      {selectedDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              height: '100vh',
              backgroundColor: '#ffffff',
              boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              overflowY: 'auto',
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {selectedDeal.opportunities?.sbus?.name || 'SBU'}
                  </span>
                  {(() => {
                    const health = getDealHealth(selectedDeal)
                    return (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: health.bg,
                          color: health.color,
                          border: `1px solid ${health.border}`,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {health.label}
                      </span>
                    )
                  })()}
                </div>
                <h3 style={{ margin: '8px 0 2px 0', color: '#0f172a' }}>
                  {selectedDeal.opportunities?.clients?.name || 'Client Deal'}
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>{selectedDeal.proposal_code}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeal(null)}
                style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Activity & Follow-Up Logger Box */}
            <div
              style={{
                marginTop: 18,
                padding: 14,
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚡ Log Touchpoint & Schedule Next Action
              </h4>

              <form onSubmit={handleLogActivity} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    backgroundColor: '#fff',
                  }}
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <textarea
                  rows={2}
                  placeholder="Conversation notes (e.g. Discussed proposal with Board Chair, requested revised budget)..."
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Next commitment (e.g. Send revised budget)"
                    value={nextActionCommitment}
                    onChange={(e) => setNextActionCommitment(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                  <input
                    type="date"
                    value={nextActionDate}
                    onChange={(e) => setNextActionDate(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loggingActivity}
                  style={{
                    padding: '7px 12px',
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: loggingActivity ? 'not-allowed' : 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  {loggingActivity ? 'Recording…' : 'Save Touchpoint'}
                </button>
              </form>
            </div>

            {/* Editable Deal Dossier Form */}
            <form onSubmit={handleSaveDealDossier} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Proposal Scope / Title
                </label>
                <textarea
                  rows={3}
                  value={selectedDeal.title || ''}
                  onChange={(e) => setSelectedDeal({ ...selectedDeal, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Deal Value (ETB)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={selectedDeal.deal_value_etb || 0}
                    onChange={(e) => setSelectedDeal({ ...selectedDeal, deal_value_etb: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Pipeline Stage
                  </label>
                  <select
                    value={selectedDeal.status}
                    onChange={(e) => setSelectedDeal({ ...selectedDeal, status: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Submission Deadline
                </label>
                <input
                  type="date"
                  value={selectedDeal.submission_deadline || ''}
                  onChange={(e) => setSelectedDeal({ ...selectedDeal, submission_deadline: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Google Drive Proposal / Folder Link
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={selectedDeal.document_url || ''}
                  onChange={(e) => setSelectedDeal({ ...selectedDeal, document_url: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Touchpoint History & Audit Log
                </label>
                <textarea
                  rows={6}
                  placeholder="Activity entries will appear here automatically..."
                  value={selectedDeal.notes || ''}
                  onChange={(e) => setSelectedDeal({ ...selectedDeal, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    background: '#f8fafc',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Bottom Actions */}
              <div style={{ marginTop: 10, display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDeal(null)}
                  style={{ flex: 1, padding: '9px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 2, padding: '9px', borderRadius: 6, border: 'none', background: '#ff7a59', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {saving ? 'Saving...' : 'Save Dossier Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}