import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const PIPELINE_STAGES = [
  { id: '1. Potential Target', label: '1. Potential Target' },
  { id: '2. Lead', label: '2. Lead' },
  { id: '3. Pre-Qualified Opportunity', label: '3. Pre-Qualified Opportunity' },
  { id: '4. Qualified Pipeline', label: '4. Qualified Pipeline' },
  { id: '5. Conversion (Won / Signed)', label: '5. Conversion (Won / Signed)' },
  { id: '6. Delivery & Repeat Business', label: '6. Delivery & Repeat Business' },
]

export default function ProposalList({ refreshVersion, onRefresh }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSbu, setFilterSbu] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewType, setViewType] = useState('board') // 'board' | 'table'

  useEffect(() => {
    fetchDeals()
  }, [refreshVersion])

  async function fetchDeals() {
    setLoading(true)
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setDeals(data)
    }
    setLoading(false)
  }

  // Instant Stage Migration: Optimistically moves card out of the old column immediately
  async function handleStageChange(dealId, newStage) {
    setDeals((prevDeals) =>
      prevDeals.map((deal) =>
        deal.id === dealId ? { ...deal, stage: newStage } : deal
      )
    )

    const { error } = await supabase
      .from('opportunities')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', dealId)

    if (error) {
      alert(`Could not migrate stage: ${error.message}`)
      fetchDeals()
    } else {
      onRefresh?.()
    }
  }

  // Delete redundant card
  async function handleDeleteDeal(dealId, clientName) {
    if (!window.confirm(`Permanently remove "${clientName}" from pipeline?`)) return

    setDeals((prev) => prev.filter((d) => d.id !== dealId))
    const { error } = await supabase.from('opportunities').delete().eq('id', dealId)
    if (error) {
      alert(`Delete failed: ${error.message}`)
      fetchDeals()
    } else {
      onRefresh?.()
    }
  }

  const filteredDeals = deals.filter((d) => {
    const matchesSbu = filterSbu === 'ALL' || d.sbu === filterSbu
    const matchesSearch =
      !searchQuery ||
      (d.client && d.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.product && d.product.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.code && d.code.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSbu && matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls & SBU Filter Header */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '14px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select
            value={filterSbu}
            onChange={(e) => setFilterSbu(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 700,
              color: '#1e293b',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All SBUs (Institute, CBS, IIP, DAS)</option>
            <option value="Institute">The i-Capital Institute</option>
            <option value="CBS">Cross Border Solutions (CBS)</option>
            <option value="IIP">i-Capital Investment Partners (IIP)</option>
            <option value="DAS">Digital &amp; AI Solutions (DAS)</option>
          </select>

          <input
            type="text"
            placeholder="Search code, client, or title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              width: 240,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setViewType('board')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: viewType === 'board' ? '#fff' : 'transparent',
              color: viewType === 'board' ? '#0f172a' : '#64748b',
              boxShadow: viewType === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => setViewType('table')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: viewType === 'table' ? '#fff' : 'transparent',
              color: viewType === 'table' ? '#0f172a' : '#64748b',
              boxShadow: viewType === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Table
          </button>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewType === 'board' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(260px, 1fr))',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 16,
          }}
        >
          {PIPELINE_STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage === stage.id || d.stage === stage.label)
            const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0)

            return (
              <div
                key={stage.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 240px)',
                }}
              >
                {/* Column Top Header */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#fff', borderRadius: '12px 12px 0 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{stage.label}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        background: '#0284c7',
                        color: '#fff',
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {stageDeals.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginTop: 4 }}>
                    ETB {new Intl.NumberFormat('en-US').format(stageTotal)}
                  </div>
                </div>

                {/* Column Cards Container */}
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
                  {stageDeals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 10px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                      No deals in stage
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: 10,
                          border: '1px solid #cbd5e1',
                          padding: 12,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#0284c7' }}>
                            {deal.code || 'DEAL'}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {deal.sbu || 'INST'}
                          </span>
                        </div>

                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{deal.client}</div>
                        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.3 }}>
                          {deal.title || deal.product}
                        </div>

                        <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', marginTop: 2 }}>
                          ETB {new Intl.NumberFormat('en-US').format(deal.deal_value || 0)}
                        </div>

                        {/* Migration Selector + Delete */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 6,
                            paddingTop: 6,
                            borderTop: '1px solid #f1f5f9',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteDeal(deal.id, deal.client)}
                            title="Delete card to remove duplicates"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 12,
                              color: '#ef4444',
                              padding: 2,
                            }}
                          >
                            🗑️
                          </button>

                          <select
                            value={deal.stage}
                            onChange={(e) => handleStageChange(deal.id, e.target.value)}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '4px 6px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              color: '#0f172a',
                              maxWidth: '180px',
                              cursor: 'pointer',
                            }}
                          >
                            {PIPELINE_STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewType === 'table' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '12px 16px' }}>CODE</th>
                <th style={{ padding: '12px 16px' }}>CLIENT ACCOUNT</th>
                <th style={{ padding: '12px 16px' }}>SBU</th>
                <th style={{ padding: '12px 16px' }}>PRODUCT / TITLE</th>
                <th style={{ padding: '12px 16px' }}>DEAL VALUE</th>
                <th style={{ padding: '12px 16px' }}>PIPELINE STAGE</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                    No deals match your search.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr key={deal.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0284c7' }}>{deal.code}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{deal.client}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                        {deal.sbu}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{deal.title || deal.product}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#166534' }}>
                      ETB {new Intl.NumberFormat('en-US').format(deal.deal_value || 0)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={deal.stage}
                        onChange={(e) => handleStageChange(deal.id, e.target.value)}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                        }}
                      >
                        {PIPELINE_STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteDeal(deal.id, deal.client)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13 }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}