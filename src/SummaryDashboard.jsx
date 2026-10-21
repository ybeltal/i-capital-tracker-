import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import PipelineCoverageGauge from './PipelineCoverageGauge'
import { SBU_PIPELINE_TARGETS } from './pipelineConfig'
import UserAvatar from './UserAvatar'

const STAGE_WEIGHTS = {
  Target: 0.05,
  Lead: 0.10,
  Initiated: 0.10,
  'Pre-Qualified': 0.25,
  'In Progress': 0.30,
  'Qualified Pipeline': 0.50,
  Submitted: 0.50,
  'Under Review': 0.60,
  Shortlisted: 0.75,
  Negotiation: 0.90,
  Won: 1.00,
  'Delivery & Repeat': 1.00,
  'On Hold': 0.20,
  Lost: 0.00,
  Cancelled: 0.00,
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
  Institute: 'The i-Capital Institute',
  CBS: 'Cross Border Solutions (CBS)',
  IIP: 'i-Capital Investment Partners (IIP)',
  DAS: 'Digital & AI Solutions (DAS)',
}

// 184 Target Accounts across the 4 SBUs (155 Unique Corporate Entities)
const TOTAL_DIRECTORY_CLIENTS = 184
const UNIQUE_INSTITUTIONS_COUNT = 155

const OFFICIAL_DOCUMENT_TARGETS = {
  Institute: SBU_PIPELINE_TARGETS?.INSTITUTE?.annualRevenueTarget || 63000000,
  CBS: SBU_PIPELINE_TARGETS?.CBS?.annualRevenueTarget || 35000000,
  IIP: SBU_PIPELINE_TARGETS?.IIP?.annualRevenueTarget || 140300000,
  DAS: SBU_PIPELINE_TARGETS?.DAS?.annualRevenueTarget || 18295000,
}

const OFFICIAL_QUARTERLY_TARGETS = {
  Institute: SBU_PIPELINE_TARGETS?.INSTITUTE?.quarterly || {},
  CBS: SBU_PIPELINE_TARGETS?.CBS?.quarterly || {},
  IIP: SBU_PIPELINE_TARGETS?.IIP?.quarterly || {},
  DAS: SBU_PIPELINE_TARGETS?.DAS?.quarterly || {},
}

const ADMIN_EMAILS = ['ybeltalsemagn8899@gmail.com']

const SBU_COLORS = {
  Institute: '#0284c7',
  CBS: '#f59e0b',
  IIP: '#10b981',
  DAS: '#8b5cf6',
}

const PIE_PALETTE = ['#0284c7', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

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

export default function SummaryDashboard({ onNavigateTab }) {
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

  const activeCelebrationDeal = recentWonDeals[0] || wonProposalsList[0] || null

  const sbuMetrics = CORE_SBUS.map((sbuName) => {
    const sbuDeals = filteredProposals.filter((p) => {
      const name = p.opportunities?.sbus?.name || ''
      return name.toLowerCase().includes(sbuName.toLowerCase())
    })
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
    }
  })

  // Charts Dataset Preparation
  const barChartData = sbuMetrics.map((m) => ({
    sbuKey: m.name,
    sbuName: m.displayName.replace(/\s*\(.*?\)\s*/g, ''), // clean name
    'Target Quota (M)': Number((m.target / 1000000).toFixed(2)),
    'Active Pipeline (M)': Number((m.openValue / 1000000).toFixed(2)),
    'Weighted Forecast (M)': Number((m.weightedForecast / 1000000).toFixed(2)),
    'Won Revenue (M)': Number((m.wonValue / 1000000).toFixed(2)),
  }))

  const sbuPieData = sbuMetrics
    .map((m, idx) => ({
      name: m.displayName,
      value: m.openValue + m.wonValue || (m.target / 10), // fallback representation if pipeline is bootstrapping
      color: SBU_COLORS[m.name] || PIE_PALETTE[idx % PIE_PALETTE.length],
    }))

  const stageBreakdownData = [
    { name: 'Pre-Tender Leads', value: leadProposalsList.length || 1, color: '#0284c7' },
    { name: 'Active In Defense', value: openFormalProposalsList.length || 1, color: '#f59e0b' },
    { name: 'Contracted Won', value: wonProposalsList.length || 1, color: '#10b981' },
    { name: 'Under Review / Loss', value: lostProposalsList.length || 0, color: '#94a3b8' },
  ].filter((item) => item.value > 0)

  // Top pursuits for dossier
  const topPursuits = [...openFormalProposalsList]
    .sort((a, b) => (Number(b.deal_value_etb) || 0) - (Number(a.deal_value_etb) || 0))
    .slice(0, 6)

  const activeQuarterObj = QUARTERS.find((q) => q.id === selectedQuarter) || QUARTERS[0]

  async function handleExportCSV() {
    if (!data) return
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const csvRows = []

      csvRows.push('THE i-CAPITAL AFRICA GROUP — EXECUTIVE FORECAST & PIPELINE SUMMARY')
      csvRows.push(`Reporting Period,${activeQuarterObj.label} (${activeQuarterObj.range})`)
      csvRows.push(`Target Directory Accounts,${TOTAL_DIRECTORY_CLIENTS} (${UNIQUE_INSTITUTIONS_COUNT} Unique Institutions)`)
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

  // Operational KPI Cards
  const operationalKpiCards = data
    ? [
        [
          'Total Clients',
          '184',
          '#client-directory',
          '184 SBU target accounts (155 unique institutions)',
        ],
        [
          'Pre-Tender Leads',
          formatNumber(leadProposalsList.length),
          '#deals-and-proposals',
          'Early inquiries in qualification',
        ],
        [
          'Formal Proposals',
          formatNumber(openFormalProposalsList.length),
          '#deals-and-proposals',
          'Active tenders in pursuit',
        ],
        ['Signed Won Deals', formatNumber(wonProposalsList.length), null, 'Contracted engagements'],
        [
          'True Win Rate',
          trueProposalWinRate != null ? `${trueProposalWinRate}%` : 'No decided',
          null,
          `Won vs Lost (${decidedProposalsCount} bids decided)`,
        ],
        [
          'Lead Conversion Rate',
          `${leadQualificationRate}%`,
          null,
          `${formalProposalsList.length} of ${filteredProposals.length} advanced`,
        ],
        ['Pending Actions', formatNumber(data.pending_actions), '#follow-up-queue', 'Scheduled touchpoints'],
        ['Overdue Actions', formatNumber(data.overdue_actions), '#follow-up-queue', 'Urgent follow-ups needed'],
      ]
    : []

  return (
    <section
      aria-label="Summary Dashboard"
      style={{
        marginBottom: 36,
        paddingBottom: 28,
        borderBottom: '1px solid #dbe2ea',
      }}
    >
      {/* Scroll Animations & Interactive CSS Stylesheet */}
      <style>{`
        @keyframes subtleFadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulseSoftGlow {
          0%, 100% {
            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.12);
          }
          50% {
            box-shadow: 0 8px 24px rgba(2, 132, 199, 0.25);
          }
        }
        .anim-fade-up {
          animation: subtleFadeSlideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-delay-1 { animation-delay: 0.08s; }
        .anim-delay-2 { animation-delay: 0.16s; }
        .anim-delay-3 { animation-delay: 0.24s; }
        .anim-delay-4 { animation-delay: 0.32s; }
        
        .interactive-card {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.22s ease;
        }
        .interactive-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08) !important;
          border-color: #cbd5e1 !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
          }
          header, aside, nav, .no-print, button, select, input {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-briefing-dossier, #printable-briefing-dossier * {
            visibility: visible;
          }
          #printable-briefing-dossier {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4px 6px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Header & Actions */}
      <div
        className="anim-fade-up"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a', fontWeight: 900 }}>
            Executive Opportunity &amp; Revenue Forecast Dashboard
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Two-tier commercial intelligence: Pre-tender lead qualification and formal proposal revenue realization[cite: 16].
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
          <button
            type="button"
            onClick={() => setShowBriefingModal(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: '1px solid #1e293b',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
        className="anim-fade-up anim-delay-1"
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
                    transition: 'all 0.15s ease',
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
          {/* WIN CELEBRATION SPOTLIGHT */}
          {activeCelebrationDeal && (
            <div
              className="anim-fade-up anim-delay-1 interactive-card"
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
                    <span>Commercial Owner: <strong style={{ color: '#0369a1' }}>{activeCelebrationDeal.bd_owner || 'Corporate RG'}</strong></span>
                    <span>Technical Lead: <strong style={{ color: '#166534' }}>{activeCelebrationDeal.proposal_developer || 'Assigned Lead'}</strong></span>
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
          <div className="anim-fade-up anim-delay-2" style={{ marginTop: 20 }}>
            <PipelineCoverageGauge proposals={proposals} />
          </div>

          {/* 4-PILLAR REVENUE FORECAST GRID */}
          <div
            className="anim-fade-up anim-delay-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 14,
              marginTop: 20,
            }}
          >
            <div className="interactive-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, borderLeft: '4px solid #0284c7' }}>
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

            <div className="interactive-card" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 18, borderLeft: '4px solid #f59e0b' }}>
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

            <div className="interactive-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 18, borderLeft: '4px solid #16a34a' }}>
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

            <div className="interactive-card" style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: 18, borderLeft: '4px solid #8b5cf6' }}>
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

          {/* VIBRANT EXECUTIVE CHARTS & VISUAL ANALYTICS */}
          <div
            className="anim-fade-up anim-delay-3"
            style={{
              marginTop: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: 16,
            }}
          >
            {/* Chart 1: SBU Revenue Target vs Pipeline Performance Bar Chart */}
            <div
              className="interactive-card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '20px 22px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                    SBU Revenue Target vs. Pipeline Performance[cite: 16]
                  </h4>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Reconciled values displayed in <strong>Million ETB (M)</strong> across 4 SBUs[cite: 16].
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#f1f5f9', color: '#0284c7', padding: '3px 8px', borderRadius: 6 }}>
                  BAR CHART
                </span>
              </div>

              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="sbuName" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="M" />
                    <Tooltip
                      formatter={(val, name) => [`ETB ${val}M`, name]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 12,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="Target Quota (M)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Active Pipeline (M)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Weighted Forecast (M)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Won Revenue (M)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Pipeline Contribution & Stage Share (Two-tier Donut) */}
            <div
              className="interactive-card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '20px 22px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                    Pipeline Share &amp; Stage Health Distribution[cite: 16]
                  </h4>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Relative portfolio weight across business units and bidding progression.
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#ecfdf5', color: '#166534', padding: '3px 8px', borderRadius: 6 }}>
                  DONUT CHARTS
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: 280, alignItems: 'center' }}>
                {/* SBU Share Donut */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    SBU Portfolio Weight[cite: 16]
                  </span>
                  <div style={{ width: '100%', height: 190 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sbuPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {sbuPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val) => [formatMoney(val), 'Volume']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 11,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>
                    Institute • CBS • IIP • DAS[cite: 16]
                  </div>
                </div>

                {/* Stage Share Donut */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Progression Status
                  </span>
                  <div style={{ width: '100%', height: 190 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stageBreakdownData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {stageBreakdownData.map((entry, index) => (
                            <Cell key={`stage-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val) => [`${val} Deals`, 'Count']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 11,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>
                    Leads vs In Defense vs Won
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SBU Attainment Cards */}
          <div className="anim-fade-up anim-delay-3" style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>
                Strategic Business Unit (SBU) Target Attainment — {activeQuarterObj.label}[cite: 16]
              </h3>
              <span style={{ fontSize: 12, color: '#047857', fontWeight: 600, background: '#ecfdf5', padding: '4px 10px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                🔒 Locked to Approved Readiness Report Baseline[cite: 16]
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
              {sbuMetrics.map((sbu) => (
                <div key={sbu.name} className="interactive-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
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
                        transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
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
                      <strong style={{ color: '#334155' }}>{formatMoney(sbu.target)}</strong>[cite: 16]
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Required 3× Pipeline:</span>
                      <span>{formatMoney(sbu.required3xPipeline)}</span>[cite: 16]
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CRM Commercial & Operational Performance */}
          <h3 className="anim-fade-up anim-delay-4" style={{ marginTop: 28, marginBottom: 12, color: '#0f172a' }}>
            CRM Commercial &amp; Operational Performance ({selectedQuarter})
          </h3>
          <div
            className="anim-fade-up anim-delay-4"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}
          >
            {operationalKpiCards.map(([label, value, href, description]) => (
              <div
                key={label}
                className="interactive-card"
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
                    <a
                      href={href}
                      onClick={(e) => {
                        if (onNavigateTab) {
                          e.preventDefault()
                          if (href === '#client-directory') onNavigateTab('clients')
                          else if (href === '#deals-and-proposals') onNavigateTab('proposals')
                          else if (href === '#follow-up-queue') onNavigateTab('queue')
                        }
                      }}
                      style={{ color: '#0284c7', textDecoration: 'none', cursor: 'pointer' }}
                      title="Click to view in Directory"
                    >
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

      {/* 1-PAGE PRINTABLE EXECUTIVE BRIEFING DOSSIER MODAL */}
      {showBriefingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() => setShowBriefingModal(false)}
        >
          <div
            id="printable-briefing-dossier"
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 820,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              maxHeight: '94vh',
              overflowY: 'auto',
              color: '#0f172a',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Actions */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: 16 }}>Board-Ready 1-Page Executive Dossier</h3>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Formatted to export strictly on 1 A4 page with zero cut-off.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0284c7',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
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
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Document Canvas */}
            <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src="/logo.png"
                    alt="Logo"
                    style={{ height: 28, width: 'auto' }}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  <div>
                    <h1 style={{ margin: 0, fontSize: 15, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#0f172a', fontWeight: 900 }}>
                      The i-Capital Africa Group
                    </h1>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      Executive Opportunity &amp; Revenue Briefing • <strong>{activeQuarterObj.label}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: 10, color: '#64748b' }}>
                  <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div><strong>Classification:</strong> Confidential / Board Review</div>
                  <div><strong>Target Accounts:</strong> 184 Mapped SBU Pursuits (155 Unique)</div>
                </div>
              </div>

              {/* 1. Executive Financial Summary */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  1. Executive Financial Realization Snapshot
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <div style={{ padding: '8px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6 }}>
                    <div style={{ fontSize: 9, color: '#0369a1', fontWeight: 800 }}>PRE-TENDER LEADS</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#0369a1', marginTop: 2 }}>{formatMoney(totalSpeculativeLeadValue)}</div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>{leadProposalsList.length} In Qualification</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
                    <div style={{ fontSize: 9, color: '#92400e', fontWeight: 800 }}>ACTIVE FORMAL TENDERS</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#92400e', marginTop: 2 }}>{formatMoney(totalActiveTenderValue)}</div>
                    <div style={{ fontSize: 9, color: '#92400e' }}>{openFormalProposalsList.length} In Development</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6 }}>
                    <div style={{ fontSize: 9, color: '#166534', fontWeight: 800 }}>WEIGHTED FORECAST</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#166534', marginTop: 2 }}>{formatMoney(totalFormalWeightedForecast)}</div>
                    <div style={{ fontSize: 9, color: '#166534' }}>Probability-Adjusted</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 6 }}>
                    <div style={{ fontSize: 9, color: '#6b21a8', fontWeight: 800 }}>CONTRACTED WON</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#7c3aed', marginTop: 2 }}>{formatMoney(totalWonValue)}</div>
                    <div style={{ fontSize: 9, color: '#6b21a8' }}>{wonProposalsList.length} Closed Deals</div>
                  </div>
                </div>
              </div>

              {/* 2. SBU Target Attainment & Performance Matrix */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  2. SBU Target Attainment &amp; 3× Pipeline Matrix[cite: 16]
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #cbd5e1' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Strategic Business Unit</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center' }}>Leads</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center' }}>Tenders</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Active Value (ETB)</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Weighted (ETB)</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Quota Target (ETB)</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>3× Required (ETB)[cite: 16]</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center' }}>Attainment %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sbuMetrics.map((m) => (
                      <tr key={m.name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px 8px', fontWeight: 700 }}>{m.displayName}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center', color: '#0369a1' }}>{m.leadCount}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>{m.openCount}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>{formatMoney(m.openValue)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{formatMoney(m.weightedForecast)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>{formatMoney(m.target)}[cite: 16]</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', color: '#475569' }}>{formatMoney(m.required3xPipeline)}[cite: 16]</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 800 }}>{m.attainmentPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 3. Top Active Pursuits */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  3. Key Active Formal Tender Pursuits ({selectedQuarter})
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, border: '1px solid #cbd5e1' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Proposal Code</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Client</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Scope / Title</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center' }}>SBU</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Commercial / Tech Lead</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Contract Value (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPursuits.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                          No active formal proposals currently in pursuit.
                        </td>
                      </tr>
                    ) : (
                      topPursuits.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '4px 6px', fontWeight: 800, color: '#0369a1' }}>{p.proposal_code || '—'}</td>
                          <td style={{ padding: '4px 6px', fontWeight: 700 }}>{p.opportunities?.clients?.name || '—'}</td>
                          <td style={{ padding: '4px 6px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 600 }}>{p.opportunities?.sbus?.name || '—'}</td>
                          <td style={{ padding: '4px 6px' }}>{p.bd_owner || 'Corporate RG'} / {p.proposal_developer || 'Unassigned'}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800, color: '#166534' }}>{formatMoney(p.deal_value_etb)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 4. Footer */}
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#64748b' }}>
                <div>
                  <strong>Bidding Intelligence:</strong> Win Rate: <strong>{trueProposalWinRate != null ? `${trueProposalWinRate}%` : 'N/A'}</strong> | Lead Conversion: <strong>{leadQualificationRate}%</strong>
                </div>
                <div>
                  Verified by Master CRM Pipeline • Addis Ababa, Ethiopia
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN TARGET MODAL */}
      {editingTargets && isAdmin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            zIndex: 99999,
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
              Targets are locked to the SBU Pipeline Readiness Report baseline[cite: 16].
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
                        3× Pipeline: {formatMoney(currentVal * 3)}[cite: 16]
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
                ↺ Reset to Approved Document Baseline (ETB 256.595M Total)[cite: 16]
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