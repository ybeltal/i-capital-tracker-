import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import FollowUpForm from './FollowUpForm'
import FollowUpList from './FollowUpList'
import ProposalDocumentEditor from './ProposalDocumentEditor'

const TEAM_MEMBERS = [
  'Ybeltal Semagn',
  'Tsegaab',
  'Seife',
  'Yeabsira',
  'Dr. Daniel',
  'Dr. Abel',
  'Raphael',
  'Aida',
  'Lemlem',
  'Atalay',
]

const PROPOSAL_DEVELOPERS = [
  'Ybeltal Semagn (DAS / BD Lead)',
  'Institute SBU Technical Team',
  'CBS SBU Technical Team',
  'IIP SBU Technical Team',
  'DAS SBU Technical Team',
]

// Stage-by-Stage Advisory Gates
const STAGE_GATES = {
  'Initiated': [
    { id: 'decision_maker', label: 'Client Decision-Maker & Key Stakeholder Identified' },
    { id: 'tor_obtained', label: 'TOR / Concept Scope Document Obtained' },
    { id: 'lead_clearance', label: 'SBU Practice Lead & Delivery Capacity Cleared' },
  ],
  'In Progress': [
    { id: 'methodology_drafted', label: 'Technical Proposal & Methodology Aligned' },
    { id: 'cvs_packaged', label: 'Consultant & Key Expert CVs Packaged' },
    { id: 'statutory_cleared', label: 'Valid Tax Clearance, License & Financials Audited' },
    { id: 'director_signoff', label: 'SBU Head & Managing Director Sign-Off' },
  ],
  'Submitted': [
    { id: 'receipt_filed', label: 'Submission Receipt / Stamped Delivery Note Filed' },
    { id: 'opening_recorded', label: 'Bid Opening / Client Review Timeline Logged' },
    { id: 'followup_scheduled', label: 'Initial Post-Submission Touchpoint Scheduled' },
  ],
  'Under Review': [
    { id: 'eval_status_checked', label: 'Client Evaluation Process & Timeline Confirmed' },
    { id: 'clarifications_cleared', label: 'Technical Clarifications / Queries Addressed' },
  ],
  'Shortlisted': [
    { id: 'pitch_deck_ready', label: 'Executive Presentation / Pitch Deck Prepared' },
    { id: 'defense_aligned', label: 'Core Technical Defense Team Aligned' },
  ],
  'Negotiation': [
    { id: 'scope_refined', label: 'Revised Work Plan & Scope of Work Confirmed' },
    { id: 'commercials_agreed', label: 'Fee Structure & Payment Milestones Agreed' },
    { id: 'legal_vetted', label: 'Contract Draft Vetted by Legal / MD' },
  ],
  'Won': [
    { id: 'contract_signed', label: 'Signed Contract / Award Letter Filed in Vault' },
    { id: 'kickoff_planned', label: 'Assignment Kickoff Date Scheduled with Client' },
    { id: 'cpo_released', label: 'Bid Bond / CPO Release Process Initiated' },
  ],
}

// Categorized Closeout Reasons
const LOSS_REASONS = [
  'Fee / Price Competition (Lower bidder selected)',
  'Technical / CV Scoring (Competitor rated higher)',
  'Incumbent Vendor Bias (Client retained prior consultant)',
  'Compliance Disqualification (Late submission / missing sheet)',
  'Other Technical Evaluation Factor',
]

const CANCEL_REASONS = [
  'Client Cancelled / Annulled RFP',
  'Client Budget Frozen / Reallocated',
  'Client Leadership / Sponsor Restructuring',
  'i-Capital Internal Capacity Conflict',
]

const PIPELINE_STATUSES = [
  'Initiated',
  'In Progress',
  'Submitted',
  'Under Review',
  'Shortlisted',
  'Negotiation',
  'Won',
  'On Hold',
  'Lost',
  'Cancelled',
]

// Tag management helpers for notes field
function parseTag(text, tag) {
  if (!text) return ''
  const match = text.match(new RegExp(`\\[${tag}:\\s*([^\\]]+)\\]`))
  return match ? match[1].trim() : ''
}

function updateTag(text, tag, value) {
  const current = text || ''
  const regex = new RegExp(`\\[${tag}:\\s*([^\\]]+)\\]`)
  const newTagStr = value ? `[${tag}: ${value}]` : ''

  if (regex.test(current)) {
    return newTagStr ? current.replace(regex, newTagStr) : current.replace(regex, '').trim()
  }
  if (!newTagStr) return current
  return current ? `${newTagStr}\n${current}` : newTagStr
}

export default function ProposalEditor({ proposal, onSaved, onClose }) {
  const [status, setStatus] = useState(proposal.status)
  const [previousStatus, setPreviousStatus] = useState(proposal.status)
  const [deadline, setDeadline] = useState(proposal.submission_deadline || '')
  const [actualDate, setActualDate] = useState(proposal.actual_submission_date || '')
  const [amount, setAmount] = useState(
    proposal.deal_value_etb == null ? '' : String(proposal.deal_value_etb)
  )

  // Strict ownership accountability: never unassigned
  const [bdOwner, setBdOwner] = useState(proposal.bd_owner || 'Ybeltal Semagn')
  const [proposalDeveloper, setProposalDeveloper] = useState(
    proposal.proposal_developer || 'Ybeltal Semagn (DAS / BD Lead)'
  )

  const [notes, setNotes] = useState(proposal.notes || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [validationErrors, setValidationErrors] = useState([])
  const [activityVersion, setActivityVersion] = useState(0)

  // Keep state synchronized if a different deal is selected
  useEffect(() => {
    setStatus(proposal.status)
    setPreviousStatus(proposal.status)
    setDeadline(proposal.submission_deadline || '')
    setActualDate(proposal.actual_submission_date || '')
    setAmount(proposal.deal_value_etb == null ? '' : String(proposal.deal_value_etb))
    setBdOwner(proposal.bd_owner || 'Ybeltal Semagn')
    setProposalDeveloper(proposal.proposal_developer || 'Ybeltal Semagn (DAS / BD Lead)')
    setNotes(proposal.notes || '')
    setValidationErrors([])
    setMessage('')
  }, [proposal])

  // Stage Checklist Gates State
  const initialGatesStr = parseTag(proposal.notes, 'GATES')
  const [checkedGates, setCheckedGates] = useState(
    initialGatesStr ? initialGatesStr.split(',').map((s) => s.trim()) : []
  )

  // Lost / Cancelled Closeout Modal State
  const [showCloseoutModal, setShowCloseoutModal] = useState(false)
  const [pendingCloseStatus, setPendingCloseStatus] = useState('')
  const [closeoutReason, setCloseoutReason] = useState('')
  const [closeoutDetail, setCloseoutDetail] = useState('')

  // Handle stage dropdown change
  function handleStatusChange(e) {
    const nextStatus = e.target.value
    if (nextStatus === 'Lost' || nextStatus === 'Cancelled') {
      setPendingCloseStatus(nextStatus)
      setCloseoutReason('')
      setCloseoutDetail('')
      setShowCloseoutModal(true)
    } else {
      setPreviousStatus(status)
      setStatus(nextStatus)
      setValidationErrors([])
    }
  }

  // Toggle advisory gate checkbox
  function toggleGate(gateId) {
    const updated = checkedGates.includes(gateId)
      ? checkedGates.filter((id) => id !== gateId)
      : [...checkedGates, gateId]

    setCheckedGates(updated)
    const updatedNotes = updateTag(notes, 'GATES', updated.join(', '))
    setNotes(updatedNotes)
  }

  // Confirm closeout modal
  function handleConfirmCloseout() {
    if (!closeoutReason) return
    const tagKey = pendingCloseStatus === 'Lost' ? 'LOSS_REASON' : 'CANCEL_REASON'
    const fullReason = closeoutDetail
      ? `${closeoutReason} — ${closeoutDetail}`
      : closeoutReason

    const updatedNotes = updateTag(notes, tagKey, fullReason)
    setNotes(updatedNotes)
    setPreviousStatus(status)
    setStatus(pendingCloseStatus)
    setShowCloseoutModal(false)
    setValidationErrors([])
  }

  // Validate mandatory blockers
  function validateStageRules() {
    const errors = []

    if (!bdOwner.trim()) {
      errors.push('Commercial Owner (BD) is mandatory and cannot be unassigned.')
    }

    if (!proposalDeveloper.trim()) {
      errors.push('Proposal Developer (Tech/Fin) is mandatory and cannot be unassigned.')
    }

    if (amount !== '' && !/^\d+(\.\d{1,2})?$/.test(amount)) {
      errors.push('Enter a valid ETB amount with up to two decimal places.')
    }

    if (status === 'Initiated') {
      if (!amount || Number(amount) <= 0) {
        errors.push('Initiated deals require an estimated Deal Value greater than ETB 0.')
      }
    }

    if (status === 'In Progress') {
      if (!deadline) {
        errors.push('Submission Deadline Date is mandatory before drafting in progress.')
      }
    }

    if (status === 'Submitted') {
      if (!actualDate && !deadline) {
        errors.push('Actual Submission Date or Submission Deadline is required for submitted deals.')
      }
    }

    if (status === 'Won') {
      if (!amount || Number(amount) <= 0) {
        errors.push('Final Contracted Value (ETB) must be confirmed to mark this deal as Won.')
      }
    }

    if (status === 'Lost') {
      const existing = parseTag(notes, 'LOSS_REASON')
      if (!existing && !closeoutReason) {
        errors.push('A Primary Loss Reason must be selected for lost proposals.')
      }
    }

    if (status === 'Cancelled') {
      const existing = parseTag(notes, 'CANCEL_REASON')
      if (!existing && !closeoutReason) {
        errors.push('A Cancellation Reason must be selected for cancelled proposals.')
      }
    }

    return errors
  }

  async function saveChanges(event) {
    event.preventDefault()
    setMessage('')
    setValidationErrors([])

    // Run mandatory validation checks
    const errors = validateStageRules()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setBusy(true)

    try {
      const { data, error } = await supabase
        .from('proposals')
        .update({
          status,
          bd_owner: bdOwner,
          proposal_developer: proposalDeveloper,
          submission_deadline: deadline || null,
          actual_submission_date: actualDate || null,
          deal_value_etb: amount === '' ? null : amount,
          notes: notes.trim() || null,
        })
        .eq('id', proposal.id)
        .select(`
          id,
          status,
          bd_owner,
          proposal_developer,
          submission_deadline,
          actual_submission_date,
          deal_value_etb,
          notes
        `)
        .single()

      if (error) throw error

      onSaved?.(data)
      setMessage('Proposal changes saved successfully.')
    } catch (error) {
      setMessage(error.message || 'Could not save changes.')
    } finally {
      setBusy(false)
    }
  }

  const activeGates = STAGE_GATES[status] || []
  const passedGatesCount = activeGates.filter((g) => checkedGates.includes(g.id)).length

  return (
    <section className="panel" aria-label="Edit proposal" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a' }}>Edit Proposal: {proposal.title}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
            Client: <strong style={{ color: '#0f172a' }}>{proposal.opportunities?.clients?.name || '—'}</strong> | 
            Linked Lead: <strong style={{ color: '#0f172a' }}>{proposal.opportunities?.title || '—'}</strong>
          </p>
        </div>
      </div>

      {/* Mandatory Blocker Alert Box */}
      {validationErrors.length > 0 && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 13, marginBottom: 4 }}>
            ⛔ Mandatory Stage Requirements Missing:
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#b91c1c', fontSize: 12 }}>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Dynamic Stage Advisory Gates Box */}
      {activeGates.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              🛡️ {status} Advisory Stage Gates
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: passedGatesCount === activeGates.length ? '#dcfce7' : '#f1f5f9',
                color: passedGatesCount === activeGates.length ? '#166534' : '#475569',
              }}
            >
              {passedGatesCount} of {activeGates.length} Cleared
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeGates.map((gate) => {
              const isChecked = checkedGates.includes(gate.id)
              return (
                <label
                  key={gate.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: isChecked ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleGate(gate.id)}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#0284c7' }}
                  />
                  <span style={{ fontWeight: isChecked ? 600 : 400 }}>
                    {gate.label}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <form onSubmit={saveChanges}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="edit-proposal-status" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
            Pipeline Stage <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            id="edit-proposal-status"
            value={status}
            onChange={handleStatusChange}
            required
            disabled={busy}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          >
            {PIPELINE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* ACCOUNTABILITY FIELDS: Commercial Owner & Proposal Developer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label htmlFor="edit-bd-owner" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Commercial Owner (BD) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="edit-bd-owner"
              value={bdOwner}
              onChange={(e) => setBdOwner(e.target.value)}
              required
              disabled={busy}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            >
              {TEAM_MEMBERS.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-proposal-dev" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Proposal Developer (Tech/Fin) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="edit-proposal-dev"
              value={proposalDeveloper}
              onChange={(e) => setProposalDeveloper(e.target.value)}
              required
              disabled={busy}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            >
              {PROPOSAL_DEVELOPERS.map((dev) => (
                <option key={dev} value={dev}>
                  {dev}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label htmlFor="edit-proposal-deadline" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Submission Deadline {status === 'In Progress' && <span style={{ color: '#dc2626' }}>*</span>}
            </label>
            <input
              id="edit-proposal-deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              disabled={busy}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="edit-proposal-actual-date" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Actual Submission Date
            </label>
            <input
              id="edit-proposal-actual-date"
              type="date"
              value={actualDate}
              onChange={(event) => setActualDate(event.target.value)}
              disabled={busy}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="edit-proposal-amount" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
            Deal Value (ETB) {(status === 'Initiated' || status === 'Won') && <span style={{ color: '#dc2626' }}>*</span>}
          </label>
          <input
            id="edit-proposal-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            placeholder="e.g. 850000"
            onChange={(event) => setAmount(event.target.value)}
            disabled={busy}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="edit-proposal-notes" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
            Audit Log / Commercial Notes
          </label>
          <textarea
            id="edit-proposal-notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={busy}
            style={{
              width: '100%',
              padding: '10px',
              font: 'inherit',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            type="submit"
            disabled={busy}
            style={{
              flex: 2,
              padding: '10px 16px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {busy ? 'Saving...' : 'Save Deal Changes'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>

        {message && (
          <p
            role="status"
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: message.includes('success') ? '#dcfce7' : '#fee2e2',
              color: message.includes('success') ? '#166534' : '#b91c1c',
            }}
          >
            {message}
          </p>
        )}
      </form>

      {/* 1-Click Reason Capture Modal for Lost or Cancelled Deals */}
      {showCloseoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 440,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', color: pendingCloseStatus === 'Lost' ? '#b91c1c' : '#475569' }}>
              {pendingCloseStatus === 'Lost' ? '🔴 Proposal Closed as Lost' : '⚪ Proposal Cancelled / Retracted'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b' }}>
              {pendingCloseStatus === 'Lost'
                ? 'Select the primary factor why this engagement was not awarded to i-Capital:'
                : 'Indicate why this RFP pursuit was withdrawn or cancelled:'}
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Primary Factor <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={closeoutReason}
                onChange={(e) => setCloseoutReason(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">-- Select Required Factor --</option>
                {(pendingCloseStatus === 'Lost' ? LOSS_REASONS : CANCEL_REASONS).map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                {pendingCloseStatus === 'Lost' ? 'Winning Firm / Note (Optional)' : 'Context Note (Optional)'}
              </label>
              <input
                type="text"
                placeholder={pendingCloseStatus === 'Lost' ? 'e.g. PwC, KPMG, HST' : 'Brief explanation'}
                value={closeoutDetail}
                onChange={(e) => setCloseoutDetail(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setShowCloseoutModal(false)
                  setStatus(previousStatus)
                }}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!closeoutReason}
                onClick={handleConfirmCloseout}
                style={{
                  flex: 2,
                  padding: '9px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: !closeoutReason ? '#94a3b8' : pendingCloseStatus === 'Lost' ? '#b91c1c' : '#334155',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: !closeoutReason ? 'not-allowed' : 'pointer',
                }}
              >
                Confirm Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Vault Component */}
      <ProposalDocumentEditor
        key={`document-${proposal.id}`}
        proposalId={proposal.id}
      />

      {/* Touchpoint Logging Form & List */}
      <FollowUpForm
        proposalId={proposal.id}
        onSaved={() => setActivityVersion((version) => version + 1)}
      />
      <FollowUpList
        proposalId={proposal.id}
        activityVersion={activityVersion}
      />
    </section>
  )
}