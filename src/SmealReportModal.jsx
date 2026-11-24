/**
 * THE i-CAPITAL AFRICA GROUP — SMEAL IMMEDIATE STATUS REPORT (PDF / PRINT)
 * Answers executive SMEAL questions in 1 click:
 * - How many projects are in each SBU (INST, IIP, DAS, CBS)?
 * - Which delivery track / stage is each project in?
 * - Has the contract deadline passed (Overdue vs Due Soon vs On Schedule)?
 * - SMEAL approval status, health status, and signed contract values.
 */

import React, { useMemo, useState } from 'react'

const CORE_SBUS = [
  { code: 'INST', name: 'The i-Capital Institute (INST)' },
  { code: 'IIP', name: 'Investment Partners (IIP)' },
  { code: 'DAS', name: 'Digital & AI Solutions (DAS)' },
  { code: 'CBS', name: 'Cross Border Solutions (CBS)' },
]

const TRACK_STAGES = [
  '0. Pending SMEAL Approval',
  '1. Kickoff & Inception',
  '2. Design & Customization',
  '3. Active Execution / Training',
  '4. Outcome Evaluation (LogFrame / Kirkpatrick)',
  '5. Final Showcase & Report',
  '6. Closed & Certified',
]

function normalizeSbuCode(raw) {
  const s = String(raw || '').toLowerCase()
  if (s.includes('iip') || s.includes('invest')) return 'IIP'
  if (s.includes('das') || s.includes('digital') || s.includes('ai')) return 'DAS'
  if (s.includes('cbs') || s.includes('cross')) return 'CBS'
  return 'INST'
}

function formatEtb(amount) {
  const num = Number(amount) || 0
  return `ETB ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function getDeadlineStatus(endDateStr, deliveryStage) {
  if (deliveryStage === '6. Closed & Certified') {
    return { label: 'Completed', isOverdue: false, isDueSoon: false, bg: '#dcfce7', color: '#166534' }
  }
  if (!endDateStr) {
    return { label: 'No End Date', isOverdue: false, isDueSoon: false, bg: '#f1f5f9', color: '#64748b' }
  }
  const target = new Date(endDateStr)
  if (Number.isNaN(target.getTime())) {
    return { label: endDateStr, isOverdue: false, isDueSoon: false, bg: '#f1f5f9', color: '#64748b' }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      label: `OVERDUE (${Math.abs(diffDays)}d passed)`,
      isOverdue: true,
      isDueSoon: false,
      bg: '#fee2e2',
      color: '#b91c1c',
    }
  }
  if (diffDays === 0) {
    return {
      label: 'DUE TODAY',
      isOverdue: true,
      isDueSoon: true,
      bg: '#fee2e2',
      color: '#b91c1c',
    }
  }
  if (diffDays <= 14) {
    return {
      label: `Due in ${diffDays}d`,
      isOverdue: false,
      isDueSoon: true,
      bg: '#ffedd5',
      color: '#c2410c',
    }
  }
  return {
    label: `On Schedule (${diffDays}d left)`,
    isOverdue: false,
    isDueSoon: false,
    bg: '#ecfdf5',
    color: '#047857',
  }
}

export default function SmealReportModal({ isOpen, onClose, projects = [], userProfile }) {
  const [reportSbuFilter, setReportSbuFilter] = useState('ALL')

  const scopedProjects = useMemo(() => {
    if (reportSbuFilter === 'ALL') return projects
    return projects.filter((p) => normalizeSbuCode(p.sbu) === reportSbuFilter)
  }, [projects, reportSbuFilter])

  const analytics = useMemo(() => {
    let pendingSmeal = 0
    let activeDelivery = 0
    let closedCount = 0
    let overdueCount = 0
    let dueSoonCount = 0
    let atRiskCount = 0
    let totalValue = 0

    const enriched = scopedProjects.map((p) => {
      const dl = getDeadlineStatus(p.end_date, p.delivery_stage)
      const val = Number(p.contract_value) || 0
      totalValue += val

      if (p.smeal_approval_status !== 'Approved') pendingSmeal += 1
      if (p.delivery_stage === '6. Closed & Certified') {
        closedCount += 1
      } else if (p.smeal_approval_status === 'Approved') {
        activeDelivery += 1
      }

      if (dl.isOverdue) overdueCount += 1
      if (dl.isDueSoon) dueSoonCount += 1
      if (['At Risk', 'Delayed', 'Action Required (SMEAL)'].includes(p.health_status)) {
        atRiskCount += 1
      }

      return { ...p, _sbuCode: normalizeSbuCode(p.sbu), _dl: dl, _val: val }
    })

    const sbuSummary = CORE_SBUS.map((sbu) => {
      const items = enriched.filter((p) => p._sbuCode === sbu.code)
      return {
        ...sbu,
        total: items.length,
        pendingSmeal: items.filter((p) => p.smeal_approval_status !== 'Approved').length,
        onTrack: items.filter((p) => p.health_status === 'On Track').length,
        atRisk: items.filter((p) =>
          ['At Risk', 'Delayed', 'Action Required (SMEAL)'].includes(p.health_status)
        ).length,
        overdue: items.filter((p) => p._dl.isOverdue).length,
        closed: items.filter((p) => p.delivery_stage === '6. Closed & Certified').length,
        value: items.reduce((sum, p) => sum + p._val, 0),
      }
    })

    const trackSummary = TRACK_STAGES.map((stage) => {
      const items = enriched.filter((p) => p.delivery_stage === stage)
      return {
        stage,
        count: items.length,
        value: items.reduce((sum, p) => sum + p._val, 0),
      }
    })

    return {
      enriched,
      pendingSmeal,
      activeDelivery,
      closedCount,
      overdueCount,
      dueSoonCount,
      atRiskCount,
      totalValue,
      sbuSummary,
      trackSummary,
    }
  }, [scopedProjects])

  if (!isOpen) return null

  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
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
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          header, aside, nav, .no-print, button, select { display: none !important; }
          body * { visibility: hidden; }
          #printable-smeal-report, #printable-smeal-report * { visibility: visible; }
          #printable-smeal-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div
        id="printable-smeal-report"
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 1080,
          maxHeight: '94vh',
          overflowY: 'auto',
          padding: '24px 28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
          color: '#0f172a',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Action Bar (Hidden in PDF Print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
              📊 SMEAL Executive Project Delivery Status Report (PDF)
            </h3>
            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              Instant leadership snapshot: SBU counts, delivery tracks, overdue deadlines, and SMEAL approvals.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={reportSbuFilter}
              onChange={(e) => setReportSbuFilter(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                fontWeight: 700,
                background: '#fff',
              }}
            >
              <option value="ALL">All 4 SBUs (Group Report)</option>
              <option value="INST">INST Only</option>
              <option value="IIP">IIP Only</option>
              <option value="DAS">DAS Only</option>
              <option value="CBS">CBS Only</option>
            </select>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '8px 16px',
                borderRadius: 7,
                border: 'none',
                background: '#0f2942',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🖨️ Print / Save as PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 7,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Document Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '3px solid #0f2942',
            paddingBottom: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#0284c7', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              THE i-CAPITAL AFRICA GROUP — SMEAL GOVERNANCE DESK
            </div>
            <h1 style={{ margin: '2px 0 0 0', fontSize: 19, fontWeight: 900, color: '#0f2942' }}>
              Immediate Project Delivery &amp; Compliance Status Report
            </h1>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#475569' }}>
            <div><strong>Generated:</strong> {generatedAt}</div>
            <div><strong>Prepared By:</strong> {userProfile?.full_name || userProfile?.email || 'SMEAL Team'}</div>
            <div><strong>Scope:</strong> {reportSbuFilter === 'ALL' ? 'All 4 SBUs (INST, IIP, DAS, CBS)' : `${reportSbuFilter} SBU`}</div>
          </div>
        </div>

        {/* 1. Executive KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 18 }}>
          <div style={{ padding: 10, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b' }}>TOTAL PROJECTS</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{analytics.enriched.length}</div>
          </div>
          <div style={{ padding: 10, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#92400e' }}>PENDING SMEAL</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#b45309', marginTop: 2 }}>{analytics.pendingSmeal}</div>
          </div>
          <div style={{ padding: 10, background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#1d4ed8' }}>IN DELIVERY</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1d4ed8', marginTop: 2 }}>{analytics.activeDelivery}</div>
          </div>
          <div style={{ padding: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#991b1b' }}>DEADLINE PASSED</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626', marginTop: 2 }}>{analytics.overdueCount}</div>
          </div>
          <div style={{ padding: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#166534' }}>CLOSED / CERTIFIED</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#15803d', marginTop: 2 }}>{analytics.closedCount}</div>
          </div>
          <div style={{ padding: 10, background: '#f8fafc', border: '1px solid #0f2942', borderRadius: 8 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#0f2942' }}>PORTFOLIO VALUE</div>
            <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f2942', marginTop: 4 }}>{formatEtb(analytics.totalValue)}</div>
          </div>
        </div>

        {/* 2. Two-Column Matrix: SBU Breakdown + Delivery Track Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 14, marginBottom: 18 }}>
          {/* SBU Breakdown Table */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 900, color: '#0f2942', textTransform: 'uppercase', marginBottom: 6 }}>
              1. Projects by Strategic Business Unit (SBU)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>SBU</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center' }}>Total</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center' }}>Pending SMEAL</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center' }}>On Track</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center' }}>At Risk</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center' }}>Overdue</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Contract Value</th>
                </tr>
              </thead>
              <tbody>
                {analytics.sbuSummary.map((s) => (
                  <tr key={s.code} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 800 }}>{s.code}</td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 800 }}>{s.total}</td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', color: s.pendingSmeal > 0 ? '#b45309' : '#64748b', fontWeight: 700 }}>{s.pendingSmeal}</td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', color: '#15803d', fontWeight: 700 }}>{s.onTrack}</td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', color: s.atRisk > 0 ? '#c2410c' : '#64748b', fontWeight: 700 }}>{s.atRisk}</td>
                    <td style={{ padding: '6px 6px', textAlign: 'center', color: s.overdue > 0 ? '#dc2626' : '#64748b', fontWeight: 800 }}>{s.overdue}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{formatEtb(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Delivery Track Distribution */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 900, color: '#0f2942', textTransform: 'uppercase', marginBottom: 6 }}>
              2. Projects by Delivery Track / Stage
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Delivery Stage</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Projects</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Value (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.trackSummary.map((t) => (
                  <tr key={t.stage} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{t.stage}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>{t.count}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>{formatEtb(t.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Detailed Project Register with Deadline Status */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 900, color: '#0f2942', textTransform: 'uppercase', marginBottom: 6 }}>
            3. Detailed Project Status, Track &amp; Deadline Register ({analytics.enriched.length})
          </div>
          {analytics.enriched.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
              No signed projects registered in this scope yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '6px 7px', textAlign: 'left' }}>Code / SBU</th>
                  <th style={{ padding: '6px 7px', textAlign: 'left' }}>Client &amp; Mandate</th>
                  <th style={{ padding: '6px 7px', textAlign: 'left' }}>Delivery Lead</th>
                  <th style={{ padding: '6px 7px', textAlign: 'left' }}>Delivery Track</th>
                  <th style={{ padding: '6px 7px', textAlign: 'center' }}>SMEAL Status</th>
                  <th style={{ padding: '6px 7px', textAlign: 'center' }}>End Date / Deadline</th>
                  <th style={{ padding: '6px 7px', textAlign: 'right' }}>Value (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.enriched.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 7px', fontWeight: 800 }}>
                      <div style={{ color: '#0284c7' }}>{p.project_code}</div>
                      <div style={{ fontSize: 9.5, color: '#475569' }}>{p._sbuCode}</div>
                    </td>
                    <td style={{ padding: '6px 7px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.client_organization}</div>
                      <div style={{ color: '#475569' }}>{p.project_title}</div>
                    </td>
                    <td style={{ padding: '6px 7px' }}>{p.delivery_lead || 'Operations'}</td>
                    <td style={{ padding: '6px 7px', fontWeight: 700 }}>
                      {p.delivery_stage}
                      <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>Health: {p.health_status}</div>
                    </td>
                    <td style={{ padding: '6px 7px', textAlign: 'center', fontWeight: 800, color: p.smeal_approval_status === 'Approved' ? '#166534' : '#b45309' }}>
                      {p.smeal_approval_status}
                    </td>
                    <td style={{ padding: '6px 7px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{p.end_date || '—'}</div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 2,
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 9.5,
                          fontWeight: 800,
                          background: p._dl.bg,
                          color: p._dl.color,
                        }}
                      >
                        {p._dl.label}
                      </span>
                    </td>
                    <td style={{ padding: '6px 7px', textAlign: 'right', fontWeight: 800 }}>
                      {formatEtb(p._val)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 8,
            borderTop: '1px solid #cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#64748b',
          }}
        >
          <span>Confidential — The i-Capital Africa Group SMEAL Governance Desk</span>
          <span>Live Data Source: icapitalcrm.pro.et</span>
        </div>
      </div>
    </div>
  )
}