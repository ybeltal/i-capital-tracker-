import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Keep the proposal stages in their workflow order.
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

export default function SummaryDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError('')
      try {
        const { data: summary, error: requestError } =
          await supabase.rpc('get_dashboard_summary')

        if (requestError) throw requestError
        if (!summary) throw new Error('No dashboard data was returned.')

        if (!cancelled) {
          setData(summary)
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

  async function handleExportCSV() {
    if (!data) return
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const csvRows = []

      // Section 1: Executive KPI Summary
      csvRows.push('THE i-CAPITAL AFRICA INSTITUTE — EXECUTIVE PIPELINE SUMMARY')
      csvRows.push(`Export Date,${today}`)
      csvRows.push(`As of (Nairobi Time),${new Date(data.as_of).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}`)
      csvRows.push('')

      csvRows.push('EXECUTIVE METRIC,VALUE')
      csvRows.push(`Clients,"${data.clients_total ?? 0}"`)
      csvRows.push(`Leads,"${data.leads_total ?? 0}"`)
      csvRows.push(`Total Proposals,"${data.proposals_total ?? 0}"`)
      csvRows.push(`Open Proposals,"${data.proposals_open ?? 0}"`)
      csvRows.push(`Won Proposals,"${data.proposals_won ?? 0}"`)
      csvRows.push(`Lost Proposals,"${data.proposals_lost ?? 0}"`)
      csvRows.push(`Open Proposal Value (ETB),"${data.open_value_etb ?? 0}"`)
      csvRows.push(`Won Proposal Value (ETB),"${data.won_value_etb ?? 0}"`)
      csvRows.push(`Win Rate,"${data.win_rate_pct !== null ? data.win_rate_pct + '%' : 'N/A'}"`)
      csvRows.push(`Pending Actions,"${data.pending_actions ?? 0}"`)
      csvRows.push(`Overdue Actions,"${data.overdue_actions ?? 0}"`)
      csvRows.push(`Due Today,"${data.due_today_actions ?? 0}"`)
      csvRows.push(`Upcoming Actions,"${data.upcoming_actions ?? 0}"`)
      csvRows.push(`Actions Needing Date,"${data.undated_actions ?? 0}"`)
      csvRows.push('')

      // Section 2: Stage Distribution Breakdown
      csvRows.push('PROPOSALS BY STATUS,NUMBER OF PROPOSALS')
      proposalStatuses.forEach((status) => {
        const row = data.proposal_statuses?.find((item) => item.status === status)
        csvRows.push(`"${status}","${row?.count ?? 0}"`)
      })
      csvRows.push('')

      // Section 3: Live Pipeline Proposals Detail
      const { data: proposalsList } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false })

      if (proposalsList && proposalsList.length > 0) {
        csvRows.push('DETAILED PIPELINE PROPOSALS')
        const keys = Object.keys(proposalsList[0])
        csvRows.push(keys.map((k) => `"${k}"`).join(','))

        proposalsList.forEach((item) => {
          const rowVals = keys.map((k) => {
            const val = item[k]
            if (val === null || val === undefined) return '""'
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
            return `"${str.replace(/"/g, '""')}"`
          })
          csvRows.push(rowVals.join(','))
        })
      }

      downloadCSV(`iCapital_Pipeline_Report_${today}.csv`, csvRows)
    } catch (err) {
      alert('Could not generate CSV export: ' + (err.message || err))
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
        ['Open proposal value', formatMoney(data.open_value_etb), null],
        ['Won proposal value', formatMoney(data.won_value_etb), null],
        [
          'Win rate',
          data.win_rate_pct === null
            ? 'No decided proposals'
            : `${data.win_rate_pct}%`,
          null,
        ],
        ['Pending actions', formatNumber(data.pending_actions), '#follow-up-queue'],
        ['Overdue actions', formatNumber(data.overdue_actions), '#follow-up-queue'],
        ['Due today', formatNumber(data.due_today_actions), '#follow-up-queue'],
        ['Upcoming actions', formatNumber(data.upcoming_actions), '#follow-up-queue'],
        ['Actions needing a date', formatNumber(data.undated_actions), '#follow-up-queue'],
      ]
    : []

  return (
    <section
      aria-label="Summary Dashboard"
      style={{
        marginBottom: 32,
        paddingBottom: 24,
        borderBottom: '1px solid #dbe2ea',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0, color: '#0f172a' }}>Summary Dashboard</h2>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            disabled={loading || exporting}
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading || exporting ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {exporting ? 'Generating…' : '📥 Export to Excel / CSV'}
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
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {loading ? 'Loading…' : 'Refresh dashboard'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: '#b91c1c', marginTop: 12 }}>
          {error}
        </p>
      )}

      {loading && <p role="status">Loading dashboard totals…</p>}

      {!loading && !error && data && (
        <>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
            Totals across all records. Follow-up dates use Nairobi time (UTC+3).
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 14,
              marginTop: 16,
            }}
          >
            {cards.map(([label, value, href]) => (
              <div
                key={label}
                style={{
                  padding: 18,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    color: '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#0f172a',
                    overflowWrap: 'anywhere',
                  }}
                >
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

          <div
            style={{
              marginTop: 24,
              padding: 12,
              background: '#f1f5f9',
              borderRadius: 8,
              fontSize: 13,
              color: '#475569',
            }}
          >
            Open proposals include On Hold and exclude Won, Lost and Cancelled. Win rate is Won ÷ (Won + Lost). Won proposal value represents contracted deal value.
          </div>

          {data.open_missing_value > 0 && (
            <p style={{ color: '#b45309', fontSize: 13, marginTop: 8 }}>
              ⚠️ {formatNumber(data.open_missing_value)} open proposal(s) have no value entered.
            </p>
          )}

          <h3 style={{ marginTop: 28, marginBottom: 12 }}>Proposals by Status</h3>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>Status</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>Number of proposals</th>
                </tr>
              </thead>
              <tbody>
                {proposalStatuses.map((status) => {
                  const row = data.proposal_statuses.find((item) => item.status === status)
                  return (
                    <tr key={status} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{status}</td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {formatNumber(row?.count ?? 0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 14 }}>
            Last refreshed: {new Date(data.as_of).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}
          </p>
        </>
      )}
    </section>
  )
}