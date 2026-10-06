import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function LeadList() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [convertingId, setConvertingId] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadLeads()
  }, [])

  async function loadLeads() {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('opportunities')
        .select(`
          id,
          lead_code,
          title,
          qualification_status,
          priority,
          initiated_date,
          clients (id, name, sector),
          sbus (id, name)
        `)
        .order('created_at', { ascending: false })

      if (err) throw err
      setLeads(data || [])
    } catch (err) {
      setError(err.message || 'Could not load leads.')
    } finally {
      setLoading(false)
    }
  }

  // HubSpot Feature: One-Click Lead-to-Deal Conversion
  async function handleConvertToProposal(lead) {
    const sbuCode = lead.sbus?.name?.toUpperCase()?.slice(0, 3) || 'INST'
    const proposalCode = `${sbuCode}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

    const confirmConvert = window.confirm(
      `Convert lead "${lead.title}" for ${lead.clients?.name} into a formal Proposal / Deal (${proposalCode})?`
    )
    if (!confirmConvert) return

    setConvertingId(lead.id)
    try {
      const { error: propErr } = await supabase.from('proposals').insert({
        opportunity_id: lead.id,
        proposal_code: proposalCode,
        title: lead.title,
        status: 'Initiated',
        deal_value_etb: 0.00,
        follow_up_required: true,
      })

      if (propErr) throw propErr

      // Mark lead as Qualified
      await supabase
        .from('opportunities')
        .update({ qualification_status: 'Qualified' })
        .eq('id', lead.id)

      alert(`✅ Successfully converted to Deal: ${proposalCode}! It is now live in your Deals & Proposals pipeline.`)
      loadLeads()
    } catch (err) {
      alert('Conversion failed: ' + err.message)
    } finally {
      setConvertingId(null)
    }
  }

  const filtered = leads.filter(
    (l) =>
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.lead_code?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Lead Intake & Screening Register</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Capture, qualify, and convert new institutional opportunities into live proposals.
          </p>
        </div>
        <input
          type="text"
          placeholder="Search leads by client or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', width: 280, fontSize: 13 }}
        />
      </div>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>Loading lead register…</p>}

      {!loading && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Lead Code</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Client / Organization</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Opportunity Scope</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>SBU</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Screening Status</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Priority</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>HubSpot Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0369a1' }}>
                    {lead.lead_code || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                    {lead.clients?.name || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#334155', maxWidth: 300 }}>
                    {lead.title}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                      {lead.sbus?.name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontWeight: 600,
                        backgroundColor: lead.qualification_status === 'Qualified' ? '#dcfce7' : '#fef3c7',
                        color: lead.qualification_status === 'Qualified' ? '#166534' : '#92400e',
                      }}
                    >
                      {lead.qualification_status || 'Unscreened'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 11,
                        color: lead.priority === 'High' ? '#b91c1c' : lead.priority === 'Medium' ? '#d97706' : '#64748b',
                      }}
                    >
                      {lead.priority || 'Normal'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      disabled={convertingId === lead.id}
                      onClick={() => handleConvertToProposal(lead)}
                      style={{
                        backgroundColor: '#ff7a59',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      {convertingId === lead.id ? 'Converting…' : '⚡ Convert to Proposal'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}