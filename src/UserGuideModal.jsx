import React, { useState } from 'react'

const ROLES_GUIDE = [
  {
    id: 'exec_mgmt',
    roleName: 'Executive Leadership & SBU Heads',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    icon: '🏛️',
    audience: 'CEO (Dr. Gemechu), DCEO (Bruktawit), SBU Heads (Amare, Mekuriya, Shumet)',
    objective:
      'Govern group revenue realization against the approved ETB 256.6M annual target and enforce 3× active pipeline coverage.',
    dailyTasks: [
      'Monitor the Executive Opportunity & Revenue Forecast Dashboard to track period attainment.',
      'Check the 3× Pipeline Coverage & Gap Gauge to verify your SBU maintains 3.0× healthy coverage.',
      'Review high-value formal bids advancing from Stage 2 (Proposal In Defense) to Stage 3 (Contract Won).',
      'Generate and download the 1-Page Board-Ready Executive Briefing (PDF) for divisional reviews.',
    ],
    dos: [
      'Focus on Stage 2 to Stage 3 conversion metrics and commercial contract values.',
      'Enforce strict qualification before greenlighting high-effort competitive bids.',
    ],
    donts: [
      'Do not rely solely on unweighted speculative pipeline totals; inspect the probability-adjusted figures.',
    ],
  },
  {
    id: 'bd_manager',
    roleName: 'Relationship & Business Development Managers',
    badgeColor: '#0284c7',
    badgeBg: '#f0f9ff',
    icon: '💼',
    audience: 'RG Manager (Abdi Derese), BD Managers (Nathnael, Tatenuf), BD Officers',
    objective:
      'Drive institutional outreach, capture leads, qualify TORs, and shepherd opportunities through the bidding lifecycle.',
    dailyTasks: [
      'Log into Lead Intake & Deals to triage inbound inquiries from banking, corporate, and multilateral sectors.',
      'Register new leads and institutional accounts via "+ New Lead" and "+ New Proposal".',
      'Conduct the initial Go/No-Go qualification against client budget and institutional capacity.',
      'Update deal stage progress in real time as client negotiation meetings take place.',
    ],
    dos: [
      'Log client contact details and meeting milestones immediately in the Client Directory.',
      'Assign an accountable Technical Lead as soon as a formal TOR/RFP document is issued.',
    ],
    donts: [
      'Never move a lead to "Proposal In Defense" without attaching or referencing the formal TOR/RFP mandate.',
    ],
  },
  {
    id: 'tech_lead',
    roleName: 'Technical Proposal Leads',
    badgeColor: '#16a34a',
    badgeBg: '#f0fdf4',
    icon: '✍️',
    audience:
      'Abel, Aida, Ashenafi, Atalay, Bereket, Daniel, Dawit, Egnuma, Lemlem, Raphael, Seyfe, Tsegaab, Yabsira, Yeabsira',
    objective:
      'Architect winning technical methodologies, organize expert CV rosters, and submit compliant technical bids before client deadlines.',
    dailyTasks: [
      'Review assigned proposals inside Deals & Proposals filtered to your name.',
      'Utilize the "✨ AI Tender Parser" to extract scope of work, key deliverables, and compliance criteria from client TORs.',
      'Develop the technical approach, delivery timeline, and staffing table in Proposal Studio.',
      'Complete the Go/No-Go TOR compliance matrix checklist before submittal.',
    ],
    dos: [
      'Keep submission deadlines current to ensure 48-hour alerts trigger accurately.',
      'Confirm the commercial pricing aligns with SBU unit rate standards before proposal sealing.',
    ],
    donts: [
      'Do not modify deals belonging to other SBUs outside your assigned scope.',
    ],
  },
  {
    id: 'read_only',
    roleName: 'Reporting & Operations Viewers',
    badgeColor: '#64748b',
    badgeBg: '#f8fafc',
    icon: '👁️',
    audience: 'Mesfin, Mulu, Tsion, Operations Division, Finance Officers',
    objective:
      'Inspect corporate commercial intelligence, verify client directory records, and export reports for group planning.',
    dailyTasks: [
      'Track SBU revenue progress and won engagements across quarters.',
      'Verify directory records and sector classifications for billing and contract audit.',
      'Export consolidated CSV datasets for institutional planning and board filings.',
    ],
    dos: [
      'Use the fiscal period buttons (Q1, Q2, Q3, Q4, Full Year) to drill into specific quarters.',
      'Report any client account duplications to the Platform Administrator.',
    ],
    donts: [
      'Do not distribute internal CSV exports outside authorized institutional leadership channels.',
    ],
  },
]

const WORKFLOW_STAGES = [
  {
    stage: 'Stage 1',
    name: 'TOR / RFP Identified',
    badge: '#0284c7',
    leadRole: 'BD Manager / RG',
    description:
      'Opportunity surfaced from client outreach, public tender portal, or digital marketing lead intake. TOR collected.',
    deliverable: 'Go/No-Go Pre-Qualification & Opportunity Record Created',
  },
  {
    stage: 'Stage 2',
    name: 'Proposal In Defense',
    badge: '#f59e0b',
    leadRole: 'Technical Proposal Lead',
    description:
      'Active tender in development. Technical methodology drafted, expert CVs collected, and financial proposal calculated.',
    deliverable: 'Compliant Technical & Financial Proposal Package Submitted',
  },
  {
    stage: 'Stage 3',
    name: 'Contract Won / Signed',
    badge: '#16a34a',
    leadRole: 'RG Manager & SBU Head',
    description:
      'Client selects i-Capital. Contract negotiation concluded, Terms of Reference signed, and mobilization begins.',
    deliverable: 'Signed Contract & Initial Advance Invoice Mobilized',
  },
  {
    stage: 'Stage 4',
    name: 'Delivery & Repeat Business',
    badge: '#8b5cf6',
    leadRole: 'Consulting Delivery Lead',
    description:
      'Consulting assignment executed. Deliverables approved by client, completion signed, and follow-on retainers identified.',
    deliverable: 'Institutional Certificate of Completion & Upsell Mandate',
  },
]

export default function UserManualModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('roles')
  const [selectedRole, setSelectedRole] = useState('exec_mgmt')

  if (!isOpen) return null

  const currentRoleGuide = ROLES_GUIDE.find((r) => r.id === selectedRole) || ROLES_GUIDE[0]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-user-manual, #printable-user-manual * {
            visibility: visible !important;
          }
          #printable-user-manual {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 10px !important;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="printable-user-manual"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 920,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #070d1e 0%, #0f172a 100%)',
            padding: '18px 24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📖</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                  THE i-CAPITAL CRM — Visualized User Manual &amp; Playbook
                </h3>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    background: '#0284c7',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  GOVERNANCE v2.6
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Institutional guide for Executive Leadership, SBU Heads, BD Managers, and Technical Leads.
              </div>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#0284c7',
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              🖨️ Print Handbook
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 20px',
            gap: 12,
          }}
        >
          {[
            { id: 'roles', label: '1. Role Playbooks & Duties', icon: '👤' },
            { id: 'stages', label: '2. 4-Stage Bidding Workflow', icon: '🔄' },
            { id: 'rules', label: '3. 3× Pipeline & Governance Rules', icon: '📐' },
            { id: 'onboarding', label: '4. 15-Minute Onboarding Checklist', icon: '⏱️' },
          ].map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '3px solid #0284c7' : '3px solid transparent',
                  color: active ? '#0284c7' : '#64748b',
                  fontWeight: active ? 800 : 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Modal Content Body */}
        <div style={{ padding: '22px 26px', overflowY: 'auto', flex: 1, color: '#0f172a' }}>
          {/* TAB 1: ROLE PLAYBOOKS */}
          {activeTab === 'roles' && (
            <div>
              {/* Role Switcher Toolbar */}
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 18,
                  flexWrap: 'wrap',
                }}
              >
                {ROLES_GUIDE.map((r) => {
                  const isSel = selectedRole === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isSel ? `2px solid ${r.badgeColor}` : '1px solid #cbd5e1',
                        background: isSel ? r.badgeBg : '#ffffff',
                        color: isSel ? r.badgeColor : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{r.icon}</span>
                      <span>{r.roleName}</span>
                    </button>
                  )
                })}
              </div>

              {/* Selected Role Card */}
              <div
                style={{
                  border: `1px solid #e2e8f0`,
                  borderRadius: 10,
                  padding: 20,
                  background: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        background: currentRoleGuide.badgeBg,
                        color: currentRoleGuide.badgeColor,
                        padding: '3px 10px',
                        borderRadius: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {currentRoleGuide.roleName}
                    </span>
                    <h4 style={{ margin: '8px 0 2px 0', fontSize: 16, fontWeight: 900 }}>
                      Assigned Members: {currentRoleGuide.audience}
                    </h4>
                  </div>
                </div>

                <div
                  style={{
                    margin: '14px 0',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    borderLeft: `4px solid ${currentRoleGuide.badgeColor}`,
                    fontSize: 13,
                    color: '#334155',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Core Mission:</strong> {currentRoleGuide.objective}
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 }}>
                    Primary Daily Operational Tasks:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                    {currentRoleGuide.dailyTasks.map((t, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 4 }}>
                      ✅ Best Practices (Dos)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
                      {currentRoleGuide.dos.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', marginBottom: 4 }}>
                      ⚠️ Things to Avoid (Don'ts)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#b91c1c', lineHeight: 1.5 }}>
                      {currentRoleGuide.donts.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 4-STAGE WORKFLOW */}
          {activeTab === 'stages' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>
                  4-Stage Consulting Revenue Lifecycle
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Every commercial engagement at The i-Capital Africa Group moves sequentially through these four gates.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {WORKFLOW_STAGES.map((ws, i) => (
                  <div
                    key={ws.stage}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '14px 18px',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          background: ws.badge,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: 14,
                        }}
                      >
                        {i + 1}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                            {ws.name}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Lead: {ws.leadRole}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                          {ws.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: 220 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                        Required Milestone
                      </span>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#0369a1' }}>
                        {ws.deliverable}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 3X RULE & GOVERNANCE */}
          {activeTab === 'rules' && (
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#334155' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                Key Commercial Governance Rules
              </h4>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0284c7', marginBottom: 4 }}>
                  Rule 1: The 3.0× Active Pipeline Coverage Rule
                </div>
                <div>
                  To hit the group annual revenue realization target of <strong>ETB 256.6M</strong>[cite: 17], historical consulting win rates require an active tender pipeline of at least <strong>3.0×</strong> (ETB 769.78M). Any SBU whose coverage drops below 3.0× triggers an immediate lead generation mandate.
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', marginBottom: 4 }}>
                  Rule 2: Go/No-Go Bid Qualification
                </div>
                <div>
                  Before investing high engineering effort into technical bids, the BD Manager and Technical Lead must evaluate the Go/No-Go score:
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
                    <li>TOR Scope Clarity &amp; Alignment with i-Capital Practice Areas.</li>
                    <li>Availability of qualified Key Experts and Team Leader CVs.</li>
                    <li>Sufficient margin after factoring in reimbursables and 15% VAT.</li>
                  </ul>
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>
                  Rule 3: Single Source of Truth
                </div>
                <div>
                  All client commitments, submitted financial values, and TOR packages must reside inside the CRM. External spreadsheets are deprecated to maintain consistent board reporting and audit readiness.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 15-MINUTE ONBOARDING CHECKLIST */}
          {activeTab === 'onboarding' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>
                  15-Minute Onboarding Walkthrough Agenda
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Use this structured checklist during the team walkthrough session.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {[
                  {
                    step: 'Minutes 0 – 3',
                    title: 'Access & Role Verification',
                    detail: 'Log into icapitalcrm.pro.et using work email and confirm assigned SBU scope in the top banner[cite: 17].',
                  },
                  {
                    step: 'Minutes 3 – 7',
                    title: 'Dashboard & Pipeline Metrics',
                    detail: 'Demonstrate SBU target attainment, 3× gap tracking, and the 1-Page PDF Briefing export.',
                  },
                  {
                    step: 'Minutes 7 – 11',
                    title: 'Deals & Proposals Progression',
                    detail: 'Walk through creating a deal, advancing stages (Stage 1 to 4), and assigning Technical Leads.',
                  },
                  {
                    step: 'Minutes 11 – 15',
                    title: 'Q&A & Feedback Intake',
                    detail: 'Address questions and record comments ahead of the full Quarter 2 transition.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {item.step}
                    </span>
                    <h5 style={{ margin: '8px 0 4px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      {item.title}
                    </h5>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="no-print"
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Platform Lead: <strong>Ybeltal Semagn</strong> • The i-Capital Africa Group
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: 'none',
              background: '#0f172a',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  )
}