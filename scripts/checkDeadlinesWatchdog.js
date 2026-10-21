import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'ybeltalsemagn8899@gmail.com'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

async function runDeadlineWatchdog() {
  console.log('--- Scanning Pipeline for Approaching Deadlines (T-48 Hours) ---')

  // 1. Fetch active, unclosed opportunities with scheduled deadlines
  const { data: deals, error } = await supabase
    .from('opportunities')
    .select('*')
    .not('deadline', 'is', null)
    .not('stage', 'ilike', '%Won%')
    .not('stage', 'ilike', '%Delivery%')
    .not('stage', 'ilike', '%Lost%')
    .eq('alert_48h_sent', false)

  if (error) {
    console.error('Database query error:', error.message)
    process.exit(1)
  }

  const now = new Date()
  const urgentDeals = []

  for (const deal of deals) {
    const deadlineDate = new Date(deal.deadline)
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Flag deals that expire between 0 and 52 hours from now
    if (diffHours > 0 && diffHours <= 52) {
      urgentDeals.push({ ...deal, hoursLeft: Math.round(diffHours) })
    }
  }

  if (urgentDeals.length === 0) {
    console.log('✓ No opportunities expiring within the 48-hour window. Watchdog idle.')
    return
  }

  console.log(`⚠️ Found ${urgentDeals.length} urgent opportunities requiring intervention.`)

  // 2. Build Executive HTML Notification
  const dealRows = urgentDeals
    .map(
      (d) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 14px; font-weight: 800; color: #0284c7;">${d.code || 'DEAL'}</td>
        <td style="padding: 12px 14px; font-weight: 700; color: #0f172a;">${d.client || d.client_name}</td>
        <td style="padding: 12px 14px; color: #475569;">${d.sbu}</td>
        <td style="padding: 12px 14px; color: #475569;">${d.title || d.product}</td>
        <td style="padding: 12px 14px; font-weight: 800; color: #166534;">ETB ${new Intl.NumberFormat('en-US').format(d.deal_value || 0)}</td>
        <td style="padding: 12px 14px; font-weight: 800; color: #dc2626;">${d.deadline} (${d.hoursLeft}h left)</td>
        <td style="padding: 12px 14px; font-size: 11px; color: #64748b;">${d.stage}</td>
      </tr>
    `
    )
    .join('')

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px;">
      <div style="max-width: 780px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        
        <div style="background: linear-gradient(135deg, #070d1e 0%, #0f172a 100%); padding: 20px 24px; color: #ffffff;">
          <div style="display: inline-block; background: #dc2626; color: #fff; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">
            T-Minus 48h Watchdog Threat Alert
          </div>
          <h2 style="margin: 8px 0 2px 0; font-size: 20px; font-weight: 900;">The i-Capital Commercial Pipeline</h2>
          <div style="font-size: 12px; color: #94a3b8;">Automated Submission Cutoff Monitor</div>
        </div>

        <div style="padding: 24px;">
          <p style="font-size: 13px; color: #334155; line-height: 1.5; margin: 0 0 16px 0;">
            The following formal proposals have submission deadlines expiring in <strong>less than 48 hours</strong>. Please verify technical proposal envelopes, bidding compliance documents, and final delivery logistics immediately:
          </p>

          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; color: #475569; font-weight: 800;">
                <th style="padding: 10px 14px;">CODE</th>
                <th style="padding: 10px 14px;">CLIENT</th>
                <th style="padding: 10px 14px;">SBU</th>
                <th style="padding: 10px 14px;">SCOPE</th>
                <th style="padding: 10px 14px;">VALUE</th>
                <th style="padding: 10px 14px;">CUTOFF</th>
                <th style="padding: 10px 14px;">STAGE</th>
              </tr>
            </thead>
            <tbody>
              ${dealRows}
            </tbody>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://icapitalcrm.pro.et" style="display: inline-block; background: #0284c7; color: #ffffff; padding: 10px 22px; border-radius: 8px; font-size: 12px; font-weight: 800; text-decoration: none;">
              Open Commercial Workbench & Kanban →
            </a>
          </div>
        </div>

        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 24px; font-size: 11px; color: #94a3b8; text-align: center;">
          The i-Capital Africa Group • Commercial Revenue Operations • Addis Ababa, Ethiopia
        </div>
      </div>
    </div>
  `

  // 3. Dispatch Email
  if (resend) {
    try {
      await resend.emails.send({
        from: 'The i-Capital CRM <onboarding@resend.dev>', // Replace with your domain once verified
        to: [NOTIFICATION_EMAIL],
        subject: `⚠️ URGENT: ${urgentDeals.length} Proposals Due in ≤ 48 Hours | The i-Capital CRM`,
        html: emailHtml,
      })
      console.log(`✓ Email notification successfully dispatched to ${NOTIFICATION_EMAIL}.`)

      // Mark deals as alerted in Supabase
      const alertedIds = urgentDeals.map((d) => d.id)
      await supabase.from('opportunities').update({ alert_48h_sent: true }).in('id', alertedIds)
      console.log('✓ Database flags updated (alert_48h_sent = true).')
    } catch (sendErr) {
      console.error('Failed to dispatch email via Resend:', sendErr)
    }
  } else {
    console.log('⚠️ RESEND_API_KEY not defined in environment. HTML generated but not emailed.')
  }
}

runDeadlineWatchdog()