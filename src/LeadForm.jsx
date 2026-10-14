import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function LeadForm({ userId, onSaved, clientVersion }) {
  const [clients, setClients] = useState([])
  const [sbus, setSbus] = useState([])
  const [clientId, setClientId] = useState('')
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
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

  function handleClientSelectChange(e) {
    const val = e.target.value
    if (val === 'NEW_CLIENT_OPTION') {
      setIsCreatingNewClient(true)
      setClientId('')
    } else {
      setIsCreatingNewClient(false)
      setNewClientName('')
      setClientId(val)
    }
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!sbuId || !title.trim()) {
      setMessage('Please select an SBU and enter an opportunity title.')
      return
    }

    if (!isCreatingNewClient && !clientId) {
      setMessage('Please select a client or register a new one.')
      return
    }

    if (isCreatingNewClient && !newClientName.trim()) {
      setMessage('Please enter the name of the new client.')
      return
    }

    setBusy(true)
    setMessage('')

    try {
      let targetClientId = clientId

      // If user chose to create a new client inline, insert it first
      if (isCreatingNewClient) {
        const { data: newClientData, error: clientInsertError } = await supabase
          .from('clients')
          .insert({ name: newClientName.trim(), sector: 'Institutional' })
          .select('id')
          .single()

        if (clientInsertError) throw clientInsertError
        targetClientId = newClientData.id
      }

      // Resolve authenticated owner ID
      let currentOwnerId = userId
      if (!currentOwnerId) {
        const { data: { user } } = await supabase.auth.getUser()
        currentOwnerId = user?.id || null
      }

      const { error } = await supabase
        .from('opportunities')
        .insert({
          lead_code: autoLeadCode,
          client_id: targetClientId,
          sbu_id: sbuId,
          title: title.trim(),
          owner_id: currentOwnerId,
          qualification_status: 'Unscreened',
          priority: 'Medium',
        })
        .select('id')
        .single()

      if (error) throw error

      setTitle('')
      setNewClientName('')
      setIsCreatingNewClient(false)
      setClientId('')
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
          value={isCreatingNewClient ? 'NEW_CLIENT_OPTION' : clientId}
          onChange={handleClientSelectChange}
          disabled={busy}
          required
        >
          <option value="">Select a client</option>
          <option value="NEW_CLIENT_OPTION" style={{ fontWeight: 700, color: '#0284c7' }}>
            ➕ [ Register a New Client... ]
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        {/* Inline New Client Input */}
        {isCreatingNewClient && (
          <div style={{ marginTop: 8, padding: 10, background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
            <label htmlFor="new-client-name" style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: 4 }}>
              New Client / Organization Name
            </label>
            <input
              id="new-client-name"
              type="text"
              placeholder="e.g., Ethiopian Capital Market Authority"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              disabled={busy}
              required
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>
        )}

        <label htmlFor="lead-sbu" style={{ marginTop: 12, display: 'block' }}>SBU</label>
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

        <label htmlFor="lead-title" style={{ marginTop: 12, display: 'block' }}>Opportunity</label>
        <input
          id="lead-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
          required
          placeholder="e.g., Executive Leadership & Governance Program"
        />

        <button type="submit" disabled={busy} style={{ marginTop: 16 }}>
          {busy ? 'Saving…' : `Save Lead (${autoLeadCode})`}
        </button>

        {message && <p role="status" style={{ marginTop: 10 }}>{message}</p>}
      </form>
    </section>
  )
}