import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import PipelineCoverageGauge from './PipelineCoverageGauge'
import { SBU_PIPELINE_TARGETS } from './pipelineConfig'
import UserAvatar from './UserAvatar'

const STAGE_WEIGHTS = {
  'Target': 0.05,
  'Lead': 0.10,
  'Initiated': 0.10,
  'Pre-Qualified': 0.25,
  'In Progress': 0.30,
  'Qualified Pipeline': 0.50,
  'Submitted': 0.50,
  'Under Review': 0.60,
  'Shortlisted': 0.75,
  'Negotiation': 0.90,
  'Won': 1.00,
  'Delivery & Repeat': 1.00,
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

const SBU_DISPLAY_NAMES = {
  'Institute': 'The i-Capital Institute',
  'CBS': 'Cross Border Solutions (CBS)',
  'IIP': 'i-Capital Investment Partners (IIP)',
  'DAS': 'Digital & AI Solutions (DAS)',
}

const OFFICIAL_DOCUMENT_TARGETS = {
  'Institute': SBU_PIPELINE_TARGETS.INSTITUTE.annualRevenueTarget,
  'CBS': SBU_PIPELINE_TARGETS.CBS.annualRevenueTarget,
  'IIP': SBU_PIPELINE_TARGETS.IIP.annualRevenueTarget,
  'DAS': SBU_PIPELINE_TARGETS.DAS.annualRevenueTarget,
}

const OFFICIAL_QUARTERLY_TARGETS = {
  'Institute': SBU_PIPELINE_TARGETS.INSTITUTE.quarterly,
  'CBS': SBU_PIPELINE_TARGETS.CBS.quarterly,
  'IIP': SBU_PIPELINE_TARGETS.IIP.quarterly,
  'DAS': SBU_PIPELINE_TARGETS.DAS.quarterly,
}

const ADMIN_EMAILS = ['ybeltalsemagn8899@gmail.com']

const SBU_COLORS = {
  'Institute': '#0284c7',
  'CBS': '#f59e0b',
  'IIP': '#10b981',
  'DAS': '#8b5cf6',
}

const QUARTERS = [
  { id: 'ALL', label: 'Full Year (All Quarters)', range: 'Jul 1 – Jun 30', desc: 'Fiscal Year Total' },
  { id: 'Q1', label: 'Q1 (Jul – Sep)', range: 'Jul 1 – Sep 30', desc: 'First Quarter' },
  { id: 'Q2', label: 'Q2 (Oct – Dec)', range: 'Oct 1 – Dec 31', desc: 'Second Quarter' },
  { id: 'Q3', label: 'Q3 (Jan – Mar)', range: 'Jan 1 – Mar 31', desc: 'Third Quarter' },
  { id: 'Q4', label: 'Q4 (Apr – Jun)', range: 'Apr 1 – Jun 30', desc: 'Fourth Quarter' },
]

function getFiscalQuarter(dateString) {
  if (!dateString) return null
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return null
  const month = d.getMonth() + 1

  if (month >= 7 && month <= 9) return 'Q1'
  if (month >= 10 && month <= 12) return 'Q2'
  if (month >= 1 && month <= 3) return 'Q3'
  if (month >= 4 && month <= 6) return 'Q4'
  return null
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value ?? 0)
}

function formatMoney(value) {
  return `ETB ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)}`
}

function parseTag(text, tag) {
  if (!text) return ''
  const match = text.match(new RegExp(`\\[${tag}:\\s*([^\\]]+)\\]`))
  return match ? match[1].trim() : ''
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

export default function SummaryDashboard() {
  const [data, setData] = useState(null)
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  const [selectedQuarter, setSelectedQuarter] = useState('ALL')

  const [sbuTargets, setSbuTargets] = useState(() => {
    try {
      const saved = localStorage.getItem('icapital_sbu_targets_official_v2')
      return saved ? JSON.parse(saved) : OFFICIAL_DOCUMENT_TARGETS
    } catch {
      return OFFICIAL_DOCUMENT_TARGETS
    }
  })
  const [editingTargets, setEditingTargets] = useState(false)
  const [tempTargets, setTempTargets] = useState(sbuTargets)
  const [showBriefingModal, setShowBriefingModal] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError('')
      try {
        const { data: authData } = await supabase.auth.getUser()
        const email = authData?.user?.email?.toLowerCase() || ''
        const role = authData?.user?.user_metadata?.role?.toLowerCase() || ''
        if (!cancelled) {
          setIsAdmin(ADMIN_EMAILS.includes(email) || role === 'admin')
        }

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
              product_engine,
              bd_owner,
              proposal_developer,
              notes,
              created_at,
              opportunities (
                sbus (name, code),
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
    if (!isAdmin) {
      alert('Unauthorized: Only an Administrator can modify official SBU revenue targets.')
      return
    }
    setSbuTargets(tempTargets)
    localStorage.setItem('icapital_sbu_targets_official_v2', JSON.stringify(tempTargets))
    setEditingTargets(false)
  }

  function handleResetToOfficialDocumentTargets() {
    if (!isAdmin) return
    setTempTargets(OFFICIAL_DOCUMENT_TARGETS)
    setSbuTargets(OFFICIAL_DOCUMENT_TARGETS)
    localStorage.removeItem('icapital_sbu_targets_official_v2')
    localStorage.removeItem('icapital_sbu_targets')
  }

  const filteredProposals = proposals.filter((p) => {
    if (selectedQuarter === 'ALL') return true
    const dealQuarter = getFiscalQuarter(p.submission_deadline || p.created_at)
    return dealQuarter === selectedQuarter
  })

  const leadProposalsList = filteredProposals.filter((p) => ['Initiated', 'Target', 'Lead'].includes(p.status))
  const formalProposalsList = filteredProposals.filter((p) => !['Initiated', 'Target', 'Lead'].includes(p.status))

  const openFormalProposalsList = formalProposalsList.filter((p) => !['Won', 'Lost', 'Cancelled'].includes(p.status))
  const wonProposalsList = formalProposalsList.filter((p) => p.status === 'Won' || p.status === 'Delivery & Repeat')
  const lostProposalsList = formalProposalsList.filter((p) => p.status === 'Lost')

  const totalSpeculativeLeadValue = leadProposalsList.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
  const totalActiveTenderValue = openFormalProposalsList.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
  const totalWonValue = wonProposalsList.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)

  const totalFormalWeightedForecast = openFormalProposalsList.reduce((sum, p) => {
    const val = Number(p.deal_value_etb) || 0
    const prob = STAGE_WEIGHTS[p.status] ?? 0.30
    return sum + (val * prob)
  }, 0)

  const decidedProposalsCount = wonProposalsList.length + lostProposalsList.length
  const trueProposalWinRate = decidedProposalsCount > 0
    ? Math.round((wonProposalsList.length / decidedProposalsCount) * 100)
    : null

  const leadQualificationRate = filteredProposals.length > 0
    ? Math.round((formalProposalsList.length / filteredProposals.length) * 100)
    : 0

  // 30-Day Win Celebration Spotlight Check
  const nowMs = new Date().getTime()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  const recentWonDeals = wonProposalsList.filter((p) => {
    const wonDateStr = parseTag(p.notes, 'WON_DATE') || p.submission_deadline || p.created_at
    if (!wonDateStr) return false
    const wonTime = new Date(wonDateStr).getTime()
    return !isNaN(wonTime) && (nowMs - wonTime <= thirtyDaysMs)
  })

  // Fallback to absolute latest won deal if none within 30 days
  const activeCelebrationDeal = recentWonDeals[0] || wonProposalsList[0] || null

  const sbuMetrics = CORE_SBUS.map((sbuName) => {
    const sbuDeals = filteredProposals.filter((p) => p.opportunities?.sbus?.name === sbuName)
    const sbuLeads = sbuDeals.filter((p) => ['Initiated', 'Target', 'Lead'].includes(p.status))
    const sbuFormalOpen = sbuDeals.filter((p) => !['Initiated', 'Target', 'Lead', 'Won', 'Delivery & Repeat', 'Lost', 'Cancelled'].includes(p.status))
    const sbuWon = sbuDeals.filter((p) => p.status === 'Won' || p.status === 'Delivery & Repeat')
    const sbuLost = sbuDeals.filter((p) => p.status === 'Lost')

    const leadVal = sbuLeads.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
    const openVal = sbuFormalOpen.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
    const wonVal = sbuWon.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)

    const weightedForecast = sbuFormalOpen.reduce((sum, p) => {
      const val = Number(p.deal_value_etb) || 0
      const prob = STAGE_WEIGHTS[p.status] ?? 0.30
      return sum + (val * prob)
    }, 0)

    const baseAnnualTarget = sbuTargets[sbuName] || OFFICIAL_DOCUMENT_TARGETS[sbuName]
    let target = baseAnnualTarget
    if (selectedQuarter !== 'ALL') {
      const qData = OFFICIAL_QUARTERLY_TARGETS[sbuName]?.[selectedQuarter]
      if (qData && baseAnnualTarget === OFFICIAL_DOCUMENT_TARGETS[sbuName]) {
        target = qData.revenue
      } else {
        target = Math.round(baseAnnualTarget / 4)
      }
    }

    const required3xPipeline = target * 3
    const attainmentPct = target > 0 ? Math.min(150, Math.round((weightedForecast / target) * 100)) : 0
    const decided = sbuWon.length + sbuLost.length
    const winRate = decided > 0 ? Math.round((sbuWon.length / decided) * 100) : null

    return {
      name: sbuName,
      displayName: SBU_DISPLAY_NAMES[sbuName] || sbuName,
      totalDeals: sbuDeals.length,
      leadCount: sbuLeads.length,
      openCount: sbuFormalOpen.length,
      wonCount: sbuWon.length,
      lostCount: sbuLost.length,
      leadValue: leadVal,
      openValue: openVal,
      wonValue: wonVal,
      weightedForecast,
      target,
      required3xPipeline,
      attainmentPct,
      winRate,
      lostDealsList: sbuLost,
    }
  })

  const dynamicBarData = sbuMetrics.map((m) => ({
    name: m.name,
    Target: m.target,
    Forecast: m.weightedForecast,
  }))

  const dynamicPieData = sbuMetrics
    .filter((m) => m.weightedForecast > 0)
    .map((m) => ({
      name: m.name,
      value: m.weightedForecast,
      color: SBU_COLORS[m.name] || '#64748b',
    }))

  const finalPieData = dynamicPieData.length > 0
    ? dynamicPieData
    : [{ name: 'No Active Forecast', value: 1, color: '#e2e8f0' }]

  const stageBreakdown = proposalStatuses.map((status) => {
    const stageDeals = filteredProposals.filter((p) => p.status === status)
    const nominal = stageDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
    const prob = STAGE_WEIGHTS[status] ?? 0
    const weighted = nominal * prob
    const denominator = totalActiveTenderValue > 0 ? totalActiveTenderValue : 1
    const share = !['Initiated', 'Target', 'Lead', 'Won', 'Lost', 'Cancelled'].includes(status)
      ? Math.round((nominal / denominator) * 100)
      : 0

    return {
      status,
      count: stageDeals.length,
      nominal,
      prob: Math.round(prob * 100),
      weighted,
      share,
      isLead: ['Initiated', 'Target', 'Lead'].includes(status),
      isOutcome: ['Won', 'Lost', 'Cancelled'].includes(status),
    }
  })

  const topPursuits = [...openFormalProposalsList]
    .sort((a, b) => (Number(b.deal_value_etb) || 0) - (Number(a.deal_value_etb) || 0))
    .slice(0, 8)

  const activeQuarterObj = QUARTERS.find((q) => q.id === selectedQuarter) || QUARTERS[0]

  async function handleExportCSV() {
    if (!data) return
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const csvRows = []

      csvRows.push('THE i-CAPITAL AFRICA INSTITUTE — EXECUTIVE FORECAST & PIPELINE SUMMARY')
      csvRows.push(`Reporting Period,${activeQuarterObj.label} (${activeQuarterObj.range})`)
      csvRows.push(`Export Date,${today}`)
      csvRows.push('')

      csvRows.push('COMMERCIAL PIPELINE TIERS,DEAL COUNT,VALUE (ETB)')
      csvRows.push(`"Speculative Pre-Tender Leads (Initiated)","${leadProposalsList.length}","${formatMoney(totalSpeculativeLeadValue)}"`)
      csvRows.push(`"Active Formal Proposals","${openFormalProposalsList.length}","${formatMoney(totalActiveTenderValue)}"`)
      csvRows.push(`"Contracted Won Revenue","${wonProposalsList.length}","${formatMoney(totalWonValue)}"`)
      csvRows.push(`"True Proposal Win Rate","${decidedProposalsCount} decided","${trueProposalWinRate != null ? trueProposalWinRate + '%' : 'N/A'}"`)
      csvRows.push('')

      csvRows.push('SBU PERFORMANCE MATRIX,WINS,LOSSES,WEIGHTED FORECAST (ETB),PERIOD TARGET (ETB),ATTAINMENT %')
      sbuMetrics.forEach((m) => {
        csvRows.push(`"${m.displayName}","${m.wonCount}","${m.lostCount}","${m.weightedForecast}","${m.target}","${m.attainmentPct}%"`)
      })
      csvRows.push('')

      downloadCSV(`iCapital_Executive_Forecast_${selectedQuarter}_${today}.csv`, csvRows)
    } catch (err) {
      alert('Could not export report: ' + (err.message || err))
    } finally {
      setExporting(false)
    }
  }

  const operationalKpiCards = data
    ? [
        ['Total Clients', formatNumber(data.clients_total), '#client-directory', 'Institutional client directory'],
        ['Pre-Tender Leads', formatNumber(leadProposalsList.length), '#deals-and-proposals', 'Early inquiries in qualification'],
        ['Formal Proposals', formatNumber(openFormalProposalsList.length), '#deals-and-proposals', 'Active tenders in pursuit'],
        ['Signed Won Deals', formatNumber(wonProposalsList.length), null, 'Contracted engagements'],
        ['True Win Rate', trueProposalWinRate != null ? `${trueProposalWinRate}%` : 'No decided', null, `Won vs Lost (${decidedProposalsCount} bids decided)`],
        ['Lead Conversion Rate', `${leadQualificationRate}%`, null, `${formalProposalsList.length} of ${filteredProposals.length} advanced`],
        ['Pending Actions', formatNumber(data.pending_actions), '#follow-up-queue', 'Scheduled touchpoints'],
        ['Overdue Actions', formatNumber(data.overdue_actions), '#follow-up-queue', 'Urgent follow-ups needed'],
      ]
    : []

  return (
    <section aria-label="Summary Dashboard" style={{ marginBottom: 36, paddingBottom: 28, borderBottom: '1px solid #dbe2ea' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-briefing-dossier, #printable-briefing-dossier * { visibility: visible; }
          #printable-briefing-dossier { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10px; background: #ffffff !important; color: #0f172a !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Executive Opportunity &amp; Revenue Forecast Dashboard</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Two-tier commercial intelligence: Pre-tender lead qualification and formal proposal revenue realization.
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

          {isAdmin ? (
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
              ⚙️ SBU Targets (Admin)
            </button>
          ) : (
            <span
              style={{
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 11,
              }}
            >
              🔒 Targets Locked
            </span>
          )}

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
            {exporting ? 'Generating…' : `📥 Export ${selectedQuarter} to CSV`}
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

      {/* Fiscal Period Selector Toolbar */}
      <div
        style={{
          marginTop: 18,
          backgroundColor: '#ffffff',
          padding: '12px 18px',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>🗓️</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Fiscal Period:
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {QUARTERS.map((q) => {
              const isActive = selectedQuarter === q.id
              const count = q.id === 'ALL'
                ? proposals.length
                : proposals.filter((p) => getFiscalQuarter(p.submission_deadline || p.created_at) === q.id).length

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedQuarter(q.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isActive ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    backgroundColor: isActive ? '#0284c7' : '#f8fafc',
                    color: isActive ? '#ffffff' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{q.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 10,
                      backgroundColor: isActive ? '#ffffff' : '#e2e8f0',
                      color: isActive ? '#0284c7' : '#64748b',
                      fontWeight: 800,
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#64748b' }}>
          Date Span: <strong style={{ color: '#0f172a' }}>{activeQuarterObj.range}</strong>
        </div>
      </div>

      {error && <p role="alert" style={{ color: '#b91c1c', marginTop: 12 }}>{error}</p>}
      {loading && <p role="status" style={{ color: '#64748b', marginTop: 16 }}>Calculating revenue forecast &amp; SBU metrics…</p>}

      {!loading && !error && data && (
        <>
          {/* ======================================================== */}
          {/* AUTOMATIC 30-DAY WIN CELEBRATION SPOTLIGHT BANNER        */}
          {/* ======================================================== */}
          {activeCelebrationDeal && (
            <div
              style={{
                marginTop: 20,
                padding: '18px 22px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #eff6ff 100%)',
                border: '2px solid #86efac',
                borderRadius: 12,
                boxShadow: '0 6px 20px rgba(22, 163, 74, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <UserAvatar name={activeCelebrationDeal.proposal_developer} size={48} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: '#16a34a',
                        color: '#fff',
                        padding: '3px 10px',
                        borderRadius: 12,
                        letterSpacing: '0.5px',
                      }}
                    >
                      🎉 Congratulations on Winning!
                    </span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                    {activeCelebrationDeal.title} ({activeCelebrationDeal.proposal_code || 'DEAL'})
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Client: <strong style={{ color: '#0f172a' }}>{activeCelebrationDeal.opportunities?.clients?.name || 'Institutional Client'}</strong></span>
                    <span>• Commercial Owner: <strong style={{ color: '#0369a1' }}>{activeCelebrationDeal.bd_owner || 'Corporate RG'}</strong></span>
                    <span>• Technical Lead: <strong style={{ color: '#166534' }}>{activeCelebrationDeal.proposal_developer || 'Assigned Lead'}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', minWidth: 160 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                  Contracted Won Revenue
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#166534' }}>
                  {formatMoney(activeCelebrationDeal.deal_value_etb)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginTop: 2 }}>
                  SBU: {activeCelebrationDeal.opportunities?.sbus?.name || 'Institute'}
                </div>
              </div>
            </div>
          )}

          {/* 3X PIPELINE COVERAGE GAUGE */}
          <div style={{ marginTop: 20 }}>
            <PipelineCoverageGauge proposals={proposals} />
          </div>

          {/* 4-PILLAR REVENUE FORECAST GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 20 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
                  🎯 Pre-Tender Leads Pipeline
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4 }}>
                  Initiated / Lead
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>
                {formatMoney(totalSpeculativeLeadValue)}
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {leadProposalsList.length} exploratory opportunities in qualification
              </span>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 18, borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                  📘 Active Tender Pipeline
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4 }}>
                  In Progress – Neg.
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#78350f', margin: '8px 0 4px 0' }}>
                {formatMoney(totalActiveTenderValue)}
              </div>
              <span style={{ fontSize: 12, color: '#92400e' }}>
                {openFormalProposalsList.length} formal proposals in development &amp; defense
              </span>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 18, borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                  📈 Weighted Tender Realization
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4 }}>
                  Risk-Adjusted
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', margin: '8px 0 4px 0' }}>
                {formatMoney(totalFormalWeightedForecast)}
              </div>
              <span style={{ fontSize: 12, color: '#166534' }}>
                Stage-weighted expected conversion from formal bids
              </span>
            </div>

            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: 18, borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>
                  🏆 Contracted Won Revenue
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#f3e8ff', color: '#6b21a8', padding: '2px 6px', borderRadius: 4 }}>
                  Signed Deals
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', margin: '8px 0 4px 0' }}>
                {formatMoney(totalWonValue)}
              </div>
              <span style={{ fontSize: 12, color: '#6b21a8' }}>
                {wonProposalsList.length} closed won engagements in period
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* QUARTERLY WIN / LOSS & POST-MORTEM LEARNING LEDGER       */}
          {/* ======================================================== */}
          <div style={{ marginTop: 28, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: '0 0 2px 0', color: '#0f172a' }}>
                  📚 Quarterly Win / Loss &amp; Post-Mortem Learning Ledger ({activeQuarterObj.label})
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  Track won vs. lost outcomes and analyze documented loss reasons for institutional learning.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ padding: '4px 10px', borderRadius: 6, background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: 12 }}>
                  Won: {wonProposalsList.length}
                </span>
                <span style={{ padding: '4px 10px', borderRadius: 6, background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: 12 }}>
                  Lost: {lostProposalsList.length}
                </span>
                <span style={{ padding: '4px 10px', borderRadius: 6, background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 12 }}>
                  Win Rate: {trueProposalWinRate != null ? `${trueProposalWinRate}%` : 'N/A'}
                </span>
              </div>
            </div>

            {lostProposalsList.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13, background: '#f8fafc', borderRadius: 8, fontStyle: 'italic' }}>
                No lost proposals recorded for this period. Excellent performance!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 12px', color: '#475569' }}>Proposal Code</th>
                      <th style={{ padding: '8px 12px', color: '#475569' }}>Client &amp; Title</th>
                      <th style={{ padding: '8px 12px', color: '#475569' }}>SBU</th>
                      <th style={{ padding: '8px 12px', color: '#475569' }}>Commercial Unit</th>
                      <th style={{ padding: '8px 12px', color: '#475569' }}>Technical Lead</th>
                      <th style={{ padding: '8px 12px', color: '#475569' }}>Value (ETB)</th>
                      <th style={{ padding: '8px 12px', color: '#b91c1c' }}>Documented Loss Reason (Learning Post-Mortem)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lostProposalsList.map((p) => {
                      const lossReason = parseTag(p.notes, 'LOSS_REASON') || 'No formal loss reason tagged in audit notes.'
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0369a1' }}>{p.proposal_code || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.opportunities?.clients?.name || '—'}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{p.title}</div>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.opportunities?.sbus?.code || 'INST'}</td>
                          <td style={{ padding: '8px 12px', color: '#334155' }}>{p.bd_owner || 'Corporate RG'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <UserAvatar name={p.proposal_developer} size={20} />
                              <span>{p.proposal_developer || '—'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#166534' }}>{formatMoney(p.deal_value_etb)}</td>
                          <td style={{ padding: '8px 12px', color: '#b91c1c', fontWeight: 600, background: '#fef2f2' }}>
                            {lossReason}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SBU Pipeline Targets */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>
                Strategic Business Unit (SBU) Target Attainment — {activeQuarterObj.label}
              </h3>
              <span style={{ fontSize: 12, color: '#047857', fontWeight: 600, background: '#ecfdf5', padding: '4px 10px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                🔒 Locked to Approved Readiness Report Baseline
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
              {sbuMetrics.map((sbu) => (
                <div key={sbu.name} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 14, color: '#0f172a' }}>{sbu.displayName}</strong>
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
                      <span>Revenue Target:</span>
                      <strong style={{ color: '#334155' }}>{formatMoney(sbu.target)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Required 3× Pipeline:</span>
                      <span>{formatMoney(sbu.required3xPipeline)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 6, marginTop: 4 }}>
                      <span>Portfolio Breakdown:</span>
                      <span>{sbu.openCount} tenders • {sbu.wonCount} won ({sbu.lostCount} lost)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Analytics: Bar Chart & Pie Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', margin: '24px 0' }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                📊 SBU Target Quota vs. Weighted Tender Forecast (ETB) — {selectedQuarter}
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicBarData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
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

            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                🍩 SBU Weighted Tender Realization Share — {selectedQuarter}
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={finalPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {finalPieData.map((entry, index) => (
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
          <h3 style={{ marginTop: 28, marginBottom: 12, color: '#0f172a' }}>
            CRM Commercial &amp; Operational Performance ({selectedQuarter})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            {operationalKpiCards.map(([label, value, href, description]) => (
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
                {description && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    {description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ADMIN-ONLY SBU Target Setting Modal */}
      {editingTargets && isAdmin && (
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
          <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>🔒 Official SBU Revenue Target Quotas</h3>
              <span style={{ fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6 }}>
                ADMIN ONLY
              </span>
            </div>
            <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#64748b' }}>
              Targets are locked to the SBU Pipeline Readiness Report baseline (Annual Revenue Target in ETB; 3× Pipeline Coverage is calculated automatically).
            </p>

            <form onSubmit={handleSaveTargets} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CORE_SBUS.map((sbu) => {
                const currentVal = tempTargets[sbu] ?? OFFICIAL_DOCUMENT_TARGETS[sbu]
                return (
                  <div key={sbu} style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                        {SBU_DISPLAY_NAMES[sbu]}
                      </label>
                      <span style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>
                        3× Pipeline: {formatMoney(currentVal * 3)}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={currentVal}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setTempTargets({ ...tempTargets, [sbu]: parseFloat(e.target.value) || 0 })
                      }
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                )
              })}

              <button
                type="button"
                onClick={handleResetToOfficialDocumentTargets}
                style={{
                  padding: '8px',
                  borderRadius: 6,
                  border: '1px dashed #0284c7',
                  background: '#f0f9ff',
                  color: '#0369a1',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                ↺ Reset to Approved Document Baseline (ETB 256.595M Total)
              </button>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
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
                  disabled={!isAdmin}
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
                  Save Official Targets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}