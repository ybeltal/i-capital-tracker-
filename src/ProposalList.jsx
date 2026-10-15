import { useEffect, useState, useMemo } from 'react'
import { supabase } from './supabase'
import UserAvatar from './UserAvatar'
import ProposalEditor from './ProposalEditor'

// All 7 Pipeline Stages aligned between Board and Table
const PIPELINE_STAGES = [
  '1. Potential Target',
  '2. Lead',
  '3. Pre-Qualified Opportunity',
  '4. Qualified Pipeline',
  '5. Conversion (Won / Signed)',
  '6. Delivery & Repeat Business',
  'Closed / Lost',
]

// Database status to Display Stage normalizer
function normalizeStage(status) {
  if (!status) return '1. Potential Target'
  if (status === 'Initiated' || status === 'Target' || status === '1. Potential Target') {
    return '1. Potential Target'
  }
  if (status === 'Lead' || status === '2. Lead') {
    return '2. Lead'
  }
  if (status === 'In Progress' || status === 'Pre-Qualified' || status === '3. Pre-Qualified Opportunity') {
    return '3. Pre-Qualified Opportunity'
  }
  if (
    status === 'Submitted' ||
    status === 'Under Review' ||
    status === 'Shortlisted' ||
    status === 'Negotiation' ||
    status === 'Qualified Pipeline' ||
    status === '4. Qualified Pipeline'
  ) {
    return '4. Qualified Pipeline'
  }
  if (status === 'Won' || status === 'Conversion' || status === '5. Conversion (Won / Signed)') {
    return '5. Conversion (Won / Signed)'
  }
  if (status === 'Delivery & Repeat' || status === 'Delivery & Repeat Business' || status === '6. Delivery & Repeat Business') {
    return '6. Delivery & Repeat Business'
  }
  if (status === 'Lost' || status === 'Cancelled' || status === 'Closed / Lost') {
    return 'Closed / Lost'
  }
  return '1. Potential Target'
}

// Convert Display Stage back to Database-allowed status
function mapStageToDbStatus(displayStage) {
  switch (displayStage) {
    case '1. Potential Target':
      return 'Initiated'
    case '2. Lead':
      return 'Initiated'
    case '3. Pre-Qualified Opportunity':
      return 'In Progress'
    case '4. Qualified Pipeline':
      return 'Submitted'
    case '5. Conversion (Won / Signed)':
      return 'Won'
    case '6. Delivery & Repeat Business':
      return 'Won'
    case 'Closed / Lost':
      return 'Lost'
    default:
      return 'In Progress'
  }
}

function formatETB(value) {
  if (!value && value !== 0) return 'ETB 0'
  return `ETB ${new Intl.NumberFormat('en-US').format(value)}`
}

function getMandateBadge(notes) {
  if (!notes) return null
  const match = notes.match(/\[MANDATE_TYPE:\s*([^\]]+)\]/)
  const type = match ? match[1].trim() : null
  if (!type) return null

  switch (type) {
    case 'ORAL':
      return { label: '🗣️ Oral Mandate', bg: '#fef3c7', color: '#92400e' }
    case 'RFP':
      return { label: '📜 Formal RFP', bg: '#e0f2fe', color: '#0369a1' }
    case 'LETTER':
      return { label: '✉️ Official Letter', bg: '#f3e8ff', color: '#6b21a8' }
    case 'EMAIL':
      return { label: '📧 Email Invitation', bg: '#ecfeff', color: '#0e7490' }
    case 'TOR':
    default:
      return { label: '📑 Official TOR', bg: '#dcfce7', color: '#166534' }
  }
}

export default function ProposalList({ refreshVersion, onRefresh }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // View & Filter States
  const [viewMode, setViewMode] = useState('board') // 'board' vs 'table'
  const [pipelineFilter, setPipelineFilter] = useState('formal') // 'all', 'formal', 'leads'
  const [sbuFilter, setSbuFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Active Proposal Drawer State
  const [editingProposal, setEditingProposal] = useState(null)

  useEffect(() => {
    loadProposals()
  }, [refreshVersion])

  async function loadProposals() {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('proposals')
        .select(`
          id,
          proposal_code,
          title,
          status,
          deal_value_etb,
          submission_deadline,
          actual_submission_date,
          bd_owner,
          proposal_developer,
          product_engine,
          notes,
          created_at,
          opportunities (
            id,
            lead_code,
            title,
            sbus (name, code),
            clients (id, name, sector)
          )
        `)
        .order('created_at', { ascending: false })

      if (err) throw err
      setProposals(data || [])
    } catch (err) {
      setError(err.message || 'Could not load deals.')
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickStageChange(proposalId, newDisplayStage) {
    const dbStatus = mapStageToDbStatus(newDisplayStage)
    try {
      const { error: err } = await supabase
        .from('proposals')
        .update({ status: dbStatus })
        .eq('id', proposalId)

      if (err) throw err

      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: dbStatus } : p))
      )
      onRefresh?.()
    } catch (err) {
      alert(`Could not update stage: ${err.message}`)
    }
  }

  // Filtered dataset
  const filteredDeals = useMemo(() => {
    return proposals.filter((p) => {
      const stage = normalizeStage(p.status)

      // Pipeline View segmentation
      if (pipelineFilter === 'leads') {
        if (stage !== '2. Lead' && p.status !== 'Lead') return false
      } else if (pipelineFilter === 'formal') {
        if (p.status === 'Lead' && !p.deal_value_etb) return false
      }

      // SBU filter
      if (sbuFilter !== 'ALL') {
        const sbuName = p.opportunities?.sbus?.name || ''
        const sbuCode = p.opportunities?.sbus?.code || ''
        if (!sbuName.toLowerCase().includes(sbuFilter.toLowerCase()) && !sbuCode.toLowerCase().includes(sbuFilter.toLowerCase())) {
          return false
        }
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const code = (p.proposal_code || '').toLowerCase()
        const client = (p.opportunities?.clients?.name || '').toLowerCase()
        const title = (p.title || '').toLowerCase()
        if (!code.includes(q) && !client.includes(q) && !title.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [proposals, pipelineFilter, sbuFilter, searchTerm])

  const allCount = proposals.length
  const leadsCount = proposals.filter((p) => p.status === 'Lead').length
  const formalCount = allCount - leadsCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* Header & Subtitle */}
      <div>
        <h2 style={{ margin: '0 0 4px 0', fontSize: 20, color: '#0f172a', fontWeight: 800 }}>
          Active Deals &amp; Formal Proposals
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          Board-ready commercial governance pipeline with automated stage-gating and instant filters.
        </p>
      </div>

      {/* Filter and Switch Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Pipeline Views */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginRight: 4 }}>
            PIPELINE VIEW:
          </span>
          <button
            type="button"
            onClick={() => setPipelineFilter('all')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: pipelineFilter === 'all' ? '#0284c7' : '#f1f5f9',
              color: pipelineFilter === 'all' ? '#fff' : '#475569',
            }}
          >
            All Deals ({allCount})
          </button>
          <button
            type="button"
            onClick={() => setPipelineFilter('formal')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: pipelineFilter === 'formal' ? '#0284c7' : '#f1f5f9',
              color: pipelineFilter === 'formal' ? '#fff' : '#475569',
            }}
          >
            Formal Proposals ({formalCount})
          </button>
          <button
            type="button"
            onClick={() => setPipelineFilter('leads')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: pipelineFilter === 'leads' ? '#0284c7' : '#f1f5f9',
              color: pipelineFilter === 'leads' ? '#fff' : '#475569',
            }}
          >
            Leads &amp; Pre-Tenders ({leadsCount})
          </button>
        </div>

        {/* SBU Filter, Search & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={sbuFilter}
            onChange={(e) => setSbuFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
          >
            <option value="ALL">All SBUs (Institute, CBS, IIP, DAS)</option>
            <option value="Institute">The i-Capital Institute</option>
            <option value="CBS">Cross Border Solutions (CBS)</option>
            <option value="IIP">Investment Partners (IIP)</option>
            <option value="DAS">Digital &amp; AI Solutions (DAS)</option>
          </select>

          <input
            type="text"
            placeholder="Search code, client, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: 200 }}
          />

          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 6, padding: 2 }}>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              style={{
                padding: '6px 12px',
                borderRadius: 5,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: viewMode === 'board' ? '#fff' : 'transparent',
                color: viewMode === 'board' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                borderRadius: 5,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: viewMode === 'table' ? '#fff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 8 }}>{error}</div>}
      {loading && <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading pipeline deals…</div>}

      {!loading && !error && (
        <>
          {/* ======================================================== */}
          {/* 1. KANBAN BOARD VIEW (ALL 7 STAGES + MANDATE BADGES)     */}
          {/* ======================================================== */}
          {viewMode === 'board' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(250px, 1fr))',
                gap: 12,
                overflowX: 'auto',
                alignItems: 'start',
                paddingBottom: 16,
              }}
            >
              {PIPELINE_STAGES.map((stageName) => {
                const stageDeals = filteredDeals.filter((d) => normalizeStage(d.status) === stageName)
                const totalValue = stageDeals.reduce((sum, d) => sum + (Number(d.deal_value_etb) || 0), 0)

                return (
                  <div
                    key={stageName}
                    style={{
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      padding: 10,
                      minHeight: 480,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Column Header */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{stageName}</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            background: stageDeals.length > 0 ? '#0284c7' : '#e2e8f0',
                            color: stageDeals.length > 0 ? '#fff' : '#64748b',
                            padding: '1px 6px',
                            borderRadius: 10,
                          }}
                        >
                          {stageDeals.length}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                        {formatETB(totalValue)}
                      </div>
                    </div>

                    {/* Cards Container */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                      {stageDeals.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                          No deals in stage
                        </div>
                      ) : (
                        stageDeals.map((deal) => {
                          const sbuCode = deal.opportunities?.sbus?.code || 'INST'
                          const mandateBadge = getMandateBadge(deal.notes)

                          return (
                            <div
                              key={deal.id}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: 12,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onClick={() => setEditingProposal(deal)}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284c7')}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1' }}>
                                  {deal.proposal_code || 'PROPOSAL'}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: 4 }}>
                                  {sbuCode}
                                </span>
                              </div>

                              {/* Mandate Evidence Badge */}
                              {mandateBadge && (
                                <div style={{ marginBottom: 4 }}>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 800,
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      background: mandateBadge.bg,
                                      color: mandateBadge.color,
                                    }}
                                  >
                                    {mandateBadge.label}
                                  </span>
                                </div>
                              )}

                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                                {deal.opportunities?.clients?.name || 'Institutional Client'}
                              </div>

                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {deal.title}
                              </div>

                              {/* Commercial Unit & Single Tech Lead Avatar */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid #f1f5f9', paddingTop: 6, marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>
                                  🏢 {deal.bd_owner || 'Corporate RG'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <UserAvatar name={deal.proposal_developer} size={20} />
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>
                                    {deal.proposal_developer || 'Unassigned'}
                                  </span>
                                </div>
                              </div>

                              {/* Deal Value & Quick Stage Selector */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#166534' }}>
                                  {formatETB(deal.deal_value_etb)}
                                </span>

                                <select
                                  value={stageName}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleQuickStageChange(deal.id, e.target.value)}
                                  style={{
                                    fontSize: 10,
                                    padding: '2px 4px',
                                    borderRadius: 4,
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    maxWidth: 120,
                                  }}
                                >
                                  {PIPELINE_STAGES.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ======================================================== */
            /* 2. TABLE VIEW (ALL 7 STAGES + MANDATE EVIDENCE)          */
            /* ======================================================== */
            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>Proposal Code</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>Client</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>Scope / Title &amp; Mandate</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>SBU &amp; Engine</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>Accountability (BD / Dev)</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>Deal Value (ETB)</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>Pipeline Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((deal) => {
                    const currentStage = normalizeStage(deal.status)
                    const sbuCode = deal.opportunities?.sbus?.code || 'INST'
                    const mandateBadge = getMandateBadge(deal.notes)

                    return (
                      <tr
                        key={deal.id}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => setEditingProposal(deal)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0369a1' }}>
                          {deal.proposal_code || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                          {deal.opportunities?.clients?.name || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#334155', maxWidth: 260 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {deal.title}
                          </div>
                          {mandateBadge && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: mandateBadge.bg,
                                color: mandateBadge.color,
                                marginTop: 3,
                                display: 'inline-block',
                              }}
                            >
                              {mandateBadge.label}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#334155' }}>
                            {sbuCode}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: 11, color: '#475569' }}>{deal.bd_owner || 'Corporate RG'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <UserAvatar name={deal.proposal_developer} size={18} />
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{deal.proposal_developer || '—'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>
                          {formatETB(deal.deal_value_etb)}
                        </td>
                        <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <select
                            value={currentStage}
                            onChange={(e) => handleQuickStageChange(deal.id, e.target.value)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 11,
                              fontWeight: 700,
                              background: currentStage.includes('Won') ? '#dcfce7' : '#ffffff',
                              color: currentStage.includes('Won') ? '#166534' : '#1e293b',
                            }}
                          >
                            {PIPELINE_STAGES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Slide-over Drawer for Editing Proposal */}
      {editingProposal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setEditingProposal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              height: '100vh',
              background: '#ffffff',
              padding: 24,
              overflowY: 'auto',
              boxShadow: '-10px 0 25px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ProposalEditor
              proposal={editingProposal}
              onSaved={() => {
                setEditingProposal(null)
                loadProposals()
                onRefresh?.()
              }}
              onClose={() => setEditingProposal(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}