import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const BREVO_API_KEY = process.env.BREVO_API_KEY
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'ybeltalsemagn8899@gmail.com'

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

function formatMoney(amount) {
  if (!amount || isNaN(amount)) return 'ETB 0.00'
  return `ETB ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function parseOwner(notes) {
  if (!notes) return 'Commercial Team'
  const match = notes.match(/\[OWNER:\s*([^\]]+)\]/)
  return match ? match[1].trim() : 'Commercial Team'
}

function parseGates(notes) {
  if (!notes) return []
  const match = notes.match(/\[GATES:([^\]]*)\]/)
  return match ? match[1].split(',').map((s) => s.trim()).filter(Boolean) : []
}

async function runDailyBriefing() {
  console.log('🚀 Starting i-Capital Morning CRM Briefing...')

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const { data: proposals, error: propErr } = await supabase
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
    .order('created_at', { ascending: false })

  if (propErr) {
    console.error('❌ Failed to fetch proposals:', propErr)
    process.exit(1)
  }

  // Segregate Leads vs Formal Proposals
  const leadDeals = (proposals || []).filter((p) => p.status === 'Initiated')
  const formalDeals = (proposals || []).filter((p) => p.status !== 'Initiated')

  const openFormalDeals = formalDeals.filter((p) => !['Won', 'Lost', 'Cancelled'].includes(p.status))
  const wonDeals = formalDeals.filter((p) => p.status === 'Won')
  const lostDeals = formalDeals.filter((p) => p.status === 'Lost')

  const speculativeLeadValue = leadDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
  const activeTenderValue = openFormalDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
  const wonValue = wonDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)

  const weightedForecast = openFormalDeals.reduce((sum, p) => {
    const val = Number(p.deal_value_etb) || 0
    const prob = STAGE_WEIGHTS[p.status] ?? 0.30
    return sum + (val * prob)
  }, 0)

  const decidedCount = wonDeals.length + lostDeals.length
  const winRate = decidedCount > 0 ? Math.round((wonDeals.length / decidedCount) * 100) : null

  const now = new Date()
  const urgentProposals = openFormalDeals.filter((p) => {
    if (!p.submission_deadline) return false
    const diffDays = Math.ceil((new Date(p.submission_deadline) - now) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 5
  })

  const todayStr = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px 12px; }
    .card { background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 24px; max-width: 680px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.03); }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .grid { display: table; width: 100%; table-layout: fixed; margin-bottom: 22px; }
    .col { display: table-cell; padding: 10px; border-radius: 8px; vertical-align: top; }
    .pill { font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px; text-transform: uppercase; display: inline-block; margin-bottom: 4px; }
    .metric-val { font-size: 16px; font-weight: 800; margin: 4px 0 2px 0; }
    .metric-sub { font-size: 11px; color: #64748b; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin: 20px 0 10px 0; border-left: 3px solid #0284c7; padding-left: 8px; }
    .deal-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 8px; }
    .cta-btn { display: inline-block; background: #0284c7; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 11px 22px; border-radius: 6px; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">The i-Capital Africa Institute</h1>
      <div class="subtitle">Two-Tier Commercial Intelligence Briefing • <strong>${todayStr}</strong></div>
    </div>

    <!-- 4-PILLAR REVENUE SNAPSHOT -->
    <div class="grid">
      <div class="col" style="background: #f0f9ff; border: 1px solid #bae6fd; margin-right: 6px;">
        <span class="pill" style="background: #e0f2fe; color: #0369a1;">Pre-Tender Leads</span>
        <div class="metric-val" style="color: #0369a1;">${formatMoney(speculativeLeadValue)}</div>
        <div class="metric-sub">${leadDeals.length} in Qualification</div>
      </div>
      <div class="col" style="background: #fffbeb; border: 1px solid #fde68a; margin-right: 6px;">
        <span class="pill" style="background: #fef3c7; color: #92400e;">Active Tenders</span>
        <div class="metric-val" style="color: #78350f;">${formatMoney(activeTenderValue)}</div>
        <div class="metric-sub">${openFormalDeals.length} Bids in Pursuit</div>
      </div>
      <div class="col" style="background: #f0fdf4; border: 1px solid #bbf7d0; margin-right: 6px;">
        <span class="pill" style="background: #dcfce7; color: #166534;">Weighted Realization</span>
        <div class="metric-val" style="color: #166534;">${formatMoney(weightedForecast)}</div>
        <div class="metric-sub">Risk-Adjusted Expected</div>
      </div>
      <div class="col" style="background: #faf5ff; border: 1px solid #e9d5ff;">
        <span class="pill" style="background: #f3e8ff; color: #6b21a8;">Contracted Won</span>
        <div class="metric-val" style="color: #6b21a8;">${formatMoney(wonValue)}</div>
        <div class="metric-sub">${wonDeals.length} Won Deals</div>
      </div>
    </div>

    <!-- URGENT SUBMISSION WATCHLIST -->
    ${urgentProposals.length > 0 ? `
    <div class="section-title" style="border-left-color: #dc2626; color: #991b1b;">
      🚨 Urgent Submission Watchlist (&lt; 5 Days)
    </div>
    ${urgentProposals.map((p) => `
      <div class="deal-item" style="border-color: #fecaca; background: #fff5f5;">
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: #0f172a; font-size: 13px;">${p.opportunities?.clients?.name || 'Client'} — ${p.title}</strong>
          <span style="font-weight: 800; color: #b91c1c; font-size: 12px;">Due: ${p.submission_deadline}</span>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          SBU: ${p.opportunities?.sbus?.name || 'SBU'} • Value: <strong>${formatMoney(p.deal_value_etb)}</strong> • Owner: ${parseOwner(p.notes)}
        </div>
      </div>
    `).join('')}
    ` : ''}

    <!-- ACTIVE FORMAL PROPOSALS IN PURSUIT -->
    <div class="section-title">
      📄 Active Formal Proposal Pursuits (${openFormalDeals.length})
    </div>
    ${openFormalDeals.slice(0, 6).map((p) => {
      const gates = parseGates(p.notes)
      return `
      <div class="deal-item">
        <div style="display: flex; justify-content: space-between;">
          <strong style="font-size: 13px; color: #0f172a;">${p.opportunities?.clients?.name \vert{}\vert{} 'Client'} — ${p.title}</strong>
          <span style="font-weight: 700; color: #0284c7; font-size: 12px;">${formatMoney(p.deal_value_etb)}</span>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          Stage: <strong style="color: #0f172a;">${p.status}</strong> • SBU: ${p.opportunities?.sbus?.name \vert{}\vert{} 'SBU'} • Owner: <strong>${parseOwner(p.notes)}</strong> • Gates Cleared: ${gates.length}
        </div>
      </div>
      `
    }).join('')}

    <!-- PRE-TENDER LEADS IN INTAKE -->
    <div class="section-title" style="border-left-color: #0284c7;">
      🎯 Pre-Tender Leads in Qualification (${leadDeals.length})
    </div>
    ${leadDeals.map((p) => `
      <div class="deal-item" style="background: #f8fafc;">
        <div style="display: flex; justify-content: space-between;">
          <strong style="font-size: 13px; color: #0f172a;">${p.opportunities?.clients?.name \vert{}\vert{} 'Client'} — ${p.title}</strong>
          <span style="font-weight: 700; color: #0369a1; font-size: 12px;">${formatMoney(p.deal_value_etb)}</span>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          SBU: ${p.opportunities?.sbus?.name || 'SBU'} • Lead Intake • Owner: <strong>${parseOwner(p.notes)}</strong>
        </div>
      </div>
    `).join('')}

    <!-- PERFORMANCE STATS -->
    <div style="border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 14px; font-size: 11px; color: #64748b;">
      <strong>Conversion Record:</strong> True Proposal Win Rate: <strong>${winRate != null ? winRate + '%' : 'N/A'}</strong> (${decidedCount} decided) • Total Opportunities: ${proposals.length}
    </div>

    <!-- CTA BUTTON -->
    <div style="text-align: center;">
      <a href="https://icapitalcrm.pro.et" class="cta-btn">
        🚀 Open Live i-Capital CRM Hub
      </a>
    </div>
  </div>
</body>
</html>
`

  if (RESEND_API_KEY) {
    console.log('📬 Sending email via Resend...')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'i-Capital CRM <onboarding@resend.dev>',
        to: [NOTIFICATION_EMAIL],
        subject: `The i-Capital CRM Daily Brief: ${todayStr}`,
        html: htmlContent,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('❌ Resend Error:', errText)
    } else {
      console.log('✅ Daily brief successfully delivered via Resend!')
    }
  } else if (BREVO_API_KEY) {
    console.log('📬 Sending email via Brevo...')
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'i-Capital CRM', email: 'notifications@icapital.et' },
        to: [{ email: NOTIFICATION_EMAIL }],
        subject: `The i-Capital CRM Daily Brief: ${todayStr}`,
        htmlContent: htmlContent,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('❌ Brevo Error:', errText)
    } else {
      console.log('✅ Daily brief successfully delivered via Brevo!')
    }
  } else {
    console.log('⚠️ Neither RESEND_API_KEY nor BREVO_API_KEY was provided.')
  }
}

runDailyBriefing()