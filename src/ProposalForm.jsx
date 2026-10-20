import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const SBU_OPTIONS = [
  { code: 'Institute', label: 'The i-Capital Institute' },
  { code: 'CBS', label: 'Cross Border Solutions (CBS)' },
  { code: 'IIP', label: 'i-Capital Investment Partners (IIP)' },
  { code: 'DAS', label: 'Digital & AI Solutions (DAS)' },
]

const PIPELINE_STAGES = [
  '1. Potential Target',
  '2. Lead',
  '3. Pre-Qualified Opportunity',
  '4. Qualified Pipeline',
  '5. Conversion (Won / Signed)',
  '6. Delivery & Repeat Business',
]

export default function ProposalForm({ targetContext, currentUser = 'Ybeltal Semagn', onSaved, onClose }) {
  const [formData, setFormData] = useState({
    client: '',
    sbu: 'Institute',
    product: '',
    title: '',
    dealValue: '',
    stage: '3. Pre-Qualified Opportunity',
    deadline: '',
    commercialOwner: currentUser,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (targetContext) {
      const clientName =
        targetContext.client ||
        targetContext.client_name ||
        targetContext.name ||
        targetContext.institution ||
        ''

      setFormData((prev) => ({
        ...prev,
        client: clientName || prev.client,
        sbu: targetContext.sbu || prev.sbu,
        product: targetContext.product || targetContext.service_fit || prev.product,
        title: targetContext.title || (clientName ? `${clientName} Proposal` : prev.title),
        dealValue: targetContext.dealValue || targetContext.deal_value || prev.dealValue,
        deadline: targetContext.deadline || prev.deadline,
        notes: targetContext.notes || prev.notes,
        stage: targetContext.stage || '3. Pre-Qualified Opportunity',
      }))
    }
  }, [targetContext])

  async function handleSubmit(e) {
    e.preventDefault()
    const cleanClient = formData.client.trim()

    if (!cleanClient) {
      setError('Please provide the client name.')
      return
    }

    setLoading(true)
    setError('')

    // Set both client and client_name so all queries and triggers succeed
    const payload = {
      client: cleanClient,
      client_name: cleanClient,
      sbu: formData.sbu,
      product: formData.product.trim() || 'Executive Advisory',
      title: formData.title.trim() || `${cleanClient} Proposal`,
      deal_value: Number(formData.dealValue) || 0,
      stage: formData.stage,
      deadline: formData.deadline || null,
      commercial_owner: formData.commercialOwner || currentUser,
      notes: formData.notes || '',
      updated_at: new Date().toISOString(),
    }

    try {
      // 1. If migrating a record with an existing ID, update in place
      if (targetContext?.id) {
        const { error: updateErr } = await supabase
          .from('opportunities')
          .update(payload)
          .eq('id', targetContext.id)

        if (updateErr) throw updateErr
      } else {
        // 2. Check for an existing lead to upgrade and prevent duplicate Kanban cards
        const { data: existingLeads } = await supabase
          .from('opportunities')
          .select('id, client, client_name, stage')
          .limit(100)

        const match = existingLeads?.find((d) => {
          const name = (d.client || d.client_name || '').toLowerCase().trim()
          return name === cleanClient.toLowerCase() && (d.stage?.includes('Target') || d.stage?.includes('Lead'))
        })

        if (match?.id) {
          const { error: upgradeErr } = await supabase
            .from('opportunities')
            .update(payload)
            .eq('id', match.id)

          if (upgradeErr) throw upgradeErr
        } else {
          // 3. Insert fresh proposal
          const prefix = formData.sbu.substring(0, 4).toUpperCase()
          const generatedCode = `${prefix}-2026-${Math.floor(100 + Math.random() * 900)}`

          const { error: insertErr } = await supabase.from('opportunities').insert([
            {
              ...payload,
              code: generatedCode,
              created_at: new Date().toISOString(),
            },
          ])

          if (insertErr) throw insertErr
        }
      }

      onSaved?.()
    } catch (err) {
      setError(err.message || 'Failed to register proposal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && (
        <div style={{ padding: 10, borderRadius: 6, background: '#fef2f2', border: '1px solid #fecdd3', color: '#b91c1c', fontSize: 12 }}>
          {error}
        </div>
      )}

      {targetContext && (
        <div style={{ padding: '8px 12px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd', fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
          ⚡ Converting account: <strong>{formData.client}</strong> (will register in active pipeline)
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            Client Account *
          </label>
          <input
            type="text"
            required
            value={formData.client}
            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
            placeholder="e.g. Cooperative Bank of Oromia, CBE, VisionFund"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            Strategic Business Unit (SBU) *
          </label>
          <select
            value={formData.sbu}
            onChange={(e) => setFormData({ ...formData, sbu: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          >
            {SBU_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            Catalogue Product / Route Engine
          </label>
          <input
            type="text"
            value={formData.product}
            onChange={(e) => setFormData({ ...formData, product: e.target.value })}
            placeholder="e.g. MBL, S-OJT, Overseas Immersion"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            Proposal Title / Mandate Scope
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Executive Board Study Tour & Immersion"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            Deal Value (ETB)
          </label>
          <input
            type="number"
            value={formData.dealValue}
            onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
            placeholder="e.g. 10000000"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            Pipeline Target Stage
          </label>
          <select
            value={formData.stage}
            onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          >
            {PIPELINE_STAGES.map((stg) => (
              <option key={stg} value={stg}>
                {stg}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            Submission Deadline
          </label>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
          Notes &amp; Scope Requirements
        </label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Deliverables, scope notes, or AI extraction metadata…"
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 18px',
            borderRadius: 6,
            border: 'none',
            background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Saving…' : 'Save & Register Deal →'}
        </button>
      </div>
    </form>
  )
}