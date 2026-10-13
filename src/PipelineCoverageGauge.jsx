import React from 'react'
import { SBU_PIPELINE_TARGETS, calculatePipelineCoverage } from './pipelineConfig'

export default function PipelineCoverageGauge({ proposals = [] }) {
  // Filter active pipeline deals in pursuit (exclude Lost and Won)
  const activeProposals = proposals.filter((p) => {
    const st = (p.status || '').toLowerCase()
    return st !== 'lost' && st !== 'closed' && st !== 'won' && st !== 'contracted won'
  })

  // Helper to resolve SBU code from proposal or linked lead
  const getSbuCode = (p) => {
    const code = p.sbus?.code || p.opportunities?.sbus?.code || ''
    if (code) return code.toUpperCase()
    // Fallback detection from title or notes
    const txt = `${p.title || ''} ${p.product_engine || ''} ${p.notes || ''}`.toUpperCase()
    if (txt.includes('CBS') || txt.includes('CROSS BORDER')) return 'CBS'
    if (txt.includes('IIP') || txt.includes('INVESTMENT')) return 'IIP'
    if (txt.includes('DAS') || txt.includes('SHOFER') || txt.includes('DIGITAL')) return 'DAS'
    return 'INST' // Default to Institute
  }

  // Calculate active pipeline value per SBU
  const sbuActiveValues = {
    INST: 0,
    CBS: 0,
    IIP: 0,
    DAS: 0,
  }

  // Track Direct vs Tender for Institute and Cross Border Solutions
  const sourcingBreakdown = {
    INST: { direct: 0, tender: 0 },
    CBS: { direct: 0, tender: 0 },
  }

  activeProposals.forEach((p) => {
    const val = parseFloat(p.deal_value_etb) || 0
    const sbu = getSbuCode(p)
    if (sbuActiveValues[sbu] !== undefined) {
      sbuActiveValues[sbu] += val
    }

    const isTender =
      (p.title && /bid|tender|rfp|eoi/i.test(p.title)) ||
      (p.notes && /tender|bid|portal/i.test(p.notes)) ||
      p.submission_deadline

    if (sbu === 'INST' || sbu === 'CBS') {
      if (isTender) {
        sourcingBreakdown[sbu].tender += val
      } else {
        sourcingBreakdown[sbu].direct += val
      }
    }
  })

  const groupTotalActive = Object.values(sbuActiveValues).reduce((a, b) => a + b, 0)
  const groupCoverage = calculatePipelineCoverage(
    groupTotalActive,
    SBU_PIPELINE_TARGETS.GROUP_TOTAL.requiredPipelineTarget
  )

  const formatM = (num) => `ETB ${(num / 1000000).toFixed(2)}M`

  const getStatusColor = (status) => {
    if (status === 'green') return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }
    if (status === 'amber') return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' }
    return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' }
  }

  const groupColors = getStatusColor(groupCoverage.status)

  const sbus = [
    { key: 'INST', config: SBU_PIPELINE_TARGETS.INSTITUTE, hasSplit: true },
    { key: 'CBS', config: SBU_PIPELINE_TARGETS.CBS, hasSplit: true },
    { key: 'IIP', config: SBU_PIPELINE_TARGETS.IIP, hasSplit: false },
    { key: 'DAS', config: SBU_PIPELINE_TARGETS.DAS, hasSplit: false },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18, marginBottom: 20 }}>
      {/* Top Banner: Group 3x Coverage Real-Time Gauge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              3× Required Pipeline Coverage & Gap Gauge
            </h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                background: groupColors.bg,
                color: groupColors.text,
                border: `1px solid ${groupColors.border}`,
              }}
            >
              {groupCoverage.ratio}× Coverage ({groupCoverage.status.toUpperCase()})
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Group Governance Rule: 3.0× active pipeline required to secure the ETB 256.60M revenue target.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>GROUP PIPELINE GAP TO 3×</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: groupCoverage.gap > 0 ? '#b91c1c' : '#047857' }}>
            {groupCoverage.gap > 0 ? `- ${formatM(groupCoverage.gap)}` : 'TARGET COVERED ✓'}
          </div>
        </div>
      </div>

      {/* Group Progress Bar */}
      <div style={{ marginTop: 12, background: '#f1f5f9', borderRadius: 999, height: 10, overflow: 'hidden' }}>
        <div
          style={{
            width: `${groupCoverage.coveragePercent}%`,
            height: '100%',
            background: groupCoverage.status === 'green' ? '#10b981' : groupCoverage.status === 'amber' ? '#f59e0b' : '#ef4444',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
        <span>Active: <strong>{formatM(groupTotalActive)}</strong></span>
        <span>Benchmark (3× Target): <strong>{formatM(SBU_PIPELINE_TARGETS.GROUP_TOTAL.requiredPipelineTarget)}</strong></span>
      </div>

      {/* SBU Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginTop: 16 }}>
        {sbus.map(({ key, config, hasSplit }) => {
          const activeVal = sbuActiveValues[key] || 0
          const cov = calculatePipelineCoverage(activeVal, config.requiredPipelineTarget)
          const col = getStatusColor(cov.status)
          const displayName = key === 'CBS' ? 'Cross Border Solutions' : config.name

          return (
            <div
              key={key}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: 12,
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#1e293b' }}>{displayName}</strong>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: col.bg,
                      color: col.text,
                      border: `1px solid ${col.border}`,
                    }}
                  >
                    {cov.ratio}×
                  </span>
                </div>

                <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                  <div>Active: <strong>{formatM(activeVal)}</strong></div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    3× Target: {formatM(config.requiredPipelineTarget)}
                  </div>
                </div>

                {/* Direct vs Tender Split for Institute & Cross Border Solutions */}
                {hasSplit && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 6,
                      borderTop: '1px dashed #cbd5e1',
                      fontSize: 10,
                      color: '#475569',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Direct Outreach:</span>
                      <strong>{formatM(sourcingBreakdown[key].direct)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      <span>Competitive Bids:</span>
                      <strong>{formatM(sourcingBreakdown[key].tender)}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* SBU Mini Progress Bar */}
              <div style={{ marginTop: 10 }}>
                <div style={{ background: '#e2e8f0', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${cov.coveragePercent}%`,
                      height: '100%',
                      background: cov.status === 'green' ? '#10b981' : cov.status === 'amber' ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 2 }}>
                  <span>{cov.coveragePercent}% filled</span>
                  <span>{cov.gap > 0 ? `Gap: ${formatM(cov.gap)}` : 'Ready ✓'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}