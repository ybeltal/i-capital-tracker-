import { useState } from 'react'
import { supabase } from './supabase'
import FollowUpForm from './FollowUpForm'
import FollowUpList from './FollowUpList'
import ProposalDocumentEditor from './ProposalDocumentEditor'
// Edit an existing proposal instead of creating another one.
export default function ProposalEditor({ proposal, onSaved, onClose }) {
  const [status, setStatus] = useState(proposal.status)
  const [deadline, setDeadline] = useState(
    proposal.submission_deadline || ''
  )
  const [actualDate, setActualDate] = useState(
    proposal.actual_submission_date || ''
  )
  const [amount, setAmount] = useState(
    proposal.deal_value_etb == null
      ? ''
      : String(proposal.deal_value_etb)
  )
  const [notes, setNotes] = useState(proposal.notes || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [activityVersion, setActivityVersion] = useState(0)
  // Match the statuses allowed by the database.
 const statuses = [
  'Initiated',
  'In Progress',
  'Submitted',
  'Under Review',
  'Shortlisted',
  'Negotiation',
  'Won',
  'Lost',
  'On Hold',
  'Cancelled',
    'Initiated',
    'In Progress',
    'Submitted',
    'Under Review',
    'Won',
    'Lost',
    'Cancelled',
  ]

  async function saveChanges(event) {
    event.preventDefault()
    setMessage('')

    if (amount !== '' && !/^\d+(\.\d{1,2})?$/.test(amount)) {
      setMessage('Enter a valid ETB amount with up to two decimal places.')
      return
    }

    setBusy(true)

    try {
      // Update only the proposal that was clicked.
      const { data, error } = await supabase
        .from('proposals')
        .update({
          status,
          submission_deadline: deadline || null,
          actual_submission_date: actualDate || null,
          deal_value_etb: amount === '' ? null : amount,
          notes: notes.trim() || null,
        })
        .eq('id', proposal.id)
        .select(`
          id,
          status,
          submission_deadline,
          actual_submission_date,
          deal_value_etb,
          notes
        `)
        .single()

      if (error) throw error

      // Tell the proposal list to show the updated values.
      onSaved?.(data)
      setMessage('Proposal changes saved successfully.')
    } catch (error) {
      setMessage(error.message || 'Could not save changes.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel" aria-label="Edit proposal">
      <h3>Edit Proposal: {proposal.title}</h3>

      <p>
        <strong>Client: </strong>
        {proposal.opportunities?.clients?.name || '—'}
      </p>

      <p>
        <strong>Linked lead: </strong>
        {proposal.opportunities?.title || '—'}
      </p>

      <form onSubmit={saveChanges}>
        <label htmlFor="edit-proposal-status">Status</label>
        <select
          id="edit-proposal-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          required
          disabled={busy}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label htmlFor="edit-proposal-deadline">
          Submission deadline
        </label>
        <input
          id="edit-proposal-deadline"
          type="date"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          disabled={busy}
        />

        <label htmlFor="edit-proposal-actual-date">
          Actual submission date
        </label>
        <input
          id="edit-proposal-actual-date"
          type="date"
          value={actualDate}
          onChange={(event) => setActualDate(event.target.value)}
          disabled={busy}
        />

        <label htmlFor="edit-proposal-amount">Deal value (ETB)</label>
        <input
          id="edit-proposal-amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={busy}
        />

        <label htmlFor="edit-proposal-notes">Remarks / notes</label>
        <textarea
          id="edit-proposal-notes"
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={busy}
          style={{
            width: '100%',
            padding: '12px',
            font: 'inherit',
          }}
        />

        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save Changes'}
        </button>

        <button type="button" onClick={onClose} disabled={busy}>
          Close
        </button>

        {message && <p role="status">{message}</p>}
      </form>
      <ProposalDocumentEditor
  key={`document-${proposal.id}`}
  proposalId={proposal.id}
/>
      <FollowUpForm
  proposalId={proposal.id}
  onSaved={() => setActivityVersion((version) => version + 1)}
/><FollowUpList
  proposalId={proposal.id}
  activityVersion={activityVersion}
/>
    </section>

  )
}