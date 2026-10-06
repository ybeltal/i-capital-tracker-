import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function LeadForm({ userId, onSaved, clientVersion }) {
  const [clients, setClients] = useState([])
  const [sbus, setSbus] = useState([])
  const [clientId, setClientId] = useState('')
  const [sbuId, setSbuId] = useState('')
  const [title, setTitle] = useState('')
  const [autoLeadCode, setAutoLeadCode] = useState('Generating…')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadOptionsAndGenerateId() {
      try {
        const [clientResult, sbuResult, oppsResult] = await Promise.all([
          supabase.from('clients').select('id, name').order('name'),
          supabase.from('sbus').select('id, code, name').order('code'),
          supabase.from('opportunities').select('lead_code'),
        ])

        if (clientResult.error) throw clientResult.error
        if (sbuResult.error) throw sbuResult.error

        // Calculate next sequential Lead ID (e.g., LD-0001 -> LD-0002)
        let maxNum = 0
        if (oppsResult.data) {
          oppsResult.data.forEach((row) => {
            if (row.lead_code) {
              const match = row.lead_code.match(/\d+/)
              if (match) {
                const num = parseInt(match[0], 10)
                if (num > maxNum) maxNum = num
              }
            }
          })
        }
        const nextCode = `LD-${String(maxNum + 1).padStart(4, '0')}`

        if (!cancelled) {
          setClients(clientResult.data || [])
          setSbus(sbuResult.data || [])
          setAutoLeadCode(nextCode)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || 'Unable to load form choices.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadOptionsAndGenerateId()
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
      const { error } = await supabase
        .from('opportunities')
        .insert({
          lead_code: autoLeadCode,
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
      setMessage(`Lead ${autoLeadCode} saved successfully.`)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Add Lead</h2>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid #bae6fd',
          }}
        >
          Auto ID: {autoLeadCode}
        </span>
      </div>

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
          {busy ? 'Saving…' : `Save Lead (${autoLeadCode})`}
        </button>

        {message && <p role="status">{message}</p>}
      </form>
    </section>
  )
}