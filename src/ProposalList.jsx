import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const STREAMLINED_STAGES = {
  '1. TOR / RFP Identified': {
    label: '1. TOR / RFP Identified',
    shortLabel: 'RFP In',
    color: '#6366f1',
    badgeBg: '#e0e7ff',
    border: '#c7d2fe',
    icon: '📑',
    checklist: [
      'Official TOR / RFP document uploaded and parsed via AI',
      'Strategic SBU fit confirmed (Institute, CBS, IIP, DAS)',
      'Submission deadline logged in calendar',
    ],
  },
  '2. Proposal In Defense': {
    label: '2. Proposal In Defense',
    shortLabel: 'Defense',
    color: '#f59e0b',
    badgeBg: '#fef3c7',
    border: '#fde68a',
    icon: '⚡',
    checklist: [
      'Technical methodology & financial envelopes completed',
      'Formal bidding package submitted before deadline',
      'Oral presentation / pitch to client committee completed',
    ],
  },
  '3. Contract Won / Signed': {
    label: '3. Contract Won / Signed',
    shortLabel: 'Won',
    color: '#10b981',
    badgeBg: '#d1fae5',
    border: '#a7f3d0',
    icon: '🏆',
    checklist: [
      'Official award letter or signed contract received',
      'Advance mobilization invoice issued to client',
      'Project Director & delivery team assigned for kickoff',
    ],
  },
  '4. Delivery & Repeat Business': {
    label: '4. Delivery & Repeat Business',
    shortLabel: 'Delivery',
    color: '#8b5cf6',
    badgeBg: '#ede9fe',
    border: '#ddd6fe',
    icon: '🔄',
    checklist: [
      'Key program deliverables completed and accepted',
      'Final contract settlement payment collected',
      'Follow-up retainer or subsequent mandate initiated',
    ],
  },
}

const STAGE_KEYS = Object.keys(STREAMLINED_STAGES)

// Helper to map any existing or legacy stage name into the 4 streamlined columns
function normalizeStage(stageStr) {
  if (!stageStr) return STAGE_KEYS[0]
  const s = stageStr.toLowerCase()

  if (s.includes('won') || s.includes('signed') || s.includes('conversion') || s.includes('5')) {
    return '3. Contract Won / Signed'
  }
  if (s.includes('delivery') || s.includes('repeat') || s.includes('6')) {
    return '4. Delivery & Repeat Business'
  }
  if (s.includes('qualified') && !s.includes('pre') || s.includes('defense') || s.includes('4')) {
    return '2. Proposal In Defense'
  }
  return '1. TOR / RFP Identified'
}

export default function ProposalList({ refreshVersion, onRefresh }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSbu, setFilterSbu] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [drawerChecklist, setDrawerChecklist] = useState({})

  useEffect(() => {
    fetchDeals()
  }, [refreshVersion])

  async function fetchDeals() {
    setLoading(true)
    const { data } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false })
    if (data) setDeals(data)
    setLoading(false)
  }

  async function handleAdvanceStage(e, deal) {
    e.stopPropagation()
    const currentNorm = normalizeStage(deal.stage)
    const currentIndex = STAGE_KEYS.indexOf(currentNorm)

    if (currentIndex >= 0 && currentIndex < STAGE_KEYS.length - 1) {
      const nextStage = STAGE_KEYS[currentIndex + 1]
      await migrateStage(deal.id, nextStage)
    }
  }

  async function migrateStage(dealId, newStage) {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage, pipeline_stage: newStage } : d))
    )

    if (selectedDeal?.id === dealId) {
      setSelectedDeal((p) => ({ ...p, stage: newStage, pipeline_stage: newStage }))
    }

    await supabase
      .from('opportunities')
      .update({ stage: newStage, pipeline_stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', dealId)

    onRefresh?.()
  }

  async function handleDeleteDeal(e, dealId, name) {
    e.stopPropagation()
    if (!window.confirm(`Remove "${name}" from pipeline?`)) return

    setDeals((prev) => prev.filter((d) => d.id !== dealId))
    if (selectedDeal?.id === dealId) setSelectedDeal(null)

    await supabase.from('opportunities').delete().eq('id', dealId)
    onRefresh?.()
  }

  const filteredDeals = deals.filter((d) => {
    const clientName = d.client || d.client_name || ''
    const matchesSbu = filterSbu === 'ALL' || d.sbu === filterSbu
    const matchesSearch =
      !searchQuery ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.product && d.product.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.code && d.code.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSbu && matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter Header */}
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select
            value={filterSbu}
            onChange={(e) => setFilterSbu(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 700,
              color: '#1e293b',
              background: '#fff',
            }}
          >
            <option value="ALL">All Business Units (Institute, CBS, IIP, DAS)</option>
            <option value="Institute">The i-Capital Institute</option>
            <option value="CBS">Cross Border Solutions (CBS)</option>
            <option value="IIP">i-Capital Investment Partners (IIP)</option>
            <option value="DAS">Digital &amp; AI Solutions (DAS)</option>
          </select>

          <input
            type="text"
            placeholder="Search institution, proposal, code…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              width: 260,
            }}
          />
        </div>

        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
          Active Commercial Deals: <strong style={{ color: '#0f172a' }}>{filteredDeals.length}</strong>
        </div>
      </div>

      {/* 4 Clean Actionable Columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 20,
        }}
      >
        {STAGE_KEYS.map((stageKey, colIdx) => {
          const conf = STREAMLINED_STAGES[stageKey]
          const stageDeals = filteredDeals.filter((d) => normalizeStage(d.stage) === stageKey)
          const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0)
          const isLastCol = colIdx === STAGE_KEYS.length - 1

          return (
            <div
              key={stageKey}
              style={{
                background: '#f8fafc',
                border: `1px solid ${conf.border}`,
                borderTop: `4px solid ${conf.color}`,
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 240px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '8px 8px 0 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{conf.icon}</span>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>{conf.label}</strong>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, background: conf.badgeBg, color: conf.color, padding: '2px 8px', borderRadius: 10 }}>
                    {stageDeals.length}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: conf.color, marginTop: 4 }}>
                  ETB {new Intl.NumberFormat('en-US').format(stageTotal)}
                </div>
              </div>

              {/* Cards */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
                {stageDeals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    No proposals in this stage
                  </div>
                ) : (
                  stageDeals.map((deal) => {
                    const clientName = deal.client || deal.client_name || 'Institutional Client'
                    const isSelected = selectedDeal?.id === deal.id

                    return (
                      <div
                        key={deal.id}
                        onClick={() => {
                          setSelectedDeal(deal)
                          setDrawerChecklist({})
                        }}
                        style={{
                          background: '#ffffff',
                          borderRadius: 10,
                          border: isSelected ? `2px solid ${conf.color}` : '1px solid #e2e8f0',
                          borderLeft: `5px solid ${conf.color}`,
                          padding: 14,
                          boxShadow: isSelected ? '0 6px 16px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: conf.color }}>
                            {deal.code || 'DEAL'}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                            {deal.sbu || 'INST'}
                          </span>
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{clientName}</div>
                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.3 }}>
                          {deal.title || deal.product}
                        </div>

                        <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', marginTop: 2 }}>
                          ETB {new Intl.NumberFormat('en-US').format(deal.deal_value || 0)}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f8fafc' }}>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDeal(e, deal.id, clientName)}
                            title="Delete card"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444' }}
                          >
                            🗑️
                          </button>

                          {!isLastCol ? (
                            <button
                              type="button"
                              onClick={(e) => handleAdvanceStage(e, deal)}
                              style={{
                                background: conf.badgeBg,
                                color: conf.color,
                                border: `1px solid ${conf.border}`,
                                borderRadius: 6,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              Advance →
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800 }}>✓ Completed</span>
                          )}
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

      {/* Drawer */}
      {selectedDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedDeal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              height: '100%',
              background: '#ffffff',
              boxShadow: '-8px 0 24px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              gap: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0284c7' }}>
                    {selectedDeal.code || 'DEAL'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4 }}>
                    {selectedDeal.sbu || 'INST'}
                  </span>
                </div>
                <h2 style={{ margin: '6px 0 2px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                  {selectedDeal.client || selectedDeal.client_name}
                </h2>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {selectedDeal.title || selectedDeal.product}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDeal(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Stepper */}
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 8 }}>
                MOVE STAGE
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STAGE_KEYS.map((stg) => {
                  const conf = STREAMLINED_STAGES[stg]
                  const isCur = normalizeStage(selectedDeal.stage) === stg

                  return (
                    <div
                      key={stg}
                      onClick={() => migrateStage(selectedDeal.id, stg)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: isCur ? `2px solid ${conf.color}` : '1px solid #e2e8f0',
                        background: isCur ? conf.badgeBg : '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{conf.icon}</span>
                        <strong style={{ fontSize: 12, color: isCur ? conf.color : '#334155' }}>
                          {conf.label}
                        </strong>
                      </div>
                      {isCur ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: conf.color, background: '#fff', padding: '2px 8px', borderRadius: 8 }}>
                          Current
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Set →</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Checklist */}
            {STREAMLINED_STAGES[normalizeStage(selectedDeal.stage)] && (
              <div style={{ background: '#f8fafc', border: `1px solid ${STREAMLINED_STAGES[normalizeStage(selectedDeal.stage)].border}`, borderRadius: 10, padding: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 8 }}>
                  STAGE CRITERIA
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {STREAMLINED_STAGES[normalizeStage(selectedDeal.stage)].checklist.map((c, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(drawerChecklist[i])}
                        onChange={() => setDrawerChecklist((p) => ({ ...p, [i]: !p[i] }))}
                        style={{ marginTop: 2, accentColor: STREAMLINED_STAGES[normalizeStage(selectedDeal.stage)].color }}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Financials */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800, display: 'block' }}>DEAL VALUE</span>
                <strong style={{ fontSize: 15, color: '#166534' }}>
                  ETB {new Intl.NumberFormat('en-US').format(selectedDeal.deal_value || 0)}
                </strong>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800, display: 'block' }}>DEADLINE</span>
                <strong style={{ fontSize: 13, color: selectedDeal.deadline ? '#ea580c' : '#64748b' }}>
                  {selectedDeal.deadline || 'No Deadline'}
                </strong>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={(e) => handleDeleteDeal(e, selectedDeal.id, selectedDeal.client || selectedDeal.client_name)}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #fecdd3', background: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setSelectedDeal(null)}
                style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}