import { createClient } from '@supabase/supabase-js'

// 1. Supabase Connection (uses environment variables or project defaults)
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://qljmgleaxfmrurrpmjkz.supabase.co'

const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_Jv9c27B9Am_d7NkKf46WRw_RkB30hvU'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Recipient email (can be customized via environment variable)
const RECIPIENT_EMAIL =
  process.env.BRIEF_RECIPIENT_EMAIL || 'ybeltalsemagn8899@gmail.com'

const CRM_URL =
  process.env.CRM_URL || 'https://icapitalcrm.pro.et'

const STAGE_WEIGHTS = {
  'Initiated': 0.10,
  'In Progress': 0.30,
  'Submitted': 0.50,
  'Under Review': 0.60,
  'Shortlisted': 0.75,
  'Negotiation': 0.90,
  'Won': 1.00,
  'On Hold': 0.20,
}

function formatMoney(amount) {
  if (!amount || isNaN(amount)) return 'ETB 0.00'
  return `ETB ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function parseOwner(notes) {
  if (!notes) return 'Unassigned'
  const match = notes.match(/\[OWNER:\s*([^\]]+)\]/)
  return match ? match[1].trim() : 'Unassigned'
}

async function runDailyBrief() {
  console.log('🚀 Starting The i-Capital CRM Daily Morning Briefing Generator...')

  // Fetch all proposals
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select(`
      id,
      proposal_code,
      title,
      status,
      deal_value_etb,
      submission_deadline,
      follow_up_required,
      notes,
      opportunities (
        sbus (name),
        clients (name, sector)
      )
    `)
    .order('submission_deadline', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('❌ Supabase query failed:', error)
    process.exit(1)
  }

  // Current Nairobi / Addis Ababa Date (UTC+3)
  const now = new Date()
  const eatFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayStr = eatFormatter.format(now) // YYYY-MM-DD
  const todayDate = new Date(`${todayStr}T00:00:00`)

  console.log(`📅 Current Reporting Date (Nairobi/Addis Ababa EAT): ${todayStr}`)

  const activeProposals = proposals.filter((p) => !['Won', 'Lost', 'Cancelled'].includes(p.status))
  const wonProposals = proposals.filter((p) => p.status === 'Won')

  const totalOpenValue = activeProposals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
  const totalWeightedForecast = activeProposals.reduce((sum, p) => {
    const val = Number(p.deal_value_etb) || 0
    const prob = STAGE_WEIGHTS[p.status] ?? 0.20
    return sum + (val * prob)
  }, 0)

  // Categorize action items by SLA deadline
  const overdueDeals = []
  const dueTodayDeals = []
  const upcomingDeals = []
  const undatedDeals = []

  activeProposals.forEach((deal) => {
    if (!deal.submission_deadline) {
      undatedDeals.push(deal)
      return
    }

    const targetDate = new Date(`${deal.submission_deadline.slice(0, 10)}T00:00:00`)
    const diffTime = targetDate.getTime() - todayDate.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      overdueDeals.push({ ...deal, diffDays: Math.abs(diffDays) })
    } else if (diffDays === 0) {
      dueTodayDeals.push(deal)
    } else if (diffDays <= 7) {
      upcomingDeals.push({ ...deal, diffDays })
    }
  })

  console.log(`📊 Metrics: ${overdueDeals.length} Overdue, ${dueTodayDeals.length} Due Today, ${upcomingDeals.length} Upcoming in 7d`)

  // Build Executive HTML Email
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>The i-Capital CRM Morning Briefing</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 660px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.03);">
    
    <!-- Corporate Header -->
    <div style="background: #0f172a; padding: 26px 30px; color: #ffffff;">
      <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #38bdf8; font-weight: 700; margin-bottom: 4px;">
        The i-Capital Africa Institute
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.2px;">
        Daily Pipeline & SLA Morning Briefing
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">
        Reporting Date: ${todayStr} • 08:00 AM Nairobi/Addis Ababa (UTC+3)
      </p>
    </div>

    <div style="padding: 26px 30px;">
      
      <!-- Executive Snapshot Cards -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="width: 25%; padding: 12px; background: #fee2e2; border-radius: 8px 0 0 8px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Overdue</div>
            <div style="font-size: 24px; font-weight: 800; color: #b91c1c; margin-top: 4px;">${overdueDeals.length}</div>
          </td>
          <td style="width: 25%; padding: 12px; background: #fef3c7; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase;">Due Today</div>
            <div style="font-size: 24px; font-weight: 800; color: #92400e; margin-top: 4px;">${dueTodayDeals.length}</div>
          </td>
          <td style="width: 25%; padding: 12px; background: #e0f2fe; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase;">Next 7 Days</div>
            <div style="font-size: 24px; font-weight: 800; color: #0369a1; margin-top: 4px;">${upcomingDeals.length}</div>
          </td>
          <td style="width: 25%; padding: 12px; background: #f1f5f9; border-radius: 0 8px 8px 0; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Active Deals</div>
            <div style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px;">${activeProposals.length}</div>
          </td>
        </tr>
      </table>

      <!-- Revenue Forecast Bar -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 26px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b;">Nominal Open Pipeline: <strong style="color: #0f172a;">${formatMoney(totalOpenValue)}</strong></td>
            <td style="text-align: right; color: #64748b;">Weighted Forecast: <strong style="color: #16a34a;">${formatMoney(totalWeightedForecast)}</strong></td>
          </tr>
        </table>
      </div>

      <!-- Section 1: Due Today -->
      <h3 style="margin: 22px 0 10px 0; font-size: 14px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
        🟡 Action Items Due Today (${dueTodayDeals.length})
      </h3>
      ${
        dueTodayDeals.length === 0
          ? '<p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0;">🎉 No proposal deadlines or scheduled client follow-ups due today.</p>'
          : `<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
              ${dueTodayDeals
                .map(
                  (d) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0;">
                    <strong style="color: #0f172a;">${d.opportunities?.clients?.name || 'Client'}</strong>
                    <div style="color: #475569; font-size: 12px;">${d.title} (${d.proposal_code})</div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Owner: ${parseOwner(d.notes)} • SBU: ${d.opportunities?.sbus?.name || 'Institute'}</div>
                  </td>
                  <td style="padding: 10px 0; text-align: right; white-space: nowrap;">
                    <strong style="color: #0f172a;">${formatMoney(d.deal_value_etb)}</strong>
                    <div style="font-size: 11px; color: #92400e; font-weight: 700;">DUE TODAY</div>
                  </td>
                </tr>`
                )
                .join('')}
            </table>`
      }

      <!-- Section 2: Overdue Follow-ups -->
      <h3 style="margin: 22px 0 10px 0; font-size: 14px; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px;">
        🔴 Overdue SLA Items (${overdueDeals.length})
      </h3>
      ${
        overdueDeals.length === 0
          ? '<p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0;">✓ Zero overdue items. SLA standards are fully up to date!</p>'
          : `<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
              ${overdueDeals
                .slice(0, 5)
                .map(
                  (d) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0;">
                    <strong style="color: #0f172a;">${d.opportunities?.clients?.name || 'Client'}</strong>
                    <div style="color: #475569; font-size: 12px;">${d.title} (${d.proposal_code})</div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Owner: ${parseOwner(d.notes)} • Stage: ${d.status}</div>
                  </td>
                  <td style="padding: 10px 0; text-align: right; white-space: nowrap;">
                    <strong style="color: #0f172a;">${formatMoney(d.deal_value_etb)}</strong>
                    <div style="font-size: 11px; color: #b91c1c; font-weight: 700;">${d.diffDays}d overdue</div>
                  </td>
                </tr>`
                )
                .join('')}
            </table>
            ${overdueDeals.length > 5 ? `<p style="font-size: 12px; color: #64748b; margin: -10px 0 16px 0;">+ ${overdueDeals.length - 5} additional overdue items in CRM queue</p>` : ''}`
      }

      <!-- Section 3: Upcoming Deadlines (Next 7 Days) -->
      <h3 style="margin: 22px 0 10px 0; font-size: 14px; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">
        🟢 RFP & Proposal Deadlines in Next 7 Days (${upcomingDeals.length})
      </h3>
      ${
        upcomingDeals.length === 0
          ? '<p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0;">No formal RFP deadlines approaching in the next 7 days.</p>'
          : `<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
              ${upcomingDeals
                .map(
                  (d) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0;">
                    <strong style="color: #0f172a;">${d.opportunities?.clients?.name || 'Client'}</strong>
                    <div style="color: #475569; font-size: 12px;">${d.title} (${d.proposal_code})</div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Target Date: ${d.submission_deadline?.slice(0, 10)} • Owner: ${parseOwner(d.notes)}</div>
                  </td>
                  <td style="padding: 10px 0; text-align: right; white-space: nowrap;">
                    <strong style="color: #0f172a;">${formatMoney(d.deal_value_etb)}</strong>
                    <div style="font-size: 11px; color: #0369a1; font-weight: 700;">In ${d.diffDays} day(s)</div>
                  </td>
                </tr>`
                )
                .join('')}
            </table>`
      }

      <!-- Direct Jump Button to Official Custom Domain -->
      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${CRM_URL}" style="background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 13px; display: inline-block;">
          🚀 Open The i-Capital CRM Hub
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 30px; font-size: 11px; color: #94a3b8; text-align: center;">
      The i-Capital Africa Institute • Bole, Addis Ababa, Ethiopia • Automated CRM Governance Agent
    </div>

  </div>
</body>
</html>
  `

  // Send the email via Resend or Brevo
  const subject = `The i-Capital CRM Daily Brief [${todayStr}]: ${dueTodayDeals.length} Due Today, ${overdueDeals.length} Overdue`

  if (process.env.RESEND_API_KEY) {
    console.log('📨 Sending via Resend API...')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.SENDER_EMAIL || 'The i-Capital CRM <onboarding@resend.dev>',
        to: [RECIPIENT_EMAIL],
        subject: subject,
        html: htmlContent,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Resend API error: ${errText}`)
    }
    console.log(`✅ Daily brief successfully delivered to ${RECIPIENT_EMAIL} via Resend!`)
  } else if (process.env.BREVO_API_KEY) {
    console.log('📨 Sending via Brevo API...')
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: 'The i-Capital CRM',
          email: process.env.SENDER_EMAIL || RECIPIENT_EMAIL,
        },
        to: [{ email: RECIPIENT_EMAIL }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Brevo API error: ${errText}`)
    }
    console.log(`✅ Daily brief successfully delivered to ${RECIPIENT_EMAIL} via Brevo!`)
  } else {
    console.log('⚠️ Neither RESEND_API_KEY nor BREVO_API_KEY was provided.')
    console.log('Generated Subject:', subject)
    console.log('HTML Output Length:', htmlContent.length)
  }
}

runDailyBrief().catch((err) => {
  console.error('Fatal error running briefing:', err)
  process.exit(1)
})