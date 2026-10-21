import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function TorComplianceMatrixModal({
  isOpen,
  deal,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Administrative Pass/Fail Gates
  const [adminGates, setAdminGates] = useState({
    license: true,
    tax: true,
    cpo: true,
    cpoAmount: '',
    competence: true,
    litigation: true,
    jv: true,
  })

  // Technical Scoring Criteria (0 - 25 points each)
  const [techScores, setTechScores] = useState({
    firmTrackRecord: 20,
    specificExperience: 20,
    methodologyWorkplan: 22,
    keyPersonnelCvs: 21,
  })

  const [notes, setNotes] = useState({
    risks: '',
    mitigation: '',
    justification: '',
  })

  useEffect(() => {
    if (deal && isOpen) {
      loadExistingAssessment()
    }
  }, [deal, isOpen])

  async function loadExistingAssessment() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tor_compliance_assessments')
        .select('*')
        .eq('opportunity_id', deal.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data && !error) {
        setAdminGates({
          license: data.admin_license_valid ?? true,
          tax: data.admin_tax_clearance ?? true,
          cpo: data.admin_bid_security_cpo ?? true,
          cpoAmount: data.admin_cpo_amount_etb || '',
          competence: data.admin_competence_cert ?? true,
          litigation: data.admin_litigation_clean ?? true,
          jv: data.admin_jv_compliant ?? true,
        })
        setTechScores({
          firmTrackRecord: Number(data.score_firm_track_record) || 20,
          specificExperience: Number(data.score_specific_experience) || 20,
          methodologyWorkplan: Number(data.score_methodology_workplan) || 22,
          keyPersonnelCvs: Number(data.score_key_personnel_cvs) || 21,
        })
        setNotes({
          risks: data.identified_risks || '',
          mitigation: data.mitigation_strategy || '',
          justification: data.verdict_justification || '',
        })
      }
    } catch (err) {
      console.error('Error loading assessment:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !deal) return null

  // Compute Administrative Compliance
  const adminPassed =
    adminGates.license &&
    adminGates.tax &&
    adminGates.cpo &&
    adminGates.competence &&
    adminGates.litigation &&
    adminGates.jv

  // Compute Total Technical Score (Max 100)
  const totalScore =
    Number(techScores.firmTrackRecord) +
    Number(techScores.specificExperience) +
    Number(techScores.methodologyWorkplan) +
    Number(techScores.keyPersonnelCvs)

  // Automated Verdict Matrix
  let autoVerdict = 'GO'
  let verdictColor = '#10b981'
  let verdictBg = '#dcfce7'
  let verdictBorder = '#86efac'
  let verdictLabel = '🟢 GO — PROCEED TO FORMAL PROPOSAL'

  if (!adminPassed) {
    autoVerdict = 'NO_GO'
    verdictColor = '#b91c1c'
    verdictBg = '#fee2e2'
    verdictBorder = '#fecaca'
    verdictLabel = '🔴 NO-GO — MANDATORY ELIGIBILITY DISQUALIFICATION'
  } else if (totalScore < 70) {
    autoVerdict = 'NO_GO'
    verdictColor = '#b91c1c'
    verdictBg = '#fee2e2'
    verdictBorder = '#fecaca'
    verdictLabel = '🔴 NO-GO — TECHNICAL SCORE BELOW COMPETITIVE THRESHOLD (< 70%)'
  } else if (totalScore < 80) {
    autoVerdict = 'CONDITIONAL_GO'
    verdictColor = '#b45309'
    verdictBg = '#fef3c7'
    verdictBorder = '#fde68a'
    verdictLabel = '🟡 CONDITIONAL GO — PARTNERING / CV STRENGTHENING REQUIRED'
  }

  async function handleSaveAssessment(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const assessmentPayload = {
        opportunity_id: deal.id,
        evaluator_email: 'ybeltalsemagn8899@gmail.com',
        admin_license_valid: adminGates.license,
        admin_tax_clearance: adminGates.tax,
        admin_bid_security_cpo: adminGates.cpo,
        admin_cpo_amount_etb: Number(adminGates.cpoAmount) || 0,
        admin_competence_cert: adminGates.competence,
        admin_litigation_clean: adminGates.litigation,
        admin_jv_compliant: adminGates.jv,
        score_firm_track_record: Number(techScores.firmTrackRecord),
        score_specific_experience: Number(techScores.specificExperience),
        score_methodology_workplan: Number(techScores.methodologyWorkplan),
        score_key_personnel_cvs: Number(techScores.keyPersonnelCvs),
        verdict: autoVerdict,
        verdict_justification: notes.justification.trim() || `Automated calculation: Total ${totalScore}/100. Administrative gates ${adminPassed ? 'passed' : 'failed'}.`,
        identified_risks: notes.risks.trim(),
        mitigation_strategy: notes.mitigation.trim(),
      }

      await supabase.from('tor_compliance_assessments').insert([assessmentPayload])

      // Update opportunity summary fields
      await supabase
        .from('opportunities')
        .update({
          gonogo_verdict: autoVerdict,
          gonogo_score: totalScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deal.id)

      // Add to audit trail
      await supabase.from('deal_governance_logs').insert([
        {
          opportunity_id: deal.id,
          user_email: 'ybeltalsemagn8899@gmail.com',
          action: 'GONOGO_ASSESSMENT_RECORDED',
          from_stage: deal.stage,
          to_stage: deal.stage,
          evidence_summary: `Verdict: ${autoVerdict} (Score: ${totalScore}/100)`,
        },
      ])

      onSaved?.(autoVerdict, totalScore)
      onClose()
    } catch (err) {
      console.error('Failed to save compliance assessment:', err)
      alert('Error saving assessment: ' + err.message)
    } finally {
      setSaving(false)
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
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          width: '100%',
          maxWidth: '820px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #070d1e 0%, #0f172a 100%)',
            padding: '16px 24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚖️</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                Automated "Go / No-Go" &amp; TOR Compliance Matrix
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  background: '#0284c7',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                GOVERNANCE GATE
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              Evaluating Bid: <strong>{deal.client || deal.client_name}</strong> •{' '}
              <span style={{ color: '#38bdf8' }}>{deal.title || deal.product}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSaveAssessment} style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Verdict Banner */}
          <div
            style={{
              background: verdictBg,
              border: `1.5px solid ${verdictBorder}`,
              borderRadius: 10,
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: verdictColor, textTransform: 'uppercase' }}>
                Automated Decision Recommendation
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: verdictColor, marginTop: 2 }}>
                {verdictLabel}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: verdictColor }}>COMPLIANCE SCORE</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: verdictColor }}>
                {totalScore} <span style={{ fontSize: 13, fontWeight: 700 }}>/ 100</span>
              </div>
            </div>
          </div>

          {/* Tier 1: Administrative Pass / Fail Eligibility */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
                1. Mandatory Administrative Eligibility (Pass / Fail Gating)
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: adminPassed ? '#dcfce7' : '#fee2e2',
                  color: adminPassed ? '#15803d' : '#b91c1c',
                }}
              >
                {adminPassed ? 'ALL ADMINISTRATIVE CRITERIA MET' : 'ELIGIBILITY BREACH DETECTED'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {[
                { key: 'license', label: 'Renewed Principal Trade License' },
                { key: 'tax', label: 'Valid Tax Clearance & TIN Certificate' },
                { key: 'cpo', label: 'CPO / Bid Bond Readiness' },
                { key: 'competence', label: 'Consulting Competence Certificate' },
                { key: 'litigation', label: 'Clean Non-Debarment & Litigation' },
                { key: 'jv', label: 'Joint Venture Compliance (If Applicable)' },
              ].map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: adminGates[item.key] ? '#15803d' : '#b91c1c',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={adminGates[item.key]}
                    onChange={(e) => setAdminGates({ ...adminGates, [item.key]: e.target.checked })}
                  />
                  {item.label}
                </label>
              ))}
            </div>

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                Required Bid Security Amount (ETB):
              </label>
              <input
                type="number"
                placeholder="e.g. 100,000 CPO"
                value={adminGates.cpoAmount}
                onChange={(e) => setAdminGates({ ...adminGates, cpoAmount: e.target.value })}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 11,
                  fontWeight: 700,
                  width: 180,
                  background: '#fff',
                }}
              />
            </div>
          </div>

          {/* Tier 2: Technical Evaluation Scoring Matrix */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#f8fafc' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: 12 }}>
              2. Technical Scoring Criteria Weights (Max 100 Points)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
                  <span>Firm Specific Track Record (Max: 25)</span>
                  <span style={{ color: '#0284c7' }}>{techScores.firmTrackRecord} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={techScores.firmTrackRecord}
                  onChange={(e) => setTechScores({ ...techScores, firmTrackRecord: e.target.value })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
                  <span>Relevant Sector Experience (Max: 25)</span>
                  <span style={{ color: '#0284c7' }}>{techScores.specificExperience} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={techScores.specificExperience}
                  onChange={(e) => setTechScores({ ...techScores, specificExperience: e.target.value })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
                  <span>Technical Methodology &amp; Work Plan (Max: 25)</span>
                  <span style={{ color: '#0284c7' }}>{techScores.methodologyWorkplan} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={techScores.methodologyWorkplan}
                  onChange={(e) => setTechScores({ ...techScores, methodologyWorkplan: e.target.value })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
                  <span>Key Personnel &amp; Team Leader CVs (Max: 25)</span>
                  <span style={{ color: '#0284c7' }}>{techScores.keyPersonnelCvs} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={techScores.keyPersonnelCvs}
                  onChange={(e) => setTechScores({ ...techScores, keyPersonnelCvs: e.target.value })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Tier 3: Qualitative Management Notes & Risk Mitigation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                Key Technical &amp; Operational Risks
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Tight delivery schedule, competitor local presence, scarce niche expert CVs..."
                value={notes.risks}
                onChange={(e) => setNotes({ ...notes, risks: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                Mitigation Strategy / Winning Edge
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Pre-engage expert consortium, emphasize proprietary i-Capital frameworks..."
                value={notes.mitigation}
                onChange={(e) => setNotes({ ...notes, mitigation: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, resize: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 22px',
                borderRadius: 6,
                border: 'none',
                background: autoVerdict === 'NO_GO' ? '#b91c1c' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {saving ? 'Recording Assessment…' : `Save Assessment (${autoVerdict}) →`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}