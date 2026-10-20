import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const STAGE_CONFIG = {
  '1. Potential Target': {
    label: '1. Potential Target',
    color: '#64748b',
    lightBg: '#f8fafc',
    border: '#cbd5e1',
    badgeBg: '#f1f5f9',
    icon: '🎯',
    checklist: [
      'Decision-maker / C-suite executive identified at client',
      'Strategic alignment with SBU product catalogue verified',
      'Target account registered in 184 Client Directory baseline',
    ],
  },
  '2. Lead': {
    label: '2. Lead',
    color: '#0284c7',
    lightBg: '#f0f9ff',
    border: '#bae6fd',
    badgeBg: '#e0f2fe',
    icon: '📞',
    checklist: [
      'First direct outreach executed (email, letter, meeting)',
      'Verified expression of interest or tender notice detected',
      'Account assigned to designated SBU Business Development Lead',
    ],
  },
  '3. Pre-Qualified Opportunity': {
    label: '3. Pre-Qualified Opportunity',
    color: '#6366f1',
    lightBg: '#eef2ff',
    border: '#c7d2fe',
    badgeBg: '#e0e7ff',
    icon: '📑',
    checklist: [
      'TOR / RFP scope analyzed using Gemini AI Document Parser',
      'Commercial budget feasibility & resource availability checked',
      'Internal Bid / No-Bid committee clearance secured',
    ],
  },
  '4. Qualified Pipeline': {
    label: '4. Qualified Pipeline',
    color: '#f59e0b',
    lightBg: '#fffbeb',
    border: '#fde68a',
    badgeBg: '#fef3c7',
    icon: '⚡',
    checklist: [
      'Formal Technical & Financial Proposal envelope submitted',
      'Oral proposal defense / institutional pitch completed',
      'Commercial terms, VAT/withholding taxes, & milestones reviewed',
    ],
  },
  '5. Conversion (Won / Signed)': {
    label: '5. Conversion (Won / Signed)',
    color: '#10b981',
    lightBg: '#ecfdf5',
    border: '#a7f3d0',
    badgeBg: '#d1fae5',
    icon: '🏆',
    checklist: [
      'Official signed contract or formal award letter received',
      'Advance payment invoice or mobilization guarantee issued',
      'SBU Delivery team assigned and formal project kickoff scheduled',
    ],
  },
  '6. Delivery & Repeat Business': {
    label: '6. Delivery & Repeat Business',
    color: '#8b5cf6',
    lightBg: '#f5f3ff',
    border: '#ddd6fe',
    badgeBg: '#ede9fe',
    icon: '🔄',
    checklist: [
      'All deliverable milestones completed and accepted by client',
      'Final contract settlement payment and retention collected',
      'Subsequent retainer or follow-up commercial mandate discussed',
    ],
  },
  'Closed / Lost': {
    label: 'Closed / Lost',
    color: '#ef4444',
    lightBg: '#fef2f2',
    border: '#fecdd3',
    badgeBg: '#fee2e2',
    icon: '❌',
    checklist: [
      'Clear loss reason documented (Budget cancelled, Competitor, Price)',
      'Debrief conducted with client to extract bid intelligence',
      'Opportunity archived from active revenue realization metrics',
    ],
  },
}

const STAGE_KEYS = Object.keys(STAGE_CONFIG)

// Robust stage matcher to accommodate variations in stage naming across existing database records
function matchStage(dealStage, targetStageKey) {
  if (!dealStage) return targetStageKey === '1. Potential Target'
  const ds = dealStage.toLowerCase().trim()
  const ts = targetStageKey.toLowerCase().trim()

  if (ds === ts) return true
  if (ts.startsWith('1') && (ds.includes('potential') || ds.includes('target'))) return true
  if (ts.startsWith('2') && ds.includes('lead')) return true
  if (ts.startsWith('3') && (ds.includes('pre-qual') || ds.includes('prequalified'))) return true
  if (ts.startsWith('4') && ds.includes('qualified') && !ds.includes('pre')) return true
  if (ts.startsWith('5') && (ds.includes('won') || ds.includes('conversion') || ds.includes('signed'))) return true
  if (ts.startsWith('6') && (ds.includes('delivery') || ds.includes('repeat'))) return true
  if (ts.includes('lost') && (ds.includes('lost') || ds.includes('closed') || ds.includes('cancelled'))) return true
  return false
}

export default function ProposalList({ refreshVersion, onRefresh }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSbu, setFilterSbu] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewType, setViewType] = useState('board')

  const [migratingDeal, setMigratingDeal] = useState(null)
  const [checkedItems, setCheckedItems] = useState({})
  const [gateNotes, setGateNotes] = useState('')
  const [savingGate, setSavingGate] = useState(false)

  useEffect(() => {
    fetchDeals()
  }, [refreshVersion])

  async function fetchDeals() {
    setLoading(true)

    // Primary fetch ordering by created_at, with fallback to unordered select if created_at is indexing
    let res = await supabase.from('opportunities').select('*').order('created_at', { ascending: false })
    if (res.error) {
      res = await supabase.from('opportunities').select('*')
    }

    if (res.data) {
      setDeals(res.data)
    }
    setLoading(false)
  }

  function initiateStageTransition(deal, newStage) {
    if (deal.stage === newStage) return
    setMigratingDeal({ deal, targetStage: newStage })
    setCheckedItems({})
    setGateNotes('')
  }

  function toggleCheckItem(index) {
    setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  function handleCheckAll(stageKey) {
    const total = STAGE_CONFIG[stageKey]?.checklist.length || 0
    const updated = {}
    for (let i = 0; i < total; i++) updated[i] = true
    setCheckedItems(updated)
  }

  async function confirmStageMigration() {
    if (!migratingDeal) return
    const { deal, targetStage } = migratingDeal
    setSavingGate(true)

    setDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, stage: targetStage } : d))
    )

    const completed = Object.keys(checkedItems).filter((k) => checkedItems[k]).length
    const total = STAGE_CONFIG[targetStage]?.checklist.length || 0
    const noteSuffix = ` [GATE_${targetStage.replace(/[^A-Za-z0-9]/g, '_')}: ${completed}/${total} Verified${gateNotes ? ` - ${gateNotes}` : ''}]`
    const updatedNotes = (deal.notes || '') + noteSuffix

    const { error } = await supabase
      .from('opportunities')
      .update({
        stage: targetStage,
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deal.id)

    setSavingGate(false)
    setMigratingDeal(null)

    if (error) {
      alert(`Could not complete stage migration: ${error.message}`)
      fetchDeals()
    } else {
      onRefresh?.()
    }
  }

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
      {/* Filter and View Selector */}
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

      {/* Multicolored Staged Board */}
      {viewType === 'board' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STAGE_KEYS.length}, minmax(260px, 1fr))`,
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 20,
          }}
        >
          {STAGE_KEYS.map((stageKey) => {
            const conf = STAGE_CONFIG[stageKey]
            const stageDeals = filteredDeals.filter((d) => matchStage(d.stage, stageKey))
            const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0)

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
                {/* Header */}
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
                        padding: '2px 7px',
                        borderRadius: 10,
                        border: `1px solid ${conf.border}`,
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
                      const displayClient = deal.client || deal.client_name || 'Institutional Client'
                      return (
                        <div
                          key={deal.id}
                          style={{
                            background: '#ffffff',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            borderLeft: `5px solid ${conf.color}`,
                            padding: 12,
                            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
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

                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{displayClient}</div>
                          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.35 }}>
                            {deal.title || deal.product}
                          </div>

                          <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', marginTop: 2 }}>
                            ETB {new Intl.NumberFormat('en-US').format(deal.deal_value || 0)}
                          </div>

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
                              onClick={() => handleDeleteDeal(deal.id, displayClient)}
                              title="Delete redundant card"
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
                              onChange={(e) => initiateStageTransition(deal, e.target.value)}
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: `1px solid ${conf.border}`,
                                background: conf.badgeBg,
                                color: conf.color,
                                maxWidth: '175px',
                                cursor: 'pointer',
                              }}
                            >
                              {STAGE_KEYS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
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
      )}

      {/* Table View */}
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
                <th style={{ padding: '12px 16px' }}>CURRENT STAGE</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>DELETE</th>
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
                  const displayClient = deal.client || deal.client_name || 'Institutional Client'
                  const conf = STAGE_CONFIG[deal.stage] || STAGE_CONFIG['1. Potential Target']
                  return (
                    <tr key={deal.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: conf.color }}>{deal.code}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{displayClient}</td>
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
                          onChange={(e) => initiateStageTransition(deal, e.target.value)}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: `1px solid ${conf.border}`,
                            background: conf.badgeBg,
                            color: conf.color,
                            cursor: 'pointer',
                          }}
                        >
                          {STAGE_KEYS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeal(deal.id, displayClient)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14 }}
                        >
                          🗑️
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

      {/* Stage-Gate Verification Modal */}
      {migratingDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setMigratingDeal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: STAGE_CONFIG[migratingDeal.targetStage]?.badgeBg,
                    color: STAGE_CONFIG[migratingDeal.targetStage]?.color,
                    border: `1px solid ${STAGE_CONFIG[migratingDeal.targetStage]?.border}`,
                    textTransform: 'uppercase',
                  }}
                >
                  Stage Gate Verification
                </span>
                <button
                  type="button"
                  onClick={() => setMigratingDeal(null)}
                  style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <h3 style={{ margin: '8px 0 2px 0', fontSize: 17, color: '#0f172a' }}>
                Migrate "{migratingDeal.deal.client || migratingDeal.deal.client_name}" to:
              </h3>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: STAGE_CONFIG[migratingDeal.targetStage]?.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{STAGE_CONFIG[migratingDeal.targetStage]?.icon}</span>
                <span>{migratingDeal.targetStage}</span>
              </div>
            </div>

            <div
              style={{
                background: STAGE_CONFIG[migratingDeal.targetStage]?.lightBg,
                border: `1px solid ${STAGE_CONFIG[migratingDeal.targetStage]?.border}`,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#334155' }}>
                  MANDATORY GATING REQUIREMENTS
                </span>
                <button
                  type="button"
                  onClick={() => handleCheckAll(migratingDeal.targetStage)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 700,
                    color: STAGE_CONFIG[migratingDeal.targetStage]?.color,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  ✓ Check All
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {STAGE_CONFIG[migratingDeal.targetStage]?.checklist.map((item, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      fontSize: 12,
                      color: '#1e293b',
                      cursor: 'pointer',
                      lineHeight: 1.4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checkedItems[idx])}
                      onChange={() => toggleCheckItem(idx)}
                      style={{ marginTop: 2, cursor: 'pointer', accentColor: STAGE_CONFIG[migratingDeal.targetStage]?.color }}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                {migratingDeal.targetStage === 'Closed / Lost' ? 'Loss Reason / Competitor Notes *' : 'Gate Verification Notes (Optional)'}
              </label>
              <input
                type="text"
                value={gateNotes}
                onChange={(e) => setGateNotes(e.target.value)}
                placeholder={
                  migratingDeal.targetStage === 'Closed / Lost'
                    ? 'e.g. Price competition, project postponed by client…'
                    : 'e.g. Scope confirmed, advance invoice submitted…'
                }
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setMigratingDeal(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingGate}
                onClick={confirmStageMigration}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: STAGE_CONFIG[migratingDeal.targetStage]?.color,
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: savingGate ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                {savingGate ? 'Migrating…' : `Confirm Move to ${STAGE_CONFIG[migratingDeal.targetStage]?.icon} ${migratingDeal.targetStage} →`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}