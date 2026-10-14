import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { PIPELINE_STAGES, LOSS_REASONS, evaluateStageGate } from './pipelineConfig'

export default function ProposalList({ refreshVersion, onRefresh }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Stage-Gate Modal State
  const [stageGateModal, setStageGateModal] = useState(null) // { proposal, targetStage, missing }
  const [modalAmount, setModalAmount] = useState('')
  const [modalDeadline, setModalDeadline] = useState('')
  const [modalLossReason, setModalLossReason] = useState('')
  const [modalNotes, setModalNotes] = useState('')
  const [busy, setBusy] = useState(false)

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
          notes,
          created_at,
          opportunities (
            lead_code,
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

    // Evaluate Stage-Gate Exit Criteria
    const evaluation = evaluateStageGate(proposal, newStage)

    if (evaluation.isUnlocked) {
      // If unlocked, update directly in database
      await updateProposalStage(proposal.id, newStage, {})
    } else {
      // If locked, open the Smart Stage-Gate Popup to collect missing requirements
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
        ...(extraFields.deal_value_etb !== undefined && { deal_value_etb: extraFields.deal_value_etb ? parseFloat(extraFields.deal_value_etb) : null }),
        ...(extraFields.submission_deadline !== undefined && { submission_deadline: extraFields.submission_deadline || null }),
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

  const filteredProposals = proposals.filter((p) => {
    const q = searchTerm.toLowerCase()
    const code = (p.proposal_code || '').toLowerCase()
    const client = (p.opportunities?.clients?.name || '').toLowerCase()
    const title = (p.title || '').toLowerCase()
    return code.includes(q) || client.includes(q) || title.includes(q)
  })

  if (loading) return <p>Loading deals and proposals…</p>
  if (error) return <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Active Deals & Formal Proposals</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Monitor stage progression, product engines, and stage-gated proposal execution.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search proposals by code, client, or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, width: 280 }}
        />
      </div>

      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Proposal Code</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Client</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Scope / Title</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>SBU & Engine</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Deal Value (ETB)</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Pipeline Stage</th>
            </tr>
          </thead>
          <tbody>
            {filteredProposals.map((p) => {
              const sbuName = p.opportunities?.sbus?.code || 'INST'
              const dealVal = p.deal_value_etb ? Number(p.deal_value_etb).toLocaleString() : '—'

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0369a1' }}>{p.proposal_code || '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{p.opportunities?.clients?.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#334155', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{sbuName}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{p.product_engine || 'General'}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#166534' }}>ETB {dealVal}</td>
                  <td style={{ padding: '10px 14px' }}>
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

      {/* SMART STAGE-GATE POPUP MODAL */}
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
              To advance this proposal to <strong>"{stageGateModal.targetStage}"</strong>, the governance framework requires you to complete the missing fields below:
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