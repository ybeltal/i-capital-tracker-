/**
 * THE i-CAPITAL AFRICA INSTITUTE — PRE-TENDER LEAD INTAKE & PIPELINE MIGRATION
 * Registers new pre-tender leads, migrates them into the active opportunity pipeline,
 * displays an immediate success confirmation, and closes the modal automatically.
 */

import React, { useState } from 'react'
import { supabase } from './supabase'

const SBU_OPTIONS = [
  'The i-Capital Institute',
  'Investment Partners (IIP)',
  'Digital & AI Solutions (DAS)',
  'Cross Border Solutions (CBS)',
]

const CHANNEL_OPTIONS = [
  'Direct Client Outreach / Relationship',
  'Inbound / Digital Marketing',
  'Public Tender / Portal Monitoring',
  'Partner / Consortium Referral',
  'Executive Event / Summit',
  'Existing Client Expansion',
]

function generateLeadCode() {
  const year = new Date().getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `LD-${year}-${rand}`
}

function getDefaultTargetDate() {
  const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0]
}

// Resilient insert helper: automatically strips any non-existent optional column and retries
async function safeInsertRow(table, rawPayload) {
  const payload = { ...rawPayload }
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase.from(table).insert([payload]).select()
    if (!error) return { data, error: null }

    const msg = error.message || ''
    const pgrstMatch = msg.match(/Could not find the '([^']+)' column/i)
    const pgMatch = msg.match(/column "([^"]+)" of relation/i)
    const badCol = pgrstMatch?.[1] || pgMatch?.[1]

    if (badCol && Object.prototype.hasOwnProperty.call(payload, badCol)) {
      delete payload[badCol]
      continue
    }
    return { data: null, error }
  }
  return { data: null, error: { message: `Could not insert record into ${table}.` } }
}

export default function LeadForm({ userProfile, onClose, onSuccess }) {
  const [leadCode] = useState(() => generateLeadCode())
  const [initiatedDate, setInitiatedDate] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [initiatedBy, setInitiatedBy] = useState(
    () => userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Ybeltal Semagn'
  )
  const [clientOrg, setClientOrg] = useState('')
  const [sbu, setSbu] = useState('The i-Capital Institute')
  const [scopeTitle, setScopeTitle] = useState('')
  const [channel, setChannel] = useState('Direct Client Outreach / Relationship')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [targetActionDate, setTargetActionDate] = useState(() => getDefaultTargetDate())
  const [nextAction, setNextAction] = useState(
    'Conduct initial introductory meeting and needs discovery'
  )
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting || successMsg) return

    setErrorMsg('')
    setSubmitting(true)

    try {
      const cleanClient = clientOrg.trim()
      const cleanTitle = scopeTitle.trim()
      const cleanInitiator = initiatedBy.trim() || 'CRM Officer'
      const cleanNextAction = nextAction.trim()
      const cleanNotes = notes.trim()
      const numericValue =
        parseFloat(String(estimatedValue).replace(/[^0-9.]/g, '')) || 0

      // 1. Register Pre-Tender Lead in public.leads
      const leadRes = await safeInsertRow('leads', {
        lead_code: leadCode,
        initiated_date: initiatedDate || new Date().toISOString().split('T')[0],
        initiated_by: cleanInitiator,
        client_organization: cleanClient,
        client_name: cleanClient,
        client: cleanClient,
        sbu,
        opportunity_title: cleanTitle,
        title: cleanTitle,
        origination_channel: channel,
        lead_source: channel,
        estimated_value: numericValue,
        deal_value: numericValue,
        target_action_date: targetActionDate || null,
        deadline: targetActionDate || null,
        next_action: cleanNextAction,
        playbook_next_action: cleanNextAction,
        notes: cleanNotes || null,
        status: 'Migrated to Pipeline',
        created_by: cleanInitiator,
      })

      if (leadRes.error) {
        throw new Error(leadRes.error.message)
      }

      // 2. Migrate into Active Pipeline (public.opportunities)
      const oppRes = await safeInsertRow('opportunities', {
        lead_code: leadCode,
        title: cleanTitle,
        opportunity_title: cleanTitle,
        client: cleanClient,
        client_organization: cleanClient,
        sbu,
        deal_value: numericValue,
        estimated_value: numericValue,
        stage: '1. Lead / Qualification',
        status: 'Active',
        probability: 20,
        deadline: targetActionDate || null,
        lead_source: channel,
        owner: cleanInitiator,
        notes:
          [
            cleanNextAction ? `Next Action: ${cleanNextAction}` : '',
            cleanNotes,
          ]
            .filter(Boolean)
            .join(' | ') || null,
      })

      if (oppRes.error) {
        throw new Error(oppRes.error.message)
      }

      // 3. Queue initial action in Follow-up Queue (non-blocking)
      if (targetActionDate) {
        await safeInsertRow('follow_up_logs', {
          title: `${cleanNextAction || 'Initial Discovery'} — ${cleanClient} (${cleanTitle})`,
          client_name: cleanClient,
          client_organization: cleanClient,
          sbu,
          due_date: targetActionDate,
          scheduled_date: targetActionDate,
          action_type: 'Pre-Tender Lead Qualification',
          status: 'Pending',
          notes: `Lead ${leadCode} initiated by ${cleanInitiator} via ${channel}.`,
        })
      }

      const confirmationText = `✓ Successfully registered ${leadCode} (${cleanClient} — ${cleanTitle}) and migrated into pipeline!`
      setSuccessMsg(confirmationText)
      setSubmitting(false)

      // Notify parent App.jsx to show persistent toast & refresh tabs
      onSuccess?.(confirmationText)

      // Automatically close the Lead modal after showing confirmation
      setTimeout(() => {
        onClose?.()
      }, 950)
    } catch (err) {
      setErrorMsg(err.message || 'Could not register and migrate lead.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Auto-Generated Identifier Banner */}
      <div
        style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#0284c7', letterSpacing: '0.5px' }}>
            AUTO-GENERATED LEAD IDENTIFIER
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginTop: 1 }}>
            {leadCode}
          </div>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#0369a1',
            background: '#e0f2fe',
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          ⚡ Initial Qualification Pathway
        </span>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Success Confirmation Alert */}
      {successMsg && (
        <div
          role="status"
          style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            color: '#166534',
            padding: '12px 14px',
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 800,
          }}
        >
          {successMsg} Closing…
        </div>
      )}

      {/* Row 1: Initiated Date & Initiated By */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
            Initiated Date (Manual) *
          </label>
          <input
            type="date"
            required
            disabled={submitting || Boolean(successMsg)}
            value={initiatedDate}
            onChange={(e) => setInitiatedDate(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
            Initiated By (Manual) *
          </label>
          <input
            type="text"
            required
            disabled={submitting || Boolean(successMsg)}
            value={initiatedBy}
            onChange={(e) => setInitiatedBy(e.target.value)}
            placeholder="Officer Full Name"
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Row 2: Client Organization & Strategic SBU */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
            Client / Organization Name *
          </label>
          <input
            type="text"
            required
            disabled={submitting || Boolean(successMsg)}
            value={clientOrg}
            onChange={(e) => setClientOrg(e.target.value)}
            placeholder="e.g., Ministry of Finance / Awash Bank"
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
            Strategic SBU *
          </label>
          <select
            disabled={submitting || Boolean(successMsg)}
            value={sbu}
            onChange={(e) => setSbu(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              background: '#ffffff',
            }}
          >
            {SBU_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Opportunity Scope / Title & Origination Channel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
            Opportunity Scope / Title *
          </label>
          <input
            type="text"
            required
            disabled={submitting || Boolean(successMsg)}
            value={scopeTitle}
            onChange={(e) => setScopeTitle(e.target.value)}
            placeholder="e.g., Executive Leadership Training"
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
            Origination Channel *
          </label>
          <select
            disabled={submitting || Boolean(successMsg)}
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              background: '#ffffff',
            }}
          >
            {CHANNEL_OPTIONS.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 4: Estimated Value & Target Action Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
            Estimated Value (ETB)
          </label>
          <input
            type="number"
            min="0"
            disabled={submitting || Boolean(successMsg)}
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="e.g., 1200000"
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
            Target Action Date *
          </label>
          <input
            type="date"
            required
            disabled={submitting || Boolean(successMsg)}
            value={targetActionDate}
            onChange={(e) => setTargetActionDate(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Playbook Next Action */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
          Playbook Next Action (S3 Tracker-Readiness) *
        </label>
        <input
          type="text"
          required
          disabled={submitting || Boolean(successMsg)}
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 11px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Strategic Intelligence / Context Notes */}
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
          Strategic Intelligence / Context Notes
        </label>
        <textarea
          rows={2}
          disabled={submitting || Boolean(successMsg)}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Background, key decision-maker names, budget context..."
          style={{
            width: '100%',
            padding: '9px 11px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.6fr',
          gap: 12,
          marginTop: 6,
          paddingTop: 12,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          disabled={submitting}
          onClick={() => onClose?.()}
          style={{
            padding: '11px 16px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
            fontSize: 13,
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting || Boolean(successMsg)}
          style={{
            padding: '11px 18px',
            borderRadius: 8,
            border: 'none',
            background: successMsg ? '#16a34a' : '#0284c7',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 800,
            cursor: submitting || successMsg ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
          }}
        >
          {submitting
            ? 'Registering & Migrating…'
            : successMsg
            ? '✓ Successfully Registered!'
            : '✓ Register & Migrate into Pipeline'}
        </button>
      </div>
    </form>
  )
}