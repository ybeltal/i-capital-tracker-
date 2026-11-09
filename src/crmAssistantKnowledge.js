// src/crmAssistantKnowledge.js

export const QUICK_TOPIC_CATEGORIES = [
  { label: '🌟 Full Overview', query: 'explain the entire crm flow' },
  { label: '🎯 Lead Intake', query: 'how to capture and qualify leads' },
  { label: '📑 Deals & Proposals', query: 'how to create and track proposals' },
  { label: '📈 3.0× Target Rule', query: 'how does the 3.0x pipeline coverage work' },
  { label: '🏛️ 4 SBUs Quotas', query: 'what are the sbu targets and quotas' },
  { label: '✨ AI Tender Parser', query: 'how does the ai tender parser work' },
  { label: '🏢 Client Directory', query: 'how does the client 360 drawer work' },
  { label: '⏰ Follow-up Queue', query: 'how does the follow up queue work' }
]

const CRM_KNOWLEDGE_BASE = [
  {
    id: 'crm_overview',
    title: 'The i-Capital Commercial Platform — Complete Flow & Purpose',
    keywords: ['explain', 'overview', 'crm', 'about', 'flow', 'what is', 'purpose', 'how it works', 'guide', 'introduction', 'start'],
    content: `
### Executive Platform Overview
**The i-Capital CRM** is the institutional revenue governance and commercial operations platform for **The i-Capital Africa Group**. It unites four Strategic Business Units (SBUs) under a single pipeline model to achieve the corporate annual target of **ETB 256.60 Million**.

#### End-to-End Operational Flow:
1. **Intake (Lead Generation):** Capture early-stage intelligence from tender advertisements, client referrals, or direct discussions in **Lead Intake** or **Digital Marketing Leads**.
2. **Analysis (AI Parsing):** Upload RFP/TOR PDFs to the **✨ AI Tender Parser** to extract scopes, submission deadlines, and eligibility criteria in seconds.
3. **Execution (Proposal Mandate):** Register formal bids in **Deals & Proposals**, assigning them to an SBU and advancing them through Stage 1 (TOR/RFP), Stage 2 (Technical Defense), and Stage 3 (Contract Won).
4. **Governance (Executive Dashboard):** Real-time monitoring of commercial health, tracking whether each SBU maintains its mandatory **3.0× pipeline coverage**.
5. **Follow-up & Watchdogs:** The **Follow-up Queue** and background watchdogs track upcoming submission deadlines and client touchpoints.
6. **Executive Dispatch:** Automated reporting generates weekly executive dossiers sent directly to **Dr. Gemechu Waktola**.
    `
  },
  {
    id: 'lead_flow',
    title: 'Capturing, Qualifying & Managing Leads',
    keywords: ['lead', 'add lead', 'new lead', 'create lead', 'lead form', 'qualification', 'intake', 'focal'],
    content: `
### How to Capture and Manage a Lead
Leads represent pre-tender opportunities, exploratory conversations, and early institutional relationships.

#### Step-by-Step Instructions:
1. Click the white **"+ New Lead"** button in the top action bar or navigate to the **Lead Intake** tab.
2. Fill out the core intake fields:
   • **Client / Organization Name:** e.g., *Awash Bank, Ethiopian Capital Market Authority (ECMA)*.
   • **Sector:** Select Banking & Finance, Public Sector, Mining, Development Partner, etc.
   • **Assigned SBU:** Allocate to *The Institute, CBS, IIP, or DAS*.
   • **Focal Contact Person:** Name, job title, work email, and direct phone number.
   • **Lead Source:** Referral, direct meeting, public tender, or marketing campaign.
   • **Qualification Status:** Select *Initiated (Unqualified), Qualified, or In Discussion*.
3. Click **"Save Lead"**.

*Where is it stored?*
Data is saved instantly to the Supabase \`leads\` table. It becomes actionable in the **Lead Directory** and **Follow-up Queue**. Once an official TOR/RFP is released, convert the lead into a formal proposal.
    `
  },
  {
    id: 'proposal_flow',
    title: 'Creating and Managing Proposal Mandates',
    keywords: ['proposal', 'add proposal', 'new proposal', 'submit', 'create proposal', 'bid', 'mandate', 'commercial value', 'fee'],
    content: `
### How to Register and Track a Proposal Mandate
Proposals represent active bids, formal technical submissions, and contracted consulting or training assignments.

#### Step-by-Step Instructions:
1. Click the orange **"+ New Proposal"** button in the top action bar or open the **Deals & Proposals** tab.
2. Enter the mandatory contract parameters:
   • **Proposal Code:** Auto-assigned or custom (e.g., \`INST-2026-685\`).
   • **Mandate Title:** Full descriptive title of the assignment.
   • **Procuring Entity / Client:** Select from the Client Directory or type a new entity.
   • **Responsible SBU:** *The Institute, CBS, IIP, or DAS*.
   • **Commercial Value (ETB):** The proposed professional fee or contract value in Ethiopian Birr.
   • **Current Stage Gate:** Stage 1, Stage 2, or Stage 3.
   • **Submission Deadline:** The client's submission date or oral defense date.
3. Click **"Save Proposal"**.

*System Impact:* Saving immediately recalculates the live SBU pipeline, updates the **Executive Dashboard**, and adjusts group quota realization figures.
    `
  },
  {
    id: 'stage_gates',
    title: 'Stage-Gate Governance & Probability Weightings',
    keywords: ['stage', 'stage gate', 'probability', 'weight', 'defense', 'won', 'lost', 'status', 'tor', 'rfp'],
    content: `
### Stage-Gate Governance Model
To prevent revenue distortion, opportunities carry probability weightings based on their verification stage:

• **Stage 1: TOR / RFP Identified (30% Probability Weight)**
  Opportunity identified, tender documents purchased, or technical proposal in development.
• **Stage 2: Proposal In Defense (70% Probability Weight)**
  Technical and financial proposals delivered to client. Active commercial defense, negotiations, or evaluation ongoing.
• **Stage 3: Contract Won / Signed (100% Realized Revenue)**
  Award letter received or service contract fully signed. Contributes 100% to the annual realized revenue quota.
• **Closed Lost / Disqualified (0% Weight)**
  Opportunity dropped, tender canceled, or lost to a competitor. Kept for historical conversion and win-rate analysis.
    `
  },
  {
    id: 'coverage_rule',
    title: 'Group Target (ETB 256.6M) & The 3.0× Pipeline Rule',
    keywords: ['3.0x', 'coverage', 'target', 'gap', 'quota', '256', '769', 'math', 'benchmark', 'calculation'],
    content: `
### Corporate Targets & The 3.0× Pipeline Rule
• **Annual Closed Target:** **ETB 256.60 Million** across all 4 SBUs.
• **Mandatory Group Pipeline Requirement:** **ETB 769.78 Million** (3.0× coverage).

#### Why 3.0× Coverage?
In institutional consulting, professional education, and advisory services, client procurement cycles experience delays, cancellations, or competitive losses. Maintaining a pipeline equal to three times the target provides the necessary buffer to hit the ETB 256.6M revenue goal.

#### The Gap Gauge:
• **Green (+):** The active pipeline meets or exceeds 3.0× of the annual target.
• **Red Deficit (-):** The pipeline is below the required 3.0× threshold, signaling a need for immediate BD outreach.
    `
  },
  {
    id: 'sbu_breakdown',
    title: 'The 4 Strategic Business Units (SBUs) & Quotas',
    keywords: ['sbu', 'institute', 'cbs', 'iip', 'das', 'units', 'divisions', 'cross border', 'investment', 'digital'],
    content: `
### Strategic Business Units (SBUs) Allocation

1. **The i-Capital Africa Institute**
   • Core Focus: Executive leadership development, specialized corporate training, and research.
   • Annual Quota: **ETB 105.00 Million** | 3.0× Pipeline Target: **ETB 315.00 Million**

2. **Corporate & Business Solutions (CBS)**
   • Core Focus: Strategy consulting, operational restructuring, institutional diagnostics, and advisory.
   • Annual Quota: **ETB 42.00 Million** | 3.0× Pipeline Target: **ETB 126.00 Million**

3. **i-Capital Investment Partners (IIP)**
   • Core Focus: Capital markets advisory, transaction structuring, investor readiness, and M&A.
   • Annual Quota: **ETB 54.80 Million** | 3.0× Pipeline Target: **ETB 164.40 Million**

4. **Digital & AI Solutions (DAS)**
   • Core Focus: Enterprise digital transformation, AI workflows, and software implementations.
   • Annual Quota: **ETB 54.80 Million** | 3.0× Pipeline Target: **ETB 164.40 Million**
    `
  },
  {
    id: 'ai_tender_parser',
    title: '✨ AI TOR / RFP Tender Document Parser',
    keywords: ['parser', 'ai tender', 'gemini', 'pdf', 'word', 'extract', 'tor parser', 'rfp parser'],
    content: `
### AI Tender Document Parser
The blue **"✨ AI Tender Parser"** button opens an automated extraction modal powered by Gemini Multimodal processing:

• **Input:** Upload tender documents in PDF or DOCX format.
• **Automated Extraction:** Identifies procuring entity, scope of services, eligibility criteria, submission deadlines, bid bond specifications, and evaluation scoring weights.
• **One-Click Convert:** Automatically populates the **New Proposal** modal with extracted data, saving manual data-entry time.
    `
  },
  {
    id: 'client_directory',
    title: 'Client Directory & Client 360° Financial Drawer',
    keywords: ['client', 'directory', 'drawer', '360', 'customer', 'bank', 'history', 'lifetime'],
    content: `
### Client Directory & 360° Financial Drawer
The **Client Directory** manages the group's institutional relationships (banks, regulatory authorities, mining corporations, and NGOs):

• **Adding Clients:** Click **"+ New Client"** to register an institution, address, sector, and website.
• **Client 360° Drawer:** Clicking any client row opens a drawer displaying their relationship history:
  - Total lifetime contract value awarded.
  - Active proposals currently in defense.
  - Historic assignments and key contact persons.
    `
  },
  {
    id: 'queue_and_watchdogs',
    title: 'Follow-up Queue & Deadline Watchdogs',
    keywords: ['queue', 'follow-up', 'follow up', 'watchdog', 'reminder', 'schedule', 'touchpoint', 'deadline'],
    content: `
### Follow-up Queue & Watchdogs
• **Follow-up Queue:** Displays scheduled client interactions, pitch dates, and required updates.
• **Deadline Watchdogs:** Automated system routines track RFP closing dates and alert officers 72 hours and 24 hours prior to submission deadlines.
    `
  },
  {
    id: 'roles_and_security',
    title: 'User Roles, Permissions & Supabase Security',
    keywords: ['role', 'permission', 'admin', 'manage roles', 'security', 'supabase', 'rls', 'access'],
    content: `
### Security & Role Governance
• **Executive Admin:** Unrestricted access, target modification, user role management.
• **Senior Management:** Global pipeline visibility, executive reporting, audit access.
• **BD Manager:** Pipeline management, lead qualification, proposal assignment across SBUs.
• **Technical Lead:** Proposal defense documentation, technical bid submission.
• **Sales Officer:** Lead intake, client meeting logs, scheduled follow-ups.
• **Database Security:** Hosted on PostgreSQL via **Supabase**. Row-Level Security (RLS) is active across all tables.
    `
  }
]

// Intelligent relevance-scoring engine
export function getCrmAssistantResponse(rawQuery) {
  if (!rawQuery || !rawQuery.trim()) {
    return CRM_KNOWLEDGE_BASE[0].content.trim()
  }

  const query = rawQuery.toLowerCase().trim()
  const queryTokens = query.split(/\s+/).filter((w) => w.length > 2)

  let bestMatch = null
  let highestScore = 0

  for (const topic of CRM_KNOWLEDGE_BASE) {
    let score = 0

    // Exact keyword matching (highest priority)
    for (const kw of topic.keywords) {
      if (query === kw) {
        score += 30
      } else if (query.includes(kw)) {
        score += 15
      }
    }

    // Tokenized word matching across keywords and title
    for (const token of queryTokens) {
      if (topic.keywords.some((kw) => kw.includes(token))) score += 5
      if (topic.title.toLowerCase().includes(token)) score += 8
      if (topic.content.toLowerCase().includes(token)) score += 1
    }

    if (score > highestScore) {
      highestScore = score
      bestMatch = topic
    }
  }

  // Return best matching topic if score meets confidence threshold
  if (bestMatch && highestScore >= 5) {
    return bestMatch.content.trim()
  }

  // Fallback with full system summary and quick navigation
  return `
### The i-Capital CRM Navigation Guide
I could not match that query to a single section. Here is a quick reference for common actions:

• **To add a lead:** Click **"+ New Lead"** in the top action bar or visit the **Lead Intake** tab.
• **To log a proposal:** Click **"+ New Proposal"** to enter the commercial value and stage gate.
• **To parse tender documents:** Click **"✨ AI Tender Parser"** to extract RFP/TOR files using Gemini.
• **To check SBU health:** Review the **Executive Dashboard** for 3.0× coverage ratios.
• **To view client history:** Open **Client Directory** and click any client row for their 360° drawer.

*Try asking about:* **"3.0x rule"**, **"how to add proposal"**, **"sbu targets"**, or **"stage gates"**.
  `.trim()
}