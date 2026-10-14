import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { PIPELINE_STAGES, LOSS_REASONS, evaluateStageGate } from './pipelineConfig'
import UserAvatar from './UserAvatar'
import ProposalEditor from './ProposalEditor'

export default function ProposalList({ refreshVersion, onRefresh }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Drawer Edit State
  const [editingProposal, setEditingProposal] = useState(null)

  // Pipeline Filter Tab: 'all', 'proposals', 'leads'
  const [pipelineTab, setPipelineTab] = useState('all')
  const [selectedSbu, setSelectedSbu] = useState('ALL')

  // Stage-Gate Modal State
  const [stageGateModal, setStageGateModal] = useState(null)
  const [modalAmount, setModalAmount] = useState('')
  const [modalDeadline, setModalDeadline] = useState('')
  const [modalLossReason, setModalLossReason] = useState('')
  const [modalNotes, setModalNotes] = useState('')
  const [busy, setBusy] = useState(false)

  // View Mode: Board vs Table
  const [viewMode, setViewMode] = useState('board')

  async function loadProposals() {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id,
          proposal_code,
          title,
          status,
          deal_value_etb,
          submission_deadline,
          product_engine,
          bd_owner,
          proposal_developer,
          notes,
          created_at,
          opportunities (
            lead_code,
            title,
            clients (name),
            sbus (code, name)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProposals(data || [])
    } catch (err) {
      setError(err.message || 'Could not load proposals.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProposals()
  }, [refreshVersion])

  async function handleStatusChangeAttempt(proposal, newStage) {
    if (proposal.status === newStage) return

    const evaluation = evaluateStageGate(proposal, newStage)

    if (evaluation.isUnlocked) {
      await updateProposalStage(proposal.id, newStage, {})
    } else {
      setStageGateModal({
        proposal,
        targetStage: newStage,
        missing: evaluation.missingRequirements,
      })
      setModalAmount(proposal.deal_value_etb || '')
      setModalDeadline(proposal.submission_deadline || '')
      setModalLossReason('')
      setModalNotes(proposal.notes || '')
    }
  }

  async function updateProposalStage(proposalId, stage, extraFields) {
    setBusy(true)
    try {
      let updatedNotes = extraFields.notes !== undefined ? extraFields.notes : undefined
      if (stage === 'Lost' && modalLossReason) {
        updatedNotes = `[LOSS REASON: ${modalLossReason}] ${updatedNotes || ''}`.trim()
      }

      const updatePayload = {
        status: stage,
        ...(extraFields.deal_value_etb !== undefined && {
          deal_value_etb: extraFields.deal_value_etb ? parseFloat(extraFields.deal_value_etb) : null,
        }),
        ...(extraFields.submission_deadline !== undefined && {
          submission_deadline: extraFields.submission_deadline || null,
        }),
        ...(updatedNotes !== undefined && { notes: updatedNotes }),
      }

      const { error } = await supabase
        .from('proposals')
        .update(updatePayload)
        .eq('id', proposalId)

      if (error) throw error

      setStageGateModal(null)
      loadProposals()
      onRefresh?.()
    } catch (err) {
      alert('Could not update stage: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveStageGateModal(e) {
    e.preventDefault()
    if (!stageGateModal) return

    const { proposal, targetStage } = stageGateModal
    await updateProposalStage(proposal.id, targetStage, {
      deal_value_etb: modalAmount,
      submission_deadline: modalDeadline,
      notes: modalNotes,
    })
  }

  // Filter logic for Pipeline Tab
  const filteredByTab = proposals.filter((p) => {
    const isPreTender = p.status === 'Initiated' || p.status === 'Lead'
    if (pipelineTab === 'proposals') return !isPreTender
    if (pipelineTab === 'leads') return isPreTender
    return true
  })

  // Filter logic for SBU & Search
  const finalFilteredProposals = filteredByTab.filter((p) => {
    const q = searchTerm.toLowerCase()
    const code = (p.proposal_code || '').toLowerCase()
    const client = (p.opportunities?.clients?.name || '').toLowerCase()
    const title = (p.title || '').toLowerCase()
    const matchesSearch = code.includes(q) || client.includes(q) || title.includes(q)

    const sbuCode = (p.opportunities?.sbus?.code || 'INST').toUpperCase()
    const matchesSbu = selectedSbu === 'ALL' || sbuCode === selectedSbu

    return matchesSearch && matchesSbu
  })

  const boardStages = PIPELINE_STAGES.filter((s) => s.id !== 'Target')

  if (loading) return <p>Loading deals and proposals…</p>
  if (error) return <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>

  return (
    <section>
      {/* Top Header & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Active Deals &amp; Formal Proposals</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Board-ready commercial governance pipeline with automated stage-gating and instant filters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={selectedSbu}
            onChange={(e) => setSelectedSbu(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', fontWeight: 600 }}
          >
            <option value="ALL">All SBUs (Institute, CBS, IIP, DAS)</option>
            <option value="INST">Institute</option>
            <option value="CBS">CBS</option>
            <option value="IIP">IIP</option>
            <option value="DAS">DAS</option>
          </select>

          <input
            type="text"
            placeholder="Search code, client, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, width: 220 }}
          />
        </div>
      </div>

      {/* Pipeline View Tabs & Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Pipeline View:</span>

          <button
            type="button"
            onClick={() => setPipelineTab('all')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              background: pipelineTab === 'all' ? '#0284c7' : '#e2e8f0',
              color: pipelineTab === 'all' ? '#fff' : '#475569',
            }}
          >
            All Deals ({proposals.length})
          </button>

          <button
            type="button"
            onClick={() => setPipelineTab('proposals')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              background: pipelineTab === 'proposals' ? '#0284c7' : '#e2e8f0',
              color: pipelineTab === 'proposals' ? '#fff' : '#475569',
            }}
          >
            Formal Proposals ({proposals.filter((p) => p.status !== 'Initiated' && p.status !== 'Lead').length})
          </button>

          <button
            type="button"
            onClick={() => setPipelineTab('leads')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              background: pipelineTab === 'leads' ? '#0284c7' : '#e2e8f0',
              color: pipelineTab === 'leads' ? '#fff' : '#475569',
            }}
          >
            Leads &amp; Pre-Tenders ({proposals.filter((p) => p.status === 'Initiated' || p.status === 'Lead').length})
          </button>
        </div>

        <div style={{ display: 'flex', background: '#e2e8f0', padding: 3, borderRadius: 6 }}>
          <button
            type="button"
            onClick={() => setViewMode('board')}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: viewMode === 'board' ? '#fff' : 'transparent',
              color: viewMode === 'board' ? '#0f172a' : '#64748b',
            }}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: viewMode === 'table' ? '#fff' : 'transparent',
              color: viewMode === 'table' ? '#0f172a' : '#64748b',
            }}
          >
            Table
          </button>
        </div>
      </div>

      {/* BOARD VIEW */}
      {viewMode === 'board' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, alignItems: 'start' }}>
          {boardStages.map((stage) => {
            const stageDeals = finalFilteredProposals.filter((p) => p.status === stage.id)
            const stageTotalVal = stageDeals.reduce((sum, d) => sum + (parseFloat(d.deal_value_etb) || 0), 0)

            return (
              <div key={stage.id} style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: 12, minHeight: 450 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '2px solid #cbd5e1', paddingBottom: 6 }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{stage.label}</h4>
                  <span style={{ fontSize: 11, background: '#e2e8f0', padding: '2px 6px', borderRadius: 10, fontWeight: 700, color: '#334155' }}>
                    {stageDeals.length}
                  </span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 10 }}>
                  ETB {stageTotalVal.toLocaleString()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stageDeals.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                      No deals in stage
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const sbuCode = deal.opportunities?.sbus?.code || 'INST'
                      const isPreTender = deal.status === 'Initiated' || deal.status === 'Lead'

                      return (
                        <div
                          key={deal.id}
                          onClick={() => setEditingProposal(deal)}
                          style={{
                            background: '#fff',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            padding: 10,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284c7')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>{deal.proposal_code}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, background: isPreTender ? '#fef3c7' : '#f1f5f9', color: isPreTender ? '#92400e' : '#475569', padding: '1px 6px', borderRadius: 4 }}>
                              {sbuCode} {isPreTender ? '• Pre-Tender' : ''}
                            </span>
                          </div>

                          <div style={{ fontWeight: 600, fontSize: 12, color: '#0f172a', marginBottom: 2 }}>
                            {deal.opportunities?.clients?.name || 'Client'}
                          </div>
                          <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {deal.title}
                          </div>

                          {/* Avatar row */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, paddingTop: 6, borderTop: '1px solid #f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <UserAvatar name={deal.bd_owner} size={20} />
                              <span style={{ fontSize: 11, color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {deal.bd_owner || 'Unassigned BD (Click to assign)'}
                              </span>
                            </div>
                            {deal.proposal_developer && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <UserAvatar name={deal.proposal_developer} size={20} />
                                <span style={{ fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {deal.proposal_developer}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Bottom Row */}
                          <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>
                              ETB {deal.deal_value_etb ? Number(deal.deal_value_etb).toLocaleString() : '0'}
                            </span>

                            <select
                              value={deal.status}
                              onChange={(e) => handleStatusChangeAttempt(deal, e.target.value)}
                              style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 11, fontWeight: 600, background: '#f8fafc' }}
                            >
                              {PIPELINE_STAGES.map((s) => {
                                const check = evaluateStageGate(deal, s.id)
                                return (
                                  <option key={s.id} value={s.id}>
                                    {check.isUnlocked ? '✓' : '🔒'} {s.label}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Proposal Code</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Client</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Scope / Title</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>SBU &amp; Engine</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Accountability (BD / Dev)</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Deal Value (ETB)</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Pipeline Stage</th>
              </tr>
            </thead>
            <tbody>
              {finalFilteredProposals.map((p) => {
                const sbuName = p.opportunities?.sbus?.code || 'INST'
                const dealVal = p.deal_value_etb ? Number(p.deal_value_etb).toLocaleString() : '—'

                return (
                  <tr
                    key={p.id}
                    onClick={() => setEditingProposal(p)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0369a1' }}>{p.proposal_code || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{p.opportunities?.clients?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#334155', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{sbuName}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{p.product_engine || 'General'}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <UserAvatar name={p.bd_owner} size={20} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{p.bd_owner || 'Unassigned'}</span>
                      </div>
                      {p.proposal_developer && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserAvatar name={p.proposal_developer} size={18} />
                          <span style={{ fontSize: 11, color: '#64748b' }}>{p.proposal_developer}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#166534' }}>ETB {dealVal}</td>
                    <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChangeAttempt(p, e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          fontWeight: 600,
                          background: p.status === 'Won' ? '#dcfce7' : p.status === 'Lost' ? '#fee2e2' : '#f8fafc',
                          color: p.status === 'Won' ? '#166534' : p.status === 'Lost' ? '#b91c1c' : '#0f172a',
                        }}
                      >
                        {PIPELINE_STAGES.map((s) => {
                          const check = evaluateStageGate(p, s.id)
                          return (
                            <option key={s.id} value={s.id}>
                              {check.isUnlocked ? '✓' : '🔒'} {s.label}
                            </option>
                          )
                        })}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT DRAWER MODAL */}
      {editingProposal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setEditingProposal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              height: '100vh',
              background: '#fff',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ProposalEditor
              proposal={editingProposal}
              onSaved={(savedData) => {
                loadProposals()
                onRefresh?.()
                setEditingProposal(null)
              }}
              onClose={() => setEditingProposal(null)}
            />
          </div>
        </div>
      )}

      {/* Stage-Gate Requirement Check Modal */}
      {stageGateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0, color: '#be123c' }}>🔒 Stage-Gate Requirement Check</h3>
              <span style={{ fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#be123c', padding: '2px 8px', borderRadius: 6 }}>
                {stageGateModal.proposal.proposal_code}
              </span>
            </div>
            <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#475569' }}>
              To advance this proposal to <strong>"{stageGateModal.targetStage}"</strong>, governance requires you to complete the missing fields below:
            </p>

            <form onSubmit={handleSaveStageGateModal} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#fff1f2', padding: 10, borderRadius: 6, border: '1px solid #fecdd3', fontSize: 12, color: '#9f1239' }}>
                <strong>Missing Requirements:</strong> {stageGateModal.missing.join(', ')}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Deal Value (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 2500000"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Submission Deadline / Target Date
                </label>
                <input
                  type="date"
                  value={modalDeadline}
                  onChange={(e) => setModalDeadline(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              {stageGateModal.targetStage === 'Lost' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', display: 'block', marginBottom: 4 }}>
                    Mandatory Loss Reason
                  </label>
                  <select
                    value={modalLossReason}
                    onChange={(e) => setModalLossReason(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="">Select primary reason for loss...</option>
                    {LOSS_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Remarks / Compliance Notes
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Context or award reference..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setStageGateModal(null)}
                  disabled={busy}
                  style={{ flex: 1, padding: '9px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{ flex: 2, padding: '9px', borderRadius: 6, border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {busy ? 'Saving...' : '✓ Complete & Advance Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}