import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import {
  PIPELINE_STAGES,
  SBU_PRODUCT_TAXONOMY,
  LOSS_REASONS,
  checkTrackerReadiness,
  evaluateStageGate,
} from './pipelineConfig'

const PROPOSAL_DEVELOPERS = [
  { id: 'Ybeltal Semagn', name: 'Ybeltal Semagn (DAS / BD Lead)' },
  { id: 'Institute SBU Team', name: 'Institute SBU Technical Team' },
  { id: 'CBS SBU Team', name: 'CBS SBU Technical Team' },
  { id: 'IIP SBU Team', name: 'IIP SBU Technical Team' },
  { id: 'DAS SBU Team', name: 'DAS SBU Technical Team' },
]

export default function ProposalForm({ leadVersion = 0, onSaved }) {
  const [leads, setLeads] = useState([])
  const [leadId, setLeadId] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('Lead')
  const [productEngine, setProductEngine] = useState('')
  const [specificProduct, setSpecificProduct] = useState('')
  const [bdOwner, setBdOwner] = useState('')
  const [proposalDeveloper, setProposalDeveloper] = useState('Ybeltal Semagn')
  const [nextAction, setNextAction] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [amount, setAmount] = useState('')
  const [lossReason, setLossReason] = useState('')
  const [notes, setNotes] = useState('')
  const [autoProposalCode, setAutoProposalCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadLeads() {
      setLoading(true)
      setLoadError('')

      try {
        const { data, error } = await supabase
          .from('opportunities')
          .select('id, title, qualification_status, clients(name), sbus(code, name)')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(100)

        if (error) throw error
        if (!cancelled) setLeads(data || [])
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || 'Could not load leads.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLeads()
    return () => {
      cancelled = true
    }
  }, [leadVersion])

  // Resolve active SBU taxonomy for the selected lead
  const selectedLead = leads.find((l) => l.id === leadId)
  const sbuCodeRaw = (selectedLead?.sbus?.code || selectedLead?.sbus?.name || 'INST').toUpperCase()

  let activeSbuKey = 'INST'
  if (sbuCodeRaw.includes('CBS') || sbuCodeRaw.includes('CROSS')) activeSbuKey = 'CBS'
  else if (sbuCodeRaw.includes('IIP') || sbuCodeRaw.includes('INVEST')) activeSbuKey = 'IIP'
  else if (sbuCodeRaw.includes('DAS') || sbuCodeRaw.includes('DIGITAL') || sbuCodeRaw.includes('AI')) activeSbuKey = 'DAS'
  else activeSbuKey = 'INST'

  const availableEngines = SBU_PRODUCT_TAXONOMY[activeSbuKey]?.engines || []
  const activeEngineObj = availableEngines.find((e) => e.label === productEngine)
  const availableProducts = activeEngineObj?.products || []

  async function handleLeadChange(selectedId) {
    setLeadId(selectedId)
    setProductEngine('')
    setSpecificProduct('')

    if (!selectedId) {
      setAutoProposalCode('')
      return
    }

    const lead = leads.find((l) => l.id === selectedId)
    const sbuCode = lead?.sbus?.code || 'INST'
    const currentYear = new Date().getFullYear()
    const prefix = `${sbuCode}-${currentYear}-`

    try {
      const { data } = await supabase
        .from('proposals')
        .select('proposal_code')
        .ilike('proposal_code', `${prefix}%`)

      let maxSeq = 0
      if (data) {
        data.forEach((p) => {
          if (p.proposal_code) {
            const match = p.proposal_code.match(/(\d+)$/)
            if (match) {
              const num = parseInt(match[1], 10)
              if (num > maxSeq) maxSeq = num
            }
          }
        })
      }
      const nextCode = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
      setAutoProposalCode(nextCode)

      if (!title && lead?.title) {
        setTitle(lead.title)
      }
    } catch {
      setAutoProposalCode(`${prefix}001`)
    }
  }

  const combinedNotes = lossReason
    ? `[LOSS REASON: ${lossReason}] ${notes}`.trim()
    : notes.trim()

  const draftDealState = {
    title: title.trim(),
    client_name: selectedLead?.clients?.name,
    product_engine: productEngine.trim() || specificProduct.trim(),
    bd_owner: bdOwner.trim(),
    proposal_developer: proposalDeveloper.trim(),
    notes: combinedNotes,
    next_action: nextAction.trim(),
    next_action_date: nextActionDate,
    deal_value_etb: amount,
    submission_deadline: deadline,
  }

  // 1. Live Tracker-Readiness evaluation
  const currentReadiness = checkTrackerReadiness(draftDealState)

  // 2. Live Stage-Gate evaluation for the currently selected stage
  const stageGateStatus = evaluateStageGate(draftDealState, status)

  async function saveProposal(event) {
    event.preventDefault()
    setMessage('')

    if (!leadId || !title.trim()) {
      setMessage('Please select a lead and enter a proposal title.')
      return
    }

    // Warn if lead has not been screened yet
    if (selectedLead?.qualification_status === 'Unscreened') {
      setMessage('⚠️ Governance Gate: This lead is still "Unscreened". Please screen and qualify the lead in Lead Intake before registering a formal proposal.')
      return
    }

    // Enforce Stage-Gate Exit Criteria before allowing save
    if (!stageGateStatus.isUnlocked) {
      setMessage(
        `🔒 Stage Gate Locked for "${status}": Please complete [${stageGateStatus.missingRequirements.join(', ')}] before saving at this stage.`
      )
      return
    }

    if (amount !== '' && !/^\d+(\.\d{1,2})?$/.test(amount)) {
      setMessage('Enter a valid ETB amount with up to two decimal places.')
      return
    }

    setBusy(true)

    try {
      const { error } = await supabase
        .from('proposals')
        .insert({
          opportunity_id: leadId,
          proposal_code: autoProposalCode,
          title: title.trim(),
          status: status,
          deal_value_etb: amount === '' ? null : amount,
          submission_deadline: deadline || null,
          product_engine: productEngine.trim() || null,
          specific_product: specificProduct.trim() || null,
          bd_owner: bdOwner.trim() || null,
          proposal_developer: proposalDeveloper.trim() || null,
          next_action: nextAction.trim() || null,
          next_action_date: nextActionDate || null,
          is_tracker_ready: currentReadiness.isReady,
          notes: combinedNotes || null,
          follow_up_required: true,
        })
        .select('id')
        .single()

      if (error) throw error

      setTitle('')
      setStatus('Lead')
      setProductEngine('')
      setSpecificProduct('')
      setBdOwner('')
      setProposalDeveloper('Ybeltal Semagn')
      setNextAction('')
      setNextActionDate('')
      setDeadline('')
      setAmount('')
      setLossReason('')
      setNotes('')
      setAutoProposalCode('')
      setMessage(`Proposal ${autoProposalCode} saved successfully.`)
      onSaved?.()
    } catch (error) {
      setMessage(error.message || 'Could not save the proposal.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p>Loading leads for proposals...</p>
  if (loadError) return <p role="alert">{loadError}</p>

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Add Proposal</h2>
        {autoProposalCode && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              background: '#ecfdf5',
              color: '#047857',
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #a7f3d0',
            }}
          >
            Auto Proposal ID: {autoProposalCode}
          </span>
        )}
      </div>

      <p>Select a screened & qualified lead that this proposal belongs to.</p>

      {leads.length === 0 ? (
        <p>Add a lead first before creating a proposal.</p>
      ) : (
        <form onSubmit={saveProposal}>
          {/* Linked Lead with Screening Badge */}
          <label htmlFor="proposal-lead">Linked lead</label>
          <select
            id="proposal-lead"
            value={leadId}
            onChange={(event) => handleLeadChange(event.target.value)}
            required
            disabled={busy}
          >
            <option value="">Select a lead</option>
            {leads.map((lead) => {
              const qStatus = lead.qualification_status || 'Unscreened'
              const badge = qStatus === 'Unscreened' ? '⚠️ [Unscreened]' : `✓ [${qStatus}]`
              return (
                <option key={lead.id} value={lead.id}>
                  {badge} {lead.clients?.name || 'Unnamed client'} — {lead.title} ({lead.sbus?.code || 'No SBU'})
                </option>
              )
            })}
          </select>

          {selectedLead?.qualification_status === 'Unscreened' && (
            <div style={{ marginTop: 6, padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 12, fontWeight: 600 }}>
              ⚠️ This lead is currently <strong>Unscreened</strong>. Please screen it in the Lead Intake tab before converting to a proposal.
            </div>
          )}

          {/* Proposal Title */}
          <label htmlFor="proposal-title" style={{ marginTop: 12, display: 'block' }}>
            Proposal title / scope
          </label>
          <input
            id="proposal-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            disabled={busy}
          />

          {/* 6-Stage Progression Selector with Live Lock Status */}
          <label htmlFor="proposal-status" style={{ marginTop: 12, display: 'block' }}>
            Pipeline Stage (Stage-Gated)
          </label>
          <select
            id="proposal-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={busy}
          >
            {PIPELINE_STAGES.map((s) => {
              const check = evaluateStageGate(draftDealState, s.id)
              const lockPrefix = check.isUnlocked ? '✓' : '🔒'
              return (
                <option key={s.id} value={s.id}>
                  {lockPrefix} {s.label} {!check.isUnlocked ? `(Requires: ${check.missingRequirements.join(', ')})` : '— Unlocked'}
                </option>
              )
            })}
          </select>

          {/* Stage-Gate Alert Banner if user picks a locked stage */}
          {!stageGateStatus.isUnlocked && (
            <div
              style={{
                marginTop: 8,
                padding: '10px 12px',
                borderRadius: 6,
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#be123c',
                fontSize: 12,
              }}
            >
              <strong>🔒 Stage Gate Requirement for "{status}":</strong> You must fill in{' '}
              <u>{stageGateStatus.missingRequirements.join(', ')}</u> below to unlock this stage.
            </div>
          )}

          {/* Mandatory Loss Reason Selector when Stage = Lost */}
          {status === 'Lost' && (
            <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
              <label htmlFor="proposal-loss-reason" style={{ color: '#b91c1c', fontWeight: 700, fontSize: 12 }}>
                Mandatory Loss Reason
              </label>
              <select
                id="proposal-loss-reason"
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                required
                disabled={busy}
              >
                <option value="">Select primary reason for loss...</option>
                {LOSS_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cascading Taxonomy: Product Engine & Specific Product */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label htmlFor="proposal-engine">
                Product Engine / Service Line ({SBU_PRODUCT_TAXONOMY[activeSbuKey]?.name || 'SBU'})
              </label>
              <select
                id="proposal-engine"
                value={productEngine}
                onChange={(e) => {
                  setProductEngine(e.target.value)
                  setSpecificProduct('')
                }}
                disabled={busy}
              >
                <option value="">Select Product Engine / Route</option>
                {availableEngines.map((eng) => (
                  <option key={eng.id} value={eng.label}>
                    {eng.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="proposal-product">Specific Product / Offer</label>
              <select
                id="proposal-product"
                value={specificProduct}
                onChange={(e) => setSpecificProduct(e.target.value)}
                disabled={busy || !productEngine}
              >
                <option value="">
                  {productEngine ? 'Select specific offer' : 'Choose Engine first'}
                </option>
                {availableProducts.map((prod) => (
                  <option key={prod} value={prod}>
                    {prod}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Commercial Owner & Proposal Developer Accountability */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label htmlFor="proposal-owner">BD / Commercial Owner</label>
              <input
                id="proposal-owner"
                placeholder="e.g., Ybeltal Mekete"
                value={bdOwner}
                onChange={(event) => setBdOwner(event.target.value)}
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="proposal-developer">Assigned Proposal Developer (Tech/Fin)</label>
              <select
                id="proposal-developer"
                value={proposalDeveloper}
                onChange={(event) => setProposalDeveloper(event.target.value)}
                disabled={busy}
              >
                {PROPOSAL_DEVELOPERS.map((dev) => (
                  <option key={dev.id} value={dev.id}>{dev.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Date & Mandatory Next Action */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label htmlFor="proposal-action-date">Action Target Date</label>
              <input
                id="proposal-action-date"
                type="date"
                value={nextActionDate}
                onChange={(event) => setNextActionDate(event.target.value)}
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="proposal-action">Mandatory Next Action</label>
              <input
                id="proposal-action"
                placeholder="e.g., Submit technical offer"
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          {/* Live Governance Tracker-Readiness Status Card */}
          <div
            style={{
              marginTop: 14,
              marginBottom: 14,
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 12,
              border: currentReadiness.isReady ? '1px solid #bbf7d0' : '1px solid #fed7aa',
              background: currentReadiness.isReady ? '#f0fdf4' : '#fffbeb',
              color: currentReadiness.isReady ? '#166534' : '#9a3412',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>
                {currentReadiness.isReady
                  ? '✓ Opportunity is Tracker-Ready'
                  : '⚠️ Not Yet Tracker-Ready (Draft Only)'}
              </span>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Governance Standard
              </span>
            </div>
            {!currentReadiness.isReady && (
              <div style={{ marginTop: 4, fontSize: 11 }}>
                Missing required fields: <strong>{currentReadiness.missingFields.join(', ')}</strong>
              </div>
            )}
          </div>

          {/* Financials & Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="proposal-amount">Deal value (ETB)</label>
              <input
                id="proposal-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={busy}
                placeholder="Required from Pre-Qualified onwards"
              />
            </div>
            <div>
              <label htmlFor="proposal-deadline">Submission deadline</label>
              <input
                id="proposal-deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          {/* Notes */}
          <label htmlFor="proposal-notes" style={{ marginTop: 12, display: 'block' }}>
            Remarks / notes
          </label>
          <textarea
            id="proposal-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={busy}
            placeholder="Context, shortlist score, contract award reference, or client constraints..."
          />

          <button
            type="submit"
            disabled={busy || !stageGateStatus.isUnlocked}
            style={{
              marginTop: 16,
              opacity: !stageGateStatus.isUnlocked ? 0.6 : 1,
              cursor: !stageGateStatus.isUnlocked ? 'not-allowed' : 'pointer',
            }}
          >
            {busy
              ? 'Saving...'
              : !stageGateStatus.isUnlocked
              ? `🔒 Complete Stage Gate Fields to Save (${status})`
              : `Save Proposal ${autoProposalCode ? `(${autoProposalCode})` : ''}`}
          </button>

          {message && <p role="status" style={{ marginTop: 10 }}>{message}</p>}
        </form>
      )}
    </section>
  )
}