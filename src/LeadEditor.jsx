import { useState } from 'react'
import { supabase } from './supabase'
import FollowUpForm from './FollowUpForm'
import FollowUpList from './FollowUpList'
import LeadContactEditor from './LeadContactEditor'
export default function LeadEditor({ lead, onSaved, onClose }) {
  // Fill the form with the selected lead's existing information.
  const [status, setStatus] = useState(lead.qualification_status)
  const [priority, setPriority] = useState(lead.priority || 'Medium')
  const [notes, setNotes] = useState(lead.notes || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [activityVersion, setActivityVersion] = useState(0)
  // Start with these qualification choices.
  const statuses = ['Unscreened', 'Screened', 'Qualified', 'Disqualified']

  // Preserve an existing status if it is outside the initial choices.
  if (!statuses.includes(lead.qualification_status)) {
    statuses.push(lead.qualification_status)
  }

  async function saveChanges(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      // Update only this lead, using its unique database ID.
      const { data, error } = await supabase
        .from('opportunities')
        .update({
          qualification_status: status,
          priority,
          notes: notes.trim() || null,
        })
        .eq('id', lead.id)
        .select('id, qualification_status, priority, notes')
        .single()

      if (error) throw error

      // Tell the lead list about the saved changes.
      onSaved?.(data)
      setMessage('Changes saved successfully.')
    } catch (error) {
      setMessage(error.message || 'Unable to save changes.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel" aria-label="Edit lead">
      <h3>{lead.title}</h3>
      <p><strong>Client:</strong> {lead.clients?.name || '—'}</p>
      <p><strong>SBU:</strong> {lead.sbus?.code || '—'}</p>

      <form onSubmit={saveChanges}>
        <label htmlFor="edit-status">Qualification</label>
        <select
          id="edit-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          disabled={busy}
          required
        >
          {statuses.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <label htmlFor="edit-priority">Priority</label>
        <select
          id="edit-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          disabled={busy}
          required
        >
          {['Low', 'Medium', 'High', 'Critical'].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <label htmlFor="edit-notes">Notes</label>
        <textarea
          id="edit-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={busy}
          rows={4}
          style={{ width: '100%', padding: '12px', font: 'inherit' }}
        />

        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>

        <button type="button" onClick={onClose} disabled={busy}>
          Close details
        </button>

        {message && <p role="status">{message}</p>}
      </form>
      <LeadContactEditor
  key={`contact-${lead.id}`}
  leadId={lead.id}
/>
      <FollowUpForm
  opportunityId={lead.id}
  onSaved={() => setActivityVersion((version) => version + 1)}
/>

<FollowUpList
  opportunityId={lead.id}
  activityVersion={activityVersion}
/>
    </section>
  )
}