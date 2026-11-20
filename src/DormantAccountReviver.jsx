import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { MASTER_184_DIRECTORY } from './ClientDirectory'

const SBU_CONFIG = {
  Institute: {
    name: 'The i-Capital Institute',
    badgeBg: '#e0f2fe',
    color: '#0284c7',
    offerings: 'Master Builder Leadership (MBL), Structured On-the-Job Training (S-OJT), and PRIME Talent Development',
    executiveAngle: 'Executive competency frameworks and leadership succession amid rapid institutional transformation.',
  },
  CBS: {
    name: 'Cross Border Solutions (CBS)',
    badgeBg: '#e0e7ff',
    color: '#6366f1',
    offerings: 'Overseas Board Study Tours and Executive Immersion (Dubai, Singapore, Istanbul, Nairobi)',
    executiveAngle: 'International benchmarking for Board of Directors and C-Suite leaders navigating open banking and regional competitiveness.',
  },
  IIP: {
    name: 'i-Capital Investment Partners (IIP)',
    badgeBg: '#ccfbf1',
    color: '#0d9488',
    offerings: 'Capital Market Readiness, Commercial Paper, Corporate Bonds, and ESX Listing Advisory',
    executiveAngle: 'Alternative debt financing, capital structuring, and balance sheet optimization under the new capital market directives.',
  },
  DAS: {
    name: 'Digital & AI Solutions (DAS)',
    badgeBg: '#fef3c7',
    color: '#d97706',
    offerings: 'Enterprise Digital Transformation, SHOFER Platform, and Investify ET Automation',
    executiveAngle: 'Operational cost efficiency and digital customer workflows via automated enterprise solutions.',
  },
}

export default function DormantAccountReviver({ onClose, onLogToQueue }) {
  const [loading, setLoading] = useState(true)
  const [dormantAccounts, setDormantAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedSbuFilter, setSelectedSbuFilter] = useState('ALL')
  const [generating, setGenerating] = useState(false)
  const [generatedPitch, setGeneratedPitch] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    scanDormantAccounts()
  }, [])

  async function scanDormantAccounts() {
    setLoading(true)

    // Assess client activity and interest signals across all 4 CRM sources
    const [oppRes, propRes, leadRes, mktRes] = await Promise.all([
      supabase.from('opportunities').select('client, client_name, client_organization, title, opportunity_title, sbu, stage, status, updated_at, created_at'),
      supabase.from('proposals').select('client, client_name, client_organization, title, opportunity_title, sbu, stage, status, updated_at, created_at'),
      supabase.from('leads').select('client_name, client_organization, organization, title, opportunity_title, sbu, screening_status, updated_at, created_at'),
      supabase.from('marketing_leads').select('organization, service_of_interest, preferred_next_step, pipeline_status, created_at'),
    ])

    const opportunities = oppRes.data || []
    const proposals = propRes.data || []
    const leads = leadRes.data || []
    const mktLeads = mktRes.data || []
    const now = new Date()

    const evaluated = MASTER_184_DIRECTORY.map((client) => {
      const clientName = client.name
      const matchToken = clientName.toLowerCase().split(' ')[0]
      const interestSignals = []
      const activityDates = []

      // 1. Check Opportunities
      opportunities.forEach((o) => {
        const name = (o.client || o.client_name || o.client_organization || '').toLowerCase()
        if (matchToken.length > 2 && name.includes(matchToken)) {
          const title = o.opportunity_title || o.title
          if (title) interestSignals.push(`Past Opportunity: ${title} (${o.stage || o.status || 'Tracked'})`)
          if (o.updated_at || o.created_at) activityDates.push(new Date(o.updated_at || o.created_at))
        }
      })

      // 2. Check Proposals
      proposals.forEach((p) => {
        const name = (p.client || p.client_name || p.client_organization || '').toLowerCase()
        if (matchToken.length > 2 && name.includes(matchToken)) {
          const title = p.opportunity_title || p.title
          if (title) interestSignals.push(`Proposal History: ${title}`)
          if (p.updated_at || p.created_at) activityDates.push(new Date(p.updated_at || p.created_at))
        }
      })

      // 3. Check Pre-Tender Leads
      leads.forEach((l) => {
        const name = (l.client_organization || l.organization || l.client_name || '').toLowerCase()
        if (matchToken.length > 2 && name.includes(matchToken)) {
          const title = l.opportunity_title || l.title
          if (title) interestSignals.push(`Lead Screening: ${title}`)
          if (l.updated_at || l.created_at) activityDates.push(new Date(l.updated_at || l.created_at))
        }
      })

      // 4. Check Inbound Digital Marketing Inquiries
      mktLeads.forEach((m) => {
        const name = (m.organization || '').toLowerCase()
        if (matchToken.length > 2 && name.includes(matchToken)) {
          if (m.service_of_interest) interestSignals.push(`Inbound Web Inquiry: ${m.service_of_interest}`)
          if (m.created_at) activityDates.push(new Date(m.created_at))
        }
      })

      let lastActive = null
      if (activityDates.length > 0) {
        activityDates.sort((a, b) => b - a)
        lastActive = activityDates[0]
      }

      const daysInactive = lastActive
        ? Math.floor((now - lastActive) / (1000 * 60 * 60 * 24))
        : 95

      const uniqueSignals = Array.from(new Set(interestSignals)).slice(0, 3)

      return {
        ...client,
        displayName: clientName,
        daysInactive,
        interestSignals: uniqueSignals,
        status: daysInactive >= 60 ? 'Dormant' : 'Active',
      }
    })

    const dormantList = evaluated
      .filter((acc) => acc.daysInactive >= 60)
      .sort((a, b) => b.daysInactive - a.daysInactive)

    setDormantAccounts(dormantList)
    if (dormantList.length > 0) setSelectedAccount(dormantList[0])
    setLoading(false)
  }

  const filteredDormant = dormantAccounts.filter(
    (acc) => selectedSbuFilter === 'ALL' || acc.sbu === selectedSbuFilter
  )

  async function generateReengagementPitch() {
    if (!selectedAccount) return
    setGenerating(true)
    setGeneratedPitch(null)
    setCopied(false)

    const sbuData = SBU_CONFIG[selectedAccount.sbu] || SBU_CONFIG.Institute
    const nominatedProduct = selectedAccount.service_fit || sbuData.offerings
    const signalsSummary =
      selectedAccount.interestSignals && selectedAccount.interestSignals.length > 0
        ? selectedAccount.interestSignals.join('; ')
        : `Sector-aligned institutional pathway (${selectedAccount.sector})`

    try {
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!geminiApiKey) {
        throw new Error('Gemini API key not configured.')
      }

      const prompt = `
You are the Senior Business Development & Relationship Officer at The i-Capital Africa Group in Addis Ababa, Ethiopia.
Write a consultative, executive re-engagement email to a dormant institutional account based on the specific product nominated by our SBU and our assessment of the client's interest across CRM sources.

Target Client: ${selectedAccount.displayName}
Sector: ${selectedAccount.sector}
Nominated SBU: ${sbuData.name}
SBU-Nominated Product / Solution Fit: ${nominatedProduct}
Assessed Client Interest Signals Across Sources: ${signalsSummary}
Strategic Executive Focus: ${sbuData.executiveAngle}
Target Executive Contact: ${selectedAccount.contact_person || 'Leadership Team'}

Requirements:
1. Subject line must highlight the SBU-nominated product (${nominatedProduct}) in a refined, executive tone.
2. Tailor the value proposition specifically to "${nominatedProduct}" and connect naturally to the client's sector (${selectedAccount.sector}) and any assessed interest signals (${signalsSummary}).
3. Reference current Ethiopian market developments (financial sector liberalization, ESX capital market readiness, or digital competitiveness).
4. Conclude with a low-friction invitation for a 20-minute exploratory briefing.
5. Return clean JSON with two fields: "subject" and "body".
`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Gemini API HTTP ${response.status}`)
      }

      const result = await response.json()
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text
      const parsed = JSON.parse(rawText)
      setGeneratedPitch(parsed)
    } catch {
      const signalNote =
        selectedAccount.interestSignals && selectedAccount.interestSignals.length > 0
          ? `Building on our earlier institutional touchpoints (${selectedAccount.interestSignals[0]}), `
          : ''

      setGeneratedPitch({
        subject: `${nominatedProduct}: Strategic Advisory Briefing for ${selectedAccount.displayName}`,
        body: `Dear ${selectedAccount.contact_person || 'Executive Leadership'},\n\nI hope this communication finds you well.\n\nOver the past months, Ethiopia's ${selectedAccount.sector} sector has entered a decisive phase of institutional modernization, regulatory evolution, and heightened operational competitiveness.\n\n${signalNote}our ${sbuData.name} practice has specifically nominated our ${nominatedProduct} framework for ${selectedAccount.displayName}. ${sbuData.executiveAngle}\n\nWe would welcome the opportunity to convene a focused, 20-minute exploratory briefing with your team to share how ${nominatedProduct} can support your ${selectedAccount.quarter} strategic priorities.\n\nPlease let us know a convenient time next week for a brief introductory conversation.\n\nWith highest professional regards,\n\nSenior Business Development & Relationship Officer\nThe i-Capital Africa Group\nAddis Ababa, Ethiopia`,
      })
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    if (!generatedPitch) return
    const textToCopy = `Subject: ${generatedPitch.subject}\n\n${generatedPitch.body}`
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(90deg, #070d1e 0%, #0f172a 60%, #1e293b 100%)',
            padding: '18px 24px',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  Autonomous Client Re-Engagement Engine
                </h3>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#ea580c', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>
                  Dormant Account Reviver
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Multi-source interest assessment &amp; SBU-nominated product email drafter across the 184 directory baseline.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#cbd5e1' }}
          >
            ✕
          </button>
        </div>

        {/* Multi-SBU Category Filter Bar */}
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
            FILTER SBU:
          </span>
          {[
            { id: 'ALL', label: 'All SBUs', count: dormantAccounts.length },
            { id: 'Institute', label: 'The i-Capital Institute', count: dormantAccounts.filter((d) => d.sbu === 'Institute').length },
            { id: 'IIP', label: 'Investment Partners (IIP)', count: dormantAccounts.filter((d) => d.sbu === 'IIP').length },
            { id: 'DAS', label: 'Digital & AI Solutions (DAS)', count: dormantAccounts.filter((d) => d.sbu === 'DAS').length },
            { id: 'CBS', label: 'Cross Border Solutions (CBS)', count: dormantAccounts.filter((d) => d.sbu === 'CBS').length },
          ].map((sbu) => {
            const isSel = selectedSbuFilter === sbu.id
            return (
              <button
                key={sbu.id}
                type="button"
                onClick={() => {
                  setSelectedSbuFilter(sbu.id)
                  const list = dormantAccounts.filter((d) => sbu.id === 'ALL' || d.sbu === sbu.id)
                  if (list.length > 0) setSelectedAccount(list[0])
                  setGeneratedPitch(null)
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: isSel ? '1px solid #0284c7' : '1px solid #cbd5e1',
                  background: isSel ? '#0284c7' : '#ffffff',
                  color: isSel ? '#ffffff' : '#334155',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{sbu.label}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    background: isSel ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isSel ? '#ffffff' : '#64748b',
                    padding: '1px 5px',
                    borderRadius: 8,
                  }}
                >
                  {sbu.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Content Split */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', flex: 1, minHeight: 0 }}>
          {/* Account List */}
          <div
            style={{
              borderRight: '1px solid #e2e8f0',
              background: '#f8fafc',
              padding: 16,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                Scanning 184 Target Baseline &amp; Multi-Source Signals…
              </div>
            ) : filteredDormant.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                No dormant accounts found for {selectedSbuFilter}.
              </div>
            ) : (
              filteredDormant.map((acc, i) => {
                const isSelected = selectedAccount?.displayName === acc.displayName
                const conf = SBU_CONFIG[acc.sbu] || SBU_CONFIG.Institute

                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedAccount(acc)
                      setGeneratedPitch(null)
                    }}
                    style={{
                      background: '#ffffff',
                      border: isSelected ? `2px solid ${conf.color}` : '1px solid #cbd5e1',
                      borderLeft: `5px solid ${conf.color}`,
                      borderRadius: 10,
                      padding: 12,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          background: conf.badgeBg,
                          color: conf.color,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {acc.sbu}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#ea580c' }}>
                        {acc.daysInactive} days silent
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                      {acc.displayName}
                    </div>

                    <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, marginTop: 2 }}>
                      Nominated: {acc.service_fit}
                    </div>

                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                      {acc.sector} • Quarter: <strong>{acc.quarter}</strong>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* AI Pitch Generator Panel */}
          <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedAccount ? (
              <>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: SBU_CONFIG[selectedAccount.sbu]?.color || '#0284c7',
                          textTransform: 'uppercase',
                        }}
                      >
                        SBU-Nominated Product &amp; Multi-Source Interest Assessment
                      </span>
                      <h4 style={{ margin: '4px 0 4px 0', fontSize: 18, color: '#0f172a', fontWeight: 900 }}>
                        {selectedAccount.displayName}
                      </h4>
                      <div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>
                        Nominated Product: <strong style={{ color: '#0284c7' }}>{selectedAccount.service_fit}</strong> ({SBU_CONFIG[selectedAccount.sbu]?.name})
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        <strong>Assessed Interest Signals:</strong>{' '}
                        {selectedAccount.interestSignals && selectedAccount.interestSignals.length > 0
                          ? selectedAccount.interestSignals.join(' • ')
                          : `Sector fit (${selectedAccount.sector}) • Target Quarter ${selectedAccount.quarter}`}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={generating}
                      onClick={generateReengagementPitch}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: generating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                      }}
                    >
                      <span>{generating ? '⏳' : '✨'}</span>
                      <span>{generating ? 'Synthesizing Pitch…' : 'Draft Nominated Product Email'}</span>
                    </button>
                  </div>
                </div>

                {generatedPitch ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        EMAIL SUBJECT LINE
                      </label>
                      <input
                        type="text"
                        value={generatedPitch.subject}
                        onChange={(e) => setGeneratedPitch({ ...generatedPitch, subject: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#0f172a',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        EXECUTIVE RE-ENGAGEMENT BODY
                      </label>
                      <textarea
                        rows={12}
                        value={generatedPitch.body}
                        onChange={(e) => setGeneratedPitch({ ...generatedPitch, body: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: '#1e293b',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          flex: 1,
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                      <button
                        type="button"
                        onClick={handleCopy}
                        style={{
                          padding: '9px 18px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          background: copied ? '#f0fdf4' : '#ffffff',
                          color: copied ? '#166534' : '#0f172a',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>{copied ? '✓' : '📋'}</span>
                        <span>{copied ? 'Copied to Clipboard!' : 'Copy Email Pitch'}</span>
                      </button>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <a
                          href={`mailto:?subject=${encodeURIComponent(generatedPitch.subject)}&body=${encodeURIComponent(generatedPitch.body)}`}
                          style={{
                            textDecoration: 'none',
                            padding: '9px 18px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#0f172a',
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span>✉️</span> Open in Outlook / Gmail
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            onLogToQueue?.(selectedAccount, generatedPitch)
                            onClose()
                          }}
                          style={{
                            padding: '9px 18px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          Log to Follow-up Queue →
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: 12,
                      padding: 40,
                      textAlign: 'center',
                      color: '#64748b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>⚡</span>
                    <strong style={{ color: '#0f172a', fontSize: 14 }}>
                      Ready to draft outreach for {selectedAccount.displayName}
                    </strong>
                    <span style={{ fontSize: 12, maxWidth: 460 }}>
                      Click <strong>&quot;Draft Nominated Product Email&quot;</strong> above to generate an outreach email tailored to <strong>{selectedAccount.service_fit}</strong> and {selectedAccount.displayName}&apos;s assessed multi-source interest signals.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                Select an account from the dormant directory on the left.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}