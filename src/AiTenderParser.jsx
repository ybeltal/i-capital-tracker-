import { useState, useRef } from 'react'

// Automatic fallback models if Google's primary cluster experiences high-demand spikes
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
]

export default function AiTenderParser({ onApplyToProposal, onClose }) {
  const [activeMode, setActiveMode] = useState('upload') // 'upload' | 'text'
  const [file, setFile] = useState(null)
  const [rawText, setRawText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [parsedResult, setParsedResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef(null)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  // Helper to load Mammoth.js dynamically for .docx parsing
  async function loadMammoth() {
    if (window.mammoth) return window.mammoth
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
      script.onload = () => resolve(window.mammoth)
      script.onerror = () => reject(new Error('Could not load Word document reader library.'))
      document.head.appendChild(script)
    })
  }

  function handleFileSelect(selectedFile) {
    if (!selectedFile) return
    const validExtensions = ['.pdf', '.docx', '.txt']
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext))

    if (!hasValidExt) {
      setError('Please upload a PDF (.pdf), Word document (.docx), or text file (.txt).')
      return
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB limit.')
      return
    }

    setError('')
    setFile(selectedFile)
    setParsedResult(null)
  }

  async function handleAnalyze() {
    if (!apiKey) {
      setError('Gemini API Key missing. Please ensure VITE_GEMINI_API_KEY is configured in Vercel.')
      return
    }

    if (activeMode === 'upload' && !file) {
      setError('Please choose or drop a PDF or Word file to analyze.')
      return
    }

    if (activeMode === 'text' && !rawText.trim()) {
      setError('Please paste the tender notice, TOR scope, or RFP text first.')
      return
    }

    setAnalyzing(true)
    setError('')
    setStatusMessage('Reading document content…')

    const systemPrompt = `
You are the Chief Commercial Analyst at The i-Capital Africa Group in Addis Ababa, Ethiopia.
Your job is to read raw Tender / RFP / Terms of Reference (TOR) / Expression of Interest (EOI) documents and extract commercial data into a strict JSON object.

The i-Capital Africa Group has 4 Strategic Business Units (SBUs):
1. 'The i-Capital Institute' (code: 'Institute'): Executive Leadership (MBL), S-OJT, PRIME Staff Development, Strategize Transformation, Knowledge Management (KMS), BDS, Afro Data.
2. 'i-Capital Investment Partners' (code: 'IIP'): Rights Issues, Corporate Bonds, Commercial Paper, Capital Market Readiness/Training, Public Listings, Wealth/Asset Advisory.
3. 'Digital & AI Solutions' (code: 'DAS'): SHOFER Parking/Auto platform, Investify ET, Enterprise ERP, Micro-Credit.
4. 'Cross Border Solutions' (code: 'CBS'): Global Board Study Tours (Thailand, Singapore, Dubai), Overseas Training, Regional Interoperability & Payments Missions.

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
      let parts = [{ text: systemPrompt }]

      if (activeMode === 'upload') {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        const isDocx = file.name.toLowerCase().endsWith('.docx')

        if (isPdf) {
          setStatusMessage('Processing PDF pages…')
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result.split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          parts.push({
            inline_data: {
              mime_type: 'application/pdf',
              data: base64Data,
            },
          })
          parts.push({
            text: 'Analyze the attached PDF document thoroughly. Extract all commercial intelligence into the requested JSON schema.',
          })
        } else if (isDocx) {
          setStatusMessage('Extracting Word document text…')
          const mammoth = await loadMammoth()
          const arrayBuffer = await file.arrayBuffer()
          const result = await mammoth.extractRawText({ arrayBuffer })
          const docText = result.value || ''

          if (!docText.trim()) throw new Error('Word document contains no readable text.')

          setStatusMessage('Document extracted. Preparing AI analysis…')
          parts.push({
            text: `DOCUMENT CONTENT (FROM WORD FILE: ${file.name}):\n\n${docText}`,
          })
        } else {
          const textContent = await file.text()
          parts.push({
            text: `DOCUMENT CONTENT (FROM FILE: ${file.name}):\n\n${textContent}`,
          })
        }
      } else {
        parts.push({
          text: `RAW TENDER / TOR TEXT TO ANALYZE:\n\n${rawText}`,
        })
      }

      // Multi-model resilience loop: iterates through models and retries if a capacity spike occurs
      let resData = null
      let lastErrorMessage = ''

      for (const modelName of CANDIDATE_MODELS) {
        let modelSuccess = false

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (attempt > 0) {
              setStatusMessage(`Server busy. Retrying in 2 seconds…`)
              await new Promise((r) => setTimeout(r, 2000))
            } else {
              setStatusMessage(`Analyzing with ${modelName}…`)
            }

            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts }],
                  generationConfig: {
                    temperature: 0.1,
                    responseMimeType: 'application/json',
                  },
                }),
              }
            )

            if (!response.ok) {
              const errJson = await response.json().catch(() => ({}))
              const msg = errJson.error?.message || `HTTP ${response.status}`
              lastErrorMessage = msg

              // If it's a temporary spike or model unavailability, try backoff or next model
              if (
                response.status === 503 ||
                response.status === 429 ||
                response.status === 404 ||
                msg.toLowerCase().includes('demand') ||
                msg.toLowerCase().includes('temporarily') ||
                msg.toLowerCase().includes('not found')
              ) {
                continue
              }
              throw new Error(msg)
            }

            resData = await response.json()
            modelSuccess = true
            break
          } catch (err) {
            lastErrorMessage = err.message
          }
        }

        if (modelSuccess && resData) break
      }

      if (!resData) {
        throw new Error(lastErrorMessage || 'All AI model endpoints are currently busy. Please retry shortly.')
      }

      const rawJson = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const cleanedJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleanedJson)

      setParsedResult(parsed)
      setStatusMessage('')
    } catch (err) {
      setError(err.message || 'Could not parse the document.')
      setStatusMessage('')
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
      notes: `[AI_EXTRACTED: TRUE] [TENDER_REF: ${parsedResult.tender_ref_no || 'N/A'}] [FILE_SOURCE: ${file ? file.name : 'Pasted Text'}] [DELIVERABLES: ${(parsedResult.key_deliverables || []).join('; ')}] ${parsedResult.executive_summary || ''}`,
    }

    onApplyToProposal?.(proposalPayload)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
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
            Gemini Multimodal Engine
          </span>
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
          Upload official tender PDF, Word (.docx) terms of reference, or paste tender text directly.
        </p>
      </div>

      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
        <button
          type="button"
          onClick={() => {
            setActiveMode('upload')
            setError('')
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeMode === 'upload' ? '#ffffff' : 'transparent',
            color: activeMode === 'upload' ? '#0f172a' : '#64748b',
            boxShadow: activeMode === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>📄</span> Upload Document (PDF / Word)
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMode('text')
            setError('')
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeMode === 'text' ? '#ffffff' : 'transparent',
            color: activeMode === 'text' ? '#0f172a' : '#64748b',
            boxShadow: activeMode === 'text' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>✍️</span> Paste Tender Text
        </button>
      </div>

      {error && (
        <div style={{ padding: 10, borderRadius: 6, background: '#fef2f2', border: '1px solid #fecdd3', color: '#b91c1c', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Upload Zone */}
      {activeMode === 'upload' && (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.docx,.txt"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFileSelect(e.dataTransfer.files?.[0])
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: dragOver ? '2px dashed #0284c7' : '2px dashed #cbd5e1',
              background: dragOver ? '#f0f9ff' : file ? '#f8fafc' : '#ffffff',
              borderRadius: 10,
              padding: '28px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 32 }}>
                  {file.name.endsWith('.pdf') ? '📕' : file.name.endsWith('.docx') ? '📘' : '📄'}
                </span>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>{file.name}</strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Click or drop another file to replace
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 32 }}>📁</span>
                <strong style={{ fontSize: 13, color: '#1e293b' }}>
                  Click to browse or drag &amp; drop RFP/TOR file here
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Supports official <strong>PDF (.pdf)</strong> and <strong>Word (.docx)</strong> documents up to 25MB
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Textarea Zone */}
      {activeMode === 'text' && (
        <div>
          <textarea
            rows={7}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste tender advertisement, Terms of Reference (TOR) scope, request for proposal notice, or email inquiry..."
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
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>
          {statusMessage || (activeMode === 'upload' && file ? 'Ready to analyze document' : '')}
        </span>

        <button
          type="button"
          disabled={analyzing || (activeMode === 'upload' && !file) || (activeMode === 'text' && !rawText.trim())}
          onClick={handleAnalyze}
          style={{
            padding: '9px 20px',
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
          {analyzing ? (
            <>
              <span style={{ display: 'inline-block' }}>⏳</span>
              Analyzing Document…
            </>
          ) : (
            '✨ Extract Commercial Intelligence'
          )}
        </button>
      </div>

      {/* Results */}
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
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block' }}>ESTIMATED DEAL VALUE</span>
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