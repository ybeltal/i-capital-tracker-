import { useState } from 'react'
import { supabase } from './supabase'

// Use the date on the user's computer, without a UTC date shift.
function todayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Link this form to either a lead or a proposal.
export default function FollowUpForm({
  opportunityId = null,
  proposalId = null,
  onSaved,
}) {
  const [activityDate, setActivityDate] = useState(todayDate)
  const [activityType, setActivityType] = useState('Phone Call')
  const [summary, setSummary] = useState('')
  const [outcome, setOutcome] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  // Keep field IDs unique if two different records are open.
  const prefix = `follow-up-${proposalId || opportunityId}`

  async function saveActivity(event) {
    event.preventDefault()
    setMessage('')

    // Exactly one record must be linked.
    if (Boolean(opportunityId) === Boolean(proposalId)) {
      setMessage('Open a lead or proposal before adding an activity.')
      return
    }

    if (!activityDate || !summary.trim()) {
      setMessage('Enter the activity date and a summary.')
      return
    }

    if (nextDate && !nextAction.trim()) {
      setMessage('Enter a next action when you set a next action date.')
      return
    }

    // Accept ordinary web links for supporting evidence.
    if (evidenceUrl.trim()) {
      try {
        const url = new URL(evidenceUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          setMessage('Use an evidence link beginning with http:// or https://.')
          return
        }
      } catch {
        setMessage('Enter a complete evidence link, or leave it blank.')
        return
      }
    }

    setBusy(true)

    try {
      const { error } = await supabase
        .from('follow_up_logs')
        .insert({
          opportunity_id: opportunityId,
          proposal_id: proposalId,
          activity_date: activityDate,
          activity_type: activityType,
          summary: summary.trim(),
          outcome: outcome.trim() || null,
          next_action: nextAction.trim() || null,
          next_action_date: nextDate || null,
          evidence_url: evidenceUrl.trim() || null,
          notes: notes.trim() || null,
        })
        .select('id')
        .single()

      if (error) throw error

      // Clear the activity fields after a successful save.
      setSummary('')
      setOutcome('')
      setNextAction('')
      setNextDate('')
      setEvidenceUrl('')
      setNotes('')
      setMessage('Follow-up activity saved successfully.')
      onSaved?.()
    } catch (error) {
      setMessage(error.message || 'Could not save the activity.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Add follow-up activity">
      <h3>Add Follow-up Activity</h3>
      <p>
        This activity will be linked to the
        {' '}{proposalId ? 'proposal' : 'lead'} you have open.
      </p>

      <form onSubmit={saveActivity}>
        <label htmlFor={`${prefix}-date`}>Activity date</label>
        <input
          id={`${prefix}-date`}
          type="date"
          value={activityDate}
          onChange={(event) => setActivityDate(event.target.value)}
          required
          disabled={busy}
        />

        <label htmlFor={`${prefix}-type`}>Activity type</label>
        <select
          id={`${prefix}-type`}
          value={activityType}
          onChange={(event) => setActivityType(event.target.value)}
          disabled={busy}
        >
          <option value="Phone Call">Phone Call</option>
          <option value="Email">Email</option>
          <option value="Meeting">Meeting</option>
          <option value="Message">Message</option>
          <option value="Other">Other</option>
        </select>

        <label htmlFor={`${prefix}-summary`}>What happened?</label>
        <textarea
          id={`${prefix}-summary`}
          rows={3}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          required
          disabled={busy}
          style={{ width: '100%', padding: '12px', font: 'inherit' }}
        />

        <label htmlFor={`${prefix}-outcome`}>Outcome / response</label>
        <input
          id={`${prefix}-outcome`}
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
          disabled={busy}
        />

        <label htmlFor={`${prefix}-next-action`}>Next action</label>
        <input
          id={`${prefix}-next-action`}
          value={nextAction}
          onChange={(event) => setNextAction(event.target.value)}
          disabled={busy}
          placeholder="For example: send the revised proposal"
        />

        <label htmlFor={`${prefix}-next-date`}>Next action date</label>
        <input
          id={`${prefix}-next-date`}
          type="date"
          value={nextDate}
          onChange={(event) => setNextDate(event.target.value)}
          disabled={busy}
        />

        <label htmlFor={`${prefix}-evidence`}>Evidence / document link</label>
        <input
          id={`${prefix}-evidence`}
          type="url"
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          disabled={busy}
          placeholder="https://..."
        />

        <label htmlFor={`${prefix}-notes`}>Additional notes</label>
        <textarea
          id={`${prefix}-notes`}
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={busy}
          style={{ width: '100%', padding: '12px', font: 'inherit' }}
        />

        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save Activity'}
        </button>

        {message && <p role="status">{message}</p>}
      </form>
    </section>
  )
}