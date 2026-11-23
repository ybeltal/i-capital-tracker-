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
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import PipelineCoverageGauge from './PipelineCoverageGauge'
import { SBU_PIPELINE_TARGETS } from './pipelineConfig'
import UserAvatar from './UserAvatar'

const CORE_SBUS = ['Institute', 'CBS', 'IIP', 'DAS']

const SBU_DISPLAY_NAMES = {
  Institute: 'The i-Capital Institute',
  CBS: 'Cross Border Solutions (CBS)',
  IIP: 'Investment Partners (IIP)',
  DAS: 'Digital & AI Solutions (DAS)',
}

const SBU_THEMES = {
  Institute: { accent: '#2563EB', soft: '#EFF6FF', text: '#1D4ED8', code: 'INST' },
  IIP: { accent: '#0D9488', soft: '#F0FDFA', text: '#0F766E', code: 'IIP' },
  DAS: { accent: '#D97706', soft: '#FFFBEB', text: '#B45309', code: 'DAS' },
  CBS: { accent: '#6366F1', soft: '#EEF2FF', text: '#4338CA', code: 'CBS' },
}

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

const ADMIN_EMAILS = ['ybeltalsemagn8899@gmail.com', 'ybeltal@icapitalafrica.org']

const FUNNEL_STAGES = [
  { key: 'TOR', label: '1. TOR & Go/No-Go', weight: 0.2, color: '#6366F1' },
  { key: 'DRAFTING', label: '2. Proposal Drafting', weight: 0.4, color: '#2563EB' },
  { key: 'SUBMITTED', label: '3. Submitted / Review', weight: 0.6, color: '#D97706' },
  { key: 'SHORTLISTED', label: '4. Shortlisted / Defense', weight: 0.8, color: '#7C3AED' },
  { key: 'WON', label: '5. Contract Won / Signed', weight: 1.0, color: '#10B981' },
]

const QUARTERS = [
  { id: 'ALL', label: 'Full Year', range: 'Jul 1 – Jun 30' },
  { id: 'Q1', label: 'Q1', range: 'Jul – Sep' },
  { id: 'Q2', label: 'Q2', range: 'Oct – Dec' },
  { id: 'Q3', label: 'Q3', range: 'Jan – Mar' },
  { id: 'Q4', label: 'Q4', range: 'Apr – Jun' },
]

function normalizeStageBucket(stageName) {
  const s = String(stageName || '').trim().toLowerCase()
  if (s.includes('cancel') || s.includes('withdraw')) return 'CANCELLED'
  if (s.includes('lost') || s.includes('no-go') || s.includes('no go')) return 'LOST'
  if (
    s.includes('5.') ||
    s.includes('3. contract') ||
    s.includes('won') ||
    s.includes('signed') ||
    s.includes('delivery') ||
    s.includes('repeat')
  ) {
    return 'WON'
  }
  if (s.includes('4.') || s.includes('shortlist') || s.includes('negotiat')) return 'SHORTLISTED'
  if (
    s.includes('3.') ||
    s.includes('2. proposal in defense') ||
    s.includes('submitted') ||
    s.includes('under review') ||
    s.includes('defense')
  ) {
    return 'SUBMITTED'
  }
  if (s.includes('2.') || s.includes('draft') || s.includes('in progress') || s.includes('prep')) {
    return 'DRAFTING'
  }
  return 'TOR'
}

function getBucketWeight(bucket) {
  const found = FUNNEL_STAGES.find((f) => f.key === bucket)
  return found ? found.weight : 0
}

function getFiscalQuarter(dateString) {
  if (!dateString) return null
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return null
  const month = d.getMonth() + 1
  if (month >= 7 && month <= 9) return 'Q1'
  if (month >= 10 && month <= 12) return 'Q2'
  if (month >= 1 && month <= 3) return 'Q3'
  if (month >= 4 && month <= 6) return 'Q4'
  return null
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

function formatMoney(value) {
  return `ETB ${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0))}`
}

function formatCompactMoney(value) {
  const num = Number(value) || 0
  if (num >= 1000000) return `ETB ${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `ETB ${(num / 1000).toFixed(0)}K`
  return `ETB ${num.toLocaleString('en-US')}`
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
  const [summaryRpc, setSummaryRpc] = useState(null)
  const [proposals, setProposals] = useState([])
  const [projects, setProjects] = useState([])
  const [partners, setPartners] = useState([])
  const [leadsCount, setLeadsCount] = useState(0)
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
          setIsAdmin(ADMIN_EMAILS.includes(email) || role === 'admin' || email.includes('ybeltal'))
        }

        const [summaryRes, oppsRes, projRes, partnerRes, leadsRes] = await Promise.all([
          supabase.rpc('get_dashboard_summary'),
          supabase.from('opportunities').select('*').order('created_at', { ascending: false }),
          supabase.from('projects').select('*').order('created_at', { ascending: false }),
          supabase.from('partners').select('*'),
          supabase.from('leads').select('id'),
        ])

        if (!cancelled) {
          const liveOpps = (oppsRes.data || []).filter((o) => !o.is_deleted)

          const normalizedDeals = liveOpps.map((o) => {
            const bucket = normalizeStageBucket(o.stage)
            let sbuKey = 'Institute'
            const rawSbu = (o.sbu || '').toLowerCase()
            if (rawSbu.includes('cross') || rawSbu.includes('cbs') || rawSbu.includes('border')) {
              sbuKey = 'CBS'
            } else if (rawSbu.includes('invest') || rawSbu.includes('iip') || rawSbu.includes('partner')) {
              sbuKey = 'IIP'
            } else if (rawSbu.includes('digital') || rawSbu.includes('das') || rawSbu.includes('ai')) {
              sbuKey = 'DAS'
            }

            const statusForGauge =
              bucket === 'WON'
                ? '3. Contract Won / Signed'
                : bucket === 'LOST'
                ? 'Lost'
                : bucket === 'CANCELLED'
                ? 'Cancelled'
                : bucket === 'TOR'
                ? '1. TOR / RFP Identified'
                : '2. Proposal In Defense'

            return {
              id: o.id,
              proposal_code: o.code || o.deal_code || 'DEAL',
              title: o.title || o.opportunity_title || o.product || 'Proposal Mandate',
              bucket,
              status: statusForGauge,
              stage: o.stage || '1. TOR Identified & Go/No-Go',
              deal_value_etb: Number(o.deal_value || o.contract_value || o.estimated_value) || 0,
              submission_deadline: o.deadline || o.submission_deadline || null,
              bd_owner: o.commercial_owner || o.commercial_owner_email || 'Corporate BD',
              proposal_developer: o.technical_lead || o.technical_lead_email || 'Technical Lead',
              loss_reason: o.loss_reason || '',
              notes: o.notes || '',
              created_at: o.created_at,
              opportunities: {
                sbus: { name: sbuKey, code: sbuKey },
                clients: {
                  name: o.client || o.client_organization || o.client_name || 'Strategic Client',
                  sector: o.sector || 'Institutional',
                },
              },
            }
          })

          setSummaryRpc(summaryRes.data || { pending_actions: 0, overdue_actions: 0 })
          setProposals(normalizedDeals)
          setProjects(projRes.data || [])
          setPartners(partnerRes.data || [])
          setLeadsCount((leadsRes.data || []).length)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load Executive Dashboard.')
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
    if (!isAdmin) return
    setSbuTargets(tempTargets)
    localStorage.setItem('icapital_sbu_targets_official_v2', JSON.stringify(tempTargets))
    setEditingTargets(false)
  }

  function handleResetToOfficialDocumentTargets() {
    if (!isAdmin) return
    setTempTargets(OFFICIAL_DOCUMENT_TARGETS)
    setSbuTargets(OFFICIAL_DOCUMENT_TARGETS)
    localStorage.removeItem('icapital_sbu_targets_official_v2')
  }

  const filteredProposals = proposals.filter((p) => {
    if (selectedQuarter === 'ALL') return true
    const q = getFiscalQuarter(p.submission_deadline || p.created_at)
    return q === selectedQuarter
  })

  // Commercial Pipeline Buckets
  const activeBidDeals = filteredProposals.filter((p) =>
    ['TOR', 'DRAFTING', 'SUBMITTED', 'SHORTLISTED'].includes(p.bucket)
  )
  const wonDeals = filteredProposals.filter((p) => p.bucket === 'WON')
  const lostDeals = filteredProposals.filter((p) => p.bucket === 'LOST')
  const cancelledDeals = filteredProposals.filter((p) => p.bucket === 'CANCELLED')

  const totalActivePipeline = activeBidDeals.reduce((sum, p) => sum + p.deal_value_etb, 0)
  const totalWonRevenue = wonDeals.reduce((sum, p) => sum + p.deal_value_etb, 0)
  const totalWeightedForecast =
    activeBidDeals.reduce((sum, p) => sum + p.deal_value_etb * getBucketWeight(p.bucket), 0) +
    totalWonRevenue

  const decidedBids = wonDeals.length + lostDeals.length
  const trueWinRate = decidedBids > 0 ? Math.round((wonDeals.length / decidedBids) * 100) : null

  // Live Operations & Governance Radar Metrics
  const linkedProjectOppIds = new Set(
    projects.map((pr) => String(pr.source_opportunity_id || '')).filter(Boolean)
  )
  const wonAwaitingHandoffCount = proposals.filter(
    (p) => p.bucket === 'WON' && !linkedProjectOppIds.has(String(p.id))
  ).length

  const pendingSmealCount = projects.filter(
    (pr) => pr.smeal_approval_status !== 'Approved'
  ).length
  const activeDeliveryProjects = projects.filter(
    (pr) =>
      pr.smeal_approval_status === 'Approved' && pr.delivery_stage !== '6. Closed & Certified'
  )
  const signedProjectsValue = projects.reduce(
    (sum, pr) => sum + (Number(pr.contract_value) || 0),
    0
  )

  const urgentDeadlinesCount = activeBidDeals.filter((p) => {
    const days = getDaysUntil(p.submission_deadline)
    return days !== null && days <= 7
  }).length

  const partnerMouAlertsCount = partners.filter((pt) => {
    const days = getDaysUntil(pt.mou_expiry_date)
    if (pt.mou_status === 'Expired' || pt.mou_status === 'Expiring Soon') return true
    return days !== null && days <= 30 && pt.mou_status !== 'No MOU'
  }).length

  // SBU Performance Metrics
  const sbuMetrics = CORE_SBUS.map((sbuName) => {
    const sbuDeals = filteredProposals.filter(
      (p) => (p.opportunities?.sbus?.name || '') === sbuName
    )
    const sbuOpen = sbuDeals.filter((p) =>
      ['TOR', 'DRAFTING', 'SUBMITTED', 'SHORTLISTED'].includes(p.bucket)
    )
    const sbuWon = sbuDeals.filter((p) => p.bucket === 'WON')
    const sbuLost = sbuDeals.filter((p) => p.bucket === 'LOST')

    const openValue = sbuOpen.reduce((sum, p) => sum + p.deal_value_etb, 0)
    const wonValue = sbuWon.reduce((sum, p) => sum + p.deal_value_etb, 0)
    const weightedForecast =
      sbuOpen.reduce((sum, p) => sum + p.deal_value_etb * getBucketWeight(p.bucket), 0) +
      wonValue

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
    const coverageRatio = target > 0 ? ((openValue + wonValue) / target).toFixed(2) : '0.00'
    const attainmentPct = target > 0 ? Math.min(150, Math.round((wonValue / target) * 100)) : 0
    const pipelineAttainmentPct =
      target > 0 ? Math.min(150, Math.round(((openValue + wonValue) / target) * 100)) : 0
    const decided = sbuWon.length + sbuLost.length
    const winRate = decided > 0 ? Math.round((sbuWon.length / decided) * 100) : null

    return {
      name: sbuName,
      displayName: SBU_DISPLAY_NAMES[sbuName],
      theme: SBU_THEMES[sbuName],
      openCount: sbuOpen.length,
      wonCount: sbuWon.length,
      lostCount: sbuLost.length,
      openValue,
      wonValue,
      weightedForecast,
      target,
      required3xPipeline,
      coverageRatio,
      attainmentPct,
      pipelineAttainmentPct,
      winRate,
    }
  })

  const totalPeriodTarget = sbuMetrics.reduce((sum, s) => sum + s.target, 0)
  const groupWonPct =
    totalPeriodTarget > 0 ? Math.min(100, (totalWonRevenue / totalPeriodTarget) * 100) : 0
  const groupWeightedPct =
    totalPeriodTarget > 0 ? Math.min(100, (totalWeightedForecast / totalPeriodTarget) * 100) : 0
  const groupCoverageRatio =
    totalPeriodTarget > 0
      ? ((totalActivePipeline + totalWonRevenue) / totalPeriodTarget).toFixed(2)
      : '0.00'

  // 5-Stage Funnel Data
  const funnelRows = FUNNEL_STAGES.map((stg) => {
    const items = filteredProposals.filter((p) => p.bucket === stg.key)
    const value = items.reduce((sum, p) => sum + p.deal_value_etb, 0)
    return { ...stg, count: items.length, value }
  })
  const maxFunnelValue = Math.max(...funnelRows.map((f) => f.value), 1)

  // Bar Chart Data (Million ETB)
  const barChartData = sbuMetrics.map((m) => ({
    sbuName: m.theme.code,
    'Target (M)': Number((m.target / 1000000).toFixed(2)),
    'Active Pipe (M)': Number((m.openValue / 1000000).toFixed(2)),
    'Weighted (M)': Number((m.weightedForecast / 1000000).toFixed(2)),
    'Won (M)': Number((m.wonValue / 1000000).toFixed(2)),
  }))

  // Loss Reason Intelligence Breakdown
  const lossReasonMap = {}
  lostDeals.forEach((d) => {
    const r = d.loss_reason || 'Not Categorized'
    lossReasonMap[r] = (lossReasonMap[r] || 0) + 1
  })
  const lossReasonEntries = Object.entries(lossReasonMap).sort((a, b) => b[1] - a[1])

  const sbuPieData = sbuMetrics.map((m) => ({
    name: m.theme.code,
    value: m.openValue + m.wonValue || 1,
    color: m.theme.accent,
  }))

  const activeCelebrationDeal = wonDeals[0] || null
  const topPursuits = [...activeBidDeals]
    .sort((a, b) => b.deal_value_etb - a.deal_value_etb)
    .slice(0, 6)
  const activeQuarterObj = QUARTERS.find((q) => q.id === selectedQuarter) || QUARTERS[0]

  async function handleExportCSV() {
    if (!proposals.length) return
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const csvRows = [
        'THE i-CAPITAL AFRICA GROUP — EXECUTIVE REVENUE & GOVERNANCE REPORT',
        `Reporting Period,${activeQuarterObj.label} (${activeQuarterObj.range})`,
        `Export Date,${today}`,
        '',
        'EXECUTIVE SUMMARY,COUNT,VALUE (ETB)',
        `"Active Formal Pipeline","${activeBidDeals.length}","${totalActivePipeline}"`,
        `"Weighted Revenue Forecast","${activeBidDeals.length + wonDeals.length}","${Math.round(totalWeightedForecast)}"`,
        `"Signed Won Revenue","${wonDeals.length}","${totalWonRevenue}"`,
        `"Lost Proposals (Learning Archive)","${lostDeals.length}","${lostDeals.reduce((s, d) => s + d.deal_value_etb, 0)}"`,
        `"Cancelled / Withdrawn","${cancelledDeals.length}","${cancelledDeals.reduce((s, d) => s + d.deal_value_etb, 0)}"`,
        `"Active Signed Projects","${projects.length}","${signedProjectsValue}"`,
        '',
        'SBU PERFORMANCE,OPEN BIDS,WON,LOST,ACTIVE PIPELINE (ETB),WEIGHTED (ETB),TARGET (ETB),COVERAGE RATIO',
        ...sbuMetrics.map(
          (m) =>
            `"${m.displayName}","${m.openCount}","${m.wonCount}","${m.lostCount}","${m.openValue}","${Math.round(m.weightedForecast)}","${m.target}","${m.coverageRatio}x"`
        ),
      ]
      downloadCSV(`iCapital_Executive_Dashboard_${selectedQuarter}_${today}.csv`, csvRows)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section
      aria-label="Executive Dashboard"
      style={{
        marginBottom: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <style>{`
        @keyframes execFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .exec-fade {
          animation: execFadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .exec-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .exec-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 26px rgba(15, 41, 66, 0.1) !important;
        }
        @media print {
          @page { size: A4 portrait; margin: 6mm 10mm; }
          header, aside, nav, .no-print, button, select, input { display: none !important; }
          body * { visibility: hidden; }
          #printable-briefing-dossier, #printable-briefing-dossier * { visibility: visible; }
          #printable-briefing-dossier {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* ==================================================================
          1. EXECUTIVE COMMAND HERO BANNER (DEEP EXECUTIVE NAVY)
      ================================================================== */}
      <div
        className="exec-fade"
        style={{
          background: 'linear-gradient(135deg, #071324 0%, #0F2942 58%, #163A5F 100%)',
          color: '#FFFFFF',
          borderRadius: 18,
          padding: '24px 28px',
          boxShadow: '0 18px 40px -12px rgba(7, 19, 36, 0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Row: Title + Action Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.9px',
                  textTransform: 'uppercase',
                  background: 'rgba(37, 99, 235, 0.28)',
                  border: '1px solid rgba(96, 165, 250, 0.4)',
                  color: '#93C5FD',
                  padding: '3px 10px',
                  borderRadius: 999,
                }}
              >
                ● LIVE COMMERCIAL &amp; DELIVERY COMMAND
              </span>
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
                {activeQuarterObj.label} ({activeQuarterObj.range})
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.3px' }}>
              The i-Capital Africa Group — Executive Command Center
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#CBD5E1' }}>
              Real-time revenue realization, 4-SBU pipeline health, SMEAL delivery governance, and consortium intelligence.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowBriefingModal(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🖨️ Board Briefing (PDF)
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setTempTargets(sbuTargets)
                  setEditingTargets(true)
                }}
                style={{
                  padding: '8px 13px',
                  borderRadius: 8,
                  border: '1px solid rgba(251, 191, 36, 0.45)',
                  background: 'rgba(217, 119, 6, 0.22)',
                  color: '#FDE68A',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⚙️ SBU Quotas
              </button>
            )}

            <button
              type="button"
              disabled={loading || exporting}
              onClick={handleExportCSV}
              style={{
                padding: '8px 13px',
                borderRadius: 8,
                border: 'none',
                background: '#10B981',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 800,
                cursor: loading || exporting ? 'not-allowed' : 'pointer',
              }}
            >
              {exporting ? 'Exporting…' : '📥 Export CSV'}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => setRefreshVersion((v) => v + 1)}
              style={{
                padding: '8px 13px',
                borderRadius: 8,
                border: 'none',
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Syncing…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Hero Target Realization Progress Bar + Quarter Selector */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Period Revenue Target
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
                  {formatCompactMoney(totalPeriodTarget)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Signed Won Realized
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#34D399', marginTop: 2 }}>
                  {formatCompactMoney(totalWonRevenue)}{' '}
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#A7F3D0' }}>
                    ({groupWonPct.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Weighted Forecast
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#60A5FA', marginTop: 2 }}>
                  {formatCompactMoney(totalWeightedForecast)}{' '}
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#BFDBFE' }}>
                    ({groupWeightedPct.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Pipeline Coverage Ratio
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: Number(groupCoverageRatio) >= 3 ? '#34D399' : '#FBBF24', marginTop: 2 }}>
                  {groupCoverageRatio}×{' '}
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1' }}>/ 3.0× Goal</span>
                </div>
              </div>
            </div>

            {/* Fiscal Period Pill Switcher */}
            <div style={{ display: 'flex', gap: 5, background: 'rgba(0,0,0,0.28)', padding: 4, borderRadius: 10 }}>
              {QUARTERS.map((q) => {
                const active = selectedQuarter === q.id
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQuarter(q.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: 'none',
                      background: active ? '#2563EB' : 'transparent',
                      color: active ? '#FFFFFF' : '#CBD5E1',
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {q.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dual-Layer Animated Progress Bar (Won Emerald + Weighted Cobalt) */}
          <div>
            <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${groupWeightedPct}%`,
                  background: 'linear-gradient(90deg, #2563EB 0%, #60A5FA 100%)',
                  borderRadius: 999,
                  transition: 'width 0.7s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${groupWonPct}%`,
                  background: 'linear-gradient(90deg, #059669 0%, #34D399 100%)',
                  borderRadius: 999,
                  transition: 'width 0.7s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#94A3B8', marginTop: 6 }}>
              <span>🟢 Signed Won ({formatMoney(totalWonRevenue)}) • 🔵 Weighted Forecast ({formatMoney(totalWeightedForecast)})</span>
              <span>Target Baseline: {formatMoney(totalPeriodTarget)}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 48, textAlign: 'center', color: '#64748B', border: '1px solid #E2E8F0', fontSize: 13 }}>
          Synchronizing live SBU pipeline, SMEAL project delivery, and partner intelligence…
        </div>
      ) : (
        <>
          {/* ==================================================================
              2. 5-CARD EXECUTIVE SCORECARD ROW
          ================================================================== */}
          <div
            className="exec-fade"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            <div
              className="exec-card"
              onClick={() => onNavigateTab?.('proposals')}
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #10B981',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                🏆 Signed Revenue Won
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginTop: 6 }}>
                {formatCompactMoney(totalWonRevenue)}
              </div>
              <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 700, marginTop: 4 }}>
                {wonDeals.length} contracted mandate{wonDeals.length === 1 ? '' : 's'}
              </div>
            </div>

            <div
              className="exec-card"
              onClick={() => onNavigateTab?.('proposals')}
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #2563EB',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                📑 Active Bid Pipeline
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginTop: 6 }}>
                {formatCompactMoney(totalActivePipeline)}
              </div>
              <div style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 700, marginTop: 4 }}>
                {activeBidDeals.length} open bids • {leadsCount} leads in intake
              </div>
            </div>

            <div
              className="exec-card"
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #7C3AED',
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                🎯 True Decision Win Rate
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginTop: 6 }}>
                {trueWinRate !== null ? `${trueWinRate}%` : '—'}
              </div>
              <div style={{ fontSize: 11.5, color: '#6D28D9', fontWeight: 700, marginTop: 4 }}>
                {wonDeals.length} Won vs {lostDeals.length} Lost ({cancelledDeals.length} Cancelled)
              </div>
            </div>

            <div
              className="exec-card"
              onClick={() => onNavigateTab?.('projects')}
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #D97706',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                🚀 Signed Projects Delivery
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginTop: 6 }}>
                {projects.length} Projects
              </div>
              <div style={{ fontSize: 11.5, color: '#B45309', fontWeight: 700, marginTop: 4 }}>
                {activeDeliveryProjects.length} Active • {formatCompactMoney(signedProjectsValue)}
              </div>
            </div>

            <div
              className="exec-card"
              onClick={() => onNavigateTab?.('clients')}
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #0F2942',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                🏢 Target Account Coverage
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginTop: 6 }}>
                184 Accounts
              </div>
              <div style={{ fontSize: 11.5, color: '#334155', fontWeight: 700, marginTop: 4 }}>
                {partners.length} JV Partners • {summaryRpc?.pending_actions || 0} Follow-ups
              </div>
            </div>
          </div>

          {/* ==================================================================
              3. LIVE GOVERNANCE & OPERATIONS ACTION RADAR (4 CLICKABLE ALERTS)
          ================================================================== */}
          <div
            className="exec-fade"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            <div
              className="exec-card"
              onClick={() => onNavigateTab?.('projects')}
              style={{
                background: pendingSmealCount > 0 ? '#FFFBEB' : '#F8FAFC',
                border: pendingSmealCount > 0 ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '13px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>
                  🛡️ Pending SMEAL Approvals
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Signed agreements awaiting SMEAL sign-off
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: pendingSmealCount > 0 ? '#D97706' : '#64748B' }}>
                {pendingSmealCount}
              </div>
            </div>

            <div
              className="exec-card"
              onClick={() => onNavigateTab?.('projects')}
              style={{
                background: wonAwaitingHandoffCount > 0 ? '#F0FDF4' : '#F8FAFC',
                border: wonAwaitingHandoffCount > 0 ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '13px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                  📎 Won Awaiting Handoff
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Attach PDF/Word agreement to start delivery
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: wonAwaitingHandoffCount > 0 ? '#16A34A' : '#64748B' }}>
                {wonAwaitingHandoffCount}
              </div>
            </div>

            <div
              className="exec-card"
              onClick={() => onNavigateTab?.('proposals')}
              style={{
                background: urgentDeadlinesCount > 0 ? '#FEF2F2' : '#F8FAFC',
                border: urgentDeadlinesCount > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '13px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>
                  ⏰ Urgent Deadlines (≤7d)
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Active bids due soon or overdue
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: urgentDeadlinesCount > 0 ? '#DC2626' : '#64748B' }}>
                {urgentDeadlinesCount}
              </div>
            </div>

            <div
              className="exec-card"
              onClick={() => onNavigateTab?.('partners')}
              style={{
                background: partnerMouAlertsCount > 0 ? '#FFF7ED' : '#F8FAFC',
                border: partnerMouAlertsCount > 0 ? '1px solid #FDBA74' : '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '13px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#9A3412', textTransform: 'uppercase' }}>
                  🤝 Partner MOU Alerts
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Consortium MOUs expiring within 30d
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: partnerMouAlertsCount > 0 ? '#EA580C' : '#64748B' }}>
                {partnerMouAlertsCount}
              </div>
            </div>
          </div>

          {/* ==================================================================
              4. VISUAL PIPELINE FUNNEL + SBU TARGET VS PIPELINE CHART
          ================================================================== */}
          <div
            className="exec-fade"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(430px, 1fr))',
              gap: 16,
            }}
          >
            {/* Left: 5-Stage Visual Conversion Funnel */}
            <div
              className="exec-card"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0F172A' }}>
                      Commercial Pipeline Stage Funnel
                    </h4>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      Live deal volume &amp; conversion weighting from TOR intake to Signed Win
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.('proposals')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#0F172A',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Open Board →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {funnelRows.map((row) => {
                    const widthPct = Math.max(8, Math.round((row.value / maxFunnelValue) * 100))
                    return (
                      <div key={row.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, color: '#1E293B' }}>
                            {row.label}{' '}
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B' }}>
                              ({row.count} {row.count === 1 ? 'deal' : 'deals'})
                            </span>
                          </span>
                          <span style={{ fontWeight: 900, color: '#0F172A' }}>
                            {formatCompactMoney(row.value)}
                          </span>
                        </div>
                        <div style={{ height: 12, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${row.value > 0 ? widthPct : 2}%`,
                              background: row.color,
                              borderRadius: 999,
                              transition: 'width 0.7s ease',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Mini Loss Intelligence Strip */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 12,
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11.5,
                  color: '#475569',
                }}
              >
                <span>
                  📚 <strong>Learning Archive:</strong> {lostDeals.length} Lost • {cancelledDeals.length} Cancelled
                </span>
                <span style={{ fontWeight: 700, color: '#B91C1C' }}>
                  {lossReasonEntries[0] ? `Top Loss: ${lossReasonEntries[0][0]}` : 'Zero losses recorded'}
                </span>
              </div>
            </div>

            {/* Right: SBU Target vs. Pipeline Bar Chart */}
            <div
              className="exec-card"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0F172A' }}>
                    4-SBU Target Quota vs. Commercial Pipeline
                  </h4>
                  <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                    Values shown in <strong>Million ETB (M)</strong> for {activeQuarterObj.label}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#EFF6FF', color: '#1D4ED8', padding: '3px 9px', borderRadius: 6 }}>
                  MILLION ETB
                </span>
              </div>

              <div style={{ width: '100%', height: 265 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="sbuName" stroke="#64748B" fontSize={12} fontWeight={700} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit="M" />
                    <Tooltip
                      formatter={(val, name) => [`ETB ${val}M`, name]}
                      contentStyle={{
                        backgroundColor: '#0F2942',
                        borderColor: '#1E3A5F',
                        borderRadius: 10,
                        color: '#FFFFFF',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="Target (M)" fill="#CBD5E1" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="Active Pipe (M)" fill="#2563EB" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="Weighted (M)" fill="#D97706" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="Won (M)" fill="#10B981" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ==================================================================
              5. 4-SBU PERFORMANCE SCORECARD MATRIX
          ================================================================== */}
          <div className="exec-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0F172A' }}>
                Strategic Business Unit (SBU) Performance Matrix — {activeQuarterObj.label}
              </h3>
              <span style={{ fontSize: 11.5, color: '#047857', fontWeight: 700, background: '#ECFDF5', padding: '4px 10px', borderRadius: 8, border: '1px solid #A7F3D0' }}>
                ✓ Reconciled to Approved Readiness Baseline
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {sbuMetrics.map((sbu) => (
                <div
                  key={sbu.name}
                  className="exec-card"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderTop: `4px solid ${sbu.theme.accent}`,
                    borderRadius: 14,
                    padding: 18,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 900, background: sbu.theme.soft, color: sbu.theme.text, padding: '2px 7px', borderRadius: 5 }}>
                        {sbu.theme.code}
                      </span>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
                        {sbu.displayName}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: sbu.theme.accent }}>
                        {sbu.coverageRatio}×
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>Coverage</div>
                    </div>
                  </div>

                  {/* Progress bar showing pipeline+won vs target */}
                  <div style={{ height: 7, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden', margin: '10px 0 12px 0' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, sbu.pipelineAttainmentPct)}%`,
                        background: sbu.theme.accent,
                        borderRadius: 999,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Signed Won ({sbu.wonCount}):</span>
                      <strong style={{ color: '#059669' }}>{formatCompactMoney(sbu.wonValue)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Active Pipeline ({sbu.openCount}):</span>
                      <strong style={{ color: '#2563EB' }}>{formatCompactMoney(sbu.openValue)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Weighted Forecast:</span>
                      <strong style={{ color: '#0F172A' }}>{formatCompactMoney(sbu.weightedForecast)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ color: '#64748B' }}>Period Target:</span>
                      <strong style={{ color: '#334155' }}>{formatCompactMoney(sbu.target)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ==================================================================
              6. TOP ACTIVE PURSUITS + PORTFOLIO WEIGHT DONUT & WIN SPOTLIGHT
          ================================================================== */}
          <div
            className="exec-fade"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: 16,
            }}
          >
            {/* Top Active High-Value Pursuits */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 900, color: '#0F172A' }}>
                  💎 Highest-Value Active Pursuits
                </h4>
                <button
                  type="button"
                  onClick={() => onNavigateTab?.('proposals')}
                  style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}
                >
                  View All →
                </button>
              </div>

              {topPursuits.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                  No active formal bids in this quarter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topPursuits.map((deal) => {
                    const sbu = SBU_THEMES[deal.opportunities?.sbus?.name] || SBU_THEMES.Institute
                    return (
                      <div
                        key={deal.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 12px',
                          background: '#F8FAFC',
                          borderRadius: 9,
                          borderLeft: `4px solid ${sbu.accent}`,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>
                            {deal.opportunities?.clients?.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {deal.title}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 900, color: '#059669' }}>
                            {formatCompactMoney(deal.deal_value_etb)}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>
                            {sbu.code} • {deal.submission_deadline || 'No deadline'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right Stack: Win Spotlight + SBU Share Donut */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeCelebrationDeal && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
                    color: '#FFFFFF',
                    borderRadius: 14,
                    padding: '18px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <UserAvatar name={activeCelebrationDeal.proposal_developer} size={44} />
                    <div>
                      <span style={{ fontSize: 9.5, fontWeight: 900, background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: 999 }}>
                        🎉 LATEST SIGNED WIN
                      </span>
                      <div style={{ fontSize: 15, fontWeight: 900, marginTop: 4 }}>
                        {activeCelebrationDeal.opportunities?.clients?.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#A7F3D0' }}>
                        {activeCelebrationDeal.title}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>
                      {formatCompactMoney(activeCelebrationDeal.deal_value_etb)}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#A7F3D0' }}>
                      {activeCelebrationDeal.opportunities?.sbus?.name}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 20px', flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0F172A', marginBottom: 8 }}>
                  Portfolio Share by Strategic Business Unit
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 150, height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sbuPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={64}
                          paddingAngle={3}
                        >
                          {sbuPieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [formatCompactMoney(v), 'Volume']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sbuMetrics.map((m) => (
                      <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#334155' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: m.theme.accent, display: 'inline-block' }} />
                          {m.theme.code}
                        </span>
                        <strong style={{ color: '#0F172A' }}>
                          {formatCompactMoney(m.openValue + m.wonValue)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3X PIPELINE COVERAGE GAUGE */}
          <div className="exec-fade">
            <PipelineCoverageGauge proposals={proposals} />
          </div>
        </>
      )}

      {/* 1-PAGE PRINTABLE EXECUTIVE BRIEFING MODAL (PROTECTED AGAINST OUTSIDE CLICK CLOSE) */}
      {showBriefingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            zIndex: 999999,
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
              maxWidth: 840,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              maxHeight: '94vh',
              overflowY: 'auto',
              color: '#0f172a',
              boxSizing: 'border-box',
            }}
          >
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: 16 }}>Board-Ready 1-Page Executive Briefing</h3>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Click Print / Save as PDF to export cleanly onto 1 A4 page.
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
                    background: '#2563EB',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
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
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div style={{ borderBottom: '2px solid #0F2942', paddingBottom: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, textTransform: 'uppercase', color: '#0F2942' }}>
                  The i-Capital Africa Group — Executive Commercial Briefing
                </h1>
                <div style={{ fontSize: 11, color: '#475569' }}>
                  Period: <strong>{activeQuarterObj.label} ({activeQuarterObj.range})</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 10.5, color: '#64748b' }}>
                <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div><strong>Coverage Ratio:</strong> {groupCoverageRatio}× / 3.0× Target</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
              <div style={{ padding: 10, background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#166534' }}>SIGNED WON REVENUE</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#166534', marginTop: 2 }}>{formatCompactMoney(totalWonRevenue)}</div>
                <div style={{ fontSize: 9.5, color: '#475569' }}>{wonDeals.length} Signed Deals</div>
              </div>
              <div style={{ padding: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#1D4ED8' }}>ACTIVE BID PIPELINE</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#1D4ED8', marginTop: 2 }}>{formatCompactMoney(totalActivePipeline)}</div>
                <div style={{ fontSize: 9.5, color: '#475569' }}>{activeBidDeals.length} Open Bids</div>
              </div>
              <div style={{ padding: 10, background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#92400E' }}>WEIGHTED FORECAST</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#92400E', marginTop: 2 }}>{formatCompactMoney(totalWeightedForecast)}</div>
                <div style={{ fontSize: 9.5, color: '#475569' }}>Win Rate: {trueWinRate !== null ? `${trueWinRate}%` : 'N/A'}</div>
              </div>
              <div style={{ padding: 10, background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#334155' }}>PROJECT DELIVERY</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', marginTop: 2 }}>{projects.length} Signed</div>
                <div style={{ fontSize: 9.5, color: '#475569' }}>{pendingSmealCount} Pending SMEAL</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #CBD5E1', marginBottom: 14 }}>
              <thead>
                <tr style={{ background: '#0F2942', color: '#FFFFFF' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>SBU</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Won (ETB)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Active Pipe (ETB)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Weighted (ETB)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Target Quota</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {sbuMetrics.map((m) => (
                  <tr key={m.name} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 700 }}>{m.displayName}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{formatMoney(m.wonValue)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatMoney(m.openValue)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>{formatMoney(m.weightedForecast)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatMoney(m.target)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>{m.coverageRatio}×</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ fontSize: 10.5, color: '#64748B', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #CBD5E1', paddingTop: 8 }}>
              <span>Lost Archive: {lostDeals.length} • Cancelled: {cancelledDeals.length} • Registered JV Partners: {partners.length}</span>
              <span>The i-Capital Africa Group • Addis Ababa, Ethiopia</span>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN SBU TARGETS MODAL (PROTECTED AGAINST OUTSIDE CLICK CLOSE) */}
      {editingTargets && isAdmin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>🔒 Official SBU Revenue Target Quotas</h3>
              <button
                type="button"
                onClick={() => setEditingTargets(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#64748b' }}>
              Adjust annual quotas for the 4 Strategic Business Units (Super Admin only).
            </p>

            <form onSubmit={handleSaveTargets} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CORE_SBUS.map((sbu) => {
                const currentVal = tempTargets[sbu] ?? OFFICIAL_DOCUMENT_TARGETS[sbu]
                return (
                  <div key={sbu} style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                        {SBU_DISPLAY_NAMES[sbu]}
                      </label>
                      <span style={{ fontSize: 11, color: '#047857', fontWeight: 700 }}>
                        3× Pipeline: {formatCompactMoney(currentVal * 3)}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={currentVal}
                      onChange={(e) =>
                        setTempTargets({ ...tempTargets, [sbu]: parseFloat(e.target.value) || 0 })
                      }
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
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
                  border: '1px dashed #2563EB',
                  background: '#EFF6FF',
                  color: '#1D4ED8',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                ↺ Reset to Approved Document Baseline (ETB 256.60M Total)
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
                    fontWeight: 700,
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
                    background: '#2563EB',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 800,
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