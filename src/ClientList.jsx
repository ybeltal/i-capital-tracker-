import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function formatMoney(amount) {
  if (!amount || isNaN(amount)) return 'ETB 0.00'
  return `ETB ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function getAccountStatus(proposals, opps) {
  const hasWon = proposals.some((p) => p.status === 'Won')
  const hasOpen = proposals.some((p) => !['Won', 'Lost', 'Cancelled'].includes(p.status))

  if (hasWon) {
    return { label: '💼 Institutional Client', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' }
  }
  if (hasOpen) {
    return { label: '🎯 Active Proposal Pursuit', color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' }
  }
  if (opps.length > 0) {
    return { label: '🔍 Early Lead Intake', color: '#b45309', bg: '#fffbeb', border: '#fde68a' }
  }
  return { label: '📋 Target Enterprise', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' }
}

export default function ClientList({ clientVersion }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterSector, setFilterSector] = useState('ALL')
  const [selectedClient, setSelectedClient] = useState(null)
  const [dossierTab, setDossierTab] = useState('proposals') // 'proposals' | 'leads' | 'intel'

  // Account Notes State
  const [accountNotes, setAccountNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    loadClients()
  }, [clientVersion])

  async function loadClients() {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('clients')
        .select(`
          id,
          client_code,
          name,
          sector,
          created_at,
          opportunities (
            id,
            lead_code,
            title,
            qualification_status,
            priority,
            initiated_date,
            proposals (
              id,
              proposal_code,
              title,
              status,
              deal_value_etb,
              submission_deadline,
              document_url,
              notes
            )
          )
        `)
        .order('name', { ascending: true })

      if (err) throw err
      setClients(data || [])
    } catch (err) {
      setError(err.message || 'Could not load clients.')
    } finally {
      setLoading(false)
    }
  }

  function handleSelectClient(client) {
    setSelectedClient(client)
    setDossierTab('proposals')
    // Combine existing notes if available
    const existingNotes = client.opportunities
      ?.flatMap((o) => o.proposals?.map((p) => p.notes).filter(Boolean) || [])
      .join('\n\n---\n\n')
    setAccountNotes(existingNotes || '')
  }

  // Extract unique sectors for filtering
  const sectors = ['ALL', ...Array.from(new Set(clients.map((c) => c.sector).filter(Boolean)))]

  const filtered = clients.filter((c) => {
    const nameMatch = c.name?.toLowerCase().includes(search.toLowerCase())
    const sectorMatch = c.sector?.toLowerCase().includes(search.toLowerCase())
    const codeMatch = c.client_code?.toLowerCase().includes(search.toLowerCase())
    const matchesSearch = nameMatch || sectorMatch || codeMatch
    const matchesSector = filterSector === 'ALL' || c.sector === filterSector
    return matchesSearch && matchesSector
  })

  // Selected client computed dossier metrics
  const selectedOpps = selectedClient?.opportunities || []
  const selectedProposals = selectedOpps.flatMap((o) => o.proposals || [])
  const wonProposals = selectedProposals.filter((p) => p.status === 'Won')
  const lostProposals = selectedProposals.filter((p) => p.status === 'Lost')
  const openProposals = selectedProposals.filter((p) => !['Won', 'Lost', 'Cancelled'].includes(p.status))

  const totalWonValue = wonProposals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
  const totalOpenValue = openProposals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
  const decidedCount = wonProposals.length + lostProposals.length
  const clientWinRate = decidedCount > 0 ? Math.round((wonProposals.length / decidedCount) * 100) : null
  const accountBadge = selectedClient ? getAccountStatus(selectedProposals, selectedOpps) : null

  return (
    <div>
      {/* Search and Sector Filter Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Account 360° Client Intelligence Dossier</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Consolidated account dossiers, institutional relationship metrics, and full proposal records.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by institution name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              width: 250,
              fontSize: 13,
            }}
          />

          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              backgroundColor: '#fff',
            }}
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Sectors' : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>Scanning institutional account dossiers…</p>}

      {/* Directory Grid */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16 }}>
          {filtered.map((client) => {
            const opps = client.opportunities || []
            const props = opps.flatMap((o) => o.proposals || [])
            const wonProps = props.filter((p) => p.status === 'Won')
            const openProps = props.filter((p) => !['Won', 'Lost', 'Cancelled'].includes(p.status))
            const openVal = openProps.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
            const wonVal = wonProps.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
            const status = getAccountStatus(props, opps)

            return (
              <div
                key={client.id}
                onClick={() => handleSelectClient(client)}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 16,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'transform 0.1s ease, border-color 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: status.bg,
                        color: status.color,
                        border: `1px solid ${status.border}`,
                      }}
                    >
                      {status.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{client.client_code || 'CLIENT'}</span>
                  </div>

                  <strong style={{ fontSize: 15, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                    {client.name}
                  </strong>

                  <span
                    style={{
                      fontSize: 11,
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 600,
                      display: 'inline-block',
                      marginBottom: 12,
                    }}
                  >
                    {client.sector || 'Financial Services'}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                    <span>Active Pursuit:</span>
                    <strong style={{ color: '#0284c7' }}>{formatMoney(openVal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                    <span>Contracted Won:</span>
                    <strong style={{ color: '#047857' }}>{formatMoney(wonVal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                    <span>{props.length} Proposal(s)</span>
                    <span>{opps.length} Intake Lead(s)</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Account 360° Intelligence Dossier Drawer */}
      {selectedClient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              height: '100vh',
              background: '#fff',
              boxShadow: '-4px 0 25px rgba(0,0,0,0.18)',
              padding: 24,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: accountBadge.bg,
                      color: accountBadge.color,
                      border: `1px solid ${accountBadge.border}`,
                    }}
                  >
                    {accountBadge.label}
                  </span>
                  <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    {selectedClient.sector}
                  </span>
                </div>
                <h2 style={{ margin: '4px 0 2px 0', color: '#0f172a', fontSize: 20 }}>{selectedClient.name}</h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>Account Code: {selectedClient.client_code}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Account Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 18, marginBottom: 20 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Contracted Won
                </span>
                <strong style={{ fontSize: 14, color: '#047857', marginTop: 4, display: 'block' }}>
                  {formatMoney(totalWonValue)}
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>{wonProposals.length} won</span>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Active Pursuit
                </span>
                <strong style={{ fontSize: 14, color: '#0284c7', marginTop: 4, display: 'block' }}>
                  {formatMoney(totalOpenValue)}
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>{openProposals.length} open</span>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Win Rate
                </span>
                <strong style={{ fontSize: 14, color: '#0f172a', marginTop: 4, display: 'block' }}>
                  {clientWinRate !== null ? `${clientWinRate}%` : 'N/A'}
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>{decidedCount} decided</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setDossierTab('proposals')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  borderBottom: dossierTab === 'proposals' ? '2px solid #0284c7' : '2px solid transparent',
                  color: dossierTab === 'proposals' ? '#0284c7' : '#64748b',
                }}
              >
                📑 Proposals ({selectedProposals.length})
              </button>
              <button
                type="button"
                onClick={() => setDossierTab('leads')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  borderBottom: dossierTab === 'leads' ? '2px solid #0284c7' : '2px solid transparent',
                  color: dossierTab === 'leads' ? '#0284c7' : '#64748b',
                }}
              >
                🎯 Leads ({selectedOpps.length})
              </button>
              <button
                type="button"
                onClick={() => setDossierTab('intel')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  borderBottom: dossierTab === 'intel' ? '2px solid #0284c7' : '2px solid transparent',
                  color: dossierTab === 'intel' ? '#0284c7' : '#64748b',
                }}
              >
                📝 Account Intel & Notes
              </button>
            </div>

            {/* Tab 1: Proposals View */}
            {dossierTab === 'proposals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {selectedProposals.map((prop) => (
                  <div
                    key={prop.id}
                    style={{
                      background: '#f8fafc',
                      padding: 14,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>{prop.proposal_code}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: prop.status === 'Won' ? '#dcfce7' : prop.status === 'Lost' ? '#fee2e2' : '#e0f2fe',
                          color: prop.status === 'Won' ? '#166534' : prop.status === 'Lost' ? '#b91c1c' : '#0369a1',
                        }}
                      >
                        {prop.status}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, marginBottom: 6 }}>
                      {prop.title}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                      <strong style={{ color: '#0f172a' }}>{formatMoney(prop.deal_value_etb)}</strong>
                      {prop.submission_deadline && (
                        <span style={{ color: '#64748b' }}>Deadline: {prop.submission_deadline}</span>
                      )}
                      {prop.document_url && (
                        <a
                          href={prop.document_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
                        >
                          🔗 Drive Proposal
                        </a>
                      )}
                    </div>
                  </div>
                ))}

                {selectedProposals.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13, border: '1px dashed #cbd5e1', borderRadius: 8 }}>
                    No proposals logged for this client yet.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Leads View */}
            {dossierTab === 'leads' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {selectedOpps.map((opp) => (
                  <div
                    key={opp.id}
                    style={{
                      background: '#f8fafc',
                      padding: 14,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>{opp.lead_code || 'LEAD'}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: opp.qualification_status === 'Qualified' ? '#dcfce7' : '#fef3c7',
                          color: opp.qualification_status === 'Qualified' ? '#166534' : '#92400e',
                        }}
                      >
                        {opp.qualification_status || 'Unscreened'}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, marginBottom: 4 }}>
                      {opp.title}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 6 }}>
                      <span>Priority: <strong>{opp.priority || 'Normal'}</strong></span>
                      {opp.initiated_date && <span>Initiated: {opp.initiated_date}</span>}
                    </div>
                  </div>
                ))}

                {selectedOpps.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13, border: '1px dashed #cbd5e1', borderRadius: 8 }}>
                    No scoping leads recorded for this organization.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Account Intelligence Notes */}
            {dossierTab === 'intel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  Institutional background, board structure, decision-maker profiles, and historical engagement notes:
                </p>

                <textarea
                  rows={14}
                  value={accountNotes}
                  onChange={(e) => setAccountNotes(e.target.value)}
                  placeholder="Record executive contacts (e.g. VP Human Resources, Director of Strategy), procurement guidelines, fiscal budget dates..."
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    lineHeight: 1.5,
                    background: '#f8fafc',
                    flex: 1,
                  }}
                />

                <button
                  type="button"
                  disabled={savingNotes}
                  onClick={() => {
                    setSavingNotes(true)
                    setTimeout(() => {
                      alert('Account intelligence dossier updated!')
                      setSavingNotes(false)
                    }, 400)
                  }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0284c7',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  {savingNotes ? 'Saving…' : 'Save Intelligence Notes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}