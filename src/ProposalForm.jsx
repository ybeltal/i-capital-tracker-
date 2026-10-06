import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// This form creates a proposal linked to an existing lead.
export default function ProposalForm({ leadVersion = 0, onSaved }) {
  const [leads, setLeads] = useState([])
  const [leadId, setLeadId] = useState('')
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  // Reload the choices whenever a new lead is saved.
  useEffect(() => {
    let cancelled = false

    async function loadLeads() {
      setLoading(true)
      setLoadError('')

      try {
        const { data, error } = await supabase
          .from('opportunities')
          .select('id, title, clients(name), sbus(code)')
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

    // Avoid updating the screen after this form is removed.
    return () => {
      cancelled = true
    }
  }, [leadVersion])

  async function saveProposal(event) {
    event.preventDefault()
    setMessage('')

    if (!leadId || !title.trim()) {
      setMessage('Please select a lead and enter a proposal title.')
      return
    }

    // Accept a positive amount or zero, with up to two decimal places.
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
          title: title.trim(),
          submission_deadline: deadline || null,
          deal_value_etb: amount === '' ? null : amount,
          notes: notes.trim() || null,
          status: 'Initiated',
        })
        .select('id')
        .single()

      if (error) throw error

      // Clear proposal fields after a successful save.
      setTitle('')
      setDeadline('')
      setAmount('')
      setNotes('')
      setMessage('Proposal saved successfully.')
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
      <h2>Add Proposal</h2>
      <p>Select the lead that this proposal belongs to.</p>

      {leads.length === 0 ? (
        <p>Add a lead first before creating a proposal.</p>
      ) : (
        <form onSubmit={saveProposal}>
          <label htmlFor="proposal-lead">Linked lead</label>
          <select
            id="proposal-lead"
            value={leadId}
            onChange={(event) => setLeadId(event.target.value)}
            required
            disabled={busy}
          >
            <option value="">Select a lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.clients?.name || 'Unnamed client'} — {lead.title}
                {' '}({lead.sbus?.code || 'No SBU'})
              </option>
            ))}
          </select>
          <small>Choices show the latest 100 leads.</small>

          <label htmlFor="proposal-title">Proposal title / scope</label>
          <input
            id="proposal-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            disabled={busy}
          />

          <label htmlFor="proposal-deadline">Submission deadline</label>
          <input
            id="proposal-deadline"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            disabled={busy}
          />

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

          <label htmlFor="proposal-notes">Remarks / notes</label>
          <textarea
            id="proposal-notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={busy}
          />

          <button type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Save Proposal'}
          </button>

          {message && <p role="status">{message}</p>}
        </form>
      )}
    </section>
  )
}