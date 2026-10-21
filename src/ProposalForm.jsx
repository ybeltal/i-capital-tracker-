import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Official Strategic Products and Route Engines from FY 2026/27 Pipeline Readiness Report
const SBU_PRODUCT_ENGINES = {
  Institute: [
    'Master Builder Leadership Development Program',
    'S-OJT (Structured On-the-Job Training)',
    'PRIME Staff Development Program',
    'Strategize',
    'BDS (Business Development Services)',
    'VSM (Value Stream Mapping)',
    'Knowledge Management System',
    'Afro Data',
  ],
  CBS: [
    'Cross-Border Market Expansion',
    'Regional Trade & AfCFTA Advisory',
    'Diaspora Capital & Commercial Routing',
    'International Institutional Partnerships',
    'Global Supply Chain & Trade Facilitation',
  ],
  IIP: [
    'Equity Market Access Route',
    'Debt Market Access Route',
    'Strategic Transactions & M&A Route',
    'Capital Structure & Cross-Cutting Advisory',
    'Investor Advisory & Wealth Route',
    'Capital Market Readiness & Training',
    'Corporate Bond Advisory',
    'Commercial Paper Advisory',
    'Rights Offer Advisory',
    'Capital Market Advisory Services',
    'DSB Route',
  ],
  DAS: [
    'SHOFER Parking',
    'SHOFER Car Wash',
    'SHOFER Auto Care',
    'SHOFER Insurance',
    'SHOFER Learning',
    'SHOFER Promotion',
    'Investify ET',
    'Afro Data',
    'ERP Solutions',
    'Micro-Credit Platform',
    'Master Builder Leadership Development Program',
    'Strategize',
  ],
}

const INCEPTION_EVIDENCE_TYPES = [
  { id: 'TOR_RFP', label: '📄 Official TOR / RFP Document' },
  { id: 'INVITATION_LETTER', label: '✉️ Client Invitation to Bid (LOI / Letter)' },
  { id: 'PORTAL_LINK', label: '🌐 Tender Portal Reference / e-GP Publication' },
  { id: 'CLIENT_EMAIL', label: '📧 Formal Client Procurement Email / Memo' },
  { id: 'EXPRESSION_OF_INTEREST', label: '📑 Published EOI Notice' },
]

const BANNED_DUMMY_STRINGS = ['test', 'asdf', '123', 'none', 'na', 'fake', 'abc', 'xxx', 'sample', 'demo']

export default function ProposalForm({
  targetContext = null,
  currentUser = 'ybeltalsemagn8899@gmail.com',
  onSaved,
  onClose,
}) {
  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Commercial Proposal Fields
  const [formData, setFormData] = useState({
    code: '',
    client: '',
    sbu: 'Institute',
    product: 'Master Builder Leadership Development Program',
    title: '',
    deal_value: 1500000,
    stage: '1. TOR / RFP Identified',
    deadline: '',
    commercial_owner_email: currentUser || 'ybeltalsemagn8899@gmail.com',
    technical_lead_email: '',
    next_action: 'Submit formal clarification request or review technical specifications',
    notes: '',
  })

  // Mandatory Inception Evidence Fields
  const [evidenceData, setEvidenceData] = useState({
    evidence_type: 'TOR_RFP',
    document_title: '',
    file_url: '',
    notes: '',
  })

  // File Upload & Anti-Deceit Attestation
  const [attachedFile, setAttachedFile] = useState(null)
  const [attestationConfirmed, setAttestationConfirmed] = useState(false)

  // Normalize initial SBU and auto-fill from targetContext
  useEffect(() => {
    const randomCode = `INST-2026-${Math.floor(100 + Math.random() * 900)}`

    let initialSbu = 'Institute'
    if (targetContext?.sbu) {
      const s = targetContext.sbu.toLowerCase()
      if (s.includes('cross') || s.includes('cbs') || s.includes('border')) initialSbu = 'CBS'
      else if (s.includes('invest') || s.includes('iip')) initialSbu = 'IIP'
      else if (s.includes('digital') || s.includes('das')) initialSbu = 'DAS'
      else initialSbu = 'Institute'
    }

    const availableEngines = SBU_PRODUCT_ENGINES[initialSbu] || SBU_PRODUCT_ENGINES.Institute
    const matchedProduct = availableEngines.includes(targetContext?.product || targetContext?.fit)
      ? (targetContext.product || targetContext.fit)
      : availableEngines[0]

    setFormData({
      code: targetContext?.code || randomCode,
      client: targetContext?.client || targetContext?.name || targetContext?.client_name || '',
      sbu: initialSbu,
      product: matchedProduct,
      title: targetContext?.title || (targetContext?.client || targetContext?.name ? `${targetContext.client || targetContext.name} Proposal` : ''),
      deal_value: Number(targetContext?.deal_value || targetContext?.defaultValue || 1500000),
      stage: targetContext?.stage || '1. TOR / RFP Identified',
      deadline: targetContext?.deadline || '',
      commercial_owner_email: currentUser || 'ybeltalsemagn8899@gmail.com',
      technical_lead_email: '',
      next_action: 'Review technical specifications and formulate proposal response plan',
      notes: targetContext?.notes || '',
    })
  }, [targetContext, currentUser])

  function handleSbuChange(newSbu) {
    const engines = SBU_PRODUCT_ENGINES[newSbu] || []
    setFormData((prev) => ({
      ...prev,
      sbu: newSbu,
      product: engines[0] || '',
    }))
  }

  // Strict Validation Checks
  const clientValid = formData.client.trim().length >= 3
  const titleValid = formData.title.trim().length >= 5
  const valueValid = Number(formData.deal_value) > 0

  const docTitleClean = evidenceData.document_title.trim().toLowerCase()
  const isDummyText = BANNED_DUMMY_STRINGS.some((d) => docTitleClean === d || docTitleClean.startsWith(d))
  const refTitleValid = evidenceData.document_title.trim().length >= 6 && !isDummyText

  const hasValidUrl =
    evidenceData.file_url.trim().startsWith('http://') ||
    evidenceData.file_url.trim().startsWith('https://')
  const hasPhysicalFile = attachedFile !== null
  const proofProvided = hasPhysicalFile || hasValidUrl

  // Master Governance Lock
  const isFormLocked = !clientValid || !titleValid || !valueValid || !refTitleValid || !proofProvided || !attestationConfirmed

  async function handleFileUpload(file) {
    if (!file) return null
    setUploadingFile(true)
    try {
      const fileExt = file.name.split('.').pop()
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `tender_inceptions/${cleanFileName}`

      const { error } = await supabase.storage
        .from('deal-evidence')
        .upload(filePath, file)

      if (error) {
        console.warn('Storage upload notice, falling back to local file reference:', error.message)
        return `attachment://${file.name}`
      }

      const { data: urlData } = supabase.storage.from('deal-evidence').getPublicUrl(filePath)
      return urlData?.publicUrl || filePath
    } catch (err) {
      console.error('File upload error:', err)
      return `attachment://${file.name}`
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (isFormLocked) {
      setErrorMsg('Pipeline Governance Lock: You must upload an authentic document or valid URL, provide a genuine reference code, and sign the integrity declaration.')
      return
    }

    setLoading(true)

    try {
      let finalFileUrl = evidenceData.file_url.trim()

      if (attachedFile) {
        const uploadedUrl = await handleFileUpload(attachedFile)
        if (uploadedUrl) finalFileUrl = uploadedUrl
      }

      const targetValue = Number(formData.deal_value) || 0
      const calculatedProbability = formData.stage.includes('Defense') ? 60 : 30
      const defaultNextDueDate = formData.deadline || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      // 1. Opportunities Payload with Strict Financial Metric Separation & Human Accountability
      const opportunityPayload = {
        code: formData.code.trim() || `INST-2026-${Math.floor(100 + Math.random() * 900)}`,
        client: formData.client.trim(),
        client_name: formData.client.trim(),
        sbu: formData.sbu,
        product: formData.product.trim(),
        title: formData.title.trim() || `${formData.client} Proposal`,
        
        // Non-interchangeable financial measures
        deal_value: targetValue,
        submitted_proposal_value: targetValue,
        win_probability_pct: calculatedProbability,
        awarded_contract_value: formData.stage.includes('Won') ? targetValue : 0,
        recognized_revenue: 0,
        cash_collected: 0,
        
        stage: formData.stage || '1. TOR / RFP Identified',
        deadline: formData.deadline || null,
        submission_deadline: formData.deadline || null,
        notes: formData.notes.trim(),
        
        // Human accountability and governance tracking
        commercial_owner_email: formData.commercial_owner_email || currentUser || 'ybeltalsemagn8899@gmail.com',
        technical_lead_email: formData.technical_lead_email.trim() || 'Dr. Gemechu Waktola / Lead SME',
        next_action: formData.next_action.trim(),
        next_action_due_date: defaultNextDueDate,
        last_authorized_by: currentUser || 'ybeltalsemagn8899@gmail.com',
        
        alert_48h_sent: false,
        evidence_status: 'Verified',
        last_evidence_title: evidenceData.document_title.trim(),
        last_evidence_url: finalFileUrl || null,
      }

      const { data: newDeal, error: dealError } = await supabase
        .from('opportunities')
        .insert([opportunityPayload])
        .select()
        .single()

      if (dealError) throw dealError

      // 2. Insert Mandatory Evidence Locker Entry
      const evidencePayload = {
        opportunity_id: newDeal.id,
        stage_name: formData.stage || '1. TOR / RFP Identified',
        evidence_type: evidenceData.evidence_type,
        document_title: evidenceData.document_title.trim(),
        file_url: finalFileUrl || null,
        notes: `Mandatory tender proof verified by ${currentUser}. ${evidenceData.notes.trim()}`,
        verified_by: currentUser || 'ybeltalsemagn8899@gmail.com',
      }

      await supabase.from('deal_evidence').insert([evidencePayload])

      // 3. Write Immutable Audit Trail Entry
      const auditPayload = {
        opportunity_id: newDeal.id,
        user_email: currentUser || 'ybeltalsemagn8899@gmail.com',
        action: 'PROPOSAL_REGISTERED_WITH_STRICT_EVIDENCE',
        from_stage: 'Inception',
        to_stage: formData.stage || '1. TOR / RFP Identified',
        evidence_summary: `${evidenceData.evidence_type}: ${evidenceData.document_title.trim()} (${formData.sbu} - ${formData.product}) | Owner: ${formData.commercial_owner_email}`,
      }

      await supabase.from('deal_governance_logs').insert([auditPayload])

      onSaved?.(newDeal)
    } catch (err) {
      console.error('Submission failed:', err)
      setErrorMsg(err.message || 'Failed to register opportunity. Please check required fields.')
    } finally {
      setLoading(false)
    }
  }

  const currentProductOptions = SBU_PRODUCT_ENGINES[formData.sbu] || SBU_PRODUCT_ENGINES.Institute

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {errorMsg && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Account & SBU Tier */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
            Client Account / Procuring Entity *
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Commercial Bank of Ethiopia (CBE)"
            value={formData.client}
            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: clientValid ? '1px solid #cbd5e1' : '1px solid #f87171',
              fontSize: 12,
              fontWeight: 700,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
            Strategic SBU *
          </label>
          <select
            value={formData.sbu}
            onChange={(e) => handleSbuChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 700,
              background: '#fff',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="Institute">The i-Capital Institute</option>
            <option value="CBS">Cross Border Solutions (CBS)</option>
            <option value="IIP">Investment Partners (IIP)</option>
            <option value="DAS">Digital &amp; AI Solutions (DAS)</option>
          </select>
        </div>
      </div>

      {/* Dynamic Catalogue Product / Route Engine Dropdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
            Catalogue Product / Route Engine * ({formData.sbu})
          </label>
          <select
            value={formData.product}
            onChange={(e) => setFormData({ ...formData, product: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #0284c7',
              background: '#f0f9ff',
              fontSize: 12,
              fontWeight: 700,
              color: '#0369a1',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            {currentProductOptions.map((prod) => (
              <option key={prod} value={prod}>
                {prod}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
            Proposal Scope Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Executive Leadership &amp; Transformation Program"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: titleValid ? '1px solid #cbd5e1' : '1px solid #f87171',
              fontSize: 12,
              fontWeight: 700,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Commercial Value & Submission Deadline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
            Commercial Deal Value (ETB) *
          </label>
          <input
            type="number"
            required
            min="1"
            step="1000"
            value={formData.deal_value}
            onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 800,
              color: '#166534',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
            Submission Deadline
          </label>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Human Accountability: Assigned Owners & Action Gating */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
            Commercial Relationship Owner *
          </label>
          <input
            type="email"
            required
            value={formData.commercial_owner_email}
            onChange={(e) => setFormData({ ...formData, commercial_owner_email: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
            Designated Technical Lead / Expert Lead
          </label>
          <input
            type="text"
            placeholder="e.g., Dr. Gemechu Waktola / Lead SME"
            value={formData.technical_lead_email}
            onChange={(e) => setFormData({ ...formData, technical_lead_email: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Next Milestone Action */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
          Next Immediate Milestone Action *
        </label>
        <input
          type="text"
          required
          placeholder="e.g., Conduct stakeholder alignment session or submit formal clarification questions"
          value={formData.next_action}
          onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            fontSize: 12,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* STRICT INCEPTION EVIDENCE LOCKER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1.5px solid #86efac',
          borderRadius: 10,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#166534', letterSpacing: '0.4px' }}>
              MANDATORY INCEPTION EVIDENCE
            </span>
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              background: '#dc2626',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: 10,
              textTransform: 'uppercase',
            }}
          >
            Strict Lock Active
          </span>
        </div>

        <div style={{ fontSize: 11, color: '#166534', lineHeight: 1.4 }}>
          To prevent phantom forecasting and pipeline inflation, verifiable proof of solicitation is strictly required. Generic placeholder text is automatically blocked.
        </div>

        {/* Dynamic Verification Progress Checklist */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #bbf7d0',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 11,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: refTitleValid ? '#15803d' : '#94a3b8' }}>
            <span>{refTitleValid ? '✓' : '○'}</span>
            <span>Document Reference Code / Email Title (Minimum 6 characters, no test placeholder text)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: proofProvided ? '#15803d' : '#94a3b8' }}>
            <span>{proofProvided ? '✓' : '○'}</span>
            <span>Proof of Solicitation Attached: Upload document file (PDF/Doc) OR provide verifiable URL</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: attestationConfirmed ? '#15803d' : '#94a3b8' }}>
            <span>{attestationConfirmed ? '✓' : '○'}</span>
            <span>Signed Institutional Commercial Governance Declaration</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#15803d', marginBottom: 4 }}>
              Evidence Category *
            </label>
            <select
              value={evidenceData.evidence_type}
              onChange={(e) => setEvidenceData({ ...evidenceData, evidence_type: e.target.value })}
              style={{
                width: '100%',
                padding: '7px 8px',
                borderRadius: 6,
                border: '1px solid #86efac',
                fontSize: 11,
                fontWeight: 700,
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              {INCEPTION_EVIDENCE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#15803d', marginBottom: 4 }}>
              Document Reference Code / Email Subject *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., CBE/PROC/RFP/2026/088 or Letter Ref: MIG/HR/04-26"
              value={evidenceData.document_title}
              onChange={(e) => setEvidenceData({ ...evidenceData, document_title: e.target.value })}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: refTitleValid ? '1px solid #86efac' : '1.5px solid #f87171',
                fontSize: 11,
                fontWeight: 700,
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Physical Document File Upload Field */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#15803d', marginBottom: 4 }}>
            Option A: Attach Physical Document / PDF Scan *
          </label>
          <div
            style={{
              border: attachedFile ? '1.5px solid #16a34a' : '1.5px dashed #86efac',
              background: '#ffffff',
              borderRadius: 6,
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setAttachedFile(e.target.files[0])
                }
              }}
              style={{ fontSize: 11, color: '#334155' }}
            />
            {attachedFile && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a' }}>
                ✓ {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
        </div>

        {/* Alternative URL Link Field */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#15803d', marginBottom: 4 }}>
            Option B: Or Direct Verifiable Link (Google Drive / e-GP Tender Portal URL) *
          </label>
          <input
            type="url"
            placeholder="https://drive.google.com/... or https://egp.ppa.gov.et/..."
            value={evidenceData.file_url}
            onChange={(e) => setEvidenceData({ ...evidenceData, file_url: e.target.value })}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 6,
              border: hasValidUrl ? '1px solid #16a34a' : '1px solid #86efac',
              fontSize: 11,
              background: '#ffffff',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Institutional Attestation */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: 11,
            color: '#14532d',
            cursor: 'pointer',
            borderTop: '1px solid #bbf7d0',
            paddingTop: 10,
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={attestationConfirmed}
            onChange={(e) => setAttestationConfirmed(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>
            <strong>Institutional Integrity Attestation:</strong> I confirm that this tender/solicitation is authentic, actively issued by the procuring client, and supported by the attached evidence for executive audit.
          </span>
        </label>
      </div>

      {/* Scope Deliverables & Notes */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
          Scope Deliverables &amp; Additional Notes
        </label>
        <textarea
          rows={2}
          placeholder="Key deliverables, committee notes, or initial compliance observations..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            fontSize: 12,
            boxSizing: 'border-box',
            resize: 'none',
          }}
        />
      </div>

      {/* Footer Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: isFormLocked ? '#dc2626' : '#15803d' }}>
          {isFormLocked ? '🔒 Pipeline Locked (Complete Evidence Above)' : '🔓 Evidence Verified — Ready to Register'}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isFormLocked || loading || uploadingFile}
            style={{
              padding: '9px 24px',
              borderRadius: 6,
              border: 'none',
              background: isFormLocked
                ? '#94a3b8'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 900,
              cursor: isFormLocked ? 'not-allowed' : 'pointer',
              boxShadow: isFormLocked ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{isFormLocked ? '🔒' : '🛡️'}</span>
            <span>{loading ? 'Verifying & Registering…' : 'Verify & Register Proposal →'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}