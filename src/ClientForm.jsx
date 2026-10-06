import { useState } from 'react'
import { supabase } from './supabase'

export default function ClientForm({ onSaved }) {
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave(event) {
    // Save through Supabase without reloading the page.
    event.preventDefault()

    if (!name.trim()) {
      setMessage('Please enter a client name.')
      return
    }

    setBusy(true)
    setMessage('')

    try {
      // The database generates the client's unique ID.
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: name.trim(),
          sector: sector.trim() || null,
        })
        .select('id, name')
        .single()

      if (error) throw error

      setName('')
      setSector('')
      setMessage(`Client saved: ${data.name}`)
      onSaved?.()
    } catch (error) {
      setMessage(error.message || 'Unable to save the client.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2>Add Client</h2>
      <p>Create a client before adding their opportunities.</p>

      <form onSubmit={handleSave}>
        <label htmlFor="client-name">Client name</label>
        <input
          id="client-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
          required
        />

        <label htmlFor="client-sector">Sector (optional)</label>
        <input
          id="client-sector"
          value={sector}
          onChange={(event) => setSector(event.target.value)}
          disabled={busy}
        />

        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save client'}
        </button>

        {message && <p role="status">{message}</p>}
      </form>
    </section>
  )
}