import React, { useState } from 'react'
import { supabase } from './supabase'

const STAGE_REQUIREMENTS = {
  '2. Proposal In Defense': {
    title: 'Submission Verification Required',
    badge: 'STAGE 2 GATE',
    description: 'To advance this deal into "Proposal In Defense", attach formal proof that the bid envelope or proposal document was officially transmitted to the client.',
    defaultType: 'SUBMISSION_RECEIPT',
    placeholderTitle: 'e.g., Client Submission Stamp, Handover Note, or Portal Receipt',
    types: [
      { id: 'SUBMISSION_RECEIPT', label: 'Client Handover / Submission Stamp' },
      { id: 'EMAIL_TRANSMISSION', label: 'Official Email Dispatch Receipt' },
      { id: 'PORTAL_SCREENSHOT', label: 'e-GP / Tender Portal Confirmation' },
    ],
  },
  '3. Contract Won / Signed': {
    title: 'Contract Award Proof Required',
    badge: 'REVENUE AUDIT GATE',
    description: 'STRICT GOVERNANCE: Deals cannot enter "Contract Won" without verifiable proof of award. Verbal commitments are ineligible for commercial recognition.',
    defaultType: 'AWARD_LETTER',
    placeholderTitle: 'e.g., Official Notification of Award / Executed Service Agreement',
    types: [
      { id: 'AWARD_LETTER', label: 'Official Letter of Award (LOA) / LOI' },
      { id: 'SIGNED_CONTRACT', label: 'Fully Executed Contract Agreement' },
      { id: 'PURCHASE_ORDER', label: 'Approved Client LPO / Service Order' },
      { id: 'CPO_RECEIPT', label: 'Performance Security / Advance CPO' },
    ],
  },
  '4. Delivery & Repeat Business': {
    title: 'Project Kickoff Handover Proof',
    badge: 'DELIVERY GATE',
    description: 'Confirm that execution has initiated by attaching the approved Inception Memo or signed stakeholder kickoff brief.',
    defaultType: 'INCEPTION_REPORT',
    placeholderTitle: 'e.g., Inception Report Sign-off / Meeting Minutes',
    types: [
      { id: 'INCEPTION_REPORT', label: 'Approved Inception Report' },
      { id: 'KICKOFF_MINUTES', label: 'Executive Kickoff Meeting Minutes' },
      { id: 'FIRST_MILESTONE', label: 'Milestone 1 Acceptance Certificate' },
    ],
  },
}

export default function StageGateEvidenceModal({
  isOpen,
  deal,
  targetStage,
  onClose,
  onSuccess,
}) {
  const [docTitle, setDocTitle] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [evidenceType, setEvidenceType] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isBypass, setIsBypass] = useState(false)
  const [bypassReason, setBypassReason] = useState('')

  if (!isOpen || !deal || !targetStage) return null

  const gateConfig = STAGE_REQUIREMENTS[targetStage] || {
    title: 'Stage Advancement Evidence',
    badge: 'GOVERNANCE AUDIT',
    description: 'Please provide supporting documentation or verification notes for advancing this opportunity.',
    defaultType: 'OTHER',
    placeholderTitle: 'Document reference or approval note',
    types: [{ id: 'OTHER', label: 'General Project Verification' }],
  }

  const activeEvidenceType = evidenceType || gateConfig.defaultType

  async function handleConfirmAdvance(e) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const finalTitle = isBypass
        ? `[ADMIN OVERRIDE] ${bypassReason.trim()}`
        : docTitle.trim()

      const finalStatus = isBypass ? 'Provisional' : 'Verified'

      // 1. Log the evidence entry in public.deal_evidence
      const { error: evidenceError } = await supabase
        .from('deal_evidence')
        .insert([
          {
            opportunity_id: deal.id,
            stage_name: targetStage,
            evidence_type: isBypass ? 'BYPASS_OVERRIDE' : activeEvidenceType,
            document_title: finalTitle,
            file_url: isBypass ? null : (docUrl.trim() || null),
            notes: isBypass ? `Bypass Reason: ${bypassReason}` : notes.trim(),
            verified_by: 'ybeltalsemagn8899@gmail.com',
          },
        ])

      if (evidenceError) {
        console.error('Evidence logging error:', evidenceError.message)
      }

      // 2. Write an immutable event to public.deal_governance_logs
      await supabase.from('deal_governance_logs').insert([
        {
          opportunity_id: deal.id,
          user_email: 'ybeltalsemagn8899@gmail.com',
          action: isBypass ? 'STAGE_ADVANCE_OVERRIDE' : 'STAGE_ADVANCE_VERIFIED',
          from_stage: deal.stage,
          to_stage: targetStage,
          evidence_summary: `${finalTitle} (${finalStatus})`,
        },
      ])

      // 3. Update the opportunity stage and verification badge
      const { error: dealError } = await supabase
        .from('opportunities')
        .update({
          stage: targetStage,
          evidence_status: finalStatus,
          last_evidence_title: finalTitle,
          last_evidence_url: isBypass ? null : (docUrl.trim() || null),
          updated_at: new Date().toISOString(),
        })
        .eq('id', deal.id)

      if (dealError) {
        alert('Failed to update stage: ' + dealError.message)
      } else {
        onSuccess(targetStage, finalStatus)
        onClose()
      }
    } catch (err) {
      console.error(err)
      alert('An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        zIndex: 999999,
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
          borderRadius: 14,
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🛡️</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                {gateConfig.title}
              </h3>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  background: '#ea580c',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {gateConfig.badge}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              Advancing: <strong>{deal.client || deal.client_name}</strong> → <span style={{ color: '#38bdf8' }}>{targetStage}</span>
            </div>
          </div>

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

        {/* Form Body */}
        <form onSubmit={handleConfirmAdvance} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 12,
              color: '#334155',
              lineHeight: 1.5,
            }}
          >
            {gateConfig.description}
          </div>

          {/* Toggle between Normal Evidence Attachment and Admin Override */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
              {isBypass ? 'Admin Governance Override' : 'Evidence Submission'}
            </span>
            <button
              type="button"
              onClick={() => setIsBypass(!isBypass)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                color: isBypass ? '#0284c7' : '#dc2626',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {isBypass ? '← Return to Normal Attachment' : '⚠️ Request Provisional Bypass'}
            </button>
          </div>

          {!isBypass ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Evidence Document Type *
                </label>
                <select
                  value={activeEvidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    boxSizing: 'border-box',
                    background: '#fff',
                  }}
                >
                  {gateConfig.types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Document Reference / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder={gateConfig.placeholderTitle}
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
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
                  Verification Link / Drive URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or SharePoint link"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
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
                  Audit Notes / Scope Gating Comments
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context for project auditors and executive management..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
            </>
          ) : (
            <div
              style={{
                background: '#fff7ed',
                border: '1px solid #ffedd5',
                padding: 14,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: '#c2410c' }}>
                Provisional Advance Without Immediate Documentation
              </div>
              <div style={{ fontSize: 11, color: '#7c2d12', lineHeight: 1.4 }}>
                This deal will be flagged with a yellow <strong>🟡 Provisional</strong> badge across all dashboards and logged to the executive compliance audit trail.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#7c2d12', marginTop: 4, marginBottom: 4 }}>
                  Justification Reason (Required for Audit) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verbal committee approval received; awaiting signed LOA by Friday"
                  value={bypassReason}
                  onChange={(e) => setBypassReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #fdba74',
                    fontSize: 12,
                    boxSizing: 'border-box',
                    background: '#fff',
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 20px',
                borderRadius: 6,
                border: 'none',
                background: isBypass
                  ? '#c2410c'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {submitting ? 'Verifying…' : isBypass ? 'Authorize Provisional Advance' : 'Verify & Advance Stage →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}