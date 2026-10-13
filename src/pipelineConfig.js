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

// Two-Tier Origination Channels (Playbook §9 Opportunity Types)
export const OPPORTUNITY_CHANNELS = [
  { id: 'DIRECT', label: 'Direct Client Outreach / Relationship', tier: 'Pre-Tender' },
  { id: 'TENDER', label: 'Competitive Open Bid / Tender Portal', tier: 'Active Tender' },
  { id: 'RESTRICTED', label: 'Restricted RFP / Direct Invitation', tier: 'Active Tender' },
  { id: 'REPEAT', label: 'Repeat Business / Cross-Sell', tier: 'Pre-Tender' },
]

// FY 2026/27 Approved Annual & Quarterly Revenue and 3× Pipeline Targets
// Source: FY 2026/27 SBU Pipeline Readiness Report (§3) + CBS Addition
export const SBU_PIPELINE_TARGETS = {
  INSTITUTE: {
    name: 'The i-Capital Institute',
    code: 'INST',
    annualRevenueTarget: 63000000,
    requiredPipelineTarget: 189000000, // 3x coverage
    // Stream distribution: ~60% Direct Outreach / ~40% Competitive Bids
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
    annualRevenueTarget: 256595000, // 221.595M + 35M (CBS)
    requiredPipelineTarget: 769785000, // 664.785M + 105M (CBS)
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

// Real-Time 3x Pipeline Coverage Calculator
export function calculatePipelineCoverage(activePipelineEtb, targetEtb) {
  if (!targetEtb || targetEtb === 0) return { ratio: 0, status: 'red', gap: 0, coveragePercent: 0 }
  const ratio = activePipelineEtb / (targetEtb / 3)
  const gap = Math.max(0, targetEtb - activePipelineEtb)
  
  let status = 'red' // Critical (< 1.5x)
  if (ratio >= 3.0) {
    status = 'green' // Fully compliant (>= 3.0x target coverage)
  } else if (ratio >= 1.5) {
    status = 'amber' // Moderate (1.5x - 2.99x)
  }

  return {
    ratio: Number(ratio.toFixed(2)),
    gap,
    status,
    coveragePercent: Math.min(100, Math.round((activePipelineEtb / targetEtb) * 100)),
  }
}