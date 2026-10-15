import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const CHANNELS = [
  { id: 'DIRECT', label: 'Direct Client Outreach / Relationship' },
  { id: 'TENDER', label: 'Competitive Open Bid / Tender Portal' },
  { id: 'RESTRICTED', label: 'Restricted RFP / Direct Invitation' },
  { id: 'REPEAT', label: 'Repeat Business / Cross-Sell' },
]

const SBUS = [
  { id: 'Institute', code: 'INST', label: 'The i-Capital Institute' },
  { id: 'CBS', code: 'CBS', label: 'Cross Border Solutions (CBS)' },
  { id: 'IIP', code: 'IIP', label: 'i-Capital Investment Partners (IIP)' },
  { id: 'DAS', code: 'DAS', label: 'Digital & AI Solutions (DAS)' },
]

export default function LeadForm({ targetContext, currentUser = 'Ybeltal Semagn', onSaved, onClose }) {
  // 1. AUTO-GENERATED FIELDS
  const todayStr = new Date().toISOString().split('T')[0]
  const autoLeadCode = `LD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

  const [leadCode] = useState(autoLeadCode)
  const [initiatedDate] = useState(todayStr)
  const [initiatedBy, setInitiatedBy] = useState(currentUser)

  // 2. LEAD METADATA
  const [clientName, setClientName] = useState(targetContext?.client || '')
  const [sbu, setSbu] = useState(targetContext?.sbu || 'Institute')
  const [title, setTitle] = useState(
    targetContext?.product ? `${targetContext.product} Opportunity` : ''
  )
  const [channel, setChannel] = useState('DIRECT')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [nextAction, setNextAction] = useState('Conduct initial introductory meeting and needs discovery')
  const [nextActionDate, setNextActionDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState(
    targetContext ? `Target Quarter: ${targetContext.quarter} | Sector: ${targetContext.category}` : ''
  )

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (targetContext) {
      setClientName(targetContext.client || '')
      if (targetContext.sbu) setSbu(targetContext.sbu)
      if (targetContext.product) setTitle(`${targetContext.product} Engagement`)
    }
  }, [targetContext])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      // 1. Check or Insert Client in clients table
      let clientId = null
      if (clientName.trim()) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .ilike('name', clientName.trim())
          .maybeSingle()

        if (existingClient) {
          clientId = existingClient.id
        } else {
          const { data: newClient, error: clientErr } = await supabase
            .from('clients')
            .insert({ name: clientName.trim() })
            .select('id')
            .single()
          if (!clientErr && newClient) clientId = newClient.id
        }
      }

      // 2. Fetch SBU ID
      const { data: sbuData } = await supabase
        .from('sbus')
        .select('id')
        .ilike('name', `%${sbu}%`)
        .maybeSingle()

      // 3. Insert Lead Opportunity
      const leadNotes = `[INITIATED_BY: ${initiatedBy}] [CHANNEL: ${channel}] ${notes}`.trim()
      const payload = {
        lead_code: leadCode,
        client_id: clientId,
        sbu_id: sbuData ? sbuData.id : null,
        title: title || `${clientName} Engagement`,
        status: 'Initiated',
        next_action: nextAction,
        next_action_date: nextActionDate || null,
        notes: leadNotes,
      }

      const { data: insertedOpportunity, error: oppErr } = await supabase
        .from('opportunities')
        .insert(payload)
        .select()
        .single()

      if (oppErr) throw oppErr

      // 4. Create Pre-Tender Proposal record in pipeline
      const sbuObj = SBUS.find((s) => s.id === sbu) || SBUS[0]
      const autoProposalCode = `${sbuObj.code}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

      const { error: propErr } = await supabase.from('proposals').insert({
        opportunity_id: insertedOpportunity.id,
        proposal_code: autoProposalCode,
        title: title || `${clientName} Engagement`,
        status: 'Lead',
        bd_owner: `BD (${sbuObj.code})`,
        deal_value_etb: estimatedValue ? parseFloat(estimatedValue) : null,
        notes: `[INITIATED_BY: ${initiatedBy}] [LEAD_REF: ${leadCode}] ${notes}`,
      })

      if (propErr) throw propErr

      onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not save lead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Auto-filled Governance Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid #bae6fd',
          borderRadius: 8,
          padding: '12px 14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          fontSize: 11,
        }}
      >
        <div>
          <span style={{ color: '#0369a1', fontWeight: 700, display: 'block' }}>AUTO LEAD ID</span>
          <strong style={{ fontSize: 13, color: '#0f172a' }}>{leadCode}</strong>
        </div>
        <div>
          <span style={{ color: '#0369a1', fontWeight: 700, display: 'block' }}>INITIATED DATE</span>
          <strong style={{ fontSize: 13, color: '#0f172a' }}>{initiatedDate}</strong>
        </div>
        <div>
          <span style={{ color: '#0369a1', fontWeight: 700, display: 'block' }}>INITIATED BY</span>
          <strong style={{ fontSize: 13, color: '#0f172a' }}>{initiatedBy}</strong>
        </div>
      </div>

      {error && (
        <div style={{ padding: 10, borderRadius: 6, background: '#fef2f2', border: '1px solid #fecdd3', color: '#b91c1c', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Client Name & Strategic SBU */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Client / Organization Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={clientName}
            placeholder="e.g., Awash Bank, Ministry of Finance"
            onChange={(e) => setClientName(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Strategic SBU <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={sbu}
            onChange={(e) => setSbu(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          >
            {SBUS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scope / Title & Origination Channel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Opportunity Scope / Title <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            placeholder="e.g., S-OJT Leadership Program"
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Origination Channel <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          >
            {CHANNELS.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estimated Value & Action Target Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Estimated Value (ETB)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="e.g., 2500000"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Target Action Date <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="date"
            required
            value={nextActionDate}
            onChange={(e) => setNextActionDate(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>
      </div>

      {/* First / Next Action */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
          Playbook Next Action (§3 Tracker-Readiness) <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="text"
          required
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder="e.g. Schedule preliminary discovery session with HR Director"
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
        />
      </div>

      {/* Notes / Intelligence */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
          Strategic Intelligence / Context Notes
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Background, key decision-maker names, budget context..."
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
        />
      </div>

      {/* Modal Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            color: '#475569',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          style={{
            flex: 2,
            padding: '10px',
            borderRadius: 6,
            border: 'none',
            background: '#0284c7',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          {busy ? 'Saving Lead…' : '✓ Register & Migrate into Pipeline'}
        </button>
      </div>
    </form>
  )
}