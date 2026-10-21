import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const envLocalPath = path.join(rootDir, '.env.local')
const envPath = path.join(rootDir, '.env')

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  dotenv.config()
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'ybeltalsemagn8899@gmail.com'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

async function runDeadlineWatchdog() {
  console.log('--- 🕒 Scanning Pipeline for Approaching Deadlines (T-48 Hours) ---')

  const { data: deals, error } = await supabase
    .from('opportunities')
    .select('*')
    .not('stage', 'ilike', '%Won%')
    .not('stage', 'ilike', '%Delivery%')
    .not('stage', 'ilike', '%Lost%')

  if (error) {
    console.error('❌ Supabase query error:', error.message)
    process.exit(1)
  }

  const now = new Date()
  const urgentDeals = []

  for (const deal of deals || []) {
    // Check deadline column or common aliases
    const targetDateStr = deal.deadline || deal.submission_deadline || deal.due_date || deal.closing_date
    if (!targetDateStr) continue
    if (deal.alert_48h_sent === true) continue

    const deadlineDate = new Date(targetDateStr)
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Alert for opportunities expiring within the next 52 hours
    if (diffHours > 0 && diffHours <= 52) {
      urgentDeals.push({
        ...deal,
        effectiveDeadline: targetDateStr,
        hoursLeft: Math.round(diffHours),
      })
    }
  }

  if (urgentDeals.length === 0) {
    console.log('✓ No proposals expiring within the 48-hour window. Watchdog cycle completed successfully.')
    return
  }

  console.log(`⚠️ Detected ${urgentDeals.length} urgent proposal(s) requiring immediate intervention.`)

  const dealRows = urgentDeals
    .map(
      (d) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 14px; font-weight: 800; color: #0284c7;">${d.code || 'DEAL'}</td>
        <td style="padding: 12px 14px; font-weight: 700; color: #0f172a;">${d.client || d.client_name || 'Institutional Target'}</td>
        <td style="padding: 12px 14px; color: #475569;">${d.sbu || 'INST'}</td>
        <td style="padding: 12px 14px; color: #475569;">${d.title || d.product || 'Advisory Program'}</td>
        <td style="padding: 12px 14px; font-weight: 800; color: #166534;">ETB ${new Intl.NumberFormat('en-US').format(d.deal_value || 0)}</td>
        <td style="padding: 12px 14px; font-weight: 800; color: #dc2626;">${d.effectiveDeadline} (${d.hoursLeft}h left)</td>
        <td style="padding: 12px 14px; font-size: 11px; color: #64748b;">${d.stage || 'In Scope'}</td>
      </tr>
    `
    )
    .join('')

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px;">
      <div style="max-width: 820px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        
        <div style="background: linear-gradient(135deg, #070d1e 0%, #0f172a 100%); padding: 22px 26px; color: #ffffff;">
          <div style="display: inline-block; background: #dc2626; color: #fff; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">
            ● T-Minus 48h Watchdog Alert
          </div>
          <h2 style="margin: 8px 0 2px 0; font-size: 20px; font-weight: 900;">The i-Capital Commercial Pipeline</h2>
          <div style="font-size: 12px; color: #94a3b8;">Automated Submission Cutoff Monitor</div>
        </div>

        <div style="padding: 24px;">
          <p style="font-size: 13px; color: #334155; line-height: 1.5; margin: 0 0 16px 0;">
            The following formal proposals have submission deadlines expiring in <strong>less than 48 hours</strong>. Please verify technical envelopes, commercial fee approvals, and compliance documentation immediately:
          </p>

          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f1f5f9; color: #475569; font-weight: 800;">
                <th style="padding: 10px 14px;">CODE</th>
                <th style="padding: 10px 14px;">CLIENT</th>
                <th style="padding: 10px 14px;">SBU</th>
                <th style="padding: 10px 14px;">SCOPE</th>
                <th style="padding: 10px 14px;">VALUE</th>
                <th style="padding: 10px 14px;">DEADLINE</th>
                <th style="padding: 10px 14px;">CURRENT STAGE</th>
              </tr>
            </thead>
            <tbody>
              ${dealRows}
            </tbody>
          </table>

          <div style="text-align: center; margin-top: 20px;">
            <a href="https://icapitalcrm.pro.et" style="display: inline-block; background: #0284c7; color: #ffffff; padding: 10px 24px; border-radius: 8px; font-size: 12px; font-weight: 800; text-decoration: none;">
              Open Commercial Workbench & Kanban →
            </a>
          </div>
        </div>

        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; font-size: 11px; color: #94a3b8; text-align: center;">
          The i-Capital Africa Group • Commercial Governance & Revenue Operations • Addis Ababa, Ethiopia
        </div>
      </div>
    </div>
  `

  if (resend) {
    try {
      const emailResult = await resend.emails.send({
        from: 'The i-Capital CRM <onboarding@resend.dev>',
        to: [NOTIFICATION_EMAIL],
        subject: `⚠️ URGENT: ${urgentDeals.length} Proposal(s) Expiring in ≤ 48 Hours | The i-Capital CRM`,
        html: emailHtml,
      })

      console.log(`✓ Email notification dispatched successfully. ID: ${emailResult.data?.id || 'OK'}`)

      const alertedIds = urgentDeals.map((d) => d.id)
      await supabase.from('opportunities').update({ alert_48h_sent: true }).in('id', alertedIds)
      console.log(`✓ Marked ${alertedIds.length} opportunity record(s) as alert_48h_sent = true.`)
    } catch (err) {
      console.error('❌ Failed to dispatch email via Resend:', err)
    }
  } else {
    console.log('⚠️ RESEND_API_KEY not defined in environment. HTML generated but email dispatch skipped.')
  }
}

runDeadlineWatchdog()