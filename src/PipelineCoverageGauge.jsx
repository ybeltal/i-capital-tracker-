import React from 'react'

const SBU_TARGETS = {
  Institute: { name: 'The i-Capital Institute', target: 63000000, req3x: 189000000 },
  CBS: { name: 'Cross Border Solutions', target: 35000000, req3x: 105000000 },
  IIP: { name: 'i-Capital Investment Partners', target: 140300000, req3x: 420900000 },
  DAS: { name: 'Digital & AI Solutions', target: 18295000, req3x: 54885000 },
}

export default function PipelineCoverageGauge({ proposals = [] }) {
  // Normalize SBU naming
  function normalizeSbu(rawSbu) {
    if (!rawSbu) return 'Institute'
    const s = String(rawSbu).toLowerCase()
    if (s.includes('cross') || s.includes('cbs') || s.includes('border')) return 'CBS'
    if (s.includes('invest') || s.includes('iip') || s.includes('partner')) return 'IIP'
    if (s.includes('digital') || s.includes('das') || s.includes('ai')) return 'DAS'
    return 'Institute'
  }

  // Active proposals includes Stage 1, Stage 2, and formal in-progress tenders
  const activeProposals = proposals.filter((p) => {
    const stg = (p.status || '').toLowerCase()
    return !stg.includes('won') && !stg.includes('lost') && !stg.includes('cancel')
  })

  const groupTarget = 256595000 // ETB 256.60M
  const groupReq3x = 769785000   // ETB 769.78M
  const groupActiveValue = activeProposals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
  const groupCoverage = groupTarget > 0 ? (groupActiveValue / groupTarget).toFixed(2) : '0.00'
  const groupGap = groupActiveValue - groupReq3x

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
              3× Required Pipeline Coverage &amp; Gap Gauge
            </h3>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 6,
                background: Number(groupCoverage) >= 3 ? '#dcfce7' : '#fee2e2',
                color: Number(groupCoverage) >= 3 ? '#15803d' : '#b91c1c',
              }}
            >
              {groupCoverage}× Coverage ({Number(groupCoverage) >= 3 ? 'HEALTHY' : 'DEFICIT'})
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Group Governance Rule: 3.0× active pipeline required to secure the ETB 256.60M revenue target.
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            GROUP PIPELINE GAP TO 3×
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: groupGap >= 0 ? '#166534' : '#dc2626', marginTop: 2 }}>
            {groupGap >= 0 ? '+' : '-'}ETB {new Intl.NumberFormat('en-US').format(Math.abs(groupGap))}
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
            Benchmark (3× Target): <strong>ETB 769.78M</strong>
          </div>
        </div>
      </div>

      {/* SBU Micro-Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
        {Object.entries(SBU_TARGETS).map(([key, cfg]) => {
          const sbuDeals = activeProposals.filter((p) => {
            const sbuName = p.opportunities?.sbus?.name || p.sbu || ''
            return normalizeSbu(sbuName) === key
          })
          const sbuActiveVal = sbuDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
          const sbuCov = cfg.target > 0 ? (sbuActiveVal / cfg.target).toFixed(2) : '0.00'
          const sbuGap = sbuActiveVal - cfg.req3x
          const pctFill = Math.min(100, Math.round((sbuActiveVal / cfg.req3x) * 100))

          return (
            <div
              key={key}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{cfg.name}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: Number(sbuCov) >= 3 ? '#15803d' : '#ea580c' }}>
                  {sbuCov}×
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>Active:</span>
                <strong style={{ color: '#0f172a' }}>
                  ETB {new Intl.NumberFormat('en-US').format(sbuActiveVal)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                <span>3× Target: ETB {(cfg.req3x / 1000000).toFixed(2)}M</span>
                <span>Gap: {(sbuGap / 1000000).toFixed(1)}M</span>
              </div>

              <div style={{ width: '100%', height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                <div
                  style={{
                    width: `${pctFill}%`,
                    height: '100%',
                    background: pctFill >= 100 ? '#10b981' : pctFill >= 30 ? '#0284c7' : '#ea580c',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}