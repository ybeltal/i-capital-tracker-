// Official 6-Stage Progression Framework (FY 2026/27 Playbook)
export const PIPELINE_STAGES = [
  {
    id: 'Target',
    label: '1. Potential Target',
    description: 'Named account with preliminary product fit',
    color: '#64748b',
  },
  {
    id: 'Lead',
    label: '2. Lead',
    description: 'Reason to engage + assigned BD owner + first action',
    color: '#0284c7',
  },
  {
    id: 'Pre-Qualified',
    label: '3. Pre-Qualified Opportunity',
    description: 'Discovery completed; budget, timing & decision path tested',
    color: '#f59e0b',
  },
  {
    id: 'Qualified Pipeline',
    label: '4. Qualified Pipeline',
    description: 'Formal technical & financial proposal submitted',
    color: '#8b5cf6',
  },
  {
    id: 'Won',
    label: '5. Conversion (Won / Signed)',
    description: 'Contract signed, awarded, or formally accepted',
    color: '#10b981',
  },
  {
    id: 'Delivery & Repeat',
    label: '6. Delivery & Repeat Business',
    description: 'Delivery in progress; repeat/cross-sell plan initiated',
    color: '#059669',
  },
  {
    id: 'Lost',
    label: 'Closed / Lost',
    description: 'Declined, cancelled, or deprioritized',
    color: '#ef4444',
  },
]

// Mandatory Loss Reasons for Stage = Lost
export const LOSS_REASONS = [
  'Price / Budget Mismatch',
  'Competitor Awarded (Technical Score)',
  'Competitor Awarded (Lower Financial Offer)',
  'Client Internal Deprioritization / Cancelled Bid',
  'Procurement Compliance Disqualification',
  'Timeline / Delivery Window Mismatch',
  'Other / Replaced by Direct Sole Source',
]

// Two-Tier Origination Channels (Playbook §9 Opportunity Types)
export const OPPORTUNITY_CHANNELS = [
  { id: 'DIRECT', label: 'Direct Client Outreach / Relationship', tier: 'Pre-Tender' },
  { id: 'TENDER', label: 'Competitive Open Bid / Tender Portal', tier: 'Active Tender' },
  { id: 'RESTRICTED', label: 'Restricted RFP / Direct Invitation', tier: 'Active Tender' },
  { id: 'REPEAT', label: 'Repeat Business / Cross-Sell', tier: 'Pre-Tender' },
]

// FY 2026/27 Approved Annual & Quarterly Revenue and 3× Pipeline Targets
export const SBU_PIPELINE_TARGETS = {
  INSTITUTE: {
    name: 'The i-Capital Institute',
    code: 'INST',
    annualRevenueTarget: 63000000,
    requiredPipelineTarget: 189000000, // 3x coverage
    directPipelineTarget: 113400000,
    tenderPipelineTarget: 75600000,
    quarterly: {
      Q1: { revenue: 6300000, pipeline: 18900000 },
      Q2: { revenue: 25200000, pipeline: 75600000 },
      Q3: { revenue: 25200000, pipeline: 75600000 },
      Q4: { revenue: 6300000, pipeline: 18900000 },
    },
  },
  CBS: {
    name: 'Capital Business Solutions',
    code: 'CBS',
    annualRevenueTarget: 35000000,
    requiredPipelineTarget: 105000000, // 3x coverage
    directPipelineTarget: 63000000,
    tenderPipelineTarget: 42000000,
    quarterly: {
      Q1: { revenue: 3500000, pipeline: 10500000 },
      Q2: { revenue: 14000000, pipeline: 42000000 },
      Q3: { revenue: 14000000, pipeline: 42000000 },
      Q4: { revenue: 3500000, pipeline: 10500000 },
    },
  },
  IIP: {
    name: 'i-Capital Investment Partners',
    code: 'IIP',
    annualRevenueTarget: 140300000,
    requiredPipelineTarget: 420900000, // 3x coverage
    quarterly: {
      Q1: { revenue: 6000000, pipeline: 18000000 },
      Q2: { revenue: 42690000, pipeline: 128070000 },
      Q3: { revenue: 46540000, pipeline: 139620000 },
      Q4: { revenue: 45070000, pipeline: 135210000 },
    },
  },
  DAS: {
    name: 'Digital & AI Solutions',
    code: 'DAS',
    annualRevenueTarget: 18295000,
    requiredPipelineTarget: 54885000, // 3x coverage
    quarterly: {
      Q1: { revenue: 3659000, pipeline: 10977000 },
      Q2: { revenue: 5489000, pipeline: 16467000 },
      Q3: { revenue: 5489000, pipeline: 16467000 },
      Q4: { revenue: 3659000, pipeline: 10977000 },
    },
  },
  GROUP_TOTAL: {
    name: 'The i-Capital Africa Group',
    annualRevenueTarget: 256595000,
    requiredPipelineTarget: 769785000,
  },
}

// Playbook Tracker-Readiness Gatekeeper (§3)
export function checkTrackerReadiness(deal) {
  const hasAccount = Boolean(
    deal.client_id ||
    deal.client_name ||
    deal.opportunities?.clients?.name ||
    deal.title
  )
  const hasProduct = Boolean(deal.product_engine || deal.specific_product)
  const hasOwner = Boolean(deal.bd_owner || (deal.notes && deal.notes.includes('[OWNER:')))
  const hasNextAction = Boolean(deal.next_action && deal.next_action.trim().length > 3)
  const hasTargetDate = Boolean(deal.next_action_date)

  const missing = []
  if (!hasAccount) missing.push('Named Account')
  if (!hasProduct) missing.push('Product / Service Fit')
  if (!hasOwner) missing.push('Responsible Owner')
  if (!hasNextAction) missing.push('Next Action')
  if (!hasTargetDate) missing.push('Action Target Date')

  return {
    isReady: missing.length === 0,
    missingFields: missing,
  }
}

// Stage Gate Governance Evaluator
export function evaluateStageGate(deal, targetStage) {
  const missing = []

  if (targetStage === 'Pre-Qualified') {
    if (!deal.deal_value_etb && deal.deal_value_etb !== 0) {
      missing.push('Estimated Deal Value (ETB)')
    }
  }

  if (targetStage === 'Qualified Pipeline' || targetStage === 'Won') {
    if (!deal.deal_value_etb && deal.deal_value_etb !== 0) {
      missing.push('Deal Value (ETB)')
    }
    if (!deal.submission_deadline) {
      missing.push('Submission / Target Date')
    }
  }

  if (targetStage === 'Lost') {
    if (!deal.notes || (!deal.notes.includes('[LOSS REASON:') && !deal.notes.trim())) {
      missing.push('Mandatory Loss Reason / Notes')
    }
  }

  return {
    isUnlocked: missing.length === 0,
    missingRequirements: missing,
  }
}

// Real-Time 3x Pipeline Coverage Calculator
export function calculatePipelineCoverage(activePipelineEtb, targetEtb) {
  if (!targetEtb || targetEtb === 0) return { ratio: 0, status: 'red', gap: 0, coveragePercent: 0 }
  const ratio = activePipelineEtb / (targetEtb / 3)
  const gap = Math.max(0, targetEtb - activePipelineEtb)

  let status = 'red'
  if (ratio >= 3.0) {
    status = 'green'
  } else if (ratio >= 1.5) {
    status = 'amber'
  }

  return {
    ratio: Number(ratio.toFixed(2)),
    gap,
    status,
    coveragePercent: Math.min(100, Math.round((activePipelineEtb / targetEtb) * 100)),
  }
}

// Official SBU Product Engines & Service Taxonomy
export const SBU_PRODUCT_TAXONOMY = {
  INSTITUTE: {
    name: 'The i-Capital Institute',
    engines: [
      {
        id: 'MBL',
        label: 'Master Builder Leadership (MBL)',
        products: [
          'Master Builder Leadership Development Program',
          'Executive Leadership Transition',
          'Board Governance & Study Tour',
        ],
      },
      {
        id: 'SOJT',
        label: 'Structured On-the-Job Training (S-OJT)',
        products: [
          'S-OJT Operational Leadership Program',
          'S-OJT In-Company Trainer Certification',
          'Workforce Capacity Building',
        ],
      },
      {
        id: 'PRIME',
        label: 'PRIME Staff Development',
        products: [
          'PRIME Core Staff Development Program',
          'Foundational Professional Development',
        ],
      },
      {
        id: 'STRATEGIZE',
        label: 'Strategize / Transformation',
        products: [
          'Corporate Strategy Formulation',
          'Institutional Transformation & Capital Market Readiness',
        ],
      },
      {
        id: 'ADVISORY_BDS_VSM',
        label: 'BDS & Value Stream Mapping (VSM)',
        products: [
          'Business Development Services (BDS)',
          'Value Stream Mapping (VSM) Diagnostic',
          'Gender Bond & Inclusive Advisory',
        ],
      },
      {
        id: 'KMS_DATA',
        label: 'Knowledge Management & Afro Data',
        products: [
          'Knowledge Management System (KMS) Deployment',
          'Afro Data Research & Intelligence Subscription',
        ],
      },
    ],
  },
  CBS: {
    name: 'Cross Border Solutions',
    engines: [
      {
        id: 'REGIONAL_STUDY_TOURS',
        label: 'Study Tours & Immersion Programs',
        products: [
          'Executive Leadership Immersion (Thailand/Singapore/Dubai)',
          'Board Study Tour & Benchmark Program',
          'Cross-Border Industrial & Financial Mission',
        ],
      },
      {
        id: 'NATIONAL_INFRASTRUCTURE',
        label: 'National Switch & Financial Infrastructure',
        products: [
          'National Switch Infrastructure Capacity Building',
          'Digital Payments & Interoperability Advisory',
        ],
      },
      {
        id: 'CROSS_BORDER_TRADE',
        label: 'Cross-Border Trade & Policy Solutions',
        products: [
          'Regional Trade Corridor Advisory',
          'Bilateral Compliance & Institutional Modernization',
        ],
      },
    ],
  },
  IIP: {
    name: 'i-Capital Investment Partners',
    engines: [
      {
        id: 'EQUITY_ACCESS',
        label: 'Equity Market Access Route',
        products: [
          'Share Registration Advisory',
          'Rights Offer Advisory',
          'Public Equity Issuance & Listing Support',
        ],
      },
      {
        id: 'DEBT_ACCESS',
        label: 'Debt Market Access Route',
        products: [
          'Corporate Bond Advisory',
          'Commercial Paper Advisory',
          'Structured Debt Financing',
        ],
      },
      {
        id: 'M_AND_A',
        label: 'Strategic Transactions & M&A Route',
        products: [
          'Strategic Transaction & Valuation Advisory',
          'Mergers & Acquisitions Advisory',
          'Joint Venture Structuring',
        ],
      },
      {
        id: 'CAPITAL_STRUCTURE',
        label: 'Capital Structure & Cross-Cutting',
        products: [
          'Capital Restructuring Advisory',
          'Corporate Balance Sheet Optimization',
        ],
      },
      {
        id: 'INVESTOR_ADVISORY',
        label: 'Investor Advisory & Wealth Route',
        products: [
          'Capital Market Readiness & Training',
          'Capital Market Advisory Services',
          'Investor Solutions / Market Access',
        ],
      },
    ],
  },
  DAS: {
    name: 'Digital & AI Solutions',
    engines: [
      {
        id: 'SHOFER',
        label: 'SHOFER Mobility Platform',
        products: [
          'SHOFER Parking Solutions',
          'SHOFER Car Wash Solutions',
          'SHOFER Auto Care Platform',
          'SHOFER Insurance Integration',
          'SHOFER Learning & Driver Academy',
          'SHOFER Ecosystem Promotion & Media',
        ],
      },
      {
        id: 'INVESTIFY',
        label: 'Investify ET & Digital Platforms',
        products: [
          'Investify ET Platform Deployment',
          'Digital Retail Investment Infrastructure',
        ],
      },
      {
        id: 'ENTERPRISE_AI',
        label: 'Enterprise AI & ERP Solutions',
        products: [
          'AI Strategic Applications & Governance Program',
          'Enterprise ERP Implementation',
          'Micro-Credit Digital Lending Engine',
        ],
      },
    ],
  },
}
// Budget / Deal Size Classification Tiers
export const BUDGET_TIERS = [
  { id: 'TIER_1', label: 'Tier 1 (< 500K ETB)', min: 0, max: 500000 },
  { id: 'TIER_2', label: 'Tier 2 (500K - 2M ETB)', min: 500000, max: 2000000 },
  { id: 'TIER_3', label: 'Tier 3 (2M - 10M ETB)', min: 2000000, max: 10000000 },
  { id: 'TIER_4', label: 'Tier 4 (> 10M ETB Mega Deal)', min: 10000000, max: Infinity },
]