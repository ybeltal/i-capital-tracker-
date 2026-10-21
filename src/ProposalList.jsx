import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

const STAGES = [
  { id: '1. TOR / RFP Identified', title: '1. TOR / RFP Identified', color: '#6366f1', badgeBg: '#e0e7ff', badgeText: '#4338ca' },
  { id: '2. Proposal In Defense', title: '2. Proposal In Defense', color: '#f59e0b', badgeBg: '#fef3c7', badgeText: '#b45309' },
  { id: '3. Contract Won / Signed', title: '3. Contract Won / Signed', color: '#10b981', badgeBg: '#d1fae5', badgeText: '#047857' },
  { id: '4. Delivery & Repeat Business', title: '4. Delivery & Repeat Business', color: '#8b5cf6', badgeBg: '#ede9fe', badgeText: '#6d28d9' },
]

export default function ProposalList({
  refreshVersion = 0,
  onRefresh,
  onOpenTorChat,
  onOpenProposalStudio,
  onStageGateAdvance,
}) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sbuFilter, setSbuFilter] = useState('All')
  const [evidenceFilter, setEvidenceFilter] = useState('All')
  const [selectedDeal, setSelectedDeal] = useState(null)

  const [criteriaChecked, setCriteriaChecked] = useState({
    c1: false,
    c2: false,
    c3: false,
  })

  useEffect(() => {
    fetchOpportunities()

    const channel = supabase
      .channel('proposallist-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        () => {
          fetchOpportunities()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshVersion])

  async function fetchOpportunities() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setDeals(data)
      }
    } catch (err) {
      console.error('Error fetching proposals:', err)
    } finally {
      setLoading(false)
    }
  }

  function normalizeStage(stageName) {
    if (!stageName) return STAGES[0].id
    const s = stageName.trim().toLowerCase()
    if (s.includes('1.') || s.includes('tor') || s.includes('potential')) return STAGES[0].id
    if (s.includes('2.') || s.includes('defense')) return STAGES[1].id
    if (s.includes('3.') || s.includes('won') || s.includes('signed')) return STAGES[2].id
    if (s.includes('4.') || s.includes('delivery') || s.includes('repeat')) return STAGES[3].id
    return STAGES[0].id
  }

  function triggerChat(deal) {
    if (onOpenTorChat) {
      onOpenTorChat(deal)
    } else {
      window.dispatchEvent(new CustomEvent('crm:open-tor-chat', { detail: deal }))
    }
  }

  function triggerStudio(deal) {
    if (onOpenProposalStudio) {
      onOpenProposalStudio(deal)
    } else {
      window.dispatchEvent(new CustomEvent('crm:open-proposal-studio', { detail: deal }))
    }
  }

  function triggerStageAdvance(deal, nextStage) {
    if (onStageGateAdvance) {
      onStageGateAdvance(deal, nextStage)
    } else {
      window.dispatchEvent(
        new CustomEvent('crm:stage-gate-advance', {
          detail: { deal, targetStage: nextStage },
        })
      )
    }
  }

  function handleQuickAdvance(e, deal) {
    e.stopPropagation()
    const current = normalizeStage(deal.stage)
    const currentIndex = STAGES.findIndex((stg) => stg.id === current)
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1].id
      triggerStageAdvance(deal, nextStage)
    }
  }

  async function handleDeleteDeal(dealId) {
    if (!window.confirm('Are you sure you want to delete this proposal opportunity?')) return
    setDeals((prev) => prev.filter((d) => d.id !== dealId))
    setSelectedDeal(null)

    try {
      await supabase.from('opportunities').delete().eq('id', dealId)
      onRefresh?.()
    } catch (err) {
      console.error('Error deleting proposal:', err)
    }
  }

  const filteredDeals = deals.filter((deal) => {
    const term = searchQuery.toLowerCase()
    const matchSearch =
      (deal.client || deal.client_name || '').toLowerCase().includes(term) ||
      (deal.title || deal.product || '').toLowerCase().includes(term) ||
      (deal.code || '').toLowerCase().includes(term)

    const matchSbu =
      sbuFilter === 'All' ||
      (deal.sbu || '').toLowerCase() === sbuFilter.toLowerCase()

    const currentEvidence = deal.evidence_status || 'Unverified'
    const matchEvidence =
      evidenceFilter === 'All' ||
      currentEvidence.toLowerCase() === evidenceFilter.toLowerCase()

    return matchSearch && matchSbu && matchEvidence
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* FILTER & GOVERNANCE MONITORING BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={sbuFilter}
            onChange={(e) => setSbuFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 700,
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Business Units (Institute, CBS, IIP, DAS)</option>
            <option value="Institute">The i-Capital Institute</option>
            <option value="CBS">Corporate Business Solutions (CBS)</option>
            <option value="IIP">Investment Platform (IIP)</option>
            <option value="DAS">Digital &amp; AI Solutions (DAS)</option>
          </select>

          {/* Evidence Health Governance Filter */}
          <select
            value={evidenceFilter}
            onChange={(e) => setEvidenceFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 700,
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Audit States (Verified + Flagged)</option>
            <option value="Verified">🟢 Verified Only (100% Documented)</option>
            <option value="Provisional">🟡 Provisional (Pending Proof)</option>
            <option value="Unverified">🔴 Unverified (Gating Blocked)</option>
          </select>

          <input
            type="text"
            placeholder="Search institution, proposal, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              width: 260,
              background: '#ffffff',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, fontWeight: 800, color: '#64748b' }}>
          <span>
            Showing: <strong style={{ color: '#0f172a' }}>{filteredDeals.length}</strong> of {deals.length} deals
          </span>
          <span
            style={{
              background: '#dcfce7',
              color: '#15803d',
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              border: '1px solid #bbf7d0',
            }}
          >
            {deals.filter((d) => d.evidence_status === 'Verified').length} Verified
          </span>
        </div>
      </div>

      {/* 4-COLUMN EVIDENCE-PROTECTED KANBAN BOARD */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {STAGES.map((stg) => {
          const stageDeals = filteredDeals.filter(
            (d) => normalizeStage(d.stage) === stg.id
          )
          const stageTotal = stageDeals.reduce(
            (sum, d) => sum + (Number(d.deal_value) || 0),
            0
          )

          return (
            <div
              key={stg.id}
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                borderTop: `4px solid ${stg.color}`,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 520,
              }}
            >
              {/* Column Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                    {stg.title}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: stg.badgeBg,
                      color: stg.badgeText,
                    }}
                  >
                    {stageDeals.length}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginTop: 4 }}>
                  ETB {new Intl.NumberFormat('en-US').format(stageTotal)}
                </div>
              </div>

              {/* Deals Feed */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: 12 }}>
                    Loading pipeline records…
                  </div>
                ) : stageDeals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 10px', color: '#94a3b8', fontSize: 12 }}>
                    No proposals in this stage
                  </div>
                ) : (
                  stageDeals.map((deal) => {
                    const status = deal.evidence_status || 'Unverified'
                    const isVerified = status === 'Verified'
                    const isProvisional = status === 'Provisional'

                    return (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDeal(deal)}
                        style={{
                          background: '#ffffff',
                          borderRadius: 10,
                          border: isVerified ? '1px solid #bbf7d0' : isProvisional ? '1px solid #fde68a' : '1px solid #e2e8f0',
                          padding: 14,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none'
                          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                        }}
                      >
                        {/* Card Header & Evidence Health Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 900, color: '#0284c7' }}>
                            {deal.code || 'DEAL'}
                          </span>

                          <span
                            title={`Audit Governance: ${status}`}
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: isVerified ? '#dcfce7' : isProvisional ? '#fef3c7' : '#fee2e2',
                              color: isVerified ? '#15803d' : isProvisional ? '#b45309' : '#b91c1c',
                              border: `1px solid ${isVerified ? '#86efac' : isProvisional ? '#fde68a' : '#fecaca'}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>{isVerified ? '🟢' : isProvisional ? '🟡' : '🔴'}</span>
                            <span>{status}</span>
                          </span>
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                          {deal.client || deal.client_name || 'Strategic Client'}
                        </div>

                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.3 }}>
                          {deal.title || deal.product || 'Proposal Mandate Scope'}
                        </div>

                        <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', marginTop: 4 }}>
                          ETB {new Intl.NumberFormat('en-US').format(deal.deal_value || 0)}
                        </div>

                        {deal.deadline && (
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#dc2626' }}>
                            ⏰ Deadline: {deal.deadline}
                          </div>
                        )}

                        {deal.last_evidence_title && (
                          <div
                            style={{
                              fontSize: 10,
                              color: '#334155',
                              background: '#f8fafc',
                              border: '1px solid #f1f5f9',
                              padding: '3px 6px',
                              borderRadius: 4,
                              marginTop: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            📎 {deal.last_evidence_title}
                          </div>
                        )}

                        {/* Card Action Controls */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: 8,
                            marginTop: 6,
                          }}
                        >
                          <div style={{ display: 'flex', gap: 6 }}>
                            {/* 1-Click TOR Chat Trigger */}
                            <button
                              type="button"
                              title="Open Live TOR Clarification Chat"
                              onClick={(e) => {
                                e.stopPropagation()
                                triggerChat(deal)
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid #bae6fd',
                                background: '#f0f9ff',
                                color: '#0284c7',
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span>💬</span> Chat
                            </button>

                            {/* 1-Click Proposal Studio Trigger */}
                            <button
                              type="button"
                              title="Open AI Proposal Document Studio"
                              onClick={(e) => {
                                e.stopPropagation()
                                triggerStudio(deal)
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#475569',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span>📋</span> Studio
                            </button>
                          </div>

                          {/* Stage-Gate Intercepted Advance Button */}
                          <button
                            type="button"
                            title="Verify Stage-Gate Evidence & Advance"
                            onClick={(e) => handleQuickAdvance(e, deal)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: 'none',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            Advance →
                          </button>
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

      {/* RIGHT-SIDE SLIDE-OUT DEAL STAGE & EVIDENCE GOVERNANCE DRAWER */}
      {selectedDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            zIndex: 99990,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedDeal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              height: '100%',
              background: '#ffffff',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.18)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#0284c7' }}>
                      {selectedDeal.code || 'DEAL'}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontWeight: 700,
                      }}
                    >
                      {selectedDeal.sbu || 'Institute'}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                    {selectedDeal.client || selectedDeal.client_name}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {selectedDeal.title || selectedDeal.product}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDeal(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 20,
                    cursor: 'pointer',
                    color: '#94a3b8',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* QUICK ACTION BAR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '20px 0' }}>
                <button
                  type="button"
                  onClick={() => {
                    const d = selectedDeal
                    setSelectedDeal(null)
                    triggerChat(d)
                  }}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  <span>💬</span> Live TOR Chat
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const d = selectedDeal
                    setSelectedDeal(null)
                    triggerStudio(d)
                  }}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span>📋</span> Proposal Studio
                </button>
              </div>

              {/* MOVE STAGE WITH MANDATORY EVIDENCE INTERCEPTION */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  MOVE STAGE (EVIDENCE AUDIT PROTECTED)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {STAGES.map((stg) => {
                    const isCurrent = normalizeStage(selectedDeal.stage) === stg.id
                    return (
                      <div
                        key={stg.id}
                        onClick={() => {
                          if (!isCurrent) {
                            const d = selectedDeal
                            setSelectedDeal(null)
                            triggerStageAdvance(d, stg.id)
                          }
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: isCurrent ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                          background: isCurrent ? '#f0f9ff' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: isCurrent ? 'default' : 'pointer',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: isCurrent ? 800 : 600,
                            color: isCurrent ? '#0284c7' : '#334155',
                          }}
                        >
                          {stg.title}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: isCurrent ? '#0284c7' : '#94a3b8',
                          }}
                        >
                          {isCurrent ? 'Current' : 'Verify & Set →'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* STAGE CRITERIA CHECKLIST */}
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  STAGE CRITERIA
                </div>
                <div
                  style={{
                    background: '#f8fafc',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={criteriaChecked.c1}
                      onChange={(e) => setCriteriaChecked({ ...criteriaChecked, c1: e.target.checked })}
                    />
                    Official TOR / RFP document uploaded and parsed via AI
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={criteriaChecked.c2}
                      onChange={(e) => setCriteriaChecked({ ...criteriaChecked, c2: e.target.checked })}
                    />
                    Strategic SBU fit confirmed (Institute, CBS, IIP, DAS)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={criteriaChecked.c3}
                      onChange={(e) => setCriteriaChecked({ ...criteriaChecked, c3: e.target.checked })}
                    />
                    Submission deadline logged in calendar
                  </label>
                </div>
              </div>

              {/* VALUE & DEADLINE SUMMARY */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 22 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    DEAL VALUE
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#166534', marginTop: 4 }}>
                    ETB {new Intl.NumberFormat('en-US').format(selectedDeal.deal_value || 0)}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    DEADLINE
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#dc2626', marginTop: 4 }}>
                    {selectedDeal.deadline || 'No Deadline'}
                  </div>
                </div>
              </div>
            </div>

            {/* DRAWER FOOTER */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #e2e8f0',
                paddingTop: 16,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => handleDeleteDeal(selectedDeal.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>

              <button
                type="button"
                onClick={() => setSelectedDeal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
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