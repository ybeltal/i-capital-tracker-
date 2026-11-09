// src/crmAssistantKnowledge.js

export const SUGGESTED_QUESTIONS = [
  "How do I add a new Lead?",
  "How do I create and log a Proposal?",
  "What do the Stage Gates (Stage 1, 2, 3) mean?",
  "What is the 3.0× Coverage target?",
  "Where does my saved data go?",
  "How does the Executive Briefing work?"
]

const KNOWLEDGE_TOPICS = [
  {
    keywords: ['lead', 'add lead', 'new lead', 'create lead', 'lead form'],
    title: 'How to Capture and Manage a Lead',
    answer: `
**Step-by-Step: Adding a New Lead**
1. Click the **"+ New Lead"** button on the top navigation bar or inside the **Lead Management** tab.
2. Fill in the essential details:
   • **Client / Organization Name:** e.g., *Awash Bank, Ethiopian Capital Market Authority*.
   • **Sector:** Choose Financial, Public Sector, Mining, Development Partner, etc.
   • **Assigned SBU:** Select the responsible business unit (*Institute, CBS, IIP, or DAS*).
   • **Focal Contact Person:** Full name, designation/role, phone number, and work email.
   • **Lead Source:** Direct inquiry, referral, tender publication, or relationship outreach.
   • **Qualification Status:** Mark as *Initiated, Qualified, or In Discussion*.
3. Click **"Save Lead"**.

*Where does it go?*
The record is immediately saved into your Supabase \`leads\` table and becomes visible in the **Lead Directory** and **Follow-up Queue** for scheduled outreach.
    `
  },
  {
    keywords: ['proposal', 'add proposal', 'new proposal', 'submit proposal', 'create proposal', 'bid'],
    title: 'How to Register and Track a Proposal',
    answer: `
**Step-by-Step: Creating a Proposal**
1. Navigate to the **Proposal Management** tab and click **"+ Create Proposal"**.
2. Complete the required mandate fields:
   • **Proposal Code:** Automatically generated or custom (e.g., \`INST-2026-685\`).
   • **Mandate Title:** Clear, full title of the technical assignment or training.
   • **Client:** Select an existing client from your directory or type the entity name.
   • **Strategic Business Unit (SBU):** Allocate to *The Institute, CBS, IIP, or DAS*.
   • **Commercial Value (ETB):** Enter the fee/contract value in Ethiopian Birr.
   • **Current Stage Gate:** Choose where the proposal currently stands (Stage 1, Stage 2, etc.).
   • **Submission Deadline:** Tender deadline or client defense date.
3. Click **"Save Proposal"**.

*Flow:* Once saved, the commercial value is instantly added to your live pipeline calculations on the **Executive Dashboard**.
    `
  },
  {
    keywords: ['stage', 'stage gate', 'tor', 'rfp', 'defense', 'won', 'lost', 'status'],
    title: 'Understanding CRM Stage Gates & Probabilities',
    answer: `
The CRM follows a strict 3-tier Stage-Gate governance model:

• **Stage 1: TOR / RFP Identified (30% Probability Weight)**
  The bidding opportunity is open, terms of reference are being analyzed, or technical proposals are in preparation.

• **Stage 2: Proposal In Defense (70% Probability Weight)**
  The technical & financial proposal has been submitted to the client. The team is presenting defenses, negotiations, or waiting for contract awards.

• **Stage 3: Contract Won / Signed (100% Realized)**
  The contract is awarded, signed, and transitioning to execution. Its value counts directly toward your annual closed revenue quota.

• **Closed Lost / Disqualified (0% Weight)**
  The bid was dropped or awarded to a competitor. These are retained for post-mortem analysis and win-rate calculation.
    `
  },
  {
    keywords: ['3.0x', 'coverage', 'target', 'quota', 'benchmark', '769', '256', 'sbu'],
    title: 'SBU Targets & the 3.0× Pipeline Rule',
    answer: `
**Group Annual Target:** **ETB 256.60 Million**
**Group 3.0× Required Pipeline:** **ETB 769.78 Million**

To safely hit corporate revenue quotas, each SBU must maintain **3.0 times its annual target** in active, unqualified bids to absorb client drop-offs:

1. **The Institute:** Target = ETB 105.00M | Healthy Pipeline ≥ **ETB 315.00M**
2. **Corporate & Business Solutions (CBS):** Target = ETB 42.00M | Healthy Pipeline ≥ **ETB 126.00M**
3. **i-Capital Investment Partners (IIP):** Target = ETB 54.80M | Healthy Pipeline ≥ **ETB 164.40M**
4. **Digital & AI Solutions (DAS):** Target = ETB 54.80M | Healthy Pipeline ≥ **ETB 164.40M**

*Green Status:* Active Bids ≥ 3.0× Target
*Red Deficit Status:* Active Bids < 3.0× Target
    `
  },
  {
    keywords: ['executive', 'briefing', 'brief', 'email', 'ceo', 'dr gemechu', 'gemechu', 'dispatch'],
    title: 'Executive Briefing Automation',
    answer: `
**Automated Executive Briefing Workflow:**
• **Purpose:** Generates a real-time revenue realization and 3.0× governance report and dispatches it directly to Dr. Gemechu Waktola (\`gemechu@icapitalafrica.org\`) with a CC to Ybeltal Semagn.
• **Trigger:** Run via the automated backend script:
  \`node scripts/sendExecutiveBrief.js\`
• **Delivery Engine:** Dispatched via Resend API from your domain (\`icapitalcrm.pro.et\`).
• **Content:** Real-time won totals, active pipeline coverage per SBU, and high-value mandates in technical defense.
    `
  },
  {
    keywords: ['database', 'where', 'storage', 'supabase', 'lost data', 'safety', 'rls'],
    title: 'Where CRM Data Is Stored & System Security',
    answer: `
**Data Architecture & Security:**
• **Backend:** Hosted securely in PostgreSQL on **Supabase** (project: \`qljmgleaxfmrurrpmjkz\`).
• **Tables:**
  - \`leads\`: Stores incoming institutional contacts, sectors, and relationship status.
  - \`proposals\`: Stores all active bids, commercial values, SBUs, and stage gates.
  - \`clients\`: Manages institutional client directory and historical engagements.
• **Security:** Row-Level Security (RLS) is fully active with clean 0-warning database health. Your historical data cannot be overwritten or accidentally purged.
    `
  },
  {
    keywords: ['client', 'directory', 'drawer', '360', 'history'],
    title: 'Client 360° Financial Drawer',
    answer: `
**Viewing Client History:**
1. Open the **Client Directory** tab.
2. Click on any institutional client (e.g., *Dashen Bank*, *Bank of Abyssinia*, or *ECMA*).
3. The **Client 360° Financial Drawer** slides open from the right, showing:
   • Total lifetime commercial value.
   • Won contracts vs active proposals.
   • Historical touchpoints and contact persons.
    `
  }
]

export function getCrmAssistantResponse(query) {
  if (!query || !query.trim()) {
    return "Hello! I am your i-Capital CRM Assistant. Ask me anything about creating leads, logging proposals, tracking stage gates, or calculating SBU 3.0× pipeline coverage."
  }

  const cleanQuery = query.toLowerCase()

  // Match against knowledge topics
  for (const topic of KNOWLEDGE_TOPICS) {
    if (topic.keywords.some((kw) => cleanQuery.includes(kw))) {
      return topic.answer.trim()
    }
  }

  // Fallback reply with clear navigation tips
  return `
I didn't find an exact match for that specific question, but here is a quick guide to common tasks:

• **To add a lead:** Click **"+ New Lead"** in the top navigation bar.
• **To add a proposal:** Open **Proposal Management** and click **"+ Create Proposal"**.
• **To view SBU health:** Check the **Executive Dashboard** for the 3.0× pipeline coverage meters.
• **To check database records:** All data is safely stored in the Supabase \`leads\` and \`proposals\` tables.

Try asking: *"How do I create a proposal?"* or *"What does 3.0× coverage mean?"*
  `.trim()
}