import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

// APPROVED SBU TARGET BASELINES (FY 2026/27 Pipeline Readiness Report)
const SBU_TARGET_BASELINES = {
  Institute: {
    name: 'The i-Capital Institute',
    shortName: 'Institute',
    annualRevenueTarget: 63000000,
    requiredPipeline3x: 189000000,
    quarterlyRevenue: { Q1: 6300000, Q2: 25200000, Q3: 25200000, Q4: 6300000 },
    quarterlyPipeline3x: { Q1: 18900000, Q2: 75600000, Q3: 75600000, Q4: 18900000 },
  },
  CBS: {
    name: 'Cross Border Solutions',
    shortName: 'CBS',
    annualRevenueTarget: 35000000,
    requiredPipeline3x: 105000000,
    quarterlyRevenue: { Q1: 3500000, Q2: 14000000, Q3: 14000000, Q4: 3500000 },
    quarterlyPipeline3x: { Q1: 10500000, Q2: 42000000, Q3: 42000000, Q4: 10500000 },
  },
  IIP: {
    name: 'i-Capital Investment Partners',
    shortName: 'IIP',
    annualRevenueTarget: 140300000,
    requiredPipeline3x: 420900000,
    quarterlyRevenue: { Q1: 6000000, Q2: 42690000, Q3: 46540000, Q4: 45070000 },
    quarterlyPipeline3x: { Q1: 18000000, Q2: 128070000, Q3: 139620000, Q4: 135210000 },
  },
  DAS: {
    name: 'Digital & AI Solutions',
    shortName: 'DAS',
    annualRevenueTarget: 18295000,
    requiredPipeline3x: 54885000,
    quarterlyRevenue: { Q1: 3659000, Q2: 5488500, Q3: 5488500, Q4: 3659000 },
    quarterlyPipeline3x: { Q1: 10977000, Q2: 16465500, Q3: 16465500, Q4: 10977000 },
  },
}

// Stage Probability Mapping
const STAGE_WEIGHTS = {
  '1. TOR / RFP Identified': 0.25,
  '1. Potential Target': 0.20,
  '2. Proposal In Defense': 0.60,
  '3. Contract Won / Signed': 1.00,
  '4. Delivery & Repeat Business': 1.00,
  'Lost': 0.00,
}

export default function SummaryDashboard({ onNavigateTab }) {
  const [fiscalPeriod, setFiscalPeriod] = useState('Full Year') // 'Full Year' | 'Q1' | 'Q2' | 'Q3' | 'Q4'
  const [opportunities, setOpportunities] = useState([])
  const [leads, setLeads] = useState([])
  const [marketingLeads, setMarketingLeads] = useState([])
  const [clientsCount, setClientsCount] = useState(184)
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  // Executive Management Alert Filter
  const [evidenceAlertOnly, setEvidenceAlertOnly] = useState(false)

  useEffect(() => {
    fetchAllMetrics()

    const channel = supabase
      .channel('summary-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, fetchAllMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchAllMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_leads' }, fetchAllMetrics)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchAllMetrics() {
    setLoading(true)
    try {
      // 1. Opportunities Pipeline
      const { data: oppsData } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })

      if (oppsData) setOpportunities(oppsData)

      // 2. Pre-Tender Leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')

      if (leadsData) setLeads(leadsData)

      // 3. Digital Marketing Inbound Inquiries
      const { data: mktgData } = await supabase
        .from('marketing_leads')
        .select('*')

      if (mktgData) setMarketingLeads(mktgData)

      // 4. Client Directory Total Mapped
      const { count: clientTotal } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      if (clientTotal && clientTotal > 0) {
        setClientsCount(clientTotal)
      }

      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Error refreshing executive metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  // SBU Normalizer
  function normalizeSbuKey(rawSbu) {
    if (!rawSbu) return 'Institute'
    const s = rawSbu.toLowerCase()
    if (s.includes('cross') || s.includes('cbs') || s.includes('border')) return 'CBS'
    if (s.includes('invest') || s.includes('iip') || s.includes('partner')) return 'IIP'
    if (s.includes('digital') || s.includes('das') || s.includes('ai')) return 'DAS'
    return 'Institute'
  }

  // Parse Value Safely
  function parseVal(val) {
    if (!val) return 0
    if (typeof val === 'number') return val
    const clean = String(val).replace(/[^0-9.-]+/g, '')
    return parseFloat(clean) || 0
  }

  // Fiscal Quarter Filter Matcher
  function matchPeriod(record) {
    if (fiscalPeriod === 'Full Year') return true
    const q = record.quarter || record.fiscal_quarter
    if (!q) return true // Include unassigned deals in total views
    return q.toUpperCase().includes(fiscalPeriod)
  }

  // Filtered Opportunities
  const filteredOpps = opportunities.filter((o) => {
    const matchesPeriod = matchPeriod(o)
    const matchesAlert = evidenceAlertOnly ? (o.evidence_status !== 'Verified' && parseVal(o.deal_value) >= 2000000) : true
    return matchesPeriod && matchesAlert
  })

  // Group Financial Target Calculations
  const groupTargetRevenue = Object.values(SBU_TARGET_BASELINES).reduce((sum, sbu) => {
    return sum + (fiscalPeriod === 'Full Year' ? sbu.annualRevenueTarget : (sbu.quarterlyRevenue[fiscalPeriod] || 0))
  }, 0)

  const groupRequired3xPipeline = groupTargetRevenue * 3

  // Active Formal Proposals Pipeline (Stage 1 & Stage 2)
  const activeTenderDeals = filteredOpps.filter((o) => {
    const stg = (o.stage || '').toLowerCase()
    return stg.includes('1.') || stg.includes('2.') || stg.includes('tor') || stg.includes('defense')
  })
  const activeTenderValue = activeTenderDeals.reduce((sum, o) => sum + parseVal(o.deal_value), 0)

  // Contracted Won Revenue (Stage 3 & Stage 4)
  const wonDeals = filteredOpps.filter((o) => {
    const stg = (o.stage || '').toLowerCase()
    return stg.includes('3.') || stg.includes('4.') || stg.includes('won') || stg.includes('signed') || stg.includes('delivery')
  })
  const contractedWonRevenue = wonDeals.reduce((sum, o) => sum + parseVal(o.deal_value), 0)

  // Weighted Tender Realization (Stage Probability Calculation)
  const weightedTenderRealization = activeTenderDeals.reduce((sum, o) => {
    const prob = o.probability ? Number(o.probability) / 100 : (STAGE_WEIGHTS[o.stage] || 0.35)
    return sum + (parseVal(o.deal_value) * prob)
  }, 0)

  // Pre-Tender Leads Value
  const preTenderLeads = leads.filter(matchPeriod)
  const preTenderValue = preTenderLeads.reduce((sum, l) => sum + parseVal(l.deal_value || l.estimated_value), 0)

  // Total Active Qualified Pipeline (Active Proposals + Contracted Won)
  const totalQualifiedPipeline = activeTenderValue + contractedWonRevenue
  const pipelineCoverageRatio = groupTargetRevenue > 0 ? (totalQualifiedPipeline / groupTargetRevenue).toFixed(2) : '0.00'
  const pipelineGap = totalQualifiedPipeline - groupRequired3xPipeline

  // SBU Level Target Breakdown
  const sbuPerformance = Object.entries(SBU_TARGET_BASELINES).map(([key, config]) => {
    const sbuTarget = fiscalPeriod === 'Full Year' ? config.annualRevenueTarget : config.quarterlyRevenue[fiscalPeriod]
    const sbuRequired = sbuTarget * 3

    const sbuOpps = filteredOpps.filter((o) => normalizeSbuKey(o.sbu) === key)
    const sbuActive = sbuOpps.reduce((sum, o) => sum + parseVal(o.deal_value), 0)
    const sbuWon = sbuOpps
      .filter((o) => (o.stage || '').toLowerCase().includes('won') || (o.stage || '').toLowerCase().includes('3.'))
      .reduce((sum, o) => sum + parseVal(o.deal_value), 0)

    const sbuWeighted = sbuOpps.reduce((sum, o) => {
      const prob = o.probability ? Number(o.probability) / 100 : (STAGE_WEIGHTS[o.stage] || 0.3)
      return sum + (parseVal(o.deal_value) * prob)
    }, 0)

    const coverage = sbuTarget > 0 ? (sbuActive / sbuTarget).toFixed(1) : '0.0'
    const attainment = sbuTarget > 0 ? ((sbuWon / sbuTarget) * 100).toFixed(1) : '0.0'
    const gap = sbuActive - sbuRequired

    return {
      key,
      name: config.name,
      target: sbuTarget,
      required3x: sbuRequired,
      active: sbuActive,
      won: sbuWon,
      weighted: sbuWeighted,
      coverage,
      attainment,
      gap,
    }
  })

  // Priority Actions & Approaching Deadlines Count
  const now = new Date()
  const urgentDeadlines = opportunities.filter((o) => {
    if (!o.deadline) return false
    const d = new Date(o.deadline)
    const diffDays = (d - now) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 3
  })

  const unverifiedHighValue = opportunities.filter(
    (o) => parseVal(o.deal_value) >= 2000000 && o.evidence_status !== 'Verified'
  )

  // Export to CSV Functionality
  function handleExportCSV() {
    const headers = ['Code', 'Client', 'SBU', 'Title', 'Deal Value (ETB)', 'Stage', 'Probability %', 'Weighted Value (ETB)', 'Deadline', 'Evidence Status']
    const rows = filteredOpps.map((o) => [
      `"${o.code || 'DEAL'}"`,
      `"${o.client || o.client_name || 'Client'}"`,
      `"${o.sbu || 'Institute'}"`,
      `"${o.title || o.product || 'Proposal'}"`,
      parseVal(o.deal_value),
      `"${o.stage || 'TOR'}"`,
      ((STAGE_WEIGHTS[o.stage] || 0.3) * 100).toFixed(0),
      Math.round(parseVal(o.deal_value) * (STAGE_WEIGHTS[o.stage] || 0.3)),
      `"${o.deadline || 'N/A'}"`,
      `"${o.evidence_status || 'Unverified'}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `i-Capital_Commercial_Pipeline_${fiscalPeriod}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Executive Print Briefing
  function handlePrintBriefing() {
    window.print()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. EXECUTIVE TITLE, REFRESH & REPORTING BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '16px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              Executive Opportunity &amp; Revenue Forecast Dashboard
            </h2>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid #bae6fd',
              }}
            >
              FY 2026/27 Approved Baseline
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            Two-tier commercial intelligence: Pre-tender lead qualification and formal proposal revenue realization.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePrintBriefing}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#070d1e',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📑</span> Executive Briefing (PDF)
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#059669',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📊</span> Export ALL to CSV
          </button>

          <button
            type="button"
            onClick={fetchAllMetrics}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0284c7',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🔄</span> {loading ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* 2. FISCAL PERIOD SELECTOR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#475569', textTransform: 'uppercase' }}>
            📅 FISCAL PERIOD:
          </span>

          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 4 }}>
            {[
              { id: 'Full Year', label: 'Full Year (All Quarters)', count: opportunities.length },
              { id: 'Q1', label: 'Q1 (Jul – Sep)', count: opportunities.filter((o) => (o.quarter || '').includes('Q1')).length },
              { id: 'Q2', label: 'Q2 (Oct – Dec)', count: opportunities.filter((o) => (o.quarter || '').includes('Q2')).length },
              { id: 'Q3', label: 'Q3 (Jan – Mar)', count: opportunities.filter((o) => (o.quarter || '').includes('Q3')).length },
              { id: 'Q4', label: 'Q4 (Apr – Jun)', count: opportunities.filter((o) => (o.quarter || '').includes('Q4')).length },
            ].map((p) => {
              const active = fiscalPeriod === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFiscalPeriod(p.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: active ? '#0284c7' : 'transparent',
                    color: active ? '#ffffff' : '#475569',
                    fontSize: 12,
                    fontWeight: active ? 800 : 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.1s ease',
                  }}
                >
                  <span>{p.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '1px 5px',
                      borderRadius: 10,
                      background: active ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: active ? '#ffffff' : '#64748b',
                    }}
                  >
                    {p.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#64748b' }}>
          Data As Of: <strong>{lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
        </div>
      </div>

      {/* 3. 3X REQUIRED PIPELINE COVERAGE & GAP GAUGE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                3× Required Pipeline Coverage &amp; Gap Gauge[cite: 16]
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: pipelineCoverageRatio >= 3 ? '#dcfce7' : pipelineCoverageRatio >= 1.5 ? '#fef3c7' : '#fee2e2',
                  color: pipelineCoverageRatio >= 3 ? '#15803d' : pipelineCoverageRatio >= 1.5 ? '#b45309' : '#b91c1c',
                }}
              >
                {pipelineCoverageRatio}× Coverage ({pipelineCoverageRatio >= 3 ? 'HEALTHY' : 'GAP DEFICIT'})[cite: 16]
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Group Governance Rule: 3.0× active pipeline required to secure the ETB {(groupTargetRevenue / 1000000).toFixed(2)}M revenue target[cite: 16].
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              GROUP PIPELINE GAP TO 3×[cite: 16]
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: pipelineGap >= 0 ? '#166534' : '#dc2626',
                marginTop: 2,
              }}
            >
              {pipelineGap >= 0 ? '+' : '-'}ETB {new Intl.NumberFormat('en-US').format(Math.abs(pipelineGap))}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              Benchmark (3× Target): <strong>ETB {(groupRequired3xPipeline / 1000000).toFixed(2)}M</strong>[cite: 16]
            </div>
          </div>
        </div>

        {/* 4 SBUs Coverage Progress Micro-Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {sbuPerformance.map((sbu) => {
            const ratio = sbu.target > 0 ? (sbu.active / sbu.target).toFixed(1) : '0.0'
            const pctFill = Math.min(100, Math.round((sbu.active / sbu.required3x) * 100))

            return (
              <div
                key={sbu.key}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{sbu.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: ratio >= 3 ? '#15803d' : '#ea580c',
                    }}
                  >
                    {ratio}×[cite: 16]
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#64748b' }}>Active Pipeline:</span>
                  <strong style={{ color: '#0f172a' }}>
                    ETB {new Intl.NumberFormat('en-US').format(sbu.active)}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                  <span>3× Target: ETB {(sbu.required3x / 1000000).toFixed(2)}M</span>[cite: 16]
                  <span>Gap: {(sbu.gap / 1000000).toFixed(1)}M</span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                  <div
                    style={{
                      width: `${pctFill}%`,
                      height: '100%',
                      background: pctFill >= 100 ? '#10b981' : pctFill >= 50 ? '#0284c7' : '#ea580c',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. FOUR-TIER REVENUE & REALIZATION CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {/* Tier 1: Pre-Tender Leads Pipeline */}
        <div
          onClick={() => onNavigateTab?.('leads')}
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #6366f1',
            padding: 18,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase' }}>
              🎯 PRE-TENDER LEADS PIPELINE
            </span>
            <span style={{ fontSize: 10, background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
              Initiated / Lead
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '8px 0 2px 0' }}>
            ETB {new Intl.NumberFormat('en-US').format(preTenderValue)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            <strong>{preTenderLeads.length}</strong> exploratory opportunities in qualification →
          </div>
        </div>

        {/* Tier 2: Active Tender Pipeline */}
        <div
          onClick={() => onNavigateTab?.('proposals')}
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #f59e0b',
            padding: 18,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
              📋 ACTIVE TENDER PIPELINE
            </span>
            <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
              In Progress – Neg.
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '8px 0 2px 0' }}>
            ETB {new Intl.NumberFormat('en-US').format(activeTenderValue)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            <strong>{activeTenderDeals.length}</strong> formal proposals in development &amp; defense →
          </div>
        </div>

        {/* Tier 3: Weighted Tender Realization */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #10b981',
            padding: 18,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
              📈 WEIGHTED TENDER REALIZATION
            </span>
            <span style={{ fontSize: 10, background: '#d1fae5', color: '#047857', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
              Risk-Adjusted
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#166534', margin: '8px 0 2px 0' }}>
            ETB {new Intl.NumberFormat('en-US').format(Math.round(weightedTenderRealization))}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Stage-weighted expected conversion from formal bids
          </div>
        </div>

        {/* Tier 4: Contracted Won Revenue */}
        <div
          onClick={() => onNavigateTab?.('proposals')}
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #8b5cf6',
            padding: 18,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase' }}>
              🏆 CONTRACTED WON REVENUE
            </span>
            <span style={{ fontSize: 10, background: '#ede9fe', color: '#6d28d9', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
              Signed Deals
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '8px 0 2px 0' }}>
            ETB {new Intl.NumberFormat('en-US').format(contractedWonRevenue)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            <strong>{wonDeals.length}</strong> closed won engagements in period →
          </div>
        </div>
      </div>

      {/* 5. STRATEGIC BUSINESS UNIT (SBU) TARGET ATTAINMENT TABLE */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
              Strategic Business Unit (SBU) Target Attainment — {fiscalPeriod}[cite: 16]
            </h3>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Financial progress reconciled against validated SBU revenue and 3× pipeline commitments[cite: 16].
            </div>
          </div>

          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              background: '#ecfdf5',
              color: '#059669',
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid #a7f3d0',
            }}
          >
            🔒 Locked to Approved Readiness Report Baseline[cite: 16]
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', fontWeight: 800 }}>
                <th style={{ padding: '12px 16px' }}>STRATEGIC SBU</th>
                <th style={{ padding: '12px 16px' }}>REVENUE TARGET[cite: 16]</th>
                <th style={{ padding: '12px 16px' }}>3× PIPELINE REQ.[cite: 16]</th>
                <th style={{ padding: '12px 16px' }}>ACTIVE PIPELINE</th>
                <th style={{ padding: '12px 16px' }}>WEIGHTED FORECAST</th>
                <th style={{ padding: '12px 16px' }}>WON REVENUE</th>
                <th style={{ padding: '12px 16px' }}>TARGET ATTAINMENT</th>
                <th style={{ padding: '12px 16px' }}>3× GAP DEFICIT[cite: 16]</th>
              </tr>
            </thead>
            <tbody>
              {sbuPerformance.map((sbu) => (
                <tr key={sbu.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0f172a' }}>
                    {sbu.name}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    ETB {new Intl.NumberFormat('en-US').format(sbu.target)}[cite: 16]
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    ETB {new Intl.NumberFormat('en-US').format(sbu.required3x)}[cite: 16]
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0284c7' }}>
                    ETB {new Intl.NumberFormat('en-US').format(sbu.active)}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#059669', fontWeight: 700 }}>
                    ETB {new Intl.NumberFormat('en-US').format(Math.round(sbu.weighted))}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: '#166534' }}>
                    ETB {new Intl.NumberFormat('en-US').format(sbu.won)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 800, color: Number(sbu.attainment) >= 50 ? '#15803d' : '#b45309' }}>
                        {sbu.attainment}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: sbu.gap >= 0 ? '#15803d' : '#dc2626' }}>
                    {sbu.gap >= 0 ? '+' : '-'}ETB {new Intl.NumberFormat('en-US').format(Math.abs(sbu.gap))}[cite: 16]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. OPERATIONAL KPIS & PRIORITY QUEUE HIGHLIGHTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div
          onClick={() => onNavigateTab?.('clients')}
          style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>TOTAL CLIENTS MAPPED</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>{clientsCount}</div>
          <div style={{ fontSize: 11, color: '#0284c7', marginTop: 2 }}>Institutional Directory →</div>
        </div>

        <div
          onClick={() => onNavigateTab?.('marketing')}
          style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>DIGITAL MARKETING LEADS[cite: 17]</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#6366f1', marginTop: 4 }}>{marketingLeads.length}</div>
          <div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>
            {marketingLeads.filter((m) => m.status === 'New Inquiry').length} awaiting first contact[cite: 17] →
          </div>
        </div>

        <div
          onClick={() => onNavigateTab?.('proposals')}
          style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>EVIDENCE HEALTH STATUS</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#166534', marginTop: 4 }}>
            {opportunities.filter((o) => o.evidence_status === 'Verified').length} / {opportunities.length}
          </div>
          <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Strict Audit Gated Proposals →</div>
        </div>

        <div
          onClick={() => onNavigateTab?.('queue')}
          style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>APPROACHING DEADLINES (≤ 3d)</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: urgentDeadlines.length > 0 ? '#dc2626' : '#10b981', marginTop: 4 }}>
            {urgentDeadlines.length}
          </div>
          <div style={{ fontSize: 11, color: urgentDeadlines.length > 0 ? '#dc2626' : '#10b981', marginTop: 2 }}>
            {urgentDeadlines.length > 0 ? 'Urgent bids requiring defense' : 'All submissions on track'} →
          </div>
        </div>
      </div>
    </div>
  )
}