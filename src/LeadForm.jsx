import { useEffect, useState } from 'react'
import { supabase } from './supabase'
export default function LeadForm({ userId, onSaved, clientVersion }) {
  const [clients, setClients] = useState([])
  const [sbus, setSbus] = useState([])
  const [clientId, setClientId] = useState('')
  const [sbuId, setSbuId] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      try {
        // Load the choices for both dropdowns.
        const [clientResult, sbuResult] = await Promise.all([
          supabase.from('clients').select('id, name').order('name'),
          supabase.from('sbus').select('id, code, name').order('code'),
        ])

        if (clientResult.error) throw clientResult.error
        if (sbuResult.error) throw sbuResult.error

        if (!cancelled) {
          setClients(clientResult.data || [])
          setSbus(sbuResult.data || [])
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || 'Unable to load form choices.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadOptions()
    return () => {
      cancelled = true
    }
  }, [clientVersion])

  async function handleSave(event) {
    event.preventDefault()

    if (!clientId || !sbuId || !title.trim()) {
      setMessage('Please select a client and SBU, and enter an opportunity.')
      return
    }

    setBusy(true)
    setMessage('')

    try {
      // Link the lead to its client, SBU, and signed-in owner.
      const { error } = await supabase
        .from('opportunities')
        .insert({
          client_id: clientId,
          sbu_id: sbuId,
          title: title.trim(),
          owner_id: userId,
          qualification_status: 'Unscreened',
          priority: 'Medium',
        })
        .select('id')
        .single()

      if (error) throw error

      setTitle('')
      setMessage('Lead saved successfully.')
      onSaved?.()
    } catch (error) {
      setMessage(error.message || 'Unable to save the lead.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p role="status">Loading lead form…</p>
  if (loadError) return <p role="alert">{loadError}</p>

  return (
    <section>
      <h2>Add Lead</h2>

      <form onSubmit={handleSave}>
        <label htmlFor="lead-client">Client</label>
        <select
          id="lead-client"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          disabled={busy}
          required
        >
          <option value="">Select a client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        <label htmlFor="lead-sbu">SBU</label>
        <select
          id="lead-sbu"
          value={sbuId}
          onChange={(event) => setSbuId(event.target.value)}
          disabled={busy}
          required
        >
          <option value="">Select an SBU</option>
          {sbus.map((sbu) => (
            <option key={sbu.id} value={sbu.id}>
              {sbu.code} — {sbu.name}
            </option>
          ))}
        </select>

        <label htmlFor="lead-title">Opportunity</label>
        <input
          id="lead-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
          required
        />

        <button type="submit" disabled={busy || clients.length === 0}>
          {busy ? 'Saving…' : 'Save lead'}
        </button>

        {message && <p role="status">{message}</p>}
      </form>
    </section>
  )
}