import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const SBU_CONTEXTS = {
  Institute: {
    name: 'The i-Capital Institute',
    offerings: 'Master Builder Leadership (MBL), Structured On-the-Job Training (S-OJT), and PRIME Talent Development',
    executiveAngle: 'Executive competency frameworks and leadership succession amid rapid institutional transformation.',
  },
  CBS: {
    name: 'Cross Border Solutions (CBS)',
    offerings: 'Overseas Board Study Tours and Executive Immersion (Dubai, Singapore, Istanbul, Nairobi)',
    executiveAngle: 'International benchmarking for Board of Directors and C-Suite leaders navigating open banking and regional competitiveness.',
  },
  IIP: {
    name: 'i-Capital Investment Partners (IIP)',
    offerings: 'Capital Market Readiness, Commercial Paper, Corporate Bonds, and ESX Listing Advisory',
    executiveAngle: 'Alternative debt financing, capital structuring, and balance sheet optimization under the new capital market directives.',
  },
  DAS: {
    name: 'Digital & AI Solutions (DAS)',
    offerings: 'Enterprise Digital Transformation, Workflow AI Automation, and Core Analytics',
    executiveAngle: 'Operational cost efficiency and digital customer workflows via automated enterprise solutions.',
  },
}

export default function DormantAccountReviver({ onClose, onLogToQueue }) {
  const [loading, setLoading] = useState(true)
  const [dormantAccounts, setDormantAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generatedPitch, setGeneratedPitch] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    scanDormantAccounts()
  }, [])

  async function scanDormantAccounts() {
    setLoading(true)

    // 1. Fetch active deals from opportunities to track recent activities
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('client, client_name, sbu, updated_at, created_at')

    // 2. Fetch baseline client accounts
    let clientRecords = []
    const { data: clientsFromDb } = await supabase.from('clients').select('*')

    if (clientsFromDb && clientsFromDb.length > 0) {
      clientRecords = clientsFromDb
    } else {
      clientRecords = [
        { name: 'Commercial Bank of Ethiopia (CBE)', sbu: 'Institute', sector: 'Banking', contact_person: 'VP of Human Capital' },
        { name: 'Awash Bank', sbu: 'Institute', sector: 'Banking', contact_person: 'Chief Strategy Officer' },
        { name: 'Dashen Bank', sbu: 'CBS', sector: 'Banking', contact_person: 'VP of Strategic Transformation' },
        { name: 'Hibret Bank', sbu: 'IIP', sector: 'Banking', contact_person: 'Director of Treasury & Investment' },
        { name: 'Wegagen Bank', sbu: 'Institute', sector: 'Banking', contact_person: 'Head of Learning & Dev.' },
        { name: 'Nib International Bank', sbu: 'CBS', sector: 'Banking', contact_person: 'Executive Board Secretariat' },
        { name: 'Enat Bank', sbu: 'Institute', sector: 'Banking', contact_person: 'Chief Operating Officer' },
        { name: 'Ethiopian Airlines Group', sbu: 'CBS', sector: 'Aviation', contact_person: 'Managing Director of Aviation Academy' },
        { name: 'Ethio Telecom', sbu: 'DAS', sector: 'Telecom', contact_person: 'Chief Business Development Officer' },
        { name: 'MIDROC Investment Group', sbu: 'Institute', sector: 'Conglomerate', contact_person: 'Cluster Human Capital Lead' },
        { name: 'BGI Ethiopia', sbu: 'Institute', sector: 'FMCG & Manufacturing', contact_person: 'Corporate Affairs Director' },
        { name: 'Nyala Insurance', sbu: 'IIP', sector: 'Insurance', contact_person: 'Managing Director' },
      ]
    }

    const now = new Date()

    // 3. Compute inactivity duration
    const evaluated = clientRecords.map((client) => {
      const clientName = client.name || client.institution_name || client.client
      const matchingDeals = (opportunities || []).filter((opp) => {
        const oppName = opp.client || opp.client_name || ''
        return oppName.toLowerCase().includes(clientName.toLowerCase().split(' ')[0])
      })

      let lastActive = null
      if (matchingDeals.length > 0) {
        const sorted = matchingDeals.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        lastActive = new Date(sorted[0].updated_at || sorted[0].created_at)
      }

      const daysInactive = lastActive ? Math.floor((now - lastActive) / (1000 * 60 * 60 * 24)) : 95

      return {
        ...client,
        displayName: clientName,
        sbu: client.sbu || 'Institute',
        sector: client.sector || 'Financial Services',
        daysInactive,
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

  // Generate Personalized Executive Outreach via Gemini API
  async function generateReengagementPitch() {
    if (!selectedAccount) return
    setGenerating(true)
    setGeneratedPitch(null)
    setCopied(false)

    const sbuData = SBU_CONTEXTS[selectedAccount.sbu] || SBU_CONTEXTS.Institute

    try {
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!geminiApiKey) {
        throw new Error('Gemini API key not detected. Generating offline template.')
      }

      const prompt = `
You are the Senior Business Development & Relationship Officer at The i-Capital Africa Group in Addis Ababa, Ethiopia.
Write a consultative, professional, and compelling re-engagement email to a dormant institutional account.

Target Client: ${selectedAccount.displayName}
Sector: ${selectedAccount.sector}
Target SBU: ${sbuData.name}
Core Advisory Solutions: ${sbuData.offerings}
Strategic Executive Focus: ${sbuData.executiveAngle}
Target Executive Contact: ${selectedAccount.contact_person || 'Leadership Team'}

Requirements:
1. Subject line must be high-priority, executive, and non-spammy (e.g., Strategic Alignment / Executive Exploration).
2. Reference the current market developments in Ethiopia (financial sector liberalization, digital competitiveness, or leadership capacity under transformation).
3. Frame i-Capital's proven capability as a high-value advisory partner without sounding transactional or pushy.
4. Conclude with a low-friction invitation for a 20-minute exploratory briefing.
5. Return clean JSON with two fields: "subject" and "body".
`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      )

      const result = await response.json()
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text
      const parsed = JSON.parse(rawText)

      setGeneratedPitch(parsed)
    } catch {
      setGeneratedPitch({
        subject: `Strategic Dialogue: Enhancing Institutional Readiness & Leadership for ${selectedAccount.displayName}`,
        body: `Dear Leadership Team,\n\nI hope this communication finds you well.\n\nOver the past months, Ethiopia's commercial environment has accelerated towards greater liberalization, heightened governance demands, and digital-first operations. In this context, institutions like ${selectedAccount.displayName} face both unique expansion horizons and strategic operational demands.\n\nAt The i-Capital Africa Group, we have recently expanded our ${sbuData.name} mandates—specifically structuring ${sbuData.offerings}.\n\nGiven your strategic positioning, we would welcome the opportunity to convene a concise, 20-minute exploratory discussion with your executive team to explore high-impact synergies.\n\nPlease let us know if your calendar permits an introductory engagement in the coming week.\n\nWith highest professional regards,\n\nSenior Business Development Officer\nThe i-Capital Africa Group\nAddis Ababa, Ethiopia`,
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
          maxWidth: '1060px',
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
                Identifies inactive high-value accounts (60+ days) and synthesizes tailored C-suite pitches.
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

        {/* Content Split: Account List & AI Pitch Builder */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', flex: 1, minHeight: 0 }}>
          {/* Left Column: Dormant Accounts List */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                Inactive Directory Accounts ({dormantAccounts.length})
              </span>
              <span style={{ fontSize: 10, color: '#ea580c', fontWeight: 700 }}>
                60+ Days Inactive
              </span>
            </div>

            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                Scanning Client Directory &amp; Proposals…
              </div>
            ) : (
              dormantAccounts.map((acc, i) => {
                const isSelected = selectedAccount?.displayName === acc.displayName
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedAccount(acc)
                      setGeneratedPitch(null)
                    }}
                    style={{
                      background: '#ffffff',
                      border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      borderLeft: isSelected ? '5px solid #0284c7' : '3px solid #94a3b8',
                      borderRadius: 10,
                      padding: 12,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 10px rgba(2, 132, 199, 0.15)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: 4 }}>
                        {acc.sbu}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#ea580c' }}>
                        {acc.daysInactive} days silent
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                      {acc.displayName}
                    </div>

                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {acc.sector} • Contact: {acc.contact_person || 'Executive Office'}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Right Column: AI Pitch Generator & Preview */}
          <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedAccount ? (
              <>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                        Target Entity Strategy
                      </span>
                      <h4 style={{ margin: '4px 0 2px 0', fontSize: 18, color: '#0f172a', fontWeight: 900 }}>
                        {selectedAccount.displayName}
                      </h4>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Strategic SBU Match: <strong>{SBU_CONTEXTS[selectedAccount.sbu]?.name}</strong>
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
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                      }}
                    >
                      <span>{generating ? '⏳' : '✨'}</span>
                      <span>{generating ? 'Synthesizing with Gemini…' : 'Synthesize Executive Pitch'}</span>
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
                            alert(`Re-engagement touchpoint for "${selectedAccount.displayName}" registered in Follow-Up Queue!`)
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
                      Ready to synthesize outreach for {selectedAccount.displayName}
                    </strong>
                    <span style={{ fontSize: 12, maxWidth: 440 }}>
                      Click <strong>"Synthesize Executive Pitch"</strong> above to craft an outreach note matching this institution's regulatory environment and SBU catalogue offerings.
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