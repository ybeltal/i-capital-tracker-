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

// Playbook Tracker-Readiness Gatekeeper
// Rule: Named Account + Product Fit + Owner + Next Action + Target Date
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