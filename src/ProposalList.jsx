import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const STAGE_CONFIG = {
  '1. Potential Target': {
    label: '1. Potential Target',
    shortLabel: 'Target',
    color: '#64748b',
    badgeBg: '#f1f5f9',
    border: '#cbd5e1',
    icon: '🎯',
    checklist: [
      'Decision-maker identified at client institution',
      'Strategic alignment with SBU catalogue verified',
      'Account mapped in 184 Client Directory baseline',
    ],
  },
  '2. Lead': {
    label: '2. Lead',
    shortLabel: 'Lead',
    color: '#0284c7',
    badgeBg: '#e0f2fe',
    border: '#bae6fd',
    icon: '📞',
    checklist: [
      'Introductory meeting or official outreach letter sent',
      'Verified interest or RFP/TOR release detected',
      'Account assigned to designated SBU BD lead',
    ],
  },
  '3. Pre-Qualified Opportunity': {
    label: '3. Pre-Qualified Opportunity',
    shortLabel: 'Pre-Qualified',
    color: '#6366f1',
    badgeBg: '#e0e7ff',
    border: '#c7d2fe',
    icon: '📑',
    checklist: [
      'TOR / RFP scope evaluated with Gemini AI Parser',
      'Indicative budget and resource feasibility verified',
      'Internal Bid / No-Bid clearance approved',
    ],
  },
  '4. Qualified Pipeline': {
    label: '4. Qualified Pipeline',
    shortLabel: 'Qualified',
    color: '#f59e0b',
    badgeBg: '#fef3c7',
    border: '#fde68a',
    icon: '⚡',
    checklist: [
      'Formal Technical & Financial Proposal submitted',
      'Oral proposal presentation / defense completed',
      'Commercial terms, payment milestones, & taxes clarified',
    ],
  },
  '5. Conversion (Won / Signed)': {
    label: '5. Conversion (Won / Signed)',
    shortLabel: 'Won / Signed',
    color: '#10b981',
    badgeBg: '#d1fae5',
    border: '#a7f3d0',
    icon: '🏆',
    checklist: [
      'Signed service agreement or award letter secured',
      'Advance mobilization invoice issued',
      'SBU Delivery team assigned for kickoff',
    ],
  },
  '6. Delivery & Repeat Business': {
    label: '6. Delivery & Repeat Business',
    shortLabel: 'Delivery',
    color: '#8b5cf6',
    badgeBg: '#ede9fe',
    border: '#ddd6fe',
    icon: '🔄',
    checklist: [
      'All deliverables signed off by client',
      'Final contract settlement payment received',
      'Next phase or annual retainer initiated',
    ],
  },
}

const STAGE_KEYS = Object.keys(STAGE_CONFIG)

function matchStage(dealStage, targetStageKey) {
  if (!dealStage) return targetStageKey === '1. Potential Target'
  const ds = dealStage.toLowerCase().trim()
  const ts = targetStageKey.toLowerCase().trim()

  if (ds === ts) return true
  if (ts.startsWith('1') && (ds.includes('potential') || ds.includes('target'))) return true
  if (ts.startsWith('2') && ds.includes('lead')) return true
  if (ts.startsWith('3') && (ds.includes('pre-qual') || ds.includes('prequalified'))) return true
  if (ts.startsWith('4') && ds.includes('qualified') && !ds.includes('pre')) return true
  if (ts.startsWith('5') && (ds.includes('won') || ds.includes('signed') || ds.includes('conversion'))) return true
  if (ts.startsWith('6') && (ds.includes('delivery') || ds.includes('repeat'))) return true
  return false
}

export default function ProposalList({ refreshVersion, onRefresh }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSbu, setFilterSbu] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewType, setViewType] = useState('board') // 'board' | 'table'

  // Selected deal for right-side drawer inspector
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [drawerChecklist, setDrawerChecklist] = useState({})
  const [savingDrawer, setSavingDrawer] = useState(false)

  useEffect(() => {
    fetchDeals()
  }, [refreshVersion])

  async function fetchDeals() {
    setLoading(true)
    const { data } = await supabase.from('opportunities').select('*')
    if (data) setDeals(data)
    setLoading(false)
  }

  // Quick-advance deal to next stage with one click
  async function handleAdvanceNextStage(e, deal) {
    e.stopPropagation()
    const currentIndex = STAGE_KEYS.findIndex((k) => matchStage(deal.stage, k))
    if (currentIndex >= 0 && currentIndex < STAGE_KEYS.length - 1) {
      const nextStage = STAGE_KEYS[currentIndex + 1]
      await migrateDealStage(deal.id, nextStage)
    }
  }

  // Core Stage Migration (updates local UI instantly and writes both stage & pipeline_stage)
  async function migrateDealStage(dealId, newStage) {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage, pipeline_stage: newStage } : d))
    )

    if (selectedDeal && selectedDeal.id === dealId) {
      setSelectedDeal((prev) => ({ ...prev, stage: newStage, pipeline_stage: newStage }))
    }

    const { error } = await supabase
      .from('opportunities')
      .update({
        stage: newStage,
        pipeline_stage: newStage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)

    if (error) {
      alert(`Migration error: ${error.message}`)
      fetchDeals()
    } else {
      onRefresh?.()
    }
  }

  // Delete card
  async function handleDeleteDeal(e, dealId, clientName) {
    e.stopPropagation()
    if (!window.confirm(`Permanently remove "${clientName}" from pipeline?`)) return

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
      {/* 1. FILTER & VIEW SELECTOR BAR */}
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
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
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
            placeholder="Search code, client, or product…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              width: 250,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setViewType('board')}
            style={{
              padding: '6px 16px',
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
              padding: '6px 16px',
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

      {/* 2. MODERN KANBAN BOARD (CLEAN CARDS - CLICK TO INSPECT) */}
      {viewType === 'board' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STAGE_KEYS.length}, minmax(260px, 1fr))`,
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 20,
          }}
        >
          {STAGE_KEYS.map((stageKey, colIdx) => {
            const conf = STAGE_CONFIG[stageKey]
            const stageDeals = filteredDeals.filter((d) => matchStage(d.stage, stageKey))
            const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0)
            const isLastStage = colIdx === STAGE_KEYS.length - 1

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
                  maxHeight: 'calc(100vh - 250px)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                {/* Column Header */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '8px 8px 0 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{conf.icon}</span>
                      <strong style={{ fontSize: 12, color: '#0f172a' }}>{conf.label}</strong>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        background: conf.badgeBg,
                        color: conf.color,
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}
                    >
                      {stageDeals.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: conf.color, marginTop: 4 }}>
                    ETB {new Intl.NumberFormat('en-US').format(stageTotal)}
                  </div>
                </div>

                {/* Cards Container */}
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
                  {stageDeals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 12px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                      No deals in stage
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
                            padding: 12,
                            boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: conf.color }}>
                              {deal.code || 'DEAL'}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {deal.sbu || 'INST'}
                            </span>
                          </div>

                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{clientName}</div>
                          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.35 }}>
                            {deal.title || deal.product}
                          </div>

                          <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', marginTop: 2 }}>
                            ETB {new Intl.NumberFormat('en-US').format(deal.deal_value || 0)}
                          </div>

                          {/* Clean Footer: Delete and One-Click Quick Advance Arrow */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: 6,
                              paddingTop: 6,
                              borderTop: '1px solid #f8fafc',
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDeal(e, deal.id, clientName)}
                              title="Delete card"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ef4444', padding: 2 }}
                            >
                              🗑️
                            </button>

                            {!isLastStage ? (
                              <button
                                type="button"
                                onClick={(e) => handleAdvanceNextStage(e, deal)}
                                style={{
                                  background: conf.badgeBg,
                                  color: conf.color,
                                  border: `1px solid ${conf.border}`,
                                  borderRadius: 6,
                                  padding: '3px 8px',
                                  fontSize: 10,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                Advance →
                              </button>
                            ) : (
                              <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>✓ Converted</span>
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
      )}

      {/* 3. TABLE VIEW */}
      {viewType === 'table' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '12px 16px' }}>CODE</th>
                <th style={{ padding: '12px 16px' }}>CLIENT ACCOUNT</th>
                <th style={{ padding: '12px 16px' }}>SBU</th>
                <th style={{ padding: '12px 16px' }}>PRODUCT / SCOPE</th>
                <th style={{ padding: '12px 16px' }}>DEAL VALUE</th>
                <th style={{ padding: '12px 16px' }}>STAGE</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>INSPECT</th>
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
                filteredDeals.map((deal) => {
                  const clientName = deal.client || deal.client_name || 'Institutional Client'
                  const conf = STAGE_CONFIG[deal.stage] || STAGE_CONFIG['1. Potential Target']

                  return (
                    <tr
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: conf.color }}>{deal.code}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{clientName}</td>
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
                        <span style={{ fontSize: 11, fontWeight: 800, color: conf.color, background: conf.badgeBg, padding: '3px 8px', borderRadius: 6 }}>
                          {deal.stage}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDeal(deal)
                          }}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. ENTERPRISE DEAL DRAWER (SLIDES IN FROM RIGHT) */}
      {selectedDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedDeal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
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
            {/* Drawer Top Header */}
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
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* VISUAL CHEVRON STAGE STEPPER */}
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 8 }}>
                PIPELINE STAGE PROGRESSION (CLICK TO MOVE)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STAGE_KEYS.map((stageKey, idx) => {
                  const conf = STAGE_CONFIG[stageKey]
                  const isCurrent = matchStage(selectedDeal.stage, stageKey)

                  return (
                    <div
                      key={stageKey}
                      onClick={() => migrateDealStage(selectedDeal.id, stageKey)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: isCurrent ? `2px solid ${conf.color}` : '1px solid #e2e8f0',
                        background: isCurrent ? conf.badgeBg : '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{conf.icon}</span>
                        <strong style={{ fontSize: 12, color: isCurrent ? conf.color : '#334155' }}>
                          {conf.label}
                        </strong>
                      </div>
                      {isCurrent ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: conf.color, background: '#fff', padding: '2px 8px', borderRadius: 10, border: `1px solid ${conf.border}` }}>
                          Active Stage
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Set →</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* STAGE QUALIFICATION CHECKLIST (EMBEDDED IN DRAWER) */}
            {STAGE_CONFIG[selectedDeal.stage] && (
              <div
                style={{
                  background: '#f8fafc',
                  border: `1px solid ${STAGE_CONFIG[selectedDeal.stage].border}`,
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>
                    {STAGE_CONFIG[selectedDeal.stage].icon} STAGE QUALIFICATION CHECKLIST
                  </span>
                  <span style={{ fontSize: 11, color: STAGE_CONFIG[selectedDeal.stage].color, fontWeight: 700 }}>
                    {STAGE_CONFIG[selectedDeal.stage].shortLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {STAGE_CONFIG[selectedDeal.stage].checklist.map((item, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(drawerChecklist[i])}
                        onChange={() => setDrawerChecklist((p) => ({ ...p, [i]: !p[i] }))}
                        style={{ marginTop: 2, accentColor: STAGE_CONFIG[selectedDeal.stage].color }}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* COMMERCIAL METRICS SUMMARY */}
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

            {selectedDeal.notes && (
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                  EXTRACTED DELIVERABLES &amp; NOTES
                </span>
                <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.5, maxHeight: 140, overflowY: 'auto' }}>
                  {selectedDeal.notes}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={(e) => handleDeleteDeal(e, selectedDeal.id, selectedDeal.client || selectedDeal.client_name)}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #fecdd3', background: '#fef2f2', color: '#b91c1c', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                Delete Opportunity
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