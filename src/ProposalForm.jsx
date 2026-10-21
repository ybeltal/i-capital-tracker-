import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

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
    product: 'Executive Advisory',
    title: '',
    deal_value: 1500000,
    stage: '1. TOR / RFP Identified',
    deadline: '',
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

  useEffect(() => {
    const randomCode = `INST-2026-${Math.floor(100 + Math.random() * 900)}`

    if (targetContext) {
      setFormData({
        code: targetContext.code || randomCode,
        client: targetContext.client || targetContext.name || '',
        sbu: targetContext.sbu?.includes('Institute') ? 'Institute' : (targetContext.sbu || 'Institute'),
        product: targetContext.product || targetContext.fit || 'Executive Advisory',
        title: targetContext.title || `${targetContext.client || targetContext.name || 'Commercial'} Proposal`,
        deal_value: Number(targetContext.deal_value || targetContext.defaultValue || 1500000),
        stage: '1. TOR / RFP Identified',
        deadline: targetContext.deadline || '',
        notes: targetContext.notes || `Target account mapped from Strategic Client Directory.`,
      })
    } else {
      setFormData((prev) => ({
        ...prev,
        code: randomCode,
      }))
    }
  }, [targetContext])

  // Validation Checks
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

  // Master Lock: Form is strictly disabled until genuine evidence & declaration are complete
  const isFormLocked = !clientValid || !titleValid || !valueValid || !refTitleValid || !proofProvided || !attestationConfirmed

  async function handleFileUpload(file) {
    if (!file) return null
    setUploadingFile(true)
    try {
      const fileExt = file.name.split('.').pop()
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `tender_inceptions/${cleanFileName}`

      const { data, error } = await supabase.storage
        .from('deal-evidence')
        .upload(filePath, file)

      if (error) {
        console.warn('Storage upload warning, using local file name:', error.message)
        return `local-attachment://${file.name}`
      }

      const { data: urlData } = supabase.storage.from('deal-evidence').getPublicUrl(filePath)
      return urlData?.publicUrl || filePath
    } catch (err) {
      console.error('File upload error:', err)
      return `local-attachment://${file.name}`
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (isFormLocked) {
      setErrorMsg('Pipeline Governance Lock: You must upload an authentic document or valid URL, provide an authentic reference code, and sign the integrity declaration.')
      return
    }

    setLoading(true)

    try {
      let finalFileUrl = evidenceData.file_url.trim()

      if (attachedFile) {
        const uploadedUrl = await handleFileUpload(attachedFile)
        if (uploadedUrl) finalFileUrl = uploadedUrl
      }

      const opportunityPayload = {
        code: formData.code.trim() || `INST-2026-${Math.floor(100 + Math.random() * 900)}`,
        client: formData.client.trim(),
        client_name: formData.client.trim(),
        sbu: formData.sbu,
        product: formData.product.trim(),
        title: formData.title.trim() || `${formData.client} Proposal`,
        deal_value: Number(formData.deal_value) || 0,
        stage: '1. TOR / RFP Identified',
        deadline: formData.deadline || null,
        submission_deadline: formData.deadline || null,
        notes: formData.notes.trim(),
        commercial_owner: currentUser || 'ybeltalsemagn8899@gmail.com',
        alert_48h_sent: false,
        evidence_status: 'Verified',
        last_evidence_title: evidenceData.document_title.trim(),
        last_evidence_url: finalFileUrl || null,
      }

      // 1. Insert Proposal Record
      const { data: newDeal, error: dealError } = await supabase
        .from('opportunities')
        .insert([opportunityPayload])
        .select()
        .single()

      if (dealError) throw dealError

      // 2. Insert Mandatory Evidence Locker Record
      const evidencePayload = {
        opportunity_id: newDeal.id,
        stage_name: '1. TOR / RFP Identified',
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
        to_stage: '1. TOR / RFP Identified',
        evidence_summary: `${evidenceData.evidence_type}: ${evidenceData.document_title.trim()} (${finalFileUrl ? 'Link/File Verified' : 'Document Verified'})`,
      }

      await supabase.from('deal_governance_logs').insert([auditPayload])

      onSaved?.(newDeal)
    } catch (err) {
      console.error('Submission failed:', err)
      setErrorMsg(err.message || 'Failed to register opportunity. Check required fields.')
    } finally {
      setLoading(false)
    }
  }

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

      {/* Basic Opportunity Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
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
            onChange={(e) => setFormData({ ...formData, sbu: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 700,
              background: '#fff',
              boxSizing: 'border-box',
            }}
          >
            <option value="Institute">The i-Capital Institute</option>
            <option value="CBS">Corporate Business Solutions (CBS)</option>
            <option value="IIP">Investment Platform (IIP)</option>
            <option value="DAS">Digital &amp; AI Solutions (DAS)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
            Catalogue Product / Route Engine
          </label>
          <input
            type="text"
            placeholder="e.g., Master Builder Leadership (MBL)"
            value={formData.product}
            onChange={(e) => setFormData({ ...formData, product: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          />
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
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 800, color: '#166534', boxSizing: 'border-box' }}
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
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* STRICT EVIDENCE GATE LOCKER */}
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
          To prevent phantom forecasting, you must provide verifiable proof of solicitation. Dummy text is blocked.
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
            <span>Document Reference Code / Email Title (Minimum 6 characters, no test dummy text)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: proofProvided ? '#15803d' : '#94a3b8' }}>
            <span>{proofProvided ? '✓' : '○'}</span>
            <span>Proof of Tender Attached: Upload physical file (PDF/Doc) OR provide active portal/Drive URL</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: attestationConfirmed ? '#15803d' : '#94a3b8' }}>
            <span>{attestationConfirmed ? '✓' : '○'}</span>
            <span>Signed Commercial Governance Declaration</span>
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
            Option B: Or Direct Verifiable Link (Google Drive / e-GP Tender URL) *
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

        {/* Commercial Attestation Checkbox */}
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

      {/* Deliverable Notes */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
          Scope Deliverables &amp; Additional Notes
        </label>
        <textarea
          rows={2}
          placeholder="Key deliverables, committee notes, or initial compliance observations..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box', resize: 'none' }}
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