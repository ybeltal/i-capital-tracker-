import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function LeadList() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // Conversion Modal State
  const [convertingLead, setConvertingLead] = useState(null)
  const [dealValue, setDealValue] = useState('')
  const [targetDeadline, setTargetDeadline] = useState('')
  const [savingConvert, setSavingConvert] = useState(false)

  useEffect(() => {
    loadLeads()
  }, [])

  async function loadLeads() {
    setLoading(true)
    setError('')
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
          sbus (id, name),
          proposals (id, proposal_code, status)
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

  function openConvertModal(lead) {
    setConvertingLead(lead)
    setDealValue('')
    setTargetDeadline('')
  }

  async function handleConfirmConversion(e) {
    e.preventDefault()
    if (!convertingLead) return

    setSavingConvert(true)
    const sbuCode = convertingLead.sbus?.name?.toUpperCase()?.slice(0, 3) || 'INST'
    const proposalCode = `${sbuCode}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

    try {
      const { error: propErr } = await supabase.from('proposals').insert({
        opportunity_id: convertingLead.id,
        proposal_code: proposalCode,
        title: convertingLead.title,
        status: 'Initiated',
        deal_value_etb: parseFloat(dealValue) || 0.00,
        submission_deadline: targetDeadline || null,
        follow_up_required: true,
      })

      if (propErr) throw propErr

      // Mark lead as Qualified
      await supabase
        .from('opportunities')
        .update({ qualification_status: 'Qualified' })
        .eq('id', convertingLead.id)

      alert(`✅ Successfully converted to Deal: ${proposalCode}! It is now live in your Deals & Proposals pipeline.`)
      setConvertingLead(null)
      loadLeads()
    } catch (err) {
      alert('Conversion failed: ' + err.message)
    } finally {
      setSavingConvert(false)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
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
                <th style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>Pipeline Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const existingProposal = lead.proposals && lead.proposals.length > 0 ? lead.proposals[0] : null

                return (
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
                      {existingProposal ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#047857',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            padding: '4px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ✅ Converted: {existingProposal.proposal_code}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openConvertModal(lead)}
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
                            whiteSpace: 'nowrap',
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
      )}

      {/* Conversion Setup Modal */}
      {convertingLead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              width: '100%',
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>⚡ Convert Lead to Proposal</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b' }}>
              Promoting <strong>{convertingLead.title}</strong> ({convertingLead.clients?.name}) into an active proposal pursuit.
            </p>

            <form onSubmit={handleConfirmConversion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Estimated Deal Value (ETB)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 750000"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Submission Deadline / Target SLA Date
                </label>
                <input
                  type="date"
                  value={targetDeadline}
                  onChange={(e) => setTargetDeadline(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  style={{
                    flex: 1,
                    padding: '9px',
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
                  disabled={savingConvert}
                  style={{
                    flex: 2,
                    padding: '9px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#ff7a59',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {savingConvert ? 'Converting…' : 'Launch Proposal Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}