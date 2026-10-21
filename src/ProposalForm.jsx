import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

const INCEPTION_EVIDENCE_TYPES = [
  { id: 'TOR_RFP', label: '📄 Official TOR / RFP Document' },
  { id: 'INVITATION_LETTER', label: '✉️ Client Invitation to Bid (LOI / Letter)' },
  { id: 'PORTAL_LINK', label: '🌐 Tender Portal Reference / e-GP Publication' },
  { id: 'CLIENT_EMAIL', label: '📧 Formal Client Procurement Email / Memo' },
  { id: 'EXPRESSION_OF_INTEREST', label: '📑 Published EOI Notice' },
]

export default function ProposalForm({
  targetContext = null,
  currentUser = 'ybeltalsemagn8899@gmail.com',
  onSaved,
  onClose,
}) {
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    // Generate clean unique code
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

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    // Strict Evidence Gate Validation
    if (!evidenceData.document_title.trim()) {
      setErrorMsg('Mandatory Evidence Required: You must enter the TOR/RFP Document Title, Letter Reference, or Portal Publication ID.')
      return
    }

    setLoading(true)

    try {
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
        last_evidence_url: evidenceData.file_url.trim() || null,
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
        file_url: evidenceData.file_url.trim() || null,
        notes: evidenceData.notes.trim() || `Attached upon initial proposal registration.`,
        verified_by: currentUser || 'ybeltalsemagn8899@gmail.com',
      }

      const { error: evidenceError } = await supabase
        .from('deal_evidence')
        .insert([evidencePayload])

      if (evidenceError) console.error('Evidence locker warning:', evidenceError.message)

      // 3. Write Immutable Audit Trail Entry
      const auditPayload = {
        opportunity_id: newDeal.id,
        user_email: currentUser || 'ybeltalsemagn8899@gmail.com',
        action: 'PROPOSAL_REGISTERED_WITH_EVIDENCE',
        from_stage: 'Inception',
        to_stage: '1. TOR / RFP Identified',
        evidence_summary: `${evidenceData.evidence_type}: ${evidenceData.document_title.trim()}`,
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
              border: '1px solid #cbd5e1',
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
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700, boxSizing: 'border-box' }}
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
            min="0"
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

      {/* MANDATORY INCEPTION EVIDENCE LOCKER */}
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
              background: '#15803d',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: 10,
              textTransform: 'uppercase',
            }}
          >
            Required For Pipeline Entry
          </span>
        </div>

        <div style={{ fontSize: 11, color: '#166534', lineHeight: 1.4 }}>
          To prevent pipeline inflation and unverified forecasts, you must provide reference documentation confirming this solicitation exists.
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
              Document Reference / RFP Code / Email Subject *
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
                border: '1px solid #86efac',
                fontSize: 11,
                fontWeight: 700,
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#15803d', marginBottom: 4 }}>
              Document URL / Shared Drive Link (Optional)
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/... or tender portal link"
              value={evidenceData.file_url}
              onChange={(e) => setEvidenceData({ ...evidenceData, file_url: e.target.value })}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #86efac',
                fontSize: 11,
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#15803d', marginBottom: 4 }}>
              Verification Source Note
            </label>
            <input
              type="text"
              placeholder="e.g., Downloaded from e-GP portal / Injected via BD Officer"
              value={evidenceData.notes}
              onChange={(e) => setEvidenceData({ ...evidenceData, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #86efac',
                fontSize: 11,
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
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
          disabled={loading || !evidenceData.document_title.trim()}
          style={{
            padding: '8px 22px',
            borderRadius: 6,
            border: 'none',
            background:
              loading || !evidenceData.document_title.trim()
                ? '#94a3b8'
                : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 800,
            cursor: loading || !evidenceData.document_title.trim() ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)',
          }}
        >
          {loading ? 'Verifying & Registering…' : 'Verify & Register Proposal →'}
        </button>
      </div>
    </form>
  )
}