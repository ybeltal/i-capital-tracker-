// src/crmAssistantKnowledge.js

export const SUGGESTED_TOPICS = [
  { label: '📐 CRM Equations & Math', query: 'what are the crm equations and formulas' },
  { label: '🎯 How to Add Lead', query: 'how do i add a new lead' },
  { label: '📑 How to Add Proposal', query: 'how do i create a proposal' },
  { label: '📈 3.0× Coverage Rule', query: 'explain the 3.0x pipeline rule' },
  { label: '🏛️ 4 SBU Quotas', query: 'what are the sbu quotas and targets' },
  { label: '✨ AI Tender Parser', query: 'how does the ai tender parser work' },
  { label: '🏢 Client 360 Drawer', query: 'how does the client directory work' },
  { label: '⏰ Follow-up Queue', query: 'how does the follow up queue work' },
]

const CRM_KNOWLEDGE_BASE = [
  {
    id: 'equations_and_math',
    title: 'CRM Equations, Formulas & Calculations',
    keywords: [
      'equation', 'equations', 'formula', 'formulas', 'math', 'calculate', 
      'calculation', 'calculations', 'metric', 'win rate', 'weighted', 
      'probability', 'ratio', 'gap', 'coverage formula'
    ],
    content: `
### The i-Capital CRM Equations & Mathematical Formulas

The CRM relies on 4 core mathematical models to govern pipeline health:

#### 1. The 3.0× Required Pipeline Equation
Each Strategic Business Unit (SBU) must maintain an active pipeline 3 times its annual quota:
\`Required Pipeline = Annual Revenue Target × 3.0\`
• **The Institute:** ETB 105.00M × 3.0 = **ETB 315.00M**
• **CBS:** ETB 42.00M × 3.0 = **ETB 126.00M**
• **IIP:** ETB 54.80M × 3.0 = **ETB 164.40M**
• **DAS:** ETB 54.80M × 3.0 = **ETB 164.40M**
• **Group Total:** ETB 256.60M × 3.0 = **ETB 769.78M**

#### 2. Pipeline Coverage & Gap Equation
\`Coverage Ratio = Active Pipeline ÷ Annual Revenue Target\`
\`Pipeline Gap = Active Pipeline - Required Pipeline (3.0×)\`
• **Coverage ≥ 3.0×:** Healthy status (Green).
• **Coverage < 3.0×:** Deficit status (Red Gap Alert).

#### 3. Weighted Tender Realization Formula
To forecast realistic cash flow, active bids are adjusted by stage-gate probability:
\`Weighted Value = Commercial Fee × Stage Probability\`
• **Stage 1 (TOR/RFP Identified):** 30% Probability Weight
• **Stage 2 (Proposal in Defense):** 70% Probability Weight
• **Stage 3 (Contract Won / Signed):** 100% Realized Revenue

#### 4. Historical Win-Rate Equation
\`Win Rate (%) = (Won Contracts ÷ Total Decided Bids) × 100\`
*Note: Proposals still under review or in defense are excluded from the denominator to prevent metric distortion.*
    `
  },
  {
    id: 'overview',
    title: 'Executive Platform Overview & End-to-End Flow',
    keywords: ['explain', 'overview', 'crm', 'about', 'flow', 'what is', 'purpose', 'how it works', 'guide', 'start'],
    content: `
### The i-Capital Commercial Platform Flow
The platform tracks multi-SBU revenue realization toward the **ETB 256.60M** annual target:

1. **Intake:** Log early intelligence in **Lead Intake** or **Digital Marketing Leads**.
2. **AI Extraction:** Upload RFP/TOR PDFs to **✨ AI Tender Parser** to extract scopes and deadlines.
3. **Proposal Mandate:** Register formal bids in **Deals & Proposals** across Stages 1, 2, and 3.
4. **Governance:** Track SBU quotas and 3.0× coverage meters on the **Executive Dashboard**.
5. **Relationship Tracking:** Access historical mandates via the **Client 360° Financial Drawer**.
    `
  },
  {
    id: 'lead_flow',
    title: 'Capturing and Qualifying Leads',
    keywords: ['lead', 'add lead', 'new lead', 'create lead', 'intake', 'qualification'],
    content: `
### How to Add and Manage a Lead
1. Click the white **"+ New Lead"** button in the top action bar or open the **Lead Intake** tab.
2. Enter the organization name, sector, responsible SBU (*Institute, CBS, IIP, or DAS*), contact focal person details, and lead source.
3. Select qualification status (*Initiated, Qualified, or In Discussion*).
4. Click **"Save Lead"**.
*Storage:* The lead is saved to Supabase and routed to the **Follow-up Queue**.
    `
  },
  {
    id: 'proposal_flow',
    title: 'Registering and Tracking Proposals',
    keywords: ['proposal', 'add proposal', 'new proposal', 'submit', 'bid', 'mandate', 'commercial value'],
    content: `
### How to Register a Proposal Mandate
1. Click the orange **"+ New Proposal"** button in the top action bar or open the **Deals & Proposals** tab.
2. Enter proposal code (e.g. \`INST-2026-685\`), mandate title, client entity, SBU, commercial fee (ETB), and submission deadline.
3. Set the current stage gate (Stage 1, 2, or 3).
4. Click **"Save Proposal"**.
*Impact:* The fee updates your active pipeline and the Executive Dashboard immediately.
    `
  },
  {
    id: 'stage_gates',
    title: 'Stage-Gate Governance & Probabilities',
    keywords: ['stage', 'stage gate', 'tor', 'rfp', 'defense', 'won', 'lost', 'status'],
    content: `
### Stage Gates & Probability Rules
• **Stage 1 (TOR/RFP Identified - 30%):** Open opportunity; technical proposal drafting.
• **Stage 2 (Proposal in Defense - 70%):** Submitted to client; presentations and negotiations ongoing.
• **Stage 3 (Contract Won / Signed - 100%):** Award letter received; realized corporate revenue.
• **Closed Lost / Disqualified (0%):** Dropped or awarded to a competitor; retained for win-rate tracking.
    `
  },
  {
    id: 'sbus',
    title: 'Strategic Business Units & Quotas',
    keywords: ['sbu', 'institute', 'cbs', 'iip', 'das', 'quota', 'target'],
    content: `
### SBU Quotas & Target Realization
• **The Institute:** Target = ETB 105.00M | Healthy 3.0× Pipeline ≥ **ETB 315.00M**
• **Corporate & Business Solutions (CBS):** Target = ETB 42.00M | Healthy 3.0× Pipeline ≥ **ETB 126.00M**
• **i-Capital Investment Partners (IIP):** Target = ETB 54.80M | Healthy 3.0× Pipeline ≥ **ETB 164.40M**
• **Digital & AI Solutions (DAS):** Target = ETB 54.80M | Healthy 3.0× Pipeline ≥ **ETB 164.40M**
    `
  }
]

export function getCrmAssistantResponse(rawQuery) {
  if (!rawQuery || !rawQuery.trim()) {
    return CRM_KNOWLEDGE_BASE[0].content.trim()
  }

  const query = rawQuery.toLowerCase().trim()
  const queryTokens = query.split(/\s+/).filter((w) => w.length > 1)

  let bestMatch = null
  let highestScore = 0

  for (const topic of CRM_KNOWLEDGE_BASE) {
    let score = 0

    // High priority for keyword matches
    for (const kw of topic.keywords) {
      if (query === kw) score += 40
      else if (query.includes(kw)) score += 20
    }

    // Tokenized word matching
    for (const token of queryTokens) {
      if (topic.keywords.some((kw) => kw.includes(token))) score += 8
      if (topic.title.toLowerCase().includes(token)) score += 10
      if (topic.content.toLowerCase().includes(token)) score += 2
    }

    if (score > highestScore) {
      highestScore = score
      bestMatch = topic
    }
  }

  if (bestMatch && highestScore >= 5) {
    return bestMatch.content.trim()
  }

  // Graceful fallback
  return `
### Navigation Assistance
I could not match that exact phrase. Choose one of the quick topics below or ask about:
• **"equations"** or **"formulas"** for the 3.0× math and win-rate equations.
• **"how to add lead"** or **"how to create proposal"**.
• **"stage gates"** or **"sbu quotas"**.
  `.trim()
}