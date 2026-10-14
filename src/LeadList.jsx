import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { BUDGET_TIERS, OPPORTUNITY_CHANNELS } from './pipelineConfig'

export default function LeadList({ onConvertToProposal, refreshVersion }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Screening Modal State
  const [screeningLead, setScreeningLead] = useState(null)
  const [screenChannel, setScreenChannel] = useState('DIRECT')
  const [screenBudgetTier, setScreenBudgetTier] = useState('TIER_2')
  const [screenDecisionMaker, setScreenDecisionMaker] = useState('')
  const [screenNotes, setScreenNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadLeads() {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id,
          lead_code,
          title,
          qualification_status,
          priority,
          notes,
          clients (name, sector),
          sbus (code, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      setError(err.message || 'Could not load leads.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [refreshVersion])

  async function handleSaveScreening(e) {
    e.preventDefault()
    if (!screeningLead) return

    setBusy(true)
    try {
      const selectedTierObj = BUDGET_TIERS.find((t) => t.id === screenBudgetTier) || BUDGET_TIERS[1]
      const newPriority = selectedTierObj.priority // 'High', 'Medium', 'Low'
      const newStatus = newPriority === 'High' ? 'Priority Pursuit' : 'Qualified'

      const appendedNotes = `[SCREENED: Channel=${screenChannel}, DecisionMaker=${screenDecisionMaker || 'Not specified'}, Budget=${selectedTierObj.label}] ${screenNotes}`.trim()

      const { error } = await supabase
        .from('opportunities')
        .update({
          qualification_status: newStatus,
          priority: newPriority,
          notes: appendedNotes,
        })
        .eq('id', screeningLead.id)

      if (error) throw error

      setScreeningLead(null)
      setScreenDecisionMaker('')
      setScreenNotes('')
      loadLeads()
    } catch (err) {
      alert('Could not save screening scorecard: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const filteredLeads = leads.filter((l) => {
    const query = searchTerm.toLowerCase()
    const clientName = (l.clients?.name || '').toLowerCase()
    const title = (l.title || '').toLowerCase()
    const code = (l.lead_code || '').toLowerCase()
    return clientName.includes(query) || title.includes(query) || code.includes(query)
  })

  if (loading) return <p>Loading lead intake register...</p>
  if (error) return <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Lead Intake & Screening Register</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Capture, qualify via the 4-point scorecard, and convert institutional opportunities into formal proposals.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search leads by client or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, width: 260 }}
        />
      </div>

      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Lead Code</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Client / Organization</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Opportunity Scope</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>SBU</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Screening Status</th>
              <th style={{ padding: '10px 14px', color: '#475569' }}>Priority</th>
              <th style={{ padding: '10px 14px', color: '#475569', textAlign: 'right' }}>Pipeline Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const isUnscreened = !lead.qualification_status || lead.qualification_status === 'Unscreened'
              const isConverted = (lead.notes || '').includes('Converted')

              return (
                <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0369a1' }}>{lead.lead_code}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{lead.clients?.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#334155' }}>{lead.title}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', padding: '2px 8px', borderRadius: 10, color: '#475569' }}>
                      {lead.sbus?.code || 'INST'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 12,
                        background: isUnscreened ? '#fef3c7' : '#dcfce7',
                        color: isUnscreened ? '#92400e' : '#166534',
                      }}
                    >
                      {lead.qualification_status || 'Unscreened'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: lead.priority === 'High' ? '#b91c1c' : '#475569' }}>
                    {lead.priority}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {isUnscreened ? (
                      <button
                        type="button"
                        onClick={() => setScreeningLead(lead)}
                        style={{
                          padding: '6px 12px',
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        🔍 Screen Lead
                      </button>
                    ) : isConverted ? (
                      <span style={{ fontSize: 11, color: '#166534', fontWeight: 700, background: '#dcfce7', padding: '4px 8px', borderRadius: 4 }}>
                        ✓ Converted
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onConvertToProposal?.(lead)}
                        style={{
                          padding: '6px 12px',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        ⚡ Convert to Proposal
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* INTERACTIVE 4-POINT SCREENING MODAL */}
      {screeningLead && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 520, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>🔍 4-Point Lead Screening Scorecard</h3>
              <span style={{ fontSize: 11, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6 }}>
                {screeningLead.lead_code}
              </span>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#64748b' }}>
              Evaluate <strong>{screeningLead.clients?.name}</strong> ({screeningLead.title}) against governance qualification criteria before unlocking proposal conversion.
            </p>

            <form onSubmit={handleSaveScreening} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  1. Origination Channel / Source
                </label>
                <select
                  value={screenChannel}
                  onChange={(e) => setScreenChannel(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  {OPPORTUNITY_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.label} ({ch.tier})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  2. Budget & Deal Size Tier
                </label>
                <select
                  value={screenBudgetTier}
                  onChange={(e) => setScreenBudgetTier(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  {BUDGET_TIERS.map((tier) => (
                    <option key={tier.id} value={tier.id}>{tier.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  3. Client Decision-Maker / Point of Contact
                </label>
                <input
                  type="text"
                  placeholder="e.g., Ato Dawit, Director of Strategy"
                  value={screenDecisionMaker}
                  onChange={(e) => setScreenDecisionMaker(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  4. Qualification Remarks / Strategic Fit Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Confirm alignment with SBU product engines and institutional capacity..."
                  value={screenNotes}
                  onChange={(e) => setScreenNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setScreeningLead(null)}
                  disabled={busy}
                  style={{ flex: 1, padding: '9px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{ flex: 2, padding: '9px', borderRadius: 6, border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {busy ? 'Qualifying...' : '✓ Qualify & Unlock Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}