import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const COMMERCIAL_OWNERS = [
  'Corporate RG',
  'CEO OFFICE',
  'SBU (Institute)',
  'SBU (IIP)',
  'SBU (DAS)',
  'BD (Institute)',
  'BD (IIP)',
]

const TECHNICAL_TEAM_MEMBERS = [
  'Lemlem',
  'Atalay',
  'Raphael',
  'Yeabsira',
  'Seife',
  'Tsegaab',
  'Ybeltal Semagn',
  'Dr. Daniel',
  'Dr. Abel',
  'Aida',
]

const SBUS = [
  { id: 'Institute', code: 'INST', label: 'The i-Capital Institute' },
  { id: 'CBS', code: 'CBS', label: 'Cross Border Solutions (CBS)' },
  { id: 'IIP', code: 'IIP', label: 'i-Capital Investment Partners (IIP)' },
  { id: 'DAS', code: 'DAS', label: 'Digital & AI Solutions (DAS)' },
]

const ORIGINATION_CHANNELS = [
  { id: 'DIRECT', label: 'Direct Client Outreach / Relationship' },
  { id: 'TENDER', label: 'Competitive Open Bid / Tender Portal' },
  { id: 'RESTRICTED', label: 'Restricted RFP / Direct Invitation' },
  { id: 'REPEAT', label: 'Repeat Business / Cross-Sell' },
]

// Database-enforced valid statuses for proposals_status_check
const VALID_PIPELINE_STAGES = [
  { id: 'In Progress', label: 'In Progress (Methodology Drafting & Review)' },
  { id: 'Initiated', label: 'Initiated (Pre-Tender Pursuit)' },
  { id: 'Submitted', label: 'Submitted (Formal Bid Filed with Client)' },
  { id: 'Under Review', label: 'Under Review (Client Evaluation)' },
  { id: 'Shortlisted', label: 'Shortlisted (Technical Defense & Pitch)' },
  { id: 'Negotiation', label: 'Negotiation (Commercial Refinement & Award)' },
]

export default function ProposalForm({ targetContext, currentUser = 'Ybeltal Semagn', onSaved, onClose }) {
  const [sbu, setSbu] = useState(targetContext?.sbu || 'Institute')

  function generateProposalCode(selectedSbu) {
    const sbuObj = SBUS.find((s) => s.id === selectedSbu) || SBUS[0]
    return `${sbuObj.code}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  }

  const [proposalCode, setProposalCode] = useState(generateProposalCode(targetContext?.sbu || 'Institute'))
  const [clientName, setClientName] = useState(targetContext?.client || '')
  const [title, setTitle] = useState(targetContext?.product ? `${targetContext.product} Formal Proposal` : '')
  const [channel, setChannel] = useState('DIRECT')
  const [bdOwner, setBdOwner] = useState(COMMERCIAL_OWNERS[0])
  const [proposalDeveloper, setProposalDeveloper] = useState(TECHNICAL_TEAM_MEMBERS[0])
  const [dealValue, setDealValue] = useState('')
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [status, setStatus] = useState('In Progress')
  const [notes, setNotes] = useState(targetContext ? `Originated from Target Directory: ${targetContext.quarter}` : '')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (targetContext) {
      if (targetContext.client) setClientName(targetContext.client)
      if (targetContext.sbu) {
        setSbu(targetContext.sbu)
        setProposalCode(generateProposalCode(targetContext.sbu))
      }
      if (targetContext.product) setTitle(`${targetContext.product} Formal Proposal`)
    }
  }, [targetContext])

  function handleSbuChange(newSbu) {
    setSbu(newSbu)
    setProposalCode(generateProposalCode(newSbu))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      // 1. Resolve or Create Client
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

      // 3. Create Linked Opportunity (status omitted - opportunities does not have a status column)
      const { data: opportunity, error: oppErr } = await supabase
        .from('opportunities')
        .insert({
          lead_code: `LD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          client_id: clientId,
          sbu_id: sbuData ? sbuData.id : null,
          title: title || `${clientName} Proposal Pursuit`,
          notes: `[CHANNEL: ${channel}] ${notes}`.trim(),
        })
        .select('id')
        .single()

      if (oppErr) throw oppErr

      // 4. Create Formal Proposal Record using validated status
      const { error: propErr } = await supabase.from('proposals').insert({
        opportunity_id: opportunity.id,
        proposal_code: proposalCode,
        title: title || `${clientName} Proposal Pursuit`,
        status: status,
        bd_owner: bdOwner,
        proposal_developer: proposalDeveloper,
        deal_value_etb: dealValue ? parseFloat(dealValue) : null,
        submission_deadline: deadline || null,
        product_engine: targetContext?.product || 'Strategic Advisory',
        notes: `[CHANNEL: ${channel}] ${notes}`.trim(),
      })

      if (propErr) throw propErr

      onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not save proposal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Auto Proposal ID & Governance Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
            AUTO-GENERATED PROPOSAL CODE
          </span>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{proposalCode}</div>
        </div>
        <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>
          🛡️ Dual Governance: 1 Commercial Unit + 1 Technical Lead
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
            placeholder="e.g. Dashen Bank, Ethio telecom"
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
            onChange={(e) => handleSbuChange(e.target.value)}
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
            Proposal Scope / Title <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            placeholder="e.g., Executive Leadership Immersion in Thailand"
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
            {ORIGINATION_CHANNELS.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Accountability: Commercial Owner Unit vs 1 Technical Lead */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Commercial Owner (BD Unit) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={bdOwner}
            onChange={(e) => setBdOwner(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          >
            {COMMERCIAL_OWNERS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Proposal Developer (1 Individual) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={proposalDeveloper}
            onChange={(e) => setProposalDeveloper(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          >
            {TECHNICAL_TEAM_MEMBERS.map((member) => (
              <option key={member} value={member}>
                {member}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Deal Value (ETB) & Submission Deadline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Estimated Deal Value (ETB) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="number"
            step="0.01"
            required
            placeholder="e.g., 4500000"
            value={dealValue}
            onChange={(e) => setDealValue(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
            Submission Deadline Date <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="date"
            required
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Initial Stage: Standard Database Constraint Compliant */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
          Initial Pipeline Stage <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
        >
          {VALID_PIPELINE_STAGES.map((st) => (
            <option key={st.id} value={st.id}>
              {st.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
          Commercial &amp; Compliance Notes
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tender reference numbers, consortium partners, submission requirements..."
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
        />
      </div>

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
            background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          {busy ? 'Creating Proposal…' : '✓ Create Proposal & Add to Kanban'}
        </button>
      </div>
    </form>
  )
}