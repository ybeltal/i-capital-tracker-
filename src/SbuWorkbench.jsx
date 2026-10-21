import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const SBU_TARGET_CONFIG = {
  Institute: {
    fullName: 'The i-Capital Institute',
    targetEtb: 63000000,
    benchmark3x: 189000000,
    color: '#0284c7',
    badgeBg: '#e0f2fe',
    description: 'Executive Leadership (MBL), S-OJT, PRIME Staff Development, KMS, BDS',
  },
  CBS: {
    fullName: 'Cross Border Solutions (CBS)',
    targetEtb: 35000000,
    benchmark3x: 105000000,
    color: '#6366f1',
    badgeBg: '#e0e7ff',
    description: 'Overseas Cohort Training, Global Board Study Tours, Regional Missions',
  },
  IIP: {
    fullName: 'i-Capital Investment Partners (IIP)',
    targetEtb: 140000000,
    benchmark3x: 420000000,
    color: '#0d9488',
    badgeBg: '#ccfbf1',
    description: 'Capital Market Readiness, Commercial Paper, Corporate Bonds, Listings',
  },
  DAS: {
    fullName: 'Digital & AI Solutions (DAS)',
    targetEtb: 18600000,
    benchmark3x: 55800000,
    color: '#d97706',
    badgeBg: '#fef3c7',
    description: 'Enterprise ERP, Investify ET, SHOFER Parking Platform, FinTech',
  },
}

export default function SbuWorkbench({ userSbu = 'Institute', onNavigateTab, onOpenAiParser }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)

  const sbuInfo = SBU_TARGET_CONFIG[userSbu] || SBU_TARGET_CONFIG.Institute

  useEffect(() => {
    fetchSbuPipeline()
  }, [userSbu])

  async function fetchSbuPipeline() {
    setLoading(true)
    const { data } = await supabase
      .from('opportunities')
      .select('*')
      .eq('sbu', userSbu)
      .order('created_at', { ascending: false })

    if (data) setDeals(data)
    setLoading(false)
  }

  // Calculate SBU Tactical Metrics
  const totalPipelineValue = deals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0)
  const coverageRatio = sbuInfo.targetEtb > 0 ? (totalPipelineValue / sbuInfo.benchmark3x).toFixed(2) : 0
  const gapTo3x = Math.max(0, sbuInfo.benchmark3x - totalPipelineValue)

  // Bids Closing within next 7 calendar days
  const now = new Date()
  const urgentBids = deals.filter((d) => {
    if (!d.deadline) return false
    const diff = (new Date(d.deadline) - now) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 7
  })

  const inDefenseCount = deals.filter((d) => (d.stage || '').includes('Defense') || (d.stage || '').includes('2')).length
  const wonCount = deals.filter((d) => (d.stage || '').includes('Won') || (d.stage || '').includes('Signed') || (d.stage || '').includes('3')).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. SBU TACTICAL COMMAND BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #070d1e 0%, #0f172a 60%, #1e293b 100%)',
          borderRadius: 14,
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                background: sbuInfo.badgeBg,
                color: sbuInfo.color,
                padding: '3px 8px',
                borderRadius: 6,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}
            >
              {userSbu} OPERATIONAL WORKBENCH
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Tactical Business Development View</span>
          </div>

          <h2 style={{ margin: '4px 0 6px 0', fontSize: 24, fontWeight: 900 }}>
            {sbuInfo.fullName}
          </h2>

          <div style={{ fontSize: 12, color: '#cbd5e1', maxWidth: '640px', lineHeight: 1.4 }}>
            {sbuInfo.description}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onOpenAiParser}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
            }}
          >
            <span>✨</span> Parse TOR / RFP with AI
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('proposals')}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Open {userSbu} Kanban Board →
          </button>
        </div>
      </div>

      {/* 2. SBU PERFORMANCE & REALIZATION GAUGES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Active SBU Pipeline
          </span>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            ETB {new Intl.NumberFormat('en-US').format(totalPipelineValue)}
          </div>
          <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>
            {deals.length} active opportunities logged
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            3× Pipeline Benchmark
          </span>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            ETB {new Intl.NumberFormat('en-US').format(sbuInfo.benchmark3x)}
          </div>
          <div style={{ fontSize: 11, color: gapTo3x > 0 ? '#ea580c' : '#166534', fontWeight: 700 }}>
            {gapTo3x > 0 ? `Gap: - ETB ${new Intl.NumberFormat('en-US').format(gapTo3x)}` : '✓ 3× Target Covered'}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            SBU Coverage Ratio
          </span>
          <div style={{ fontSize: 22, fontWeight: 900, color: coverageRatio >= 1.0 ? '#166534' : '#ea580c', margin: '4px 0' }}>
            {coverageRatio}×
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Annual Target: ETB {new Intl.NumberFormat('en-US').format(sbuInfo.targetEtb)}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Bids in Technical Defense
          </span>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', margin: '4px 0' }}>
            {inDefenseCount} Bids
          </div>
          <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>
            {wonCount} Won / Signed contracts
          </div>
        </div>
      </div>

      {/* 3. TACTICAL ACTION SPRINT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {/* Deadlines Next 7 Days */}
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>
                ⏳ Submission Deadlines (Next 7 Days)
              </strong>
              <span style={{ fontSize: 11, color: '#64748b' }}>Technical envelopes due for delivery</span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                background: urgentBids.length > 0 ? '#fef2f2' : '#f0fdf4',
                color: urgentBids.length > 0 ? '#b91c1c' : '#166534',
                padding: '2px 8px',
                borderRadius: 12,
              }}
            >
              {urgentBids.length} Urgent
            </span>
          </div>

          {urgentBids.length === 0 ? (
            <div style={{ padding: '24px 10px', textAlign: 'center', fontSize: 12, color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', borderRadius: 8 }}>
              ✓ No submission deadlines closing within the next 7 days for {userSbu}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {urgentBids.map((bid) => (
                <div
                  key={bid.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#fff',
                    border: '1px solid #fecdd3',
                    borderLeft: '4px solid #ef4444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      {bid.client || bid.client_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {bid.title || bid.product}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', display: 'block' }}>
                      Due: {bid.deadline}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>
                      ETB {new Intl.NumberFormat('en-US').format(bid.deal_value || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rapid Conversion Shortcuts */}
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <strong style={{ fontSize: 14, color: '#0f172a', display: 'block', marginBottom: 4 }}>
            🎯 SBU Commercial Actions
          </strong>
          <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 14 }}>
            Direct conversion shortcuts for {userSbu} officers
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => onNavigateTab('leads')}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: 12, color: '#0f172a', display: 'block' }}>
                  • Intake Pre-Tender Leads
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Capture early market signals before official bids are advertised
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#0284c7', fontWeight: 800 }}>Intake →</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('clients')}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: 12, color: '#0f172a', display: 'block' }}>
                  • 184 Target Accounts Directory
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Select banks, MFIs, and SOEs to generate one-click proposals
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#0284c7', fontWeight: 800 }}>Browse →</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('queue')}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: 12, color: '#0f172a', display: 'block' }}>
                  • SBU Follow-up Queue
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Client check-ins and institutional proposal status tasks
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#0284c7', fontWeight: 800 }}>Queue →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}