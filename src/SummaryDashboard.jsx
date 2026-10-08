import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'

const STAGE_WEIGHTS = {
  'Initiated': 0.10,
  'In Progress': 0.30,
  'Submitted': 0.50,
  'Under Review': 0.60,
  'Shortlisted': 0.75,
  'Negotiation': 0.90,
  'Won': 1.00,
  'On Hold': 0.20,
  'Lost': 0.00,
  'Cancelled': 0.00,
}

const proposalStatuses = [
  'Initiated',
  'In Progress',
  'Submitted',
  'Under Review',
  'Shortlisted',
  'Negotiation',
  'Won',
  'Lost',
  'On Hold',
  'Cancelled',
]

const CORE_SBUS = ['Institute', 'CBS', 'IIP', 'DAS']

const DEFAULT_TARGETS = {
  'Institute': 5000000,
  'CBS': 6000000,
  'IIP': 4500000,
  'DAS': 2500000,
}

// Visual Analytics Data
const sbuBarData = [
  { name: 'Institute', Target: 5000000, Forecast: 809000 },
  { name: 'CBS', Target: 6000000, Forecast: 2486500 },
  { name: 'IIP', Target: 4500000, Forecast: 42000 },
  { name: 'DAS', Target: 2500000, Forecast: 0 },
]

const sbuPieData = [
  { name: 'CBS', value: 2486500, color: '#f59e0b' },
  { name: 'Institute', value: 809000, color: '#0284c7' },
  { name: 'IIP', value: 42000, color: '#10b981' },
]

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value ?? 0)
}

function formatMoney(value) {
  return `ETB ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)}`
}

function downloadCSV(filename, csvRows) {
  const csvContent = '\uFEFF' + csvRows.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 3:4 portrait photo component
function OwnerPhoto({ name }) {
  const isYbeltal = !name || name.toLowerCase().includes('ybeltal') || name === 'Commercial Team'
  const photoSrc = isYbeltal ? '/team/ybeltal.jpg' : null

  if (photoSrc) {
    return (
      <img
        src={photoSrc}
        alt={name || 'Ybeltal'}
        style={{
          width: '36px',
          height: '48px', // exact 3:4 aspect ratio
          borderRadius: '6px',
          objectFit: 'cover',
          border: '2px solid #22c55e',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          display: 'inline-block',
          verticalAlign: 'middle',
          flexShrink: 0,
        }}
        title={name || 'Ybeltal'}
      />
    )
  }

  return (
    <div
      style={{
        width: '36px',
        height: '48px',
        borderRadius: '6px',
        background: '#dcfce7',
        border: '2px solid #86efac',
        color: '#166534',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 700,
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
      title={name || 'Commercial Lead'}
    >
      {name && name !== 'Unassigned' ? name.slice(0, 2).toUpperCase() : '🏆'}
    </div>
  )
}

// Extracts owner name from notes (defaults to Ybeltal)
function parseOwner(notes) {
  if (!notes) return 'Ybeltal'
  const match = notes.match(/\[OWNER:\s*([^\]]+)\]/)
  if (!match) return 'Ybeltal'
  const val = match[1].trim()
  return (val === 'Commercial Team' || val === 'Unassigned') ? 'Ybeltal' : val
}

export default function SummaryDashboard() {
  const [data, setData] = useState(null)
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)

  // SBU Targets state
  const [sbuTargets, setSbuTargets] = useState(() => {
    try {
      const saved = localStorage.getItem('icapital_sbu_targets')
      return saved ? JSON.parse(saved) : DEFAULT_TARGETS
    } catch {
      return DEFAULT_TARGETS
    }
  })
  const [editingTargets, setEditingTargets] = useState(false)
  const [tempTargets, setTempTargets] = useState(sbuTargets)

  // Feature 5: Executive Briefing Modal State
  const [showBriefingModal, setShowBriefingModal] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError('')
      try {
        const [summaryRes, proposalsRes] = await Promise.all([
          supabase.rpc('get_dashboard_summary'),
          supabase
            .from('proposals')
            .select(`
              id,
              proposal_code,
              title,
              status,
              deal_value_etb,
              submission_deadline,
              notes,
              created_at,
              opportunities (
                sbus (name),
                clients (name, sector)
              )
            `)
            .order('created_at', { ascending: false }),
        ])

        if (summaryRes.error) throw summaryRes.error
        if (!summaryRes.data) throw new Error('No dashboard summary returned.')

        if (!cancelled) {
          setData(summaryRes.data)
          setProposals(proposalsRes.data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load the dashboard.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()
    return () => {
      cancelled = true
    }
  }, [refreshVersion])

  function handleSaveTargets(e) {
    e.preventDefault()
    setSbuTargets(tempTargets)
    localStorage.setItem('icapital_sbu_targets', JSON.stringify(tempTargets))
    setEditingTargets(false)
  }

  // Financial Calculations
  const activeProposals = proposals.filter((p) => !['Lost', 'Cancelled'].includes(p.status))
  const openProposalsList = proposals.filter((p) => !['Won', 'Lost', 'Cancelled'].includes(p.status))
  const wonProposalsList = proposals.filter((p) => p.status === 'Won')

  // Latest victory for congratulations display
  const latestWonDeal = wonProposalsList[0] || null
  const latestWonOwner = latestWonDeal ? parseOwner(latestWonDeal.notes) : 'Ybeltal'

  const totalOpenValue = openProposalsList.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
  const totalWonValue = wonProposalsList.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)

  const totalWeightedForecast = activeProposals.reduce((sum, p) => {
    const val = Number(p.deal_value_etb) || 0
    const prob = STAGE_WEIGHTS[p.status] ?? 0.20
    return sum + (val * prob)
  }, 0)

  // SBU Performance Matrix
  const sbuMetrics = CORE_SBUS.map((sbuName) => {
    const sbuDeals = proposals.filter((p) => p.opportunities?.sbus?.name === sbuName)
    const sbuOpen = sbuDeals.filter((p) => !['Won', 'Lost', 'Cancelled'].includes(p.status))
    const sbuWon = sbuDeals.filter((p) => p.status === 'Won')
    const sbuLost = sbuDeals.filter((p) => p.status === 'Lost')

    const openVal = sbuOpen.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
    const wonVal = sbuWon.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)

    const weightedForecast = sbuDeals
      .filter((p) => !['Lost', 'Cancelled'].includes(p.status))
      .reduce((sum, p) => {
        const val = Number(p.deal_value_etb) || 0
        const prob = STAGE_WEIGHTS[p.status] ?? 0.20
        return sum + (val * prob)
      }, 0)

    const target = sbuTargets[sbuName] || DEFAULT_TARGETS[sbuName] || 5000000
    const attainmentPct = target > 0 ? Math.min(150, Math.round((weightedForecast / target) * 100)) : 0
    const decided = sbuWon.length + sbuLost.length
    const winRate = decided > 0 ? Math.round((sbuWon.length / decided) * 100) : null

    return {
      name: sbuName,
      totalDeals: sbuDeals.length,
      openCount: sbuOpen.length,
      wonCount: sbuWon.length,
      openValue: openVal,
      wonValue: wonVal,
      weightedForecast,
      target,
      attainmentPct,
      winRate,
    }
  })

  // Stage-by-Stage Breakdown
  const stageBreakdown = proposalStatuses.map((status) => {
    const stageDeals = proposals.filter((p) => p.status === status)
    const nominal = stageDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
    const prob = STAGE_WEIGHTS[status] ?? 0
    const weighted = nominal * prob
    const share = totalOpenValue > 0 ? Math.round((nominal / totalOpenValue) * 100) : 0

    return {
      status,
      count: stageDeals.length,
      nominal,
      prob: Math.round(prob * 100),
      weighted,
      share,
    }
  })

  // Top Open Pursuits (Deals > ETB 300,000 for executive sheet)
  const topPursuits = [...openProposalsList]
    .sort((a, b) => (Number(b.deal_value_etb) || 0) - (Number(a.deal_value_etb) || 0))
    .slice(0, 8)

  async function handleExportCSV() {
    if (!data) return
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const csvRows = []

      csvRows.push('THE i-CAPITAL AFRICA INSTITUTE — EXECUTIVE FORECAST & PIPELINE SUMMARY')
      csvRows.push(`Export Date,${today}`)
      csvRows.push(`As of (Nairobi Time),${new Date(data.as_of).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}`)
      csvRows.push('')

      csvRows.push('REVENUE & PIPELINE METRIC,VALUE (ETB)')
      csvRows.push(`Unweighted Open Pipeline Value,"${formatMoney(totalOpenValue)}"`)
      csvRows.push(`Probability-Weighted Revenue Forecast,"${formatMoney(totalWeightedForecast)}"`)
      csvRows.push(`Closed Contracted Won Revenue,"${formatMoney(totalWonValue)}"`)
      csvRows.push(`Total Proposals,"${data.proposals_total ?? proposals.length}"`)
      csvRows.push(`Win Rate,"${data.win_rate_pct !== null ? data.win_rate_pct + '%' : 'N/A'}"`)
      csvRows.push('')

      csvRows.push('SBU PERFORMANCE MATRIX,OPEN PROPOSALS,OPEN VALUE (ETB),WEIGHTED FORECAST (ETB),SBU TARGET (ETB),TARGET ATTAINMENT %')
      sbuMetrics.forEach((m) => {
        csvRows.push(`"${m.name}","${m.openCount}","${m.openValue}","${m.weightedForecast}","${m.target}","${m.attainmentPct}%"`)
      })
      csvRows.push('')

      csvRows.push('STAGE,DEAL COUNT,NOMINAL VALUE (ETB),PROBABILITY %,WEIGHTED FORECAST (ETB)')
      stageBreakdown.forEach((s) => {
        csvRows.push(`"${s.status}","${s.count}","${s.nominal}","${s.prob}%","${s.weighted}"`)
      })
      csvRows.push('')

      downloadCSV(`iCapital_Executive_Forecast_${today}.csv`, csvRows)
    } catch (err) {
      alert('Could not export report: ' + (err.message || err))
    } finally {
      setExporting(false)
    }
  }

  const cards = data
    ? [
        ['Clients', formatNumber(data.clients_total), '#client-directory'],
        ['Leads', formatNumber(data.leads_total), '#lead-management'],
        ['Total proposals', formatNumber(data.proposals_total), '#proposal-tracking'],
        ['Open proposals', formatNumber(data.proposals_open), '#proposal-tracking'],
        ['Won proposals', formatNumber(data.proposals_won), null],
        ['Lost proposals', formatNumber(data.proposals_lost), null],
        ['Win rate', data.win_rate_pct === null ? 'No decided' : `${data.win_rate_pct}%`, null],
        ['Pending actions', formatNumber(data.pending_actions), '#follow-up-queue'],
        ['Overdue actions', formatNumber(data.overdue_actions), '#follow-up-queue'],
        ['Due today', formatNumber(data.due_today_actions), '#follow-up-queue'],
        ['Upcoming actions', formatNumber(data.upcoming_actions), '#follow-up-queue'],
        ['Date needed', formatNumber(data.undated_actions), '#follow-up-queue'],
      ]
    : []

  return (
    <section aria-label="Summary Dashboard" style={{ marginBottom: 36, paddingBottom: 28, borderBottom: '1px solid #dbe2ea' }}>
      {/* Print Style Injector for Crisp PDF Generation */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-briefing-dossier, #printable-briefing-dossier * {
            visibility: visible;
          }
          #printable-briefing-dossier {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10px;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Executive Opportunity & Revenue Forecast Dashboard</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Probability-weighted pipeline forecasting, SBU revenue target attainment, and live deal counts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowBriefingModal(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            🖨️ Executive Briefing (PDF)
          </button>

          <button
            type="button"
            onClick={() => {
              setTempTargets(sbuTargets)
              setEditingTargets(true)
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#fff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            ⚙️ Set SBU Targets
          </button>

          <button
            type="button"
            disabled={loading || exporting}
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: loading || exporting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {exporting ? 'Generating…' : '📥 Export to CSV'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => setRefreshVersion((v) => v + 1)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p role="alert" style={{ color: '#b91c1c', marginTop: 12 }}>{error}</p>}
      {loading && <p role="status" style={{ color: '#64748b', marginTop: 16 }}>Calculating revenue forecast & SBU metrics…</p>}

      {!loading && !error && data && (
        <>
          {/* 🎉 AUTOMATED DEAL WON CONGRATULATIONS SHOWCASE */}
          {latestWonDeal && (
            <div
              style={{
                marginTop: 20,
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 60%, #e0f2fe 100%)',
                border: '2px solid #86efac',
                borderRadius: 12,
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              {/* Left Side: Owner Photo & Congratulatory Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <OwnerPhoto name={latestWonOwner} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: '#16a34a',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 12,
                        letterSpacing: '0.5px',
                      }}
                    >
                      🎉 Deal Won Celebration
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                      Congratulations, {latestWonOwner}!
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    Contract Secured with {latestWonDeal.opportunities?.clients?.name || 'Institutional Client'}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                    {latestWonDeal.title} ({latestWonDeal.proposal_code || 'DEAL'})
                  </div>
                </div>
              </div>

              {/* Right Side: Final Value & SBU */}
              <div style={{ textAlign: 'right', minWidth: 160 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                  Contracted Won Revenue
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#166534' }}>
                  {formatMoney(latestWonDeal.deal_value_etb)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginTop: 2 }}>
                  SBU: {latestWonDeal.opportunities?.sbus?.name || 'Institute'}
                </div>
              </div>
            </div>
          )}

          {/* Revenue Forecast Trio */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, borderLeft: '4px solid #0284c7' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Nominal Open Pipeline Value
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>
                {formatMoney(totalOpenValue)}
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {openProposalsList.length} active proposals in pursuit
              </span>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 18, borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                  📈 Weighted Revenue Forecast
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4 }}>
                  Expected Value
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d', margin: '8px 0 4px 0' }}>
                {formatMoney(totalWeightedForecast)}
              </div>
              <span style={{ fontSize: 12, color: '#166534' }}>
                Stage probability weighted conversion expectation
              </span>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, borderLeft: '4px solid #8b5cf6' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                🏆 Contracted Won Revenue
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', margin: '8px 0 4px 0' }}>
                {formatMoney(totalWonValue)}
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {wonProposalsList.length} signed deals ({data.win_rate_pct !== null ? `${data.win_rate_pct}% win rate` : 'N/A'})
              </span>
            </div>
          </div>

          {/* SBU Pipeline Targets */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Strategic Business Unit (SBU) Target Attainment</h3>
              <span style={{ fontSize: 12, color: '#64748b' }}>Weighted Forecast vs. Annual Target Quota</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
              {sbuMetrics.map((sbu) => (
                <div key={sbu.name} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}>{sbu.name}</strong>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        backgroundColor: sbu.attainmentPct >= 80 ? '#dcfce7' : sbu.attainmentPct >= 40 ? '#fef3c7' : '#fee2e2',
                        color: sbu.attainmentPct >= 80 ? '#166534' : sbu.attainmentPct >= 40 ? '#92400e' : '#b91c1c',
                      }}
                    >
                      {sbu.attainmentPct}% Target
                    </span>
                  </div>

                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', margin: '8px 0 12px 0' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, sbu.attainmentPct)}%`,
                        background: sbu.attainmentPct >= 80 ? '#16a34a' : sbu.attainmentPct >= 40 ? '#f59e0b' : '#ef4444',
                        borderRadius: 4,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Weighted Forecast:</span>
                      <strong style={{ color: '#0f172a' }}>{formatMoney(sbu.weightedForecast)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Target Quota:</span>
                      <span>{formatMoney(sbu.target)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 6, marginTop: 4 }}>
                      <span>Deals in Pipe:</span>
                      <span>{sbu.openCount} open ({sbu.wonCount} won)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Analytics: Bar Chart & Pie Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', margin: '24px 0' }}>
            {/* SBU Target vs Forecast Bar Chart */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                📊 SBU Target Quota vs. Weighted Forecast (ETB)
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sbuBarData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(val) => `ETB ${Number(val).toLocaleString()}`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Target" fill="#cbd5e1" name="Target Quota" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Forecast" fill="#0284c7" name="Weighted Forecast" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pipeline Distribution Donut Chart */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                🍩 SBU Weighted Revenue Share
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sbuPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sbuPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => `ETB ${Number(val).toLocaleString()}`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Operational KPIs */}
          <h3 style={{ marginTop: 28, marginBottom: 12, color: '#0f172a' }}>CRM Pipeline Operational Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {cards.map(([label, value, href]) => (
              <div
                key={label}
                style={{
                  padding: 14,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                }}
              >
                <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                  {href ? (
                    <a href={href} style={{ color: '#0284c7', textDecoration: 'none' }}>
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Funnel Table */}
          <h3 style={{ marginTop: 32, marginBottom: 12, color: '#0f172a' }}>Stage-by-Stage Weighted Funnel Analysis</h3>
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>Pipeline Stage</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>Proposals</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>Nominal Deal Value (ETB)</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>Win Probability %</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>Weighted Forecast (ETB)</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>Pipeline Share</th>
                </tr>
              </thead>
              <tbody>
                {stageBreakdown.map((row) => (
                  <tr key={row.status} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>{row.status}</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{row.count}</td>
                    <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 600 }}>{formatMoney(row.nominal)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#475569' }}>
                        {row.prob}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#15803d', fontWeight: 700 }}>{formatMoney(row.weighted)}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* FEATURE 5: PRINTABLE EXECUTIVE BRIEFING DOSSIER MODAL */}
      {showBriefingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <div
            id="printable-briefing-dossier"
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 820,
              padding: 32,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header & Actions (Hidden during print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a' }}>Executive Memorandum Preview</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>Board-Ready 1-Page Briefing Sheet</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#1e293b',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  🖨️ Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowBriefingModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Document Letterhead */}
            <div style={{ fontFamily: 'Georgia, serif', color: '#0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: 14 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 20, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#0f172a', fontWeight: 800 }}>
                    The i-Capital Africa Institute
                  </h1>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#475569', fontFamily: 'sans-serif' }}>
                    Executive Pipeline & Probability-Weighted Revenue Briefing
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'sans-serif', fontSize: 11, color: '#64748b' }}>
                  <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div><strong>Timezone:</strong> Africa/Nairobi (UTC+3)</div>
                  <div><strong>Classification:</strong> Confidential / Leadership Review</div>
                </div>
              </div>

              {/* Financial Snapshot Table */}
              <div style={{ margin: '20px 0', fontFamily: 'sans-serif' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 12, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                  1. Executive Financial Summary
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div style={{ padding: 10, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>NOMINAL PIPELINE</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{formatMoney(totalOpenValue)}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{openProposalsList.length} Active Deals</div>
                  </div>
                  <div style={{ padding: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 4 }}>
                    <div style={{ fontSize: 10, color: '#166534', fontWeight: 700 }}>WEIGHTED FORECAST</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#166534', marginTop: 4 }}>{formatMoney(totalWeightedForecast)}</div>
                    <div style={{ fontSize: 10, color: '#166534' }}>Probability Expected</div>
                  </div>
                  <div style={{ padding: 10, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>CONTRACTED WON</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>{formatMoney(totalWonValue)}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{wonProposalsList.length} Deals Closed</div>
                  </div>
                  <div style={{ padding: 10, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>WIN RATE EFFICIENCY</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{data.win_rate_pct !== null ? `${data.win_rate_pct}%` : 'N/A'}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Decided Proposals</div>
                  </div>
                </div>
              </div>

              {/* SBU Performance Table */}
              <div style={{ margin: '20px 0', fontFamily: 'sans-serif' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 12, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                  2. SBU Target Attainment & Performance Matrix
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #cbd5e1' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>SBU</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Open Pursuits</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Nominal Open (ETB)</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Weighted Forecast (ETB)</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Target Quota (ETB)</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Attainment %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sbuMetrics.map((m) => (
                      <tr key={m.name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 700 }}>{m.name}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>{m.openCount}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{formatMoney(m.openValue)}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{formatMoney(m.weightedForecast)}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{formatMoney(m.target)}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{m.attainmentPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Top Active Pursuits */}
              <div style={{ margin: '20px 0', fontFamily: 'sans-serif' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 12, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                  3. Key Open Pipeline Pursuits
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #cbd5e1' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Code</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Client</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Scope / Program</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center' }}>SBU</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center' }}>Stage</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Contract Value (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPursuits.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '5px 8px', fontWeight: 700, color: '#0369a1' }}>{p.proposal_code || '—'}</td>
                        <td style={{ padding: '5px 8px', fontWeight: 600 }}>{p.opportunities?.clients?.name || '—'}</td>
                        <td style={{ padding: '5px 8px', maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>{p.opportunities?.sbus?.name || '—'}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>{p.status}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>{formatMoney(p.deal_value_etb)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SLA & Governance Summary */}
              <div style={{ margin: '20px 0 0 0', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: 12, fontSize: 11, fontFamily: 'sans-serif' }}>
                <div>
                  <strong>SLA Compliance Queue:</strong> {data.overdue_actions || 0} Overdue • {data.due_today_actions || 0} Due Today • {data.upcoming_actions || 0} Scheduled Follow-Ups
                </div>
                <div style={{ color: '#64748b' }}>
                  Verified by Master CRM Pipeline • Addis Ababa, Ethiopia
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SBU Target Setting Modal */}
      {editingTargets && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 460, padding: 24 }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>⚙️ Set SBU Revenue Target Quotas</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b' }}>
              Set annual or quarterly revenue benchmarks (in ETB) to track SBU pipeline performance.
            </p>

            <form onSubmit={handleSaveTargets} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CORE_SBUS.map((sbu) => (
                <div key={sbu}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    {sbu} Target (ETB)
                  </label>
                  <input
                    type="number"
                    value={tempTargets[sbu] ?? ''}
                    onChange={(e) =>
                      setTempTargets({ ...tempTargets, [sbu]: parseFloat(e.target.value) || 0 })
                    }
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingTargets(false)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '9px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0284c7',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Save Targets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}