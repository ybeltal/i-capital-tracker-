import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import TorClarificationChat from './TorClarificationChat'

export default function ProposalDocumentEditor({ proposal, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('methodology')
  const [saving, setSaving] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [notification, setNotification] = useState('')

  // Proposal Document Sections State
  const [docData, setDocData] = useState({
    title: '',
    client: '',
    sbu: 'Institute',
    code: '',
    executiveSummary: '',
    methodology: '',
    keyExperts: '',
    workPlan: '',
    financialOffer: '',
  })

  useEffect(() => {
    if (proposal) {
      setDocData({
        title: proposal.title || proposal.product || 'Strategic Institutional Advisory Proposal',
        client: proposal.client || proposal.client_name || 'Client Target',
        sbu: proposal.sbu || 'Institute',
        code: proposal.code || 'TENDER-2026',
        executiveSummary:
          proposal.executive_summary ||
          `The i-Capital Africa Group submits this formal technical and commercial bid to deliver high-impact advisory and organizational capacity strengthening for ${proposal.client || proposal.client_name || 'the client'}. Designed in strict accordance with the terms of reference, our engagement architecture combines deep regional regulatory intelligence with actionable execution frameworks.`,
        methodology:
          proposal.methodology ||
          `Phase 1: Institutional Diagnostic & Baseline Assessment\n- Convene executive kickoff and finalize governance reporting milestones.\n- Review regulatory policies, organizational bottlenecks, and existing workflows.\n\nPhase 2: Customized Advisory & Capacity Frameworks\n- Deliver bespoke capacity modules matching operational and strategic mandates.\n- Establish standard operating procedures (SOPs) and institutional toolkits.\n\nPhase 3: Impact Realization & Sustainability Handover\n- Administer pilot testing and post-training competency evaluations.\n- Provide closing leadership debriefing and long-term sustainability roadmap.`,
        keyExperts:
          proposal.key_experts ||
          `1. Lead Engagement Partner & Project Director (15+ Years Strategic Advisory)\n2. Senior Technical Expert & Industry Specialist (10+ Years Financial / Regulatory Advisory)\n3. Project Management & Monitoring Specialist (MSc, PMP/Agile Certified)\n4. Junior Research Analyst & Data Specialist`,
        workPlan:
          proposal.work_plan ||
          `Month 1: Inception Report, Stakeholder Diagnostic, and TOR Scope Confirmation\nMonth 2-3: Core Execution, Interactive Workshops, and Strategic Document Drafting\nMonth 4: Executive Review, Revisions, and Final Governance Handover`,
        financialOffer:
          proposal.financial_offer ||
          `Professional Advisory Fees: ETB ${new Intl.NumberFormat('en-US').format(proposal.deal_value || 8500000)}\nStatutory VAT (15%): ETB ${new Intl.NumberFormat('en-US').format((proposal.deal_value || 8500000) * 0.15)}\nTotal Gross Offer: ETB ${new Intl.NumberFormat('en-US').format((proposal.deal_value || 8500000) * 1.15)}`,
      })
    }
  }, [proposal])

  function showBanner(msg) {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  // AI-Assisted Section Generator via Gemini
  async function handleAiSynthesize(sectionKey) {
    setAiGenerating(true)
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (!geminiApiKey) {
      showBanner('Gemini API key not found in .env.local')
      setAiGenerating(false)
      return
    }

    try {
      const prompt = `
You are the Lead Proposal Specialist and Project Director at The i-Capital Africa Group in Addis Ababa, Ethiopia.
Synthesize an executive-ready, highly professional bidding narrative for a formal procurement tender.

Client: ${docData.client}
Proposal Title: ${docData.title}
Strategic Business Unit (SBU): ${docData.sbu}
Target Section to Synthesize: ${sectionKey.toUpperCase()}
Current Working Draft Context:
${docData[sectionKey]}

Provide rigorous, institutional-grade text tailored to Ethiopian corporate and public-sector procurement standards. Do not include markdown code blocks or greetings.
`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      )

      const result = await res.json()
      const generated = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (generated) {
        setDocData((prev) => ({ ...prev, [sectionKey]: generated.trim() }))
        showBanner(`Enhanced ${sectionKey.toUpperCase()} with Gemini AI`)
      }
    } catch (err) {
      console.error(err)
      showBanner('Failed to generate with AI')
    } finally {
      setAiGenerating(false)
    }
  }

  // Save changes to Supabase opportunities table
  async function handleSaveDocument() {
    setSaving(true)
    if (proposal?.id) {
      const { error } = await supabase
        .from('opportunities')
        .update({
          title: docData.title,
          methodology: docData.methodology,
          executive_summary: docData.executiveSummary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id)

      if (error) {
        showBanner('Error saving to database')
      } else {
        showBanner('Proposal document successfully saved')
        onSave?.(docData)
      }
    } else {
      showBanner('Document state saved locally')
      onSave?.(docData)
    }
    setSaving(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        zIndex: 99990,
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
          maxWidth: '1200px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            background: 'linear-gradient(90deg, #070d1e 0%, #0f172a 60%, #1e293b 100%)',
            padding: '16px 24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                  Technical Proposal & Tender Submission Studio
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: '#0284c7',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  {docData.sbu}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                {docData.code} • <strong>{docData.client}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Live TOR Clarifications Trigger */}
            <button
              type="button"
              onClick={() => setShowChat(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(56, 189, 248, 0.2)',
              }}
            >
              <span>💬</span> Live TOR Clarifications
            </button>

            <button
              type="button"
              onClick={handleSaveDocument}
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
            >
              {saving ? 'Saving…' : 'Save Document'}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#cbd5e1',
                marginLeft: 4,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status Notification Toast */}
        {notification && (
          <div
            style={{
              background: '#0284c7',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 20px',
              textAlign: 'center',
            }}
          >
            {notification}
          </div>
        )}

        {/* Proposal Title & Metadata Bar */}
        <div
          style={{
            padding: '12px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 16,
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Proposal Header Title
            </label>
            <input
              type="text"
              value={docData.title}
              onChange={(e) => setDocData({ ...docData, title: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 700,
                color: '#0f172a',
                marginTop: 4,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Target Procuring Institution
            </label>
            <input
              type="text"
              value={docData.client}
              onChange={(e) => setDocData({ ...docData, client: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 700,
                color: '#0f172a',
                marginTop: 4,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 24px',
            gap: 8,
          }}
        >
          {[
            { id: 'methodology', label: '1. Technical Methodology & Approach' },
            { id: 'executiveSummary', label: '2. Executive Summary' },
            { id: 'keyExperts', label: '3. Team Composition & Key Experts' },
            { id: 'workPlan', label: '4. Work Plan & Milestone Schedule' },
            { id: 'financialOffer', label: '5. Financial & Commercial Offer' },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                  color: isActive ? '#0284c7' : '#64748b',
                  fontSize: 12,
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Workspace Body */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
              Section Workspace: {activeTab.toUpperCase()}
            </span>

            <button
              type="button"
              disabled={aiGenerating}
              onClick={() => handleAiSynthesize(activeTab)}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                cursor: aiGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              }}
            >
              <span>{aiGenerating ? '⏳' : '✨'}</span>
              <span>{aiGenerating ? 'Synthesizing with Gemini…' : 'Synthesize with Gemini AI'}</span>
            </button>
          </div>

          <textarea
            rows={18}
            value={docData[activeTab]}
            onChange={(e) => setDocData({ ...docData, [activeTab]: e.target.value })}
            style={{
              width: '100%',
              flex: 1,
              padding: 16,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              lineHeight: 1.6,
              color: '#0f172a',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              resize: 'none',
              background: '#fcfcfd',
            }}
          />
        </div>

        {/* Footer Actions */}
        <div
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
            Submission Gating: Verify all compliance and TOR questions in <strong>Live TOR Clarifications</strong> before finalizing commercial bids.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🖨️ Print / Export PDF
            </button>
            <button
              type="button"
              onClick={handleSaveDocument}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#0284c7',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Save &amp; Continue →
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Realtime TOR Clarification Drawer */}
      <TorClarificationChat
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        opportunityId={proposal?.id}
        tenderCode={docData.code}
        clientName={docData.client}
        currentUserEmail="ybeltalsemagn8899@gmail.com"
        currentUserName="Ybeltal Semagn"
      />
    </div>
  )
}