import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const STAGES = [
  'Initiated',
  'In Progress',
  'Submitted',
  'Under Review',
  'Shortlisted',
  'Negotiation',
  'Won',
  'Lost',
]

const ACTIVITY_TYPES = [
  '📞 Phone Call',
  '🤝 In-Person Meeting',
  '💻 Virtual Presentation',
  '📧 Email / Scope Sent',
  '💬 WhatsApp / Message',
  '🏛️ Board / Committee Feedback',
  '📝 Contract Negotiation',
]

const TEAM_OWNERS = [
  'Ybeltal',
  'Tsegaab',
  'Seife',
  'Yeabsira',
  'Dr. Daniel',
  'Dr. Abel',
  'Raphael',
  'Aida',
  'Lemlem',
  'Atalay',
  'Unassigned',
]

const LOSS_REASONS = [
  'Financial (Too Expensive)',
  'Competitor Won',
  'Technical / Scope Mismatch',
  'Client Postponed / Project Shelved',
  'Capacity Constraint / Timing',
  'Procurement Window Cancelled / Expired',
  'Other / Undisclosed',
]

const WIN_FACTORS = [
  'Technical Methodology & Quality',
  'Institutional Track Record & Trust',
  'Competitive Pricing / Best Value',
  'Executive / C-Suite Relationship',
  'Speed & Custom Proposal Design',
  'Strategic SBU Partner Alignment',
]

const OUTREACH_TEMPLATES = {
  status_check: {
    label: '📋 Review & Status Check',
    subject: (client, title, code) => `Follow-up: Proposal for ${title} (${code}) - The i-Capital Africa Institute`,
    body: (client, title, code) =>
`Dear ${client} Team,

Greetings from The i-Capital Africa Institute.

I am following up regarding our proposal for "${title}" (Ref: ${code}).

We wanted to check in to see if your team has had the opportunity to review the document, and whether any technical clarifications or supplementary materials are needed from our side.

Looking forward to your guidance.

Warm regards,
The i-Capital Africa Institute`,
  },
  meeting_request: {
    label: '🤝 Clarification Sync Request',
    subject: (client, title, code) => `Brief Sync Request: ${title} (${code}) - The i-Capital Africa Institute`,
    body: (client, title, code) =>
`Dear ${client} Team,

Greetings from The i-Capital Africa Institute.

Regarding "${title}" (Ref: ${code}), our technical team would welcome a brief 15-minute call to address any preliminary questions and align on execution timelines.

Please let us know what day this week works best for your schedule.

Best regards,
The i-Capital Africa Institute`,
  },
}

function formatMoney(amount) {
  if (!amount || isNaN(amount)) return 'ETB 0.00'
  return `ETB ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function parseTag(text, tag) {
  if (!text) return ''
  const match = text.match(new RegExp(`\\[${tag}:\\s*([^\\]]+)\\]`))
  return match ? match[1].trim() : ''
}

function updateTag(text, tag, value) {
  const current = text || ''
  const regex = new RegExp(`\\[${tag}:[^\\]]*\\]`)
  const newTagStr = value ? `[${tag}: ${value}]` : ''

  if (regex.test(current)) {
    return newTagStr ? current.replace(regex, newTagStr) : current.replace(regex, '').trim()
  }
  if (!newTagStr) return current
  return current ? `${newTagStr}\n${current}` : newTagStr
}

function parseGates(notes) {
  if (!notes) return []
  const match = notes.match(/\[GATES:([^\]]*)\]/)
  if (!match) return []
  return match[1].split(',').map((s) => s.trim()).filter(Boolean)
}

function stringifyGatesWithNotes(gates, existingNotes) {
  return updateTag(existingNotes, 'GATES', gates.join(', '))
}

function parseOwner(notes) {
  const owner = parseTag(notes, 'OWNER')
  return owner || 'Unassigned'
}

function stringifyOwnerWithNotes(owner, existingNotes) {
  return updateTag(existingNotes, 'OWNER', owner)
}

function parseOutcome(notes) {
  if (!notes) return null
  const match = notes.match(/\[OUTCOME:\s*([^\]]+)\]/)
  if (!match) return null
  const parts = match[1].split('|')
  const outcome = {}
  parts.forEach((p) => {
    if (p.includes(':')) {
      const [k, v] = p.split(':', 2)
      outcome[k.trim().toLowerCase()] = v.trim()
    } else {
      outcome.status = p.trim()
    }
  })
  return outcome
}

function stringifyOutcomeWithNotes(outcomeData, existingNotes) {
  const status = outcomeData.status || 'Decided'
  const reason = outcomeData.reason || ''
  const competitor = outcomeData.competitor || ''
  const lessons = outcomeData.lessons || ''
  const factor = outcomeData.factor || ''

  const parts = [`OUTCOME: ${status}`]
  if (reason) parts.push(`Reason: ${reason}`)
  if (competitor) parts.push(`Competitor: ${competitor}`)
  if (factor) parts.push(`Factor: ${factor}`)
  if (lessons) parts.push(`Lessons: ${lessons}`)

  const tag = `[${parts.join(' | ')}]`
  const cleanNotes = (existingNotes || '').replace(/\[OUTCOME:[^\]]*\]\n?/, '').trim()
  return cleanNotes ? `${tag}\n\n${cleanNotes}` : tag
}

function getDealHealth(deal) {
  if (['Won', 'Lost', 'Cancelled'].includes(deal.status)) {
    return { label: '⚪ Closed', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', status: 'closed', days: 0 }
  }

  const createdTime = deal.created_at ? new Date(deal.created_at).getTime() : Date.now()
  const days = Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)))

  if (days <= 14) {
    return { label: `🟢 Active (${days}d)`, color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', status: 'active', days }
  } else if (days <= 30) {
    return { label: `🟡 Follow-Up (${days}d)`, color: '#b45309', bg: '#fffbeb', border: '#fde68a', status: 'attention', days }
  } else {
    return { label: `🔴 Stale (${days}d)`, color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', status: 'stale', days }
  }
}

function OwnerPhoto({ name }) {
  const isYbeltal = name && name.toLowerCase().includes('ybeltal')
  const photoSrc = isYbeltal ? '/team/ybeltal.jpg' : null

  if (photoSrc) {
    return (
      <img
        src={photoSrc}
        alt={name}
        style={{
          width: '27px',
          height: '36px',
          borderRadius: '4px',
          objectFit: 'cover',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          display: 'inline-block',
          verticalAlign: 'middle',
          flexShrink: 0,
        }}
        title={name}
      />
    )
  }

  return (
    <div
      style={{
        width: '27px',
        height: '36px',
        borderRadius: '4px',
        background: '#e0f2fe',
        border: '1px solid #bae6fd',
        color: '#0369a1',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 700,
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
      title={name || 'Unassigned'}
    >
      {name ? name.slice(0, 2).toUpperCase() : 'N/A'}
    </div>
  )
}

function renderDeadlineBadge(deadlineStr) {
  if (!deadlineStr) return null
  const now = new Date()
  const deadline = new Date(deadlineStr)
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
        ⛔ Closed ({Math.abs(diffDays)}d ago)
      </span>
    )
  }
  if (diffDays === 0) {
    return (
      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
        ⚠️ Closes Today
      </span>
    )
  }
  if (diffDays <= 3) {
    return (
      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }}>
        🚨 {diffDays}d Left
      </span>
    )
  }
  return (
    <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
      🗓️ {diffDays}d Left
    </span>
  )
}

export default function ProposalList({ proposalVersion }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSBU, setFilterSBU] = useState('ALL')
  const [filterHealth, setFilterHealth] = useState('ALL')
  const [filterOwner, setFilterOwner] = useState('ALL')
  const [showWorkloadPanel, setShowWorkloadPanel] = useState(false)

  const [draggedDealId, setDraggedDealId] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)

  const [selectedDeal, setSelectedDeal] = useState(null)
  const [selectedDealOwner, setSelectedDealOwner] = useState('Unassigned')
  const [saving, setSaving] = useState(false)
  const [drawerErrors, setDrawerErrors] = useState([])

  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0])
  const [activityNote, setActivityNote] = useState('')
  const [nextActionCommitment, setNextActionCommitment] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')
  const [loggingActivity, setLoggingActivity] = useState(false)
  const [activitySuccessToast, setActivitySuccessToast] = useState(false)

  const [outreachDeal, setOutreachDeal] = useState(null)
  const [outreachTemplateKey, setOutreachTemplateKey] = useState('status_check')
  const [outreachSubject, setOutreachSubject] = useState('')
  const [outreachBody, setOutreachBody] = useState('')
  const [autoLogOutreach, setAutoLogOutreach] = useState(true)
  const [copiedToast, setCopiedToast] = useState(false)

  const [postMortemDeal, setPostMortemDeal] = useState(null)
  const [postMortemTargetStatus, setPostMortemTargetStatus] = useState(null)
  const [lossReason, setLossReason] = useState(LOSS_REASONS[0])
  const [winningCompetitor, setWinningCompetitor] = useState('')
  const [postMortemLessons, setPostMortemLessons] = useState('')
  const [winFactor, setWinFactor] = useState(WIN_FACTORS[0])
  const [wonAmount, setWonAmount] = useState('')
  const [savingPostMortem, setSavingPostMortem] = useState(false)
  const [showIntelPanel, setShowIntelPanel] = useState(false)

  useEffect(() => {
    loadProposals()
  }, [proposalVersion])

  async function loadProposals() {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('proposals')
        .select(`
          id,
          proposal_code,
          title,
          status,
          deal_value_etb,
          submission_deadline,
          actual_submission_date,
          document_url,
          notes,
          created_at,
          opportunities (
            id,
            lead_code,
            sbus (name),
            clients (name, sector)
          )
        `)
        .order('created_at', { ascending: false })

      if (err) throw err
      setProposals(data || [])
    } catch (err) {
      setError(err.message || 'Could not load proposals.')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenDealDrawer(deal) {
    setSelectedDeal({ ...deal })
    setSelectedDealOwner(parseOwner(deal.notes))
    setDrawerErrors([])
  }

  function handleOpenOutreach(deal, e) {
    if (e) e.stopPropagation()
    const clientName = deal.opportunities?.clients?.name || 'Client'
    const title = deal.title || 'Proposal'
    const code = deal.proposal_code || 'PROPOSAL'

    const tpl = OUTREACH_TEMPLATES[outreachTemplateKey] || OUTREACH_TEMPLATES.status_check
    setOutreachDeal(deal)
    setOutreachSubject(tpl.subject(clientName, title, code))
    setOutreachBody(tpl.body(clientName, title, code))
    setCopiedToast(false)
  }

  function handleSelectTemplate(key) {
    setOutreachTemplateKey(key)
    if (!outreachDeal) return
    const clientName = outreachDeal.opportunities?.clients?.name || 'Client'
    const title = outreachDeal.title || 'Proposal'
    const code = outreachDeal.proposal_code || 'PROPOSAL'
    const tpl = OUTREACH_TEMPLATES[key]

    setOutreachSubject(tpl.subject(clientName, title, code))
    setOutreachBody(tpl.body(clientName, title, code))
  }

  async function logOutreachTouchpoint(channelLabel) {
    if (!autoLogOutreach || !outreachDeal) return
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16)
    const tplLabel = OUTREACH_TEMPLATES[outreachTemplateKey]?.label || 'Follow-Up'
    const entry = `[${timestamp}] 💬 ${channelLabel} Outreach Sent: ${tplLabel}`

    const cleanExisting = (outreachDeal.notes || '')
    const finalNotes = `${entry}\n\n${cleanExisting}`.trim()

    try {
      await supabase
        .from('proposals')
        .update({ notes: finalNotes })
        .eq('id', outreachDeal.id)

      const updated = { ...outreachDeal, notes: finalNotes }
      setProposals((prev) => prev.map((p) => (p.id === outreachDeal.id ? updated : p)))
      if (selectedDeal?.id === outreachDeal.id) {
        setSelectedDeal(updated)
      }
    } catch (err) {
      console.error('Failed to log outreach entry:', err)
    }
  }

  function handleSendWhatsApp() {
    logOutreachTouchpoint('WhatsApp')
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(outreachBody)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleSendEmail() {
    logOutreachTouchpoint('Email')
    const mailto = `mailto:?subject=${encodeURIComponent(outreachSubject)}&body=${encodeURIComponent(outreachBody)}`
    window.location.href = mailto
  }

  function handleCopyText() {
    navigator.clipboard.writeText(outreachBody)
    setCopiedToast(true)
    logOutreachTouchpoint('Clipboard Copied')
    setTimeout(() => setCopiedToast(false), 2500)
  }

  async function handleInitiateStatusChange(deal, newStatus) {
    if (newStatus === 'Lost') {
      const existing = parseOutcome(deal.notes)
      setLossReason(existing?.reason || LOSS_REASONS[0])
      setWinningCompetitor(existing?.competitor || '')
      setPostMortemLessons(existing?.lessons || '')
      setPostMortemDeal(deal)
      setPostMortemTargetStatus('Lost')
      return
    }

    if (newStatus === 'Won') {
      const existing = parseOutcome(deal.notes)
      setWinFactor(existing?.factor || WIN_FACTORS[0])
      setWonAmount(deal.deal_value_etb || '')
      setPostMortemLessons(existing?.lessons || '')
      setPostMortemDeal(deal)
      setPostMortemTargetStatus('Won')
      return
    }

    await executeStatusChange(deal.id, newStatus)
  }

  async function executeStatusChange(id, newStatus, updatedNotes, updatedValue) {
    try {
      const updatePayload = { status: newStatus }
      if (updatedNotes !== undefined) updatePayload.notes = updatedNotes
      if (updatedValue !== undefined) updatePayload.deal_value_etb = updatedValue

      const { error: updateErr } = await supabase
        .from('proposals')
        .update(updatePayload)
        .eq('id', id)

      if (updateErr) throw updateErr
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updatePayload } : p))
      )
      if (selectedDeal?.id === id) {
        setSelectedDeal((prev) => ({ ...prev, ...updatePayload }))
      }
    } catch (err) {
      alert('Could not update status: ' + err.message)
    }
  }

  async function handleSavePostMortem(e) {
    e.preventDefault()
    if (!postMortemDeal) return

    setSavingPostMortem(true)
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16)

    let outcomePayload = {}
    let logSummary = ''

    if (postMortemTargetStatus === 'Lost') {
      outcomePayload = {
        status: 'Lost',
        reason: lossReason,
        competitor: winningCompetitor.trim(),
        lessons: postMortemLessons.trim(),
      }
      logSummary = `[${timestamp}] 🏁 Outcome: Lost (Reason: ${lossReason}${winningCompetitor ? `, Competitor: ${winningCompetitor}` : ''})`
    } else {
      outcomePayload = {
        status: 'Won',
        factor: winFactor,
        lessons: postMortemLessons.trim(),
      }
      logSummary = `[${timestamp}] 🏆 Outcome: Won (Factor: ${winFactor})`
    }

    const withOutcome = stringifyOutcomeWithNotes(outcomePayload, postMortemDeal.notes)
    const finalNotes = `${logSummary}\n\n${withOutcome}`

    const finalVal = postMortemTargetStatus === 'Won' && wonAmount !== ''
      ? parseFloat(wonAmount) || postMortemDeal.deal_value_etb
      : postMortemDeal.deal_value_etb

    await executeStatusChange(postMortemDeal.id, postMortemTargetStatus, finalNotes, finalVal)
    setSavingPostMortem(false)
    setPostMortemDeal(null)
  }

  function handleDragStart(e, id) {
    setDraggedDealId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggedDealId(null)
    setDragOverStage(null)
  }

  function handleDragOver(e, stage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stage) {
      setDragOverStage(stage)
    }
  }

  function handleDragLeave(e, stage) {
    if (e.currentTarget.contains(e.relatedTarget)) return
    if (dragOverStage === stage) {
      setDragOverStage(null)
    }
  }

  async function handleDrop(e, targetStage) {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId
    setDragOverStage(null)
    setDraggedDealId(null)

    if (!dealId) return
    const deal = proposals.find((p) => p.id === dealId)
    if (deal && deal.status !== targetStage) {
      await handleInitiateStatusChange(deal, targetStage)
    }
  }

  // Generic tag-based state updates for stage-specific fields
  function updateDealTag(tag, value) {
    if (!selectedDeal) return
    const updatedNotes = updateTag(selectedDeal.notes, tag, value)
    setSelectedDeal({ ...selectedDeal, notes: updatedNotes })
  }

  function toggleGate(gateId) {
    if (!selectedDeal) return
    const currentGates = parseGates(selectedDeal.notes)
    const nextGates = currentGates.includes(gateId)
      ? currentGates.filter((g) => g !== gateId)
      : [...currentGates, gateId]
    const updatedNotes = stringifyGatesWithNotes(nextGates, selectedDeal.notes)
    setSelectedDeal({ ...selectedDeal, notes: updatedNotes })
  }

  async function handleSaveDealDossier(e) {
    e.preventDefault()
    setDrawerErrors([])
    const currentStage = selectedDeal.status || 'Initiated'
    const errors = []

    if (!selectedDeal.title || !selectedDeal.title.trim()) {
      errors.push('Proposal Scope / Title is required.')
    }

    if (currentStage === 'Initiated') {
      const val = parseFloat(selectedDeal.deal_value_etb)
      if (isNaN(val) || val <= 0) {
        errors.push('Estimated Deal Value (ETB) is mandatory for Initiated deals.')
      }
      if (!selectedDealOwner || selectedDealOwner === 'Unassigned') {
        errors.push('A designated Commercial Owner must be assigned.')
      }
    }

    if (currentStage === 'In Progress') {
      if (!selectedDeal.submission_deadline) {
        errors.push('Submission Deadline Date is mandatory for proposals In Progress.')
      }
    }

    if (currentStage === 'Submitted') {
      if (!selectedDeal.submission_deadline && !selectedDeal.actual_submission_date) {
        errors.push('Actual Submission Date or Deadline is required.')
      }
    }

    if (currentStage === 'Won') {
      const val = parseFloat(selectedDeal.deal_value_etb)
      if (isNaN(val) || val <= 0) {
        errors.push('Final Contracted Value (ETB) must be confirmed to save as Won.')
      }
    }

    if (errors.length > 0) {
      setDrawerErrors(errors)
      return
    }

    setSaving(true)
    try {
      const notesWithOwner = stringifyOwnerWithNotes(selectedDealOwner, selectedDeal.notes)

      const updatePayload = {
        title: selectedDeal.title,
        deal_value_etb: parseFloat(selectedDeal.deal_value_etb) || 0,
        status: selectedDeal.status,
        submission_deadline: selectedDeal.submission_deadline || null,
        actual_submission_date: selectedDeal.actual_submission_date || null,
        document_url: selectedDeal.document_url || null,
        notes: notesWithOwner,
      }

      const { error: updateErr } = await supabase
        .from('proposals')
        .update(updatePayload)
        .eq('id', selectedDeal.id)

      if (updateErr) throw updateErr

      const updatedDeal = { ...selectedDeal, notes: notesWithOwner }
      setProposals((prev) =>
        prev.map((p) => (p.id === selectedDeal.id ? updatedDeal : p))
      )
      setSelectedDeal(null)
    } catch (err) {
      alert('Failed to save deal changes: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogActivity(e) {
    e.preventDefault()
    if (!activityNote.trim() && !nextActionCommitment.trim()) {
      alert('Please enter a note or next action commitment.')
      return
    }

    setLoggingActivity(true)
    try {
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16)
      let logEntry = `[${timestamp}] ${activityType}: ${activityNote.trim()}`
      if (nextActionCommitment.trim()) {
        logEntry += ` | Next: ${nextActionCommitment.trim()}`
      }
      if (nextActionDate) {
        logEntry += ` (Due: ${nextActionDate})`
      }

      const cleanExistingNotes = (selectedDeal.notes || '').trim()
      const combinedNotes = cleanExistingNotes ? `${logEntry}\n\n${cleanExistingNotes}` : logEntry

      const { error: propErr } = await supabase
        .from('proposals')
        .update({ notes: combinedNotes })
        .eq('id', selectedDeal.id)

      if (propErr) throw propErr

      const updatedDeal = { ...selectedDeal, notes: combinedNotes }
      setSelectedDeal(updatedDeal)
      setProposals((prev) =>
        prev.map((p) => (p.id === selectedDeal.id ? updatedDeal : p))
      )

      setActivityNote('')
      setNextActionCommitment('')
      setNextActionDate('')
      setActivitySuccessToast(true)
      setTimeout(() => setActivitySuccessToast(false), 3000)
    } catch (err) {
      alert('Could not log activity: ' + err.message)
    } finally {
      setLoggingActivity(false)
    }
  }

  const wonDealsList = proposals.filter((p) => p.status === 'Won')
  const lostDealsList = proposals.filter((p) => p.status === 'Lost')
  const decidedTotal = wonDealsList.length + lostDealsList.length
  const winRatePercent = decidedTotal > 0 ? Math.round((wonDealsList.length / decidedTotal) * 100) : 0

  const lossReasonCounts = {}
  const competitorCounts = {}

  lostDealsList.forEach((d) => {
    const out = parseOutcome(d.notes)
    const r = out?.reason || 'Financial (Too Expensive)'
    lossReasonCounts[r] = (lossReasonCounts[r] || 0) + 1
    if (out?.competitor) {
      competitorCounts[out.competitor] = (competitorCounts[out.competitor] || 0) + 1
    }
  })

  const workloadMetrics = TEAM_OWNERS.map((ownerName) => {
    const ownerDeals = proposals.filter((p) => parseOwner(p.notes) === ownerName)
    const openDeals = ownerDeals.filter((p) => !['Won', 'Lost', 'Cancelled'].includes(p.status))
    const wonDeals = ownerDeals.filter((p) => p.status === 'Won')
    const openVal = openDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
    const wonVal = wonDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)

    return {
      name: ownerName,
      totalCount: ownerDeals.length,
      openCount: openDeals.length,
      wonCount: wonDeals.length,
      openValue: openVal,
      wonValue: wonVal,
    }
  }).filter((w) => w.totalCount > 0 || ['Ybeltal', 'Tsegaab', 'Seife', 'Yeabsira'].includes(w.name))

  const filteredProposals = proposals.filter((p) => {
    const clientName = p.opportunities?.clients?.name?.toLowerCase() || ''
    const title = p.title?.toLowerCase() || ''
    const code = p.proposal_code?.toLowerCase() || ''
    const sbu = p.opportunities?.sbus?.name || ''
    const health = getDealHealth(p)
    const owner = parseOwner(p.notes)

    const matchesSearch =
      clientName.includes(searchQuery.toLowerCase()) ||
      title.includes(searchQuery.toLowerCase()) ||
      code.includes(searchQuery.toLowerCase())

    const matchesSBU = filterSBU === 'ALL' || sbu === filterSBU
    const matchesHealth = filterHealth === 'ALL' || health.status === filterHealth
    const matchesOwner = filterOwner === 'ALL' || owner === filterOwner

    return matchesSearch && matchesSBU && matchesHealth && matchesOwner
  })

  // Helper to render customized format per pipeline stage inside the drawer
  function renderStageSpecificFormat() {
    if (!selectedDeal) return null
    const stage = selectedDeal.status || 'Initiated'
    const activeSavedGates = parseGates(selectedDeal.notes)

    switch (stage) {
      case 'Initiated': {
        const goNoGo = parseTag(selectedDeal.notes, 'GONOGO') || 'Pending'
        const stakeholder = parseTag(selectedDeal.notes, 'STAKEHOLDER')
        const initGates = [
          { id: 'init_tor', label: 'TOR / Concept Scope Document Obtained & Reviewed' },
          { id: 'init_capacity', label: 'SBU Delivery Capacity & Practice Lead Assigned' },
          { id: 'init_budget', label: 'Client Budget Availability Confirmed' },
        ]

        return (
          <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0369a1' }}>
                🎯 STAGE 1: INTAKE & QUALIFICATION
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#e0f2fe', color: '#0369a1' }}>
                Go/No-Go Decision
              </span>
            </div>

            {/* 3-Pill Interactive Decision Widget */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                Pursuit Clearance:
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'Approved Go', label: '🟢 Approved Go', bg: '#dcfce7', text: '#166534', border: '#86efac' },
                  { id: 'Under Review', label: '🟡 Reviewing', bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
                  { id: 'No-Go', label: '🔴 No-Go', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => updateDealTag('GONOGO', pill.id)}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: goNoGo === pill.id ? `2px solid ${pill.text}` : `1px solid ${pill.border}`,
                      background: goNoGo === pill.id ? pill.bg : '#ffffff',
                      color: pill.text,
                      boxShadow: goNoGo === pill.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Client Decision-Maker Input */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                Client Decision-Maker / Sponsor:
              </label>
              <input
                type="text"
                placeholder="e.g. Ato Dawit (VP Operations) or HR Director"
                value={stakeholder}
                onChange={(e) => updateDealTag('STAKEHOLDER', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
              />
            </div>

            {/* Qualification Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {initGates.map((gate) => {
                const isChecked = activeSavedGates.includes(gate.id)
                return (
                  <label key={gate.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isChecked ? '#0f172a' : '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleGate(gate.id)}
                      style={{ accentColor: '#0284c7', width: 15, height: 15 }}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400 }}>{gate.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      }

      case 'In Progress': {
        const progGates = [
          { id: 'prog_methodology', label: 'Technical Proposal & Methodology Drafted' },
          { id: 'prog_cvs', label: 'Key Consultant & Expert CVs Formatted' },
          { id: 'prog_tax', label: 'Valid Tax Clearance & Business License Attached' },
          { id: 'prog_audits', label: 'Audited Financial Statements (Last 2–3 Yrs) Packaged' },
          { id: 'prog_cpo', label: 'Bid Bond / CPO Guarantee Secured from Bank' },
          { id: 'prog_signoff', label: 'Managing Director & SBU Head Sign-Off Cleared' },
        ]
        const cleared = progGates.filter((g) => activeSavedGates.includes(g.id)).length
        const pct = Math.round((cleared / progGates.length) * 100)

        return (
          <div style={{ padding: 16, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#b45309' }}>
                📘 STAGE 2: TENDER DOSSIER & STATUTORY COMPLIANCE
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: pct === 100 ? '#dcfce7' : '#fef3c7', color: pct === 100 ? '#166534' : '#b45309' }}>
                {cleared} of {progGates.length} Ready ({pct}%)
              </span>
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: 12, color: '#92400e' }}>
              Assemble technical, administrative, and compliance packages before submission deadline.
            </p>

            <div style={{ height: 6, background: '#fef3c7', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16a34a' : '#f59e0b', transition: 'width 0.3s' }} />
            </div>

            {/* 2-Column Statutory Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {progGates.map((gate) => {
                const isChecked = activeSavedGates.includes(gate.id)
                return (
                  <label key={gate.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isChecked ? '#0f172a' : '#78350f', cursor: 'pointer', background: isChecked ? '#fef3c7' : '#ffffff', padding: '6px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleGate(gate.id)}
                      style={{ accentColor: '#f59e0b', width: 15, height: 15 }}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400 }}>{gate.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      }

      case 'Submitted': {
        const slipUrl = parseTag(selectedDeal.notes, 'SLIP_URL')
        const openingDate = parseTag(selectedDeal.notes, 'OPENING_DATE')
        const subGates = [
          { id: 'sub_receipt', label: 'Stamped Submission Receipt / Tender Slip Filed' },
          { id: 'sub_cpo_filed', label: 'Original CPO Guarantee Retained in Safe' },
          { id: 'sub_followup', label: 'First Evaluation Check Scheduled in CRM' },
        ]

        return (
          <div style={{ padding: 16, background: '#eef2ff', borderRadius: 10, border: '1px solid #c7d2fe', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#4338ca' }}>
                📤 STAGE 3: PROOF OF SUBMISSION & PROTOCOL
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#e0e7ff', color: '#4338ca' }}>
                Delivery Logged
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                  Stamped Receipt / Slip URL:
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={slipUrl}
                  onChange={(e) => updateDealTag('SLIP_URL', e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                  Client Bid Opening Date:
                </label>
                <input
                  type="date"
                  value={openingDate}
                  onChange={(e) => updateDealTag('OPENING_DATE', e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {subGates.map((gate) => {
                const isChecked = activeSavedGates.includes(gate.id)
                return (
                  <label key={gate.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isChecked ? '#0f172a' : '#4338ca', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleGate(gate.id)}
                      style={{ accentColor: '#6366f1', width: 15, height: 15 }}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400 }}>{gate.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      }

      case 'Under Review':
      case 'Shortlisted': {
        const pitchDeckUrl = parseTag(selectedDeal.notes, 'PITCH_DECK')
        const evalRank = parseTag(selectedDeal.notes, 'EVAL_RANK') || 'Shortlisted'
        const reviewGates = [
          { id: 'rev_clarifications', label: 'Technical Clarifications / Committee Queries Formally Answered' },
          { id: 'rev_rehearsal', label: 'Core Technical Defense Team Briefed & Rehearsed' },
          { id: 'rev_standing', label: 'Commercial & Technical Evaluation Ranking Confirmed' },
        ]

        return (
          <div style={{ padding: 16, background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#6b21a8' }}>
                🔍 STAGE 4/5: EVALUATION DEFENSE & PITCH
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f3e8ff', color: '#6b21a8' }}>
                Shortlist Defense
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                  Pitch Presentation Deck Link:
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={pitchDeckUrl}
                  onChange={(e) => updateDealTag('PITCH_DECK', e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                  Client Committee Standing:
                </label>
                <select
                  value={evalRank}
                  onChange={(e) => updateDealTag('EVAL_RANK', e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                >
                  <option value="Rank 1 (Preferred)">🥇 Rank 1 (Highest Scorer)</option>
                  <option value="Shortlisted (Top 3)">🥈 Shortlisted (Top 3 Contenders)</option>
                  <option value="Clarifications Pending">⏳ Clarifications Pending</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reviewGates.map((gate) => {
                const isChecked = activeSavedGates.includes(gate.id)
                return (
                  <label key={gate.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isChecked ? '#0f172a' : '#6b21a8', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleGate(gate.id)}
                      style={{ accentColor: '#8b5cf6', width: 15, height: 15 }}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400 }}>{gate.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      }

      case 'Negotiation': {
        const milestones = parseTag(selectedDeal.notes, 'MILESTONES') || '30% Advance | 40% Draft | 30% Final'
        const targetSigning = parseTag(selectedDeal.notes, 'SIGNING_TARGET')
        const negGates = [
          { id: 'neg_scope', label: 'Revised Scope of Work & Delivery Schedule Agreed' },
          { id: 'neg_fees', label: 'Final Commercial Fee & Tax Structure Locked' },
          { id: 'neg_legal', label: 'Contract Vetted by Legal Counsel & Managing Director' },
        ]

        return (
          <div style={{ padding: 16, background: '#fff7ed', borderRadius: 10, border: '1px solid #ffedd5', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#c2410c' }}>
                🤝 STAGE 6: COMMERCIAL CLOSING & CONTRACTING
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#ffedd5', color: '#c2410c' }}>
                Finalizing Contract
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                  Payment Milestones:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 30% Advance, 40% Milestone 1, 30% Final"
                  value={milestones}
                  onChange={(e) => updateDealTag('MILESTONES', e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                  Target Contract Signing Date:
                </label>
                <input
                  type="date"
                  value={targetSigning}
                  onChange={(e) => updateDealTag('SIGNING_TARGET', e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {negGates.map((gate) => {
                const isChecked = activeSavedGates.includes(gate.id)
                return (
                  <label key={gate.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isChecked ? '#0f172a' : '#c2410c', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleGate(gate.id)}
                      style={{ accentColor: '#ea580c', width: 15, height: 15 }}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400 }}>{gate.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      }

      case 'Won': {
        const contractLink = parseTag(selectedDeal.notes, 'CONTRACT_LINK')
        const kickoffDate = parseTag(selectedDeal.notes, 'KICKOFF_DATE')
        const wonGates = [
          { id: 'won_signed', label: 'Executed Bilateral Contract Signed & Filed in Vault' },
          { id: 'won_cpo_returned', label: 'Bid Bond / CPO Guarantee Released Back from Bank' },
          { id: 'won_finance_invoice', label: 'Finance Notified for Advance Payment / Mobilization Invoice' },
        ]

        return (
          <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 10, border: '2px solid #86efac', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>
                🏆 DEAL WON: HANDOVER & DELIVERY KICKOFF
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#166534' }}>
                Contract Secured
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                  Signed Contract Vault Link:
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={contractLink}
                  onChange={(e) => updateDealTag('CONTRACT_LINK', e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                  Project Kickoff Meeting Date:
                </label>
                <input
                  type="date"
                  value={kickoffDate}
                  onChange={(e) => updateDealTag('KICKOFF_DATE', e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {wonGates.map((gate) => {
                const isChecked = activeSavedGates.includes(gate.id)
                return (
                  <label key={gate.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isChecked ? '#0f172a' : '#166534', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleGate(gate.id)}
                      style={{ accentColor: '#16a34a', width: 15, height: 15 }}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400 }}>{gate.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      }

      case 'Lost': {
        const currentLossReason = parseTag(selectedDeal.notes, 'LOSS_REASON') || LOSS_REASONS[0]
        const comp = parseTag(selectedDeal.notes, 'COMPETITOR')

        return (
          <div style={{ padding: 16, background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#991b1b' }}>
                🏁 POST-MORTEM: COMPETITIVE LOSS INTELLIGENCE
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fee2e2', color: '#991b1b' }}>
                Deal Lost
              </span>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                Primary Loss Factor:
              </label>
              <select
                value={currentLossReason}
                onChange={(e) => updateDealTag('LOSS_REASON', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
              >
                {LOSS_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                Winning Competitor / Firm:
              </label>
              <input
                type="text"
                placeholder="e.g. PwC, KPMG, Deloitte, HST, Local firm"
                value={comp}
                onChange={(e) => updateDealTag('COMPETITOR', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
              />
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div>
      {/* Top Filter & Intelligence Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by client, title, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              width: '210px',
              fontSize: 13,
            }}
          />

          <select
            value={filterSBU}
            onChange={(e) => setFilterSBU(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              backgroundColor: '#fff',
            }}
          >
            <option value="ALL">All SBUs</option>
            <option value="Institute">Institute</option>
            <option value="CBS">CBS</option>
            <option value="DAS">DAS</option>
            <option value="IIP">IIP</option>
          </select>

          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              backgroundColor: '#fff',
              fontWeight: 600,
              color: '#0f172a',
            }}
          >
            <option value="ALL">👤 All Owners</option>
            <option value="Ybeltal">👤 My Deals (Ybeltal)</option>
            {TEAM_OWNERS.filter((o) => o !== 'Ybeltal').map((owner) => (
              <option key={owner} value={owner}>
                👤 {owner}
              </option>
            ))}
          </select>

          <select
            value={filterHealth}
            onChange={(e) => setFilterHealth(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              backgroundColor: '#fff',
            }}
          >
            <option value="ALL">All Deal Health</option>
            <option value="active">🟢 Active (&lt; 14d)</option>
            <option value="attention">🟡 Follow-Up (14–30d)</option>
            <option value="stale">🔴 Stale (&gt; 30d)</option>
            <option value="closed">⚪ Closed</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setShowWorkloadPanel((v) => !v)
              setShowIntelPanel(false)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: showWorkloadPanel ? '#eff6ff' : '#fff',
              color: showWorkloadPanel ? '#1d4ed8' : '#334155',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            👥 Team Workload
          </button>

          <button
            type="button"
            onClick={() => {
              setShowIntelPanel((v) => !v)
              setShowWorkloadPanel(false)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: showIntelPanel ? '#f0fdf4' : '#fff',
              color: showIntelPanel ? '#166534' : '#334155',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            📊 Win/Loss Intel {decidedTotal > 0 && `(${winRatePercent}%)`}
          </button>
        </div>

        <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
          <button
            type="button"
            onClick={() => setViewMode('board')}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              backgroundColor: viewMode === 'board' ? '#fff' : 'transparent',
              color: viewMode === 'board' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            📊 Pipeline Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              backgroundColor: viewMode === 'table' ? '#fff' : 'transparent',
              color: viewMode === 'table' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            📋 Table View
          </button>
        </div>
      </div>

      {/* Team Workload Panel */}
      {showWorkloadPanel && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #bfdbfe',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              👥 Commercial Owner Workload & Portfolio Allocation
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Active Proposals Assigned across Senior Relationship Officers
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            {workloadMetrics.map((w) => (
              <div
                key={w.name}
                onClick={() => setFilterOwner(filterOwner === w.name ? 'ALL' : w.name)}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  border: filterOwner === w.name ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  background: filterOwner === w.name ? '#f0f9ff' : '#f8fafc',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <OwnerPhoto name={w.name} />
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>{w.name}</strong>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: 10 }}>
                    {w.openCount} active
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0' }}>
                  {formatMoney(w.openValue)}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {w.wonCount} won deals ({formatMoney(w.wonValue)})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Win/Loss & Competitor Intel Drawer */}
      {showIntelPanel && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #bbf7d0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Institutional Conversion Rate
            </span>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              {winRatePercent}% Win Rate
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {wonDealsList.length} Won vs {lostDealsList.length} Lost ({decidedTotal} decided)
            </span>
          </div>

          <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
              Loss Reasons Breakdown
            </span>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(lossReasonCounts).length === 0 ? (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>No lost deals recorded yet</span>
              ) : (
                Object.entries(lossReasonCounts).map(([r, c]) => (
                  <div key={r} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
                    <span>• {r}</span>
                    <strong style={{ color: '#0f172a' }}>{c} ({Math.round((c / lostDealsList.length) * 100)}%)</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
              Identified Competitor Wins
            </span>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(competitorCounts).length === 0 ? (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>No competitors logged</span>
              ) : (
                Object.entries(competitorCounts).map(([comp, count]) => (
                  <div key={comp} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
                    <span>🏢 {comp}</span>
                    <strong style={{ color: '#0f172a' }}>{count} loss(es)</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>Loading pipeline data…</p>}

      {/* 1. KANBAN BOARD */}
      {!loading && viewMode === 'board' && (
        <div
          style={{
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 16,
            minHeight: '620px',
          }}
        >
          {STAGES.map((stage) => {
            const stageDeals = filteredProposals.filter((p) => p.status === stage)
            const stageValue = stageDeals.reduce((sum, p) => sum + (Number(p.deal_value_etb) || 0), 0)
            const isTargeted = dragOverStage === stage

            return (
              <div
                key={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={(e) => handleDragLeave(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                style={{
                  width: 290,
                  minWidth: 290,
                  background: isTargeted ? '#f0f9ff' : '#f8fafc',
                  borderRadius: 8,
                  border: isTargeted ? '2px dashed #0284c7' : '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '75vh',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #e2e8f0',
                    background: isTargeted ? '#e0f2fe' : '#ffffff',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{stage}</span>
                    <span
                      style={{
                        background: isTargeted ? '#bae6fd' : '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#475569',
                      }}
                    >
                      {stageDeals.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
                    {formatMoney(stageValue)}
                  </div>
                </div>

                <div
                  style={{
                    padding: 10,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flex: 1,
                  }}
                >
                  {stageDeals.map((deal) => {
                    const clientName = deal.opportunities?.clients?.name || 'Unassigned Client'
                    const sbuName = deal.opportunities?.sbus?.name || 'SBU'
                    const health = getDealHealth(deal)
                    const isBeingDragged = draggedDealId === deal.id
                    const owner = parseOwner(deal.notes)

                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleOpenDealDrawer(deal)}
                        style={{
                          background: '#ffffff',
                          padding: 12,
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          cursor: 'grab',
                          opacity: isBeingDragged ? 0.45 : 1,
                          transition: 'opacity 0.15s ease, transform 0.1s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {sbuName}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                background: health.bg,
                                color: health.color,
                                border: `1px solid ${health.border}`,
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {health.label}
                            </span>
                          </div>

                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                            {deal.proposal_code || 'PROPOSAL'}
                          </span>
                        </div>

                        <strong style={{ fontSize: 13, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                          {clientName}
                        </strong>

                        <p
                          style={{
                            fontSize: 12,
                            color: '#475569',
                            margin: '0 0 8px 0',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {deal.title}
                        </p>

                        {deal.submission_deadline && (
                          <div style={{ marginBottom: 6 }}>
                            {renderDeadlineBadge(deal.submission_deadline)}
                          </div>
                        )}

                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <OwnerPhoto name={owner} />
                            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                              {owner}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleOpenOutreach(deal, e)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 4,
                              border: '1px solid #10b981',
                              background: '#ecfdf5',
                              color: '#047857',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            💬 Outreach
                          </button>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: 8,
                            marginTop: 4,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                            {formatMoney(deal.deal_value_etb)}
                          </span>

                          <select
                            value={deal.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleInitiateStatusChange(deal, e.target.value)}
                            style={{
                              fontSize: 11,
                              padding: '2px 4px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              backgroundColor: '#f8fafc',
                              cursor: 'pointer',
                            }}
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}

                  {stageDeals.length === 0 && (
                    <div
                      style={{
                        padding: '24px 10px',
                        textAlign: 'center',
                        color: isTargeted ? '#0284c7' : '#94a3b8',
                        fontSize: 12,
                        border: isTargeted ? '1px dashed #0284c7' : '1px dashed #cbd5e1',
                        borderRadius: 6,
                        backgroundColor: isTargeted ? '#e0f2fe' : 'transparent',
                        fontWeight: isTargeted ? 600 : 400,
                      }}
                    >
                      {isTargeted ? 'Drop deal here' : 'No deals in this stage'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 2. TABLE VIEW */}
      {!loading && viewMode === 'table' && (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Code</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Client</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Scope / Title</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>SBU</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Commercial Owner</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Status</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Value (ETB)</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>Outreach</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((deal) => {
                const owner = parseOwner(deal.notes)

                return (
                  <tr
                    key={deal.id}
                    onClick={() => handleOpenDealDrawer(deal)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0369a1' }}>
                      {deal.proposal_code || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      {deal.opportunities?.clients?.name || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>
                      <div>{deal.title}</div>
                      {deal.submission_deadline && (
                        <div style={{ marginTop: 4 }}>
                          {renderDeadlineBadge(deal.submission_deadline)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          background: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {deal.opportunities?.sbus?.name || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <OwnerPhoto name={owner} />
                        <span>{owner}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={deal.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleInitiateStatusChange(deal, e.target.value)}
                        style={{
                          fontSize: 12,
                          padding: '3px 6px',
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {formatMoney(deal.deal_value_etb)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => handleOpenOutreach(deal, e)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: '1px solid #10b981',
                          background: '#ecfdf5',
                          color: '#047857',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        💬 Outreach
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Post-Mortem Modal */}
      {postMortemDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 500,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: postMortemTargetStatus === 'Won' ? '#dcfce7' : '#fee2e2',
                    color: postMortemTargetStatus === 'Won' ? '#166534' : '#b91c1c',
                  }}
                >
                  {postMortemTargetStatus === 'Won' ? '🏆 DEAL WON POST-MORTEM' : '🏁 DEAL LOST POST-MORTEM'}
                </span>
                <h3 style={{ margin: '6px 0 2px 0', color: '#0f172a' }}>
                  {postMortemTargetStatus === 'Won' ? 'Record Victory Intelligence' : 'Record Loss & Competitor Intelligence'}
                </h3>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {postMortemDeal.opportunities?.clients?.name} ({postMortemDeal.proposal_code})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPostMortemDeal(null)}
                style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePostMortem} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {postMortemTargetStatus === 'Lost' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Primary Loss Reason:
                    </label>
                    <select
                      value={lossReason}
                      onChange={(e) => setLossReason(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      {LOSS_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Winning Competitor Name (if known):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PwC, Deloitte, EY, local firm"
                      value={winningCompetitor}
                      onChange={(e) => setWinningCompetitor(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Primary Winning Factor:
                    </label>
                    <select
                      value={winFactor}
                      onChange={(e) => setWinFactor(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      {WIN_FACTORS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Final Contracted Value (ETB):
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 950000"
                      value={wonAmount}
                      onChange={(e) => setWonAmount(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Post-Mortem Lessons & Institutional Feedback:
                </label>
                <textarea
                  rows={3}
                  placeholder="Record remarks or delivery factors for future bidding rounds..."
                  value={postMortemLessons}
                  onChange={(e) => setPostMortemLessons(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setPostMortemDeal(null)}
                  style={{ flex: 1, padding: '9px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPostMortem}
                  style={{
                    flex: 2,
                    padding: '9px',
                    borderRadius: 6,
                    border: 'none',
                    background: postMortemTargetStatus === 'Won' ? '#16a34a' : '#b91c1c',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {savingPostMortem ? 'Saving…' : `Confirm & Move to ${postMortemTargetStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outreach Generator Modal */}
      {outreachDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 580,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {outreachDeal.proposal_code}
                </span>
                <h3 style={{ margin: '6px 0 2px 0', color: '#0f172a' }}>
                  💬 1-Click Outreach Generator
                </h3>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {outreachDeal.opportunities?.clients?.name} — {outreachDeal.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOutreachDeal(null)}
                style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Select Institutional Template:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {Object.entries(OUTREACH_TEMPLATES).map(([k, tpl]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleSelectTemplate(k)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: outreachTemplateKey === k ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: outreachTemplateKey === k ? '#f0f9ff' : '#fff',
                      color: outreachTemplateKey === k ? '#0369a1' : '#475569',
                    }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Subject (for Email):
              </label>
              <input
                type="text"
                value={outreachSubject}
                onChange={(e) => setOutreachSubject(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Message Body (WhatsApp & Email):
              </label>
              <textarea
                rows={9}
                value={outreachBody}
                onChange={(e) => setOutreachBody(e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  lineHeight: 1.5,
                  background: '#f8fafc',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoLogOutreach}
                onChange={(e) => setAutoLogOutreach(e.target.checked)}
                style={{ accentColor: '#0284c7', width: 15, height: 15 }}
              />
              <span>Automatically log this outreach touchpoint to deal history & audit trail</span>
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#25D366',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                💬 Open in WhatsApp
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#0284c7',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                ✉️ Open in Email
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: copiedToast ? '#dcfce7' : '#fff',
                  color: copiedToast ? '#166534' : '#475569',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {copiedToast ? 'Copied! ✓' : '📋 Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEAL DOSSIER (SLIDE-OVER DRAWER) */}
      {selectedDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              height: '100vh',
              backgroundColor: '#ffffff',
              boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              overflowY: 'auto',
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {selectedDeal.opportunities?.sbus?.name || 'SBU'}
                  </span>
                  {(() => {
                    const health = getDealHealth(selectedDeal)
                    return (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: health.bg,
                          color: health.color,
                          border: `1px solid ${health.border}`,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {health.label}
                      </span>
                    )
                  })()}
                  {selectedDeal.submission_deadline && renderDeadlineBadge(selectedDeal.submission_deadline)}
                </div>
                <h3 style={{ margin: '8px 0 2px 0', color: '#0f172a' }}>
                  {selectedDeal.opportunities?.clients?.name || 'Client Deal'}
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>{selectedDeal.proposal_code}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeal(null)}
                style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* MANDATORY VALIDATION ERROR BANNER */}
            {drawerErrors.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 12, marginBottom: 4 }}>
                  ⛔ Mandatory Requirements Missing for {selectedDeal.status}:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#b91c1c', fontSize: 12 }}>
                  {drawerErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Outreach Trigger */}
            <div style={{ marginTop: 14, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => handleOpenOutreach(selectedDeal)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid #10b981',
                  background: '#ecfdf5',
                  color: '#047857',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                💬 Open WhatsApp / Email Outreach Generator
              </button>
            </div>

            {/* SPECIALIZED STAGE-SPECIFIC REQUIREMENTS COMPONENT */}
            {renderStageSpecificFormat()}

            {/* Quick Touchpoint Logger */}
            <div
              style={{
                marginTop: 6,
                padding: 14,
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚡ Log Touchpoint & Schedule Next Action
              </h4>

              <form onSubmit={handleLogActivity} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    backgroundColor: '#fff',
                  }}
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <textarea
                  rows={2}
                  placeholder="Conversation notes (e.g. Discussed timeline with HR Director)..."
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Next commitment"
                    value={nextActionCommitment}
                    onChange={(e) => setNextActionCommitment(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                  <input
                    type="date"
                    value={nextActionDate}
                    onChange={(e) => setNextActionDate(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={loggingActivity}
                    style={{
                      padding: '7px 14px',
                      background: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: loggingActivity ? 'not-allowed' : 'pointer',
                      alignSelf: 'flex-start',
                    }}
                  >
                    {loggingActivity ? 'Recording…' : 'Save Touchpoint'}
                  </button>

                  {activitySuccessToast && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '4px 8px', borderRadius: 4, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      ✓ Touchpoint recorded to dossier!
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* Editable Proposal Form */}
            <form onSubmit={handleSaveDealDossier} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Proposal Scope / Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={selectedDeal.title || ''}
                  onChange={(e) => setSelectedDeal({ ...selectedDeal, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>
                  👤 Assigned Commercial Owner {selectedDeal.status === 'Initiated' && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <OwnerPhoto name={selectedDealOwner} />
                  <select
                    value={selectedDealOwner}
                    onChange={(e) => setSelectedDealOwner(e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc', fontWeight: 600 }}
                  >
                    {TEAM_OWNERS.map((owner) => (
                      <option key={owner} value={owner}>
                        {owner}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    {selectedDeal.status === 'Won' ? 'Final Contracted Value (ETB)' : 'Estimated Deal Value (ETB)'}
                    {(selectedDeal.status === 'Initiated' || selectedDeal.status === 'Won') && <span style={{ color: '#dc2626' }}>*</span>}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 500000"
                    value={selectedDeal.deal_value_etb || ''}
                    onChange={(e) => setSelectedDeal({ ...selectedDeal, deal_value_etb: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>
                    Pipeline Stage
                  </label>
                  <select
                    value={selectedDeal.status}
                    onChange={(e) => {
                      const newStatus = e.target.value
                      setSelectedDeal({ ...selectedDeal, status: newStatus })
                      setDrawerErrors([])
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '2px solid #0284c7', fontSize: 13, fontWeight: 700, background: '#f0f9ff', color: '#0369a1' }}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Submission Deadline {['In Progress', 'Submitted'].includes(selectedDeal.status) && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <input
                  type="date"
                  value={selectedDeal.submission_deadline || ''}
                  onChange={(e) => setSelectedDeal({ ...selectedDeal, submission_deadline: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Google Drive / Document Vault Link
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={selectedDeal.document_url || ''}
                  onChange={(e) => setSelectedDeal({ ...selectedDeal, document_url: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Touchpoint History & Audit Log
                </label>
                <textarea
                  rows={4}
                  value={selectedDeal.notes || ''}
                  onChange={(e) => setSelectedDeal({ ...selectedDeal, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    background: '#f8fafc',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDeal(null)}
                  style={{ flex: 1, padding: '9px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 2, padding: '9px', borderRadius: 6, border: 'none', background: '#ff7a59', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {saving ? 'Saving...' : 'Save Dossier Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}