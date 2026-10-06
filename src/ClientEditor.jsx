import { useState } from 'react'
import { supabase } from './supabase'

export default function ClientEditor({ client, onSaved }) {
  const [name, setName] = useState(client.name || '')
  const [sector, setSector] = useState(client.sector || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Include the client ID so each form has unique input labels.
  const inputPrefix = `client-editor-${client.id}`

  async function handleSave(event) {
    event.preventDefault()
    if (busy) return

    setMessage('')
    setError('')

    const cleanName = name.trim()
    const cleanSector = sector.trim()

    if (!cleanName) {
      setError('Please enter a client name.')
      return
    }

    setBusy(true)

    try {
      // Update the existing client using its permanent database ID.
      // Renaming the client keeps its linked leads and proposals.
      const { data, error: requestError } = await supabase
        .from('clients')
        .update({
          name: cleanName,
          sector: cleanSector || null,
        })
        .eq('id', client.id)
        .select('id, client_code, name, sector')
        .single()

      if (requestError) throw requestError

      setName(data.name)
      setSector(data.sector || '')

      // Tell the client directory to display the saved information.
      onSaved?.(data)
      setMessage('Client details saved successfully.')
    } catch (err) {
      setError(err.message || 'Could not save client details.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ marginTop: 20, marginBottom: 24 }}>
      <h3>Edit client details</h3>

      <form onSubmit={handleSave} style={{ maxWidth: 600 }}>
        <label htmlFor={`${inputPrefix}-name`}>
          Client name
        </label>

        <input
          id={`${inputPrefix}-name`}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          disabled={busy}
        />

        <label htmlFor={`${inputPrefix}-sector`}>
          Sector
        </label>

        <input
          id={`${inputPrefix}-sector`}
          type="text"
          value={sector}
          onChange={(event) => setSector(event.target.value)}
          placeholder="For example: Banking or Microfinance"
          disabled={busy}
        />

        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save client details'}
        </button>
      </form>

      {message && (
        <p role="status" style={{ color: '#166534' }}>
          {message}
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}
    </section>
  )
}