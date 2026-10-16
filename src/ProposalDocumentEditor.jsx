import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const INVITATION_TYPES = [
  { id: 'TOR', label: '📑 Terms of Reference (TOR) / Scope of Work' },
  { id: 'RFP', label: '📜 Formal Request for Proposals (RFP / Tender Notice)' },
  { id: 'LETTER', label: '✉️ Official Invitation Letter / EOI' },
  { id: 'EMAIL', label: '📧 Client Email Invitation / Written Inquiry' },
  { id: 'ORAL', label: '🗣️ Oral Conversation / Executive Briefing' },
]

function parseTag(text, tag) {
  if (!text) return ''
  const match = text.match(new RegExp(`\\[${tag}:\\s*([^\\]]+)\\]`))
  return match ? match[1].trim() : ''
}

function updateTag(text, tag, value) {
  const current = text || ''
  const regex = new RegExp(`\\[${tag}:\\s*([^\\]]+)\\]`)
  const newTagStr = value ? `[${tag}: ${value}]` : ''

  if (regex.test(current)) {
    return newTagStr ? current.replace(regex, newTagStr) : current.replace(regex, '').trim()
  }
  if (!newTagStr) return current
  return current ? `${newTagStr}\n${current}` : newTagStr
}

export default function ProposalDocumentEditor({ proposalId }) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')

  // Mandate & Invitation Fields
  const [invitationType, setInvitationType] = useState('TOR')
  const [docLink, setDocLink] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [dateReceived, setDateReceived] = useState('')
  const [oralStakeholder, setOralStakeholder] = useState('')
  const [mandateSummary, setMandateSummary] = useState('')

  useEffect(() => {
    loadProposalData()
  }, [proposalId])

  async function loadProposalData() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('notes')
        .eq('id', proposalId)
        .single()

      if (error) throw error

      const rawNotes = data?.notes || ''
      setNotes(rawNotes)

      // Parse existing mandate metadata
      setInvitationType(parseTag(rawNotes, 'MANDATE_TYPE') || 'TOR')
      setDocLink(parseTag(rawNotes, 'MANDATE_LINK') || '')
      setRefNumber(parseTag(rawNotes, 'MANDATE_REF') || '')
      setDateReceived(parseTag(rawNotes, 'MANDATE_DATE') || '')
      setOralStakeholder(parseTag(rawNotes, 'ORAL_STAKEHOLDER') || '')
      setMandateSummary(parseTag(rawNotes, 'MANDATE_SUMMARY') || '')
    } catch (err) {
      console.error('Could not load mandate vault:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveMandate(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      let updatedNotes = notes

      // Sync tags into proposal notes
      updatedNotes = updateTag(updatedNotes, 'MANDATE_TYPE', invitationType)
      updatedNotes = updateTag(updatedNotes, 'MANDATE_LINK', docLink.trim())
      updatedNotes = updateTag(updatedNotes, 'MANDATE_REF', refNumber.trim())
      updatedNotes = updateTag(updatedNotes, 'MANDATE_DATE', dateReceived)
      updatedNotes = updateTag(updatedNotes, 'ORAL_STAKEHOLDER', oralStakeholder.trim())
      updatedNotes = updateTag(updatedNotes, 'MANDATE_SUMMARY', mandateSummary.trim())

      const { error } = await supabase
        .from('proposals')
        .update({ notes: updatedNotes.trim() || null })
        .eq('id', proposalId)

      if (error) throw error

      setNotes(updatedNotes)
      setMessage('✓ Mandate & client invitation evidence saved successfully.')
    } catch (err) {
      setMessage(`Error: ${err.message || 'Could not save evidence.'}`)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: '#64748b' }}>
        Loading mandate documentation vault…
      </div>
    )
  }

  const isOral = invitationType === 'ORAL'

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        padding: '16px',
        marginBottom: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 13, color: '#0f172a', fontWeight: 800 }}>
            📁 Client Mandate &amp; Tender Origination Vault
          </h4>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Store the client's invitation letter, RFP, TOR, or oral conversation record.
          </span>
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 12,
            background: docLink || oralStakeholder ? '#dcfce7' : '#fee2e2',
            color: docLink || oralStakeholder ? '#166534' : '#b91c1c',
          }}
        >
          {docLink || oralStakeholder ? '✓ Mandate Filed' : '⚠️ Missing Evidence'}
        </span>
      </div>

      <form onSubmit={handleSaveMandate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* 1. Select Invitation Type */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
            Invitation / Mandate Type <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={invitationType}
            onChange={(e) => setInvitationType(e.target.value)}
            disabled={busy}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#f8fafc' }}
          >
            {INVITATION_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2A. If Written (RFP / TOR / Letter / Email) */}
        {!isOral ? (
          <>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                Document Vault / Folder Link (Google Drive / OneDrive / Cloud) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="url"
                required={!isOral}
                value={docLink}
                placeholder="https://drive.google.com/drive/folders/..."
                onChange={(e) => setDocLink(e.target.value)}
                disabled={busy}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                  Tender / Letter Reference Number
                </label>
                <input
                  type="text"
                  value={refNumber}
                  placeholder="e.g. RFP/CBE/2026/04 or Ref: 104/26"
                  onChange={(e) => setRefNumber(e.target.value)}
                  disabled={busy}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                  Date Received
                </label>
                <input
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  disabled={busy}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>
            </div>
          </>
        ) : (
          /* 2B. If Oral Conversation */
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                  Key Client Decision-Maker <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required={isOral}
                  value={oralStakeholder}
                  placeholder="e.g. CEO, VP of Strategy, Board Chairman"
                  onChange={(e) => setOralStakeholder(e.target.value)}
                  disabled={busy}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                  Discussion Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  required={isOral}
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  disabled={busy}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
                Direct Link to Meeting Notes / Audio Memo (Optional)
              </label>
              <input
                type="url"
                value={docLink}
                placeholder="Google Doc meeting minutes link (optional)"
                onChange={(e) => setDocLink(e.target.value)}
                disabled={busy}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
              />
            </div>
          </>
        )}

        {/* 3. Brief Summary / Scope / Objectives */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 3 }}>
            {isOral ? 'Oral Briefing Notes & Key Objectives' : 'Scope Summary & Key Evaluation Requirements'}
          </label>
          <textarea
            rows={2}
            value={mandateSummary}
            placeholder={
              isOral
                ? 'Client requested in-person executive immersion program for 25 executives; budget approved in principle...'
                : 'TOR deliverables: Leadership diagnostic assessment, 4 training modules, 6-month delivery window...'
            }
            onChange={(e) => setMandateSummary(e.target.value)}
            disabled={busy}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
          />
        </div>

        {/* Action Button & Active Link Shortcut */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          {docLink ? (
            <a
              href={docLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}
            >
              🔗 Open Document Vault ↗
            </a>
          ) : (
            <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
              No document link saved yet
            </span>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Saving Evidence…' : 'Save Mandate Evidence'}
          </button>
        </div>

        {message && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              background: message.includes('✓') ? '#dcfce7' : '#fee2e2',
              color: message.includes('✓') ? '#166534' : '#b91c1c',
            }}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  )
}