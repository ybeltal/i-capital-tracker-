import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { PIPELINE_STAGES, checkTrackerReadiness } from './pipelineConfig'

export default function ProposalForm({ leadVersion = 0, onSaved }) {
  const [leads, setLeads] = useState([])
  const [leadId, setLeadId] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('Lead')
  const [productEngine, setProductEngine] = useState('')
  const [bdOwner, setBdOwner] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [amount, setAmount] = useState('')
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
          .select('id, title, clients(name), sbus(code, name)')
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

  // Generate the next sequential Proposal Code when a Lead is selected
  async function handleLeadChange(selectedId) {
    setLeadId(selectedId)
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

  // Live Tracker-Readiness evaluation against Playbook §3 rules
  const selectedLead = leads.find((l) => l.id === leadId)
  const currentReadiness = checkTrackerReadiness({
    title: title.trim(),
    client_name: selectedLead?.clients?.name,
    product_engine: productEngine.trim(),
    bd_owner: bdOwner.trim(),
    notes: notes,
    next_action: nextAction.trim(),
    next_action_date: nextActionDate,
  })

  async function saveProposal(event) {
    event.preventDefault()
    setMessage('')

    if (!leadId || !title.trim()) {
      setMessage('Please select a lead and enter a proposal title.')
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
          bd_owner: bdOwner.trim() || null,
          next_action: nextAction.trim() || null,
          next_action_date: nextActionDate || null,
          is_tracker_ready: currentReadiness.isReady,
          notes: notes.trim() || null,
          follow_up_required: true,
        })
        .select('id')
        .single()

      if (error) throw error

      setTitle('')
      setStatus('Lead')
      setProductEngine('')
      setBdOwner('')
      setNextAction('')
      setNextActionDate('')
      setDeadline('')
      setAmount('')
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

      <p>Select the lead that this proposal belongs to.</p>

      {leads.length === 0 ? (
        <p>Add a lead first before creating a proposal.</p>
      ) : (
        <form onSubmit={saveProposal}>
          {/* Linked Lead */}
          <label htmlFor="proposal-lead">Linked lead</label>
          <select
            id="proposal-lead"
            value={leadId}
            onChange={(event) => handleLeadChange(event.target.value)}
            required
            disabled={busy}
          >
            <option value="">Select a lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.clients?.name || 'Unnamed client'} — {lead.title} ({lead.sbus?.code || 'No SBU'})
              </option>
            ))}
          </select>
          <small>Choices show the latest 100 leads.</small>

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

          {/* 6-Stage Progression Selector */}
          <label htmlFor="proposal-status" style={{ marginTop: 12, display: 'block' }}>
            Pipeline Stage (Playbook FY26/27)
          </label>
          <select
            id="proposal-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={busy}
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.description}
              </option>
            ))}
          </select>

          {/* Product Engine & BD Owner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label htmlFor="proposal-engine">Product Engine / Service</label>
              <input
                id="proposal-engine"
                placeholder="e.g., MBL, S-OJT, PRIME, SHOFER, Advisory"
                value={productEngine}
                onChange={(event) => setProductEngine(event.target.value)}
                disabled={busy}
              />
            </div>
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
          </div>

          {/* Mandatory Next Action & Target Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label htmlFor="proposal-action">Next Action</label>
              <input
                id="proposal-action"
                placeholder="e.g., Submit concept note; schedule discovery call"
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
                disabled={busy}
              />
            </div>
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
          </div>

          {/* Live Playbook Tracker-Readiness Status Card */}
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
                Playbook §3 Standard
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
                placeholder="Optional"
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
            placeholder="Context, referral details, or client constraints..."
          />

          <button type="submit" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Saving...' : `Save Proposal ${autoProposalCode ? `(${autoProposalCode})` : ''}`}
          </button>

          {message && <p role="status" style={{ marginTop: 10 }}>{message}</p>}
        </form>
      )}
    </section>
  )
}