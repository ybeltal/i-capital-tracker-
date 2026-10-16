import { useState } from 'react'

export default function AiTenderParser({ onApplyToProposal, onClose }) {
  const [rawText, setRawText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [parsedResult, setParsedResult] = useState(null)

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  async function handleAnalyze() {
    if (!rawText.trim()) {
      setError('Please paste the tender notice, TOR scope, or RFP text first.')
      return
    }
    if (!apiKey) {
      setError('Gemini API Key missing. Please ensure VITE_GEMINI_API_KEY is configured in Vercel.')
      return
    }

    setAnalyzing(true)
    setError('')

    const systemPrompt = `
You are the Chief Commercial Analyst at The i-Capital Africa Group in Addis Ababa, Ethiopia.
Your job is to read raw Tender / RFP / Terms of Reference (TOR) / Expression of Interest (EOI) text and extract commercial data into a strict JSON object.

The i-Capital Africa Group has 4 Strategic Business Units (SBUs):
1. 'The i-Capital Institute' (code: 'Institute'): Executive Leadership (MBL), S-OJT, PRIME Staff Development, Strategize Transformation, Knowledge Management (KMS), BDS, Afro Data.
2. 'i-Capital Investment Partners' (code: 'IIP'): Rights Issues, Corporate Bonds, Commercial Paper, Capital Market Readiness/Training, Public Listings, Wealth/Asset Advisory.
3. 'Digital & AI Solutions' (code: 'DAS'): SHOFER Parking/Auto platform, Investify ET, Enterprise ERP, Micro-Credit.
4. 'Cross Border Solutions' (code: 'CBS'): Global Board Study Tours (Thailand, Singapore, Dubai), Regional Interoperability & Payments Missions.

Extract and return ONLY a valid raw JSON object (with NO markdown code blocks, NO backticks, and NO extra text) with these exact keys:
{
  "client_name": "Full legal or institutional name of issuing client",
  "tender_title": "Clear, professional proposal title",
  "tender_ref_no": "RFP or bid reference number, or null if none",
  "submission_deadline": "YYYY-MM-DD format, or null if not stated",
  "estimated_value_etb": Number (in ETB without commas, or null if not stated),
  "recommended_sbu": "Institute" | "IIP" | "DAS" | "CBS",
  "recommended_product": "Most applicable product from i-Capital catalogue",
  "invitation_type": "RFP" | "TOR" | "LETTER" | "EMAIL",
  "key_deliverables": ["Deliverable 1", "Deliverable 2", "Deliverable 3"],
  "qualification_criteria": "Key eligibility or submission requirements",
  "executive_summary": "2-3 sentence strategic summary of the assignment"
}
`

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: `RAW TENDER / TOR TEXT TO ANALYZE:\n\n${rawText}` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || 'Gemini API call failed.')
      }

      const resData = await response.json()
      const rawJson = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const cleanedJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleanedJson)

      setParsedResult(parsed)
    } catch (err) {
      setError(err.message || 'Could not parse the document.')
    } finally {
      setAnalyzing(false)
    }
  }

  function handleTransfer() {
    if (!parsedResult) return

    const proposalPayload = {
      client: parsedResult.client_name || 'Institutional Client',
      product: parsedResult.recommended_product || parsedResult.tender_title,
      sbu: parsedResult.recommended_sbu || 'Institute',
      title: parsedResult.tender_title || '',
      dealValue: parsedResult.estimated_value_etb || '',
      deadline: parsedResult.submission_deadline || '',
      refNumber: parsedResult.tender_ref_no || '',
      mandateType: parsedResult.invitation_type || 'TOR',
      notes: `[AI_EXTRACTED: TRUE] [TENDER_REF: ${parsedResult.tender_ref_no || 'N/A'}] [DELIVERABLES: ${(parsedResult.key_deliverables || []).join('; ')}] ${parsedResult.executive_summary || ''}`,
    }

    onApplyToProposal?.(proposalPayload)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>✨</span>
          <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
            AI TOR / RFP Tender Document Parser
          </h3>
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
            Powered by Gemini
          </span>
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
          Paste tender notices, Terms of Reference (TOR), RFPs, or invitation emails. AI extracts client intelligence and loads it directly into your proposal pipeline.
        </p>
      </div>

      {error && (
        <div style={{ padding: 10, borderRadius: 6, background: '#fef2f2', border: '1px solid #fecdd3', color: '#b91c1c', fontSize: 12 }}>
          {error}
        </div>
      )}

      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
          Paste Raw Tender / RFP / TOR Text:
        </label>
        <textarea
          rows={7}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste tender advertisement, TOR scope, RFP notice, or email inquiry..."
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 12,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {rawText.length > 0 ? `${rawText.length} characters entered` : 'Paste at least 1-2 paragraphs'}
          </span>
          <button
            type="button"
            disabled={analyzing || !rawText.trim()}
            onClick={handleAnalyze}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: 'none',
              background: analyzing ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: analyzing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
            }}
          >
            {analyzing ? 'Analyzing Tender Scope…' : '✨ Extract Commercial Intelligence'}
          </button>
        </div>
      </div>

      {parsedResult && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>
              ✓ Analysis Complete
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Ref: <strong style={{ color: '#0f172a' }}>{parsedResult.tender_ref_no || 'N/A'}</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block' }}>CLIENT ACCOUNT</span>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>{parsedResult.client_name}</strong>
            </div>

            <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block' }}>STRATEGIC SBU FIT</span>
              <strong style={{ fontSize: 13, color: '#0284c7' }}>{parsedResult.recommended_sbu}</strong>
            </div>

            <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block' }}>DEADLINE DATE</span>
              <strong style={{ fontSize: 13, color: parsedResult.submission_deadline ? '#ea580c' : '#64748b' }}>
                {parsedResult.submission_deadline || 'Not Specified'}
              </strong>
            </div>

            <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block' }}>BUDGET / DEAL VALUE</span>
              <strong style={{ fontSize: 13, color: '#166534' }}>
                {parsedResult.estimated_value_etb ? `ETB ${new Intl.NumberFormat('en-US').format(parsedResult.estimated_value_etb)}` : 'Competitive Quote'}
              </strong>
            </div>
          </div>

          <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>
              SUGGESTED PRODUCT / ROUTE ENGINE
            </span>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              {parsedResult.recommended_product}
            </div>
          </div>

          {parsedResult.key_deliverables?.length > 0 && (
            <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                KEY DELIVERABLES EXTRACTED
              </span>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155' }}>
                {parsedResult.key_deliverables.map((del, idx) => (
                  <li key={idx}>{del}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>
              STRATEGIC SUMMARY
            </span>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
              {parsedResult.executive_summary}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={handleTransfer}
              style={{
                padding: '10px 18px',
                borderRadius: 6,
                border: 'none',
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 3px 8px rgba(234, 88, 12, 0.3)',
              }}
            >
              📋 Transfer to Proposal Form &amp; Register in Kanban →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}