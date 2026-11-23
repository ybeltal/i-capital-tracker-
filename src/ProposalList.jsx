import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import TorComplianceMatrixModal from './TorComplianceMatrixModal'

const ACTIVE_STAGES = [
  {
    id: '1. TOR Identified & Go/No-Go',
    shortTitle: '1. TOR & Go/No-Go',
    probability: 0.2,
    color: '#6366f1',
    badgeBg: '#e0e7ff',
    badgeText: '#4338ca',
    gateHint: 'Attach TOR/RFP reference or Go/No-Go screening summary.',
  },
  {
    id: '2. Proposal Drafting',
    shortTitle: '2. Proposal Drafting',
    probability: 0.4,
    color: '#0284c7',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
    gateHint: 'Confirm technical lead assigned and TOR/RFP uploaded.',
  },
  {
    id: '3. Submitted / Under Review',
    shortTitle: '3. Submitted / Review',
    probability: 0.6,
    color: '#d97706',
    badgeBg: '#fef3c7',
    badgeText: '#b45309',
    gateHint: 'Attach submission receipt, email proof, or tender registry confirmation.',
  },
  {
    id: '4. Shortlisted / Negotiation',
    shortTitle: '4. Shortlisted / Defense',
    probability: 0.8,
    color: '#7c3aed',
    badgeBg: '#ede9fe',
    badgeText: '#6d28d9',
    gateHint: 'Attach shortlist notice, defense invitation, or negotiation minutes.',
  },
  {
    id: '5. Contract Won / Signed',
    shortTitle: '5. Won / Signed',
    probability: 1.0,
    color: '#10b981',
    badgeBg: '#dcfce7',
    badgeText: '#15803d',
    gateHint: 'Attach Award Letter / Notification of Award before Project Delivery handoff.',
  },
]

const LOST_STAGE = {
  id: 'Closed Lost / No-Go',
  shortTitle: 'Lost / No-Go',
  probability: 0,
  color: '#dc2626',
  badgeBg: '#fee2e2',
  badgeText: '#b91c1c',
  gateHint: 'Mandatory Loss / No-Go reason required for Win-Rate analytics.',
}

const ALL_STAGES = [...ACTIVE_STAGES, LOST_STAGE]

const INITIATOR_OPTIONS = [
  'CEO',
  'RG',
  'Institute',
  'IIP',
  'DAS',
  'CBS',
  'Tender Portal',
  'Digital Marketing',
  'Client Referral',
  'Direct Outreach',
]

const BID_BOND_OPTIONS = [
  'Not Required',
  'Required — Pending',
  'Secured (CPO / Bank Guarantee)',
  'Submitted with Bid',
  'Released / Returned',
]

const LOSS_REASON_OPTIONS = [
  'Price / Financial Proposal Score',
  'Technical Evaluation Score',
  'Eligibility / Bid Bond / Compliance',
  'Client Cancelled / Postponed Tender',
  'Incumbent / Competitor Advantage',
  'Strategic No-Go Decision',
  'Other (Specify in Notes)',
]

const SBU_THEMES = {
  INST: { label: 'INST', full: 'The i-Capital Institute', accent: '#0284c7', bg: '#e0f2fe', text: '#0369a1' },
  IIP: { label: 'IIP', full: 'Investment Partners (IIP)', accent: '#0d9488', bg: '#ccfbf1', text: '#0f766e' },
  DAS: { label: 'DAS', full: 'Digital & AI Solutions (DAS)', accent: '#d97706', bg: '#fef3c7', text: '#b45309' },
  CBS: { label: 'CBS', full: 'Cross Border Solutions (CBS)', accent: '#6366f1', bg: '#e0e7ff', text: '#4338ca' },
}

function normalizeSbuCode(raw) {
  const s = String(raw || '').toLowerCase()
  if (s.includes('iip') || s.includes('invest')) return 'IIP'
  if (s.includes('das') || s.includes('digital') || s.includes('ai')) return 'DAS'
  if (s.includes('cbs') || s.includes('cross')) return 'CBS'
  return 'INST'
}

function normalizeStage(stageName) {
  if (!stageName) return ACTIVE_STAGES[0].id
  const s = String(stageName).trim().toLowerCase()
  if (s.includes('lost') || s.includes('no-go') || s.includes('no go') || s.includes('cancel')) {
    return LOST_STAGE.id
  }
  if (s.includes('5.') || s.includes('3. contract') || s.includes('won') || s.includes('signed') || s.includes('delivery') || s.includes('repeat')) {
    return ACTIVE_STAGES[4].id
  }
  if (s.includes('4.') || s.includes('shortlist') || s.includes('negotiat')) {
    return ACTIVE_STAGES[3].id
  }
  if (s.includes('3.') || s.includes('2. proposal in defense') || s.includes('submitted') || s.includes('under review') || s.includes('defense')) {
    return ACTIVE_STAGES[2].id
  }
  if (s.includes('2.') || s.includes('draft') || s.includes('in progress') || s.includes('prep')) {
    return ACTIVE_STAGES[1].id
  }
  return ACTIVE_STAGES[0].id
}

function getStageIndex(stageId) {
  return ACTIVE_STAGES.findIndex((s) => s.id === stageId)
}

function getStageConfig(stageName) {
  const norm = normalizeStage(stageName)
  return ALL_STAGES.find((s) => s.id === norm) || ACTIVE_STAGES[0]
}

function getDealValue(deal) {
  return Number(deal.deal_value || deal.contract_value || deal.estimated_value) || 0
}

function getDealClient(deal) {
  return deal.client || deal.client_organization || deal.client_name || deal.organization || 'Strategic Client'
}

function getDealTitle(deal) {
  return deal.title || deal.opportunity_title || deal.product || 'Proposal Mandate Scope'
}

function getDealCode(deal) {
  return deal.code || deal.deal_code || deal.proposal_code || `OPP-${String(deal.id || '').slice(0, 6).toUpperCase()}`
}

function getDealDeadline(deal) {
  return deal.deadline || deal.submission_deadline || ''
}

function formatEtb(amount) {
  const num = Number(amount) || 0
  return `ETB ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function getDeadlineMeta(deadlineStr, stageId) {
  if (!deadlineStr) {
    return { label: 'No deadline', urgency: 'none', days: null, bg: '#f1f5f9', color: '#64748b' }
  }
  if (stageId === ACTIVE_STAGES[4].id || stageId === LOST_STAGE.id) {
    return { label: deadlineStr, urgency: 'closed', days: null, bg: '#f1f5f9', color: '#475569' }
  }
  const target = new Date(deadlineStr)
  if (Number.isNaN(target.getTime())) {
    return { label: deadlineStr, urgency: 'none', days: null, bg: '#f1f5f9', color: '#64748b' }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: `Overdue ${Math.abs(diffDays)}d`, urgency: 'overdue', days: diffDays, bg: '#fee2e2', color: '#b91c1c' }
  }
  if (diffDays === 0) {
    return { label: 'Due Today', urgency: 'urgent', days: 0, bg: '#fee2e2', color: '#b91c1c' }
  }
  if (diffDays <= 7) {
    return { label: `Due in ${diffDays}d`, urgency: 'urgent', days: diffDays, bg: '#ffedd5', color: '#c2410c' }
  }
  return { label: `${diffDays}d left (${deadlineStr})`, urgency: 'normal', days: diffDays, bg: '#f0f9ff', color: '#0369a1' }
}

export default function ProposalList({
  userProfile,
  effectiveRole,
  isSuperAdmin,
  refreshVersion = 0,
  onRefresh,
  onNavigateTab,
  onNewProposal,
  onOpenTorChat,
  onOpenProposalStudio,
}) {
  const [deals, setDeals] = useState([])
  const [linkedProjectOppIds, setLinkedProjectOppIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  // View & Filter State
  const [viewMode, setViewMode] = useState('board') // 'board' | 'table'
  const [showLostArchive, setShowLostArchive] = useState(false)
  const [showRecoveryBin, setShowRecoveryBin] = useState(false)
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [wonHandoffOnly, setWonHandoffOnly] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [sbuFilter, setSbuFilter] = useState('ALL')
  const [ownerFilter, setOwnerFilter] = useState('ALL')
  const [initiatorFilter, setInitiatorFilter] = useState('ALL')
  const [evidenceFilter, setEvidenceFilter] = useState('ALL')
  const [verdictFilter, setVerdictFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('created_desc') // 'created_desc' | 'value_desc' | 'deadline_asc'

  // Drawer & Modals State
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [drawerTab, setDrawerTab] = useState('overview') // 'overview' | 'stage' | 'tools' | 'audit'
  const [assessmentDeal, setAssessmentDeal] = useState(null)

  // Drawer Edit Fields State
  const [editTitle, setEditTitle] = useState('')
  const [editClient, setEditClient] = useState('')
  const [editSbu, setEditSbu] = useState('Institute')
  const [editValue, setEditValue] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editOwner, setEditOwner] = useState('')
  const [editTechLead, setEditTechLead] = useState('')
  const [editInitiator, setEditInitiator] = useState('')
  const [editBidBond, setEditBidBond] = useState('Not Required')
  const [editNotes, setEditNotes] = useState('')
  const [savingFields, setSavingFields] = useState(false)

  // Governance Override & Stage Transition State
  const [adminOverrideEnabled, setAdminOverrideEnabled] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [targetStage, setTargetStage] = useState('')
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [lossReason, setLossReason] = useState(LOSS_REASON_OPTIONS[0])
  const [criteriaChecked, setCriteriaChecked] = useState({ c1: false, c2: false, c3: false })
  const [transitioningStage, setTransitioningStage] = useState(false)

  // Correction Request (Non-Admin) & Soft-Delete (Super Admin) State
  const [correctionNote, setCorrectionNote] = useState('')
  const [requestingCorrection, setRequestingCorrection] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deletingDeal, setDeletingDeal] = useState(false)

  // Drawer Auxiliary Data (Audit Trail + Linked Partners)
  const [auditLogs, setAuditLogs] = useState([])
  const [dealPartners, setDealPartners] = useState([])
  const [loadingDrawerData, setLoadingDrawerData] = useState(false)

  const [toastMsg, setToastMsg] = useState('')

  const activeRole = effectiveRole || userProfile?.role || 'read_only'
  const hasSuperAdminAccess =
    typeof isSuperAdmin === 'boolean' ? isSuperAdmin : activeRole === 'admin'
  const isReadOnlyRole = activeRole === 'read_only' || activeRole === 'smeal'
  const actorLabel = userProfile?.full_name || userProfile?.email || 'CRM Officer'

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4500)
  }

  useEffect(() => {
    fetchOpportunitiesAndProjects()

    const channel = supabase
      .channel('proposallist-governance-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        () => {
          fetchOpportunitiesAndProjects()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshVersion])

  async function fetchOpportunitiesAndProjects() {
    setLoading(true)
    try {
      const [oppRes, projRes] = await Promise.all([
        supabase.from('opportunities').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('id, source_opportunity_id, client_organization, project_title'),
      ])

      if (!oppRes.error && oppRes.data) {
        setDeals(oppRes.data)
      }

      if (!projRes.error && projRes.data) {
        const linkedSet = new Set(
          projRes.data.map((p) => String(p.source_opportunity_id || '')).filter(Boolean)
        )
        setLinkedProjectOppIds(linkedSet)
      }
    } catch (err) {
      console.error('Error fetching proposals:', err)
    } finally {
      setLoading(false)
    }
  }

  async function openDealDrawer(deal, initialTab = 'overview') {
    setSelectedDeal(deal)
    setDrawerTab(initialTab)
    setEditTitle(getDealTitle(deal))
    setEditClient(getDealClient(deal))
    setEditSbu(deal.sbu || 'Institute')
    setEditValue(String(getDealValue(deal) || ''))
    setEditDeadline(getDealDeadline(deal))
    setEditOwner(deal.commercial_owner || '')
    setEditTechLead(deal.technical_lead || '')
    setEditInitiator(deal.initiated_by || '')
    setEditBidBond(deal.bid_bond_status || 'Not Required')
    setEditNotes(deal.notes || '')

    setAdminOverrideEnabled(false)
    setOverrideReason('')
    setTargetStage('')
    setEvidenceTitle(deal.last_evidence_title || '')
    setEvidenceUrl(deal.last_evidence_url || '')
    setLossReason(deal.loss_reason || LOSS_REASON_OPTIONS[0])
    setCriteriaChecked({ c1: false, c2: false, c3: false })
    setCorrectionNote('')
    setShowDeleteConfirm(false)
    setDeleteReason('')

    setLoadingDrawerData(true)
    const [logsRes, partnersRes] = await Promise.all([
      supabase
        .from('deal_governance_logs')
        .select('*')
        .eq('record_id', String(deal.id))
        .order('created_at', { ascending: false }),
      supabase
        .from('deal_partners')
        .select('*, partners(partner_name, partner_type)')
        .eq('opportunity_id', String(deal.id)),
    ])

    setAuditLogs(logsRes.data || [])
    setDealPartners(partnersRes.data || [])
    setLoadingDrawerData(false)
  }

  function triggerChat(deal) {
    if (onOpenTorChat) {
      onOpenTorChat(deal)
    } else {
      window.dispatchEvent(new CustomEvent('crm:open-tor-chat', { detail: deal }))
    }
  }

  function triggerStudio(deal) {
    if (onOpenProposalStudio) {
      onOpenProposalStudio(deal)
    } else {
      window.dispatchEvent(new CustomEvent('crm:open-proposal-studio', { detail: deal }))
    }
  }

  // Two-tier lock checks for the currently selected deal
  const selectedNormStage = selectedDeal ? normalizeStage(selectedDeal.stage) : ''
  const selectedStageIdx = getStageIndex(selectedNormStage)
  const isSelectedClosed =
    selectedNormStage === ACTIVE_STAGES[4].id || selectedNormStage === LOST_STAGE.id
  const isSelectedSubmittedOrBeyond = selectedStageIdx >= 2 || isSelectedClosed

  const canEditIdentityFields = hasSuperAdminAccess && adminOverrideEnabled
  const canEditWorkingFields =
    !isReadOnlyRole &&
    ((!isSelectedSubmittedOrBeyond && !isSelectedClosed) ||
      (hasSuperAdminAccess && adminOverrideEnabled))

  async function handleSaveDealFields(e) {
    e.preventDefault()
    if (!selectedDeal) return

    if (hasSuperAdminAccess && adminOverrideEnabled && !overrideReason.trim()) {
      alert('Super Admin Override requires a justification reason for the immutable audit trail.')
      return
    }

    setSavingFields(true)
    try {
      const numericVal = parseFloat(String(editValue).replace(/[^0-9.]/g, '')) || 0
      const cleanDeadline = editDeadline.trim() || null

      const updates = {
        title: editTitle.trim(),
        commercial_owner: editOwner.trim() || null,
        technical_lead: editTechLead.trim() || null,
        initiated_by: editInitiator.trim() || null,
        bid_bond_status: editBidBond,
        notes: editNotes.trim() || null,
        last_modified_by: actorLabel,
        last_override_reason:
          hasSuperAdminAccess && adminOverrideEnabled ? overrideReason.trim() : null,
      }

      if (canEditWorkingFields) {
        updates.deal_value = numericVal
        updates.estimated_value = numericVal
        updates.contract_value = numericVal
        updates.deadline = cleanDeadline
        updates.submission_deadline = cleanDeadline
      }

      if (canEditIdentityFields) {
        updates.client = editClient.trim()
        updates.client_name = editClient.trim()
        updates.client_organization = editClient.trim()
        updates.sbu = editSbu
      }

      const { data, error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', selectedDeal.id)
        .select()

      if (error) throw new Error(error.message)

      const updated = data?.[0]
      if (updated) {
        setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
        await openDealDrawer(updated, 'overview')
      }
      onRefresh?.()
      showToast('✓ Proposal record updated and logged in Audit History.')
    } catch (err) {
      alert(`Save blocked by Governance Lock: ${err.message}`)
    } finally {
      setSavingFields(false)
    }
  }

  async function handleStageTransition(e) {
    e.preventDefault()
    if (!selectedDeal || !targetStage) return

    const currentStage = normalizeStage(selectedDeal.stage)
    const currentIdx = getStageIndex(currentStage)
    const nextIdx = getStageIndex(targetStage)
    const isMovingToLost = targetStage === LOST_STAGE.id
    const isRollback =
      !isMovingToLost && (isSelectedClosed || (nextIdx !== -1 && nextIdx <= currentIdx))

    if (isReadOnlyRole) {
      alert('Your current role has read-only access to proposal stages.')
      return
    }

    if (isRollback && !(hasSuperAdminAccess && adminOverrideEnabled)) {
      alert(
        'Stage rollbacks and reopening closed deals are locked. Use "Request Correction" or Super Admin Override.'
      )
      return
    }

    if (hasSuperAdminAccess && adminOverrideEnabled && !overrideReason.trim()) {
      alert('Please provide a Super Admin Override reason before executing this stage change.')
      return
    }

    if (isMovingToLost && !lossReason) {
      alert('Please select a Loss / No-Go reason before closing this deal.')
      return
    }

    if (!isMovingToLost && !evidenceTitle.trim() && !(hasSuperAdminAccess && adminOverrideEnabled)) {
      alert('Mandatory Stage-Gate Proof: describe the verified document or milestone evidence to advance.')
      return
    }

    setTransitioningStage(true)
    try {
      const updates = {
        stage: targetStage,
        evidence_status: evidenceTitle.trim() || evidenceUrl.trim() ? 'Verified' : selectedDeal.evidence_status || 'Provisional',
        last_evidence_title: evidenceTitle.trim() || selectedDeal.last_evidence_title || null,
        last_evidence_url: evidenceUrl.trim() || selectedDeal.last_evidence_url || null,
        loss_reason: isMovingToLost ? lossReason : selectedDeal.loss_reason || null,
        last_modified_by: actorLabel,
        last_override_reason:
          hasSuperAdminAccess && adminOverrideEnabled
            ? overrideReason.trim()
            : isMovingToLost
            ? `Closed (${lossReason})`
            : evidenceTitle.trim() || 'Stage-gate verified',
      }

      const { data, error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', selectedDeal.id)
        .select()

      if (error) throw new Error(error.message)

      const updated = data?.[0]
      if (updated) {
        setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
        await openDealDrawer(updated, 'stage')
      }
      onRefresh?.()
      showToast(`✓ Stage moved to "${targetStage}" and logged to Audit Trail.`)
    } catch (err) {
      alert(`Stage Transition Blocked: ${err.message}`)
    } finally {
      setTransitioningStage(false)
    }
  }

  async function handleRequestCorrection(e) {
    e.preventDefault()
    if (!selectedDeal || !correctionNote.trim()) return

    setRequestingCorrection(true)
    try {
      const dueDate = new Date().toISOString().split('T')[0]
      const { error } = await supabase.from('follow_up_logs').insert([
        {
          title: `Super Admin Override Request — ${getDealCode(selectedDeal)} (${getDealClient(selectedDeal)})`,
          client_name: getDealClient(selectedDeal),
          client_organization: getDealClient(selectedDeal),
          sbu: normalizeSbuCode(selectedDeal.sbu),
          due_date: dueDate,
          scheduled_date: dueDate,
          action_type: 'Super Admin Governance Override Request',
          status: 'Pending',
          notes: `Requested by ${actorLabel} (${activeRole}): ${correctionNote.trim()}`,
        },
      ])
      if (error) throw new Error(error.message)

      setCorrectionNote('')
      onRefresh?.()
      showToast('✓ Correction request queued for Super Admin review.')
    } catch (err) {
      alert(`Could not send request: ${err.message}`)
    } finally {
      setRequestingCorrection(false)
    }
  }

  async function handleSoftDeleteDeal() {
    if (!selectedDeal || !hasSuperAdminAccess) return
    if (!deleteReason.trim()) {
      alert('A deletion reason is mandatory for the Super Admin Audit Trail.')
      return
    }

    setDeletingDeal(true)
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({
          is_deleted: true,
          deleted_by: actorLabel,
          deleted_at: new Date().toISOString(),
          deletion_reason: deleteReason.trim(),
          last_modified_by: actorLabel,
        })
        .eq('id', selectedDeal.id)

      if (error) throw new Error(error.message)

      setDeals((prev) =>
        prev.map((d) =>
          d.id === selectedDeal.id
            ? { ...d, is_deleted: true, deleted_by: actorLabel, deletion_reason: deleteReason.trim() }
            : d
        )
      )
      setSelectedDeal(null)
      onRefresh?.()
      showToast('✓ Proposal soft-deleted and archived in Super Admin Recovery Bin.')
    } catch (err) {
      alert(`Soft-delete failed: ${err.message}`)
    } finally {
      setDeletingDeal(false)
    }
  }

  async function handleRestoreDeal(deal) {
    if (!hasSuperAdminAccess) return
    const reason = window.prompt(
      `Enter reason for restoring ${getDealCode(deal)} (${getDealClient(deal)}):`,
      'Restored after Super Admin audit review'
    )
    if (!reason || !reason.trim()) return

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .update({
          is_deleted: false,
          deleted_by: null,
          deleted_at: null,
          last_override_reason: reason.trim(),
          last_modified_by: actorLabel,
        })
        .eq('id', deal.id)
        .select()

      if (error) throw new Error(error.message)
      if (data?.[0]) {
        setDeals((prev) => prev.map((d) => (d.id === deal.id ? data[0] : d)))
      }
      onRefresh?.()
      showToast(`✓ Restored ${getDealCode(deal)} back to active pipeline.`)
    } catch (err) {
      alert(`Restore failed: ${err.message}`)
    }
  }

  // Separate active vs soft-deleted deals
  const liveDeals = useMemo(() => deals.filter((d) => !d.is_deleted), [deals])
  const deletedDeals = useMemo(() => deals.filter((d) => Boolean(d.is_deleted)), [deals])

  // Dynamic Owners list for Filter dropdown
  const ownerOptions = useMemo(() => {
    const set = new Set()
    liveDeals.forEach((d) => {
      if (d.commercial_owner && d.commercial_owner.trim()) {
        set.add(d.commercial_owner.trim())
      }
    })
    return Array.from(set).sort()
  }, [liveDeals])

  // Executive KPIs
  const kpis = useMemo(() => {
    let activePipelineVal = 0
    let weightedForecastVal = 0
    let urgentCount = 0
    let wonUnlinkedCount = 0
    let lostCount = 0

    liveDeals.forEach((d) => {
      const stageId = normalizeStage(d.stage)
      const val = getDealValue(d)
      const cfg = getStageConfig(stageId)

      if (stageId === LOST_STAGE.id) {
        lostCount += 1
        return
      }

      if (stageId === ACTIVE_STAGES[4].id) {
        if (!linkedProjectOppIds.has(String(d.id))) {
          wonUnlinkedCount += 1
        }
        weightedForecastVal += val
        return
      }

      activePipelineVal += val
      weightedForecastVal += val * cfg.probability

      const dlMeta = getDeadlineMeta(getDealDeadline(d), stageId)
      if (dlMeta.urgency === 'overdue' || dlMeta.urgency === 'urgent') {
        urgentCount += 1
      }
    })

    return {
      activePipelineVal,
      weightedForecastVal,
      urgentCount,
      wonUnlinkedCount,
      lostCount,
    }
  }, [liveDeals, linkedProjectOppIds])

  // Filtered + Sorted Deals
  const filteredDeals = useMemo(() => {
    const sourcePool = showRecoveryBin && hasSuperAdminAccess ? deletedDeals : liveDeals

    const filtered = sourcePool.filter((deal) => {
      const stageId = normalizeStage(deal.stage)

      if (!showRecoveryBin) {
        if (stageId === LOST_STAGE.id && !showLostArchive) return false
        if (urgentOnly) {
          const dlMeta = getDeadlineMeta(getDealDeadline(deal), stageId)
          if (dlMeta.urgency !== 'overdue' && dlMeta.urgency !== 'urgent') return false
        }
        if (wonHandoffOnly) {
          if (stageId !== ACTIVE_STAGES[4].id || linkedProjectOppIds.has(String(deal.id))) {
            return false
          }
        }
      }

      const term = searchQuery.toLowerCase().trim()
      if (term) {
        const hit =
          getDealClient(deal).toLowerCase().includes(term) ||
          getDealTitle(deal).toLowerCase().includes(term) ||
          getDealCode(deal).toLowerCase().includes(term) ||
          (deal.commercial_owner || '').toLowerCase().includes(term) ||
          (deal.initiated_by || '').toLowerCase().includes(term)
        if (!hit) return false
      }

      if (sbuFilter !== 'ALL' && normalizeSbuCode(deal.sbu) !== sbuFilter) return false
      if (ownerFilter !== 'ALL' && (deal.commercial_owner || '') !== ownerFilter) return false
      if (initiatorFilter !== 'ALL' && (deal.initiated_by || '') !== initiatorFilter) return false

      const currentEvidence = deal.evidence_status || 'Unverified'
      if (evidenceFilter !== 'ALL' && currentEvidence.toLowerCase() !== evidenceFilter.toLowerCase()) {
        return false
      }

      const currentVerdict = deal.gonogo_verdict || 'Pending Assessment'
      if (verdictFilter !== 'ALL' && currentVerdict.toLowerCase() !== verdictFilter.toLowerCase()) {
        return false
      }

      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'value_desc') return getDealValue(b) - getDealValue(a)
      if (sortBy === 'deadline_asc') {
        const da = getDealDeadline(a) || '9999-12-31'
        const db = getDealDeadline(b) || '9999-12-31'
        return da.localeCompare(db)
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
  }, [
    liveDeals,
    deletedDeals,
    showRecoveryBin,
    hasSuperAdminAccess,
    showLostArchive,
    urgentOnly,
    wonHandoffOnly,
    linkedProjectOppIds,
    searchQuery,
    sbuFilter,
    ownerFilter,
    initiatorFilter,
    evidenceFilter,
    verdictFilter,
    sortBy,
  ])

  const visibleBoardStages = showLostArchive ? ALL_STAGES : ACTIVE_STAGES

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. EXECUTIVE KPI SUMMARY STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Active Pipeline Value
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
            {formatEtb(kpis.activePipelineVal)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Pre-award bids across Stages 1–4
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Weighted Revenue Forecast
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#15803d', marginTop: 4 }}>
            {formatEtb(kpis.weightedForecastVal)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Probability-weighted + Signed Won
          </div>
        </div>

        <div
          onClick={() => {
            setUrgentOnly((v) => !v)
            setWonHandoffOnly(false)
            setShowRecoveryBin(false)
          }}
          style={{
            background: urgentOnly ? '#fff7ed' : '#ffffff',
            borderRadius: 12,
            padding: '14px 18px',
            border: urgentOnly ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
            borderLeft: '4px solid #ea580c',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Deadlines Due ≤ 7d / Overdue
            </span>
            {urgentOnly && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#ea580c' }}>FILTERED</span>}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: kpis.urgentCount > 0 ? '#c2410c' : '#0f172a', marginTop: 4 }}>
            {kpis.urgentCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Click to isolate urgent deadlines
          </div>
        </div>

        <div
          onClick={() => {
            setWonHandoffOnly((v) => !v)
            setUrgentOnly(false)
            setShowRecoveryBin(false)
          }}
          style={{
            background: wonHandoffOnly ? '#f0fdf4' : '#ffffff',
            borderRadius: 12,
            padding: '14px 18px',
            border: wonHandoffOnly ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
            borderLeft: '4px solid #7c3aed',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Won Awaiting Project Handoff
            </span>
            {wonHandoffOnly && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#16a34a' }}>FILTERED</span>}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#6d28d9', marginTop: 4 }}>
            {kpis.wonUnlinkedCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Attach signed agreement in Project Delivery
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE COMMAND, VIEW TOGGLE & GOVERNANCE BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setViewMode('board')
                  setShowRecoveryBin(false)
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: viewMode === 'board' && !showRecoveryBin ? '#ffffff' : 'transparent',
                  color: viewMode === 'board' && !showRecoveryBin ? '#0f172a' : '#64748b',
                  boxShadow: viewMode === 'board' && !showRecoveryBin ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                ▦ Board View
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('table')
                  setShowRecoveryBin(false)
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: viewMode === 'table' && !showRecoveryBin ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' && !showRecoveryBin ? '#0f172a' : '#64748b',
                  boxShadow: viewMode === 'table' && !showRecoveryBin ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                ☰ Executive Register
              </button>
            </div>

            {/* Lost / No-Go Archive Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowLostArchive((v) => !v)
                setShowRecoveryBin(false)
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 7,
                border: showLostArchive ? '1px solid #dc2626' : '1px solid #cbd5e1',
                background: showLostArchive ? '#fef2f2' : '#ffffff',
                color: showLostArchive ? '#b91c1c' : '#475569',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showLostArchive ? 'Hide' : 'Show'} Lost / No-Go ({kpis.lostCount})
            </button>

            {/* Super Admin Recovery Bin Toggle */}
            {hasSuperAdminAccess && (
              <button
                type="button"
                onClick={() => setShowRecoveryBin((v) => !v)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: showRecoveryBin ? '1px solid #7c3aed' : '1px solid #cbd5e1',
                  background: showRecoveryBin ? '#f5f3ff' : '#ffffff',
                  color: showRecoveryBin ? '#6d28d9' : '#475569',
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                🛡️ Admin Recovery Bin ({deletedDeals.length})
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>
              Showing <strong style={{ color: '#0f172a' }}>{filteredDeals.length}</strong> of{' '}
              {showRecoveryBin ? deletedDeals.length : liveDeals.length} deals
            </span>

            {onNewProposal && !isReadOnlyRole && (
              <button
                type="button"
                onClick={onNewProposal}
                style={{
                  padding: '7px 14px',
                  borderRadius: 7,
                  border: 'none',
                  background: '#ea580c',
                  color: '#ffffff',
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                + New Proposal
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search client, mandate, code, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              minWidth: 220,
              flex: '1 1 200px',
            }}
          />

          <select
            value={sbuFilter}
            onChange={(e) => setSbuFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, background: '#fff' }}
          >
            <option value="ALL">All SBUs</option>
            <option value="INST">INST (Institute)</option>
            <option value="IIP">IIP (Investment)</option>
            <option value="DAS">DAS (Digital &amp; AI)</option>
            <option value="CBS">CBS (Cross Border)</option>
          </select>

          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, background: '#fff' }}
          >
            <option value="ALL">All Owners</option>
            {ownerOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          <select
            value={initiatorFilter}
            onChange={(e) => setInitiatorFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, background: '#fff' }}
          >
            <option value="ALL">All Initiators</option>
            {INITIATOR_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>

          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, background: '#fff' }}
          >
            <option value="ALL">All Go/No-Go</option>
            <option value="GO">🟢 GO</option>
            <option value="CONDITIONAL_GO">🟡 Conditional GO</option>
            <option value="NO_GO">🔴 NO-GO</option>
            <option value="Pending Assessment">⚪ Pending</option>
          </select>

          <select
            value={evidenceFilter}
            onChange={(e) => setEvidenceFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, background: '#fff' }}
          >
            <option value="ALL">All Audit States</option>
            <option value="Verified">✓ Verified</option>
            <option value="Provisional">⏳ Provisional</option>
            <option value="Unverified">○ Unverified</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, background: '#f8fafc' }}
          >
            <option value="created_desc">Sort: Newest First</option>
            <option value="value_desc">Sort: Highest ETB Value</option>
            <option value="deadline_asc">Sort: Earliest Deadline</option>
          </select>
        </div>
      </div>

      {/* 3A. SUPER ADMIN RECOVERY BIN VIEW */}
      {showRecoveryBin && hasSuperAdminAccess ? (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1.5px solid #ddd6fe', overflowX: 'auto' }}>
          <div style={{ padding: '14px 18px', background: '#f5f3ff', borderBottom: '1px solid #ddd6fe' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#5b21b6' }}>
              🛡️ Super Admin Soft-Delete Recovery Bin ({deletedDeals.length})
            </div>
            <div style={{ fontSize: 11.5, color: '#6d28d9', marginTop: 2 }}>
              Soft-deleted proposals remain preserved for full revenue governance auditability and can be restored anytime.
            </div>
          </div>

          {filteredDeals.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#64748b', fontSize: 12.5 }}>
              Recovery Bin is empty.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff', fontSize: 11 }}>
                  <th style={{ padding: '10px 14px' }}>Code &amp; Client</th>
                  <th style={{ padding: '10px 14px' }}>Mandate &amp; Value</th>
                  <th style={{ padding: '10px 14px' }}>Deleted By &amp; Reason</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#0284c7', fontSize: 11 }}>{getDealCode(d)}</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{getDealClient(d)}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ color: '#334155' }}>{getDealTitle(d)}</div>
                      <div style={{ fontWeight: 800, color: '#166534', marginTop: 2 }}>{formatEtb(getDealValue(d))}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#991b1b' }}>{d.deleted_by || 'Super Admin'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{d.deletion_reason || 'No reason recorded'}</div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleRestoreDeal(d)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        ↺ Restore Deal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* 3B. EXECUTIVE REGISTER TABLE VIEW */
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Loading commercial register...
            </div>
          ) : filteredDeals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No proposals match your selected filters.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff', fontSize: 10.5, textTransform: 'uppercase' }}>
                  <th style={{ padding: '11px 12px' }}>Code &amp; SBU</th>
                  <th style={{ padding: '11px 12px' }}>Client &amp; Mandate</th>
                  <th style={{ padding: '11px 12px' }}>Owner / Initiator</th>
                  <th style={{ padding: '11px 12px' }}>Value &amp; Weighted</th>
                  <th style={{ padding: '11px 12px' }}>Deadline</th>
                  <th style={{ padding: '11px 12px' }}>Stage &amp; Verdict</th>
                  <th style={{ padding: '11px 12px', textAlign: 'right' }}>Workspace</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => {
                  const sbuCode = normalizeSbuCode(deal.sbu)
                  const sbuTheme = SBU_THEMES[sbuCode] || SBU_THEMES.INST
                  const stageCfg = getStageConfig(deal.stage)
                  const val = getDealValue(deal)
                  const dlMeta = getDeadlineMeta(getDealDeadline(deal), stageCfg.id)
                  const isWon = stageCfg.id === ACTIVE_STAGES[4].id
                  const isHandedOff = linkedProjectOppIds.has(String(deal.id))

                  return (
                    <tr
                      key={deal.id}
                      onClick={() => openDealDrawer(deal, 'overview')}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 800, color: '#0284c7', fontSize: 11 }}>{getDealCode(deal)}</div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: 3,
                            fontSize: 9.5,
                            fontWeight: 800,
                            background: sbuTheme.bg,
                            color: sbuTheme.text,
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {sbuTheme.label}
                        </span>
                      </td>

                      <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{getDealClient(deal)}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{getDealTitle(deal)}</div>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 11.5 }}>
                          {deal.commercial_owner || 'Unassigned'}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>
                          Init: {deal.initiated_by || '—'}
                        </div>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 800, color: '#166534' }}>{formatEtb(val)}</div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>
                          Wtd: {formatEtb(Math.round(val * stageCfg.probability))} ({Math.round(stageCfg.probability * 100)}%)
                        </div>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            background: dlMeta.bg,
                            color: dlMeta.color,
                            padding: '3px 7px',
                            borderRadius: 5,
                            fontSize: 10.5,
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {dlMeta.label}
                        </span>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            background: stageCfg.badgeBg,
                            color: stageCfg.badgeText,
                            padding: '3px 7px',
                            borderRadius: 5,
                            fontSize: 10.5,
                            fontWeight: 800,
                            display: 'inline-block',
                          }}
                        >
                          {stageCfg.shortTitle}
                        </span>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                          {deal.evidence_status === 'Verified' ? '✓ Verified' : '○ Pending Proof'}
                          {deal.gonogo_verdict && deal.gonogo_verdict !== 'Pending Assessment'
                            ? ` • ${deal.gonogo_verdict}`
                            : ''}
                        </div>
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {isWon && !isHandedOff ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onNavigateTab?.('projects')
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: 'none',
                              background: '#16a34a',
                              color: '#ffffff',
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            🚀 Hand Off
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDealDrawer(deal, 'overview')
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0f172a',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Open →
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* 3C. CLEAN 5-STAGE EXECUTIVE KANBAN BOARD VIEW */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${visibleBoardStages.length}, minmax(255px, 1fr))`,
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 8,
            alignItems: 'start',
          }}
        >
          {visibleBoardStages.map((stg) => {
            const stageDeals = filteredDeals.filter((d) => normalizeStage(d.stage) === stg.id)
            const stageTotal = stageDeals.reduce((sum, d) => sum + getDealValue(d), 0)

            return (
              <div
                key={stg.id}
                style={{
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  borderTop: `4px solid ${stg.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 500,
                }}
              >
                {/* Column Header */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '8px 8px 0 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 900, color: '#0f172a' }}>
                      {stg.shortTitle}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: stg.badgeBg,
                        color: stg.badgeText,
                      }}
                    >
                      {stageDeals.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#475569' }}>
                      {formatEtb(stageTotal)}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                      {Math.round(stg.probability * 100)}% prob
                    </span>
                  </div>
                </div>

                {/* Compact High-Signal Cards */}
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '36px 8px', color: '#94a3b8', fontSize: 12 }}>
                      Loading pipeline…
                    </div>
                  ) : stageDeals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 8px', color: '#94a3b8', fontSize: 11.5 }}>
                      No proposals in this stage
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const sbuCode = normalizeSbuCode(deal.sbu)
                      const sbuTheme = SBU_THEMES[sbuCode] || SBU_THEMES.INST
                      const dlMeta = getDeadlineMeta(getDealDeadline(deal), stg.id)
                      const isVerified = deal.evidence_status === 'Verified'
                      const isWon = stg.id === ACTIVE_STAGES[4].id
                      const isHandedOff = linkedProjectOppIds.has(String(deal.id))
                      const verdict = deal.gonogo_verdict
                      const hasVerdict = verdict && verdict !== 'Pending Assessment'
                      const needsBond =
                        deal.bid_bond_status && deal.bid_bond_status !== 'Not Required'

                      return (
                        <div
                          key={deal.id}
                          onClick={() => openDealDrawer(deal, 'overview')}
                          style={{
                            background: '#ffffff',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            borderLeft: `4px solid ${sbuTheme.accent}`,
                            padding: '11px 12px',
                            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          {/* Top Row: SBU + Code + Subtle Audit Indicator */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  background: sbuTheme.bg,
                                  color: sbuTheme.text,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                }}
                              >
                                {sbuTheme.label}
                              </span>
                              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#475569' }}>
                                {getDealCode(deal)}
                              </span>
                            </div>

                            <span
                              title={isVerified ? 'Evidence Verified' : 'Pending Stage-Gate Proof'}
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: isVerified ? '#15803d' : '#94a3b8',
                              }}
                            >
                              {isVerified ? '✓ Verified' : '○ Proof'}
                            </span>
                          </div>

                          {/* Client & Mandate */}
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
                              {getDealClient(deal)}
                            </div>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: '#475569',
                                marginTop: 2,
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {getDealTitle(deal)}
                            </div>
                          </div>

                          {/* Value & Deadline Row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 900, color: '#166534' }}>
                              {formatEtb(getDealValue(deal))}
                            </span>
                            {getDealDeadline(deal) && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  background: dlMeta.bg,
                                  color: dlMeta.color,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {dlMeta.label}
                              </span>
                            )}
                          </div>

                          {/* Compact Tags Row: Owner + Verdict + Bid Bond */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                            {deal.commercial_owner && (
                              <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: 4 }}>
                                👤 {deal.commercial_owner}
                              </span>
                            )}
                            {hasVerdict && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background:
                                    verdict === 'GO'
                                      ? '#dcfce7'
                                      : verdict === 'CONDITIONAL_GO'
                                      ? '#fef3c7'
                                      : '#fee2e2',
                                  color:
                                    verdict === 'GO'
                                      ? '#15803d'
                                      : verdict === 'CONDITIONAL_GO'
                                      ? '#b45309'
                                      : '#b91c1c',
                                }}
                              >
                                {verdict === 'GO' ? 'GO' : verdict === 'CONDITIONAL_GO' ? 'COND' : 'NO-GO'}
                                {deal.gonogo_score ? ` (${deal.gonogo_score})` : ''}
                              </span>
                            )}
                            {needsBond && (
                              <span style={{ fontSize: 9.5, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4 }}>
                                🏦 Bond
                              </span>
                            )}
                          </div>

                          {/* Single Clean Footer CTA */}
                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 7, marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {isWon ? (
                              isHandedOff ? (
                                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#15803d' }}>
                                  ✓ In Project Delivery
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onNavigateTab?.('projects')
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: 'none',
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  🚀 Hand Off to Project Delivery →
                                </button>
                              )
                            ) : (
                              <>
                                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                                  {deal.initiated_by ? `Src: ${deal.initiated_by}` : 'Click to govern'}
                                </span>
                                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#0284c7' }}>
                                  Workspace →
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ====================================================================
          4. TABBED GOVERNANCE & COMMERCIAL WORKSPACE DRAWER
      ==================================================================== */}
      {selectedDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.58)',
            zIndex: 99990,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedDeal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '580px',
              height: '100%',
              background: '#ffffff',
              boxShadow: '-10px 0 35px rgba(0,0,0,0.22)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ background: 'linear-gradient(90deg, #060b18 0%, #0f172a 100%)', color: '#ffffff', padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#38bdf8' }}>
                      {getDealCode(selectedDeal)}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(255,255,255,0.14)', padding: '2px 7px', borderRadius: 4 }}>
                      {normalizeSbuCode(selectedDeal.sbu)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        background: getStageConfig(selectedDeal.stage).badgeBg,
                        color: getStageConfig(selectedDeal.stage).badgeText,
                        padding: '2px 7px',
                        borderRadius: 4,
                      }}
                    >
                      {getStageConfig(selectedDeal.stage).shortTitle}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{getDealClient(selectedDeal)}</h3>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>{getDealTitle(selectedDeal)}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDeal(null)}
                  style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 22, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Super Admin Override Control Strip */}
              {hasSuperAdminAccess && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: adminOverrideEnabled ? 'rgba(220, 38, 38, 0.25)' : 'rgba(255,255,255,0.08)',
                    border: adminOverrideEnabled ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={adminOverrideEnabled}
                      onChange={(e) => setAdminOverrideEnabled(e.target.checked)}
                    />
                    <span>🔓 Super Admin Governance Override (Unlock Identity, Submitted Values &amp; Rollbacks)</span>
                  </label>
                  {adminOverrideEnabled && (
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Mandatory Super Admin override justification (logged to Audit History)..."
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 11.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Drawer 4-Tab Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 14px' }}>
              {[
                { id: 'overview', label: '📋 Overview & Fields' },
                { id: 'stage', label: '🔒 Stage Gate' },
                { id: 'tools', label: '⚡ Tools & Handoff' },
                { id: 'audit', label: `📜 Audit (${auditLogs.length})` },
              ].map((t) => {
                const active = drawerTab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDrawerTab(t.id)}
                    style={{
                      padding: '11px 12px',
                      border: 'none',
                      background: 'transparent',
                      borderBottom: active ? '2.5px solid #0284c7' : '2.5px solid transparent',
                      color: active ? '#0284c7' : '#64748b',
                      fontSize: 11.5,
                      fontWeight: active ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Drawer Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
              {/* TAB 1: OVERVIEW & FIELDS */}
              {drawerTab === 'overview' && (
                <form onSubmit={handleSaveDealFields} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      background: isSelectedSubmittedOrBeyond ? '#fffbeb' : '#f0f9ff',
                      border: isSelectedSubmittedOrBeyond ? '1px solid #fcd34d' : '1px solid #bae6fd',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 11.5,
                      color: isSelectedSubmittedOrBeyond ? '#92400e' : '#0369a1',
                      fontWeight: 600,
                    }}
                  >
                    {isSelectedSubmittedOrBeyond
                      ? '🔒 Post-Submission Lock Active: Client, SBU, Deal Value, and Deadline are frozen. Enable Super Admin Override to modify.'
                      : '🔒 Identity Lock Active: Client & SBU are locked after creation. Working fields remain editable until submission.'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                        CLIENT ORGANIZATION {canEditIdentityFields ? '🔓' : '🔒'}
                      </label>
                      <input
                        type="text"
                        disabled={!canEditIdentityFields}
                        value={editClient}
                        onChange={(e) => setEditClient(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 7,
                          border: '1px solid #cbd5e1',
                          fontSize: 12.5,
                          background: canEditIdentityFields ? '#fff' : '#f1f5f9',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                        EXECUTING SBU {canEditIdentityFields ? '🔓' : '🔒'}
                      </label>
                      <select
                        disabled={!canEditIdentityFields}
                        value={editSbu}
                        onChange={(e) => setEditSbu(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 7,
                          border: '1px solid #cbd5e1',
                          fontSize: 12.5,
                          background: canEditIdentityFields ? '#fff' : '#f1f5f9',
                        }}
                      >
                        <option value="Institute">Institute (INST)</option>
                        <option value="IIP">Investment Partners (IIP)</option>
                        <option value="DAS">Digital &amp; AI Solutions (DAS)</option>
                        <option value="CBS">Cross Border Solutions (CBS)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                      MANDATE / PROPOSAL TITLE
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnlyRole}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                        DEAL VALUE (ETB) {canEditWorkingFields ? '' : '🔒'}
                      </label>
                      <input
                        type="number"
                        disabled={!canEditWorkingFields}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 7,
                          border: '1px solid #cbd5e1',
                          fontSize: 12.5,
                          fontWeight: 700,
                          background: canEditWorkingFields ? '#fff' : '#f1f5f9',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                        SUBMISSION DEADLINE {canEditWorkingFields ? '' : '🔒'}
                      </label>
                      <input
                        type="date"
                        disabled={!canEditWorkingFields}
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 7,
                          border: '1px solid #cbd5e1',
                          fontSize: 12.5,
                          background: canEditWorkingFields ? '#fff' : '#f1f5f9',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                        COMMERCIAL OWNER
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnlyRole}
                        value={editOwner}
                        onChange={(e) => setEditOwner(e.target.value)}
                        placeholder="e.g., Ybeltal / Yeabsira"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                        TECHNICAL PROPOSAL LEAD
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnlyRole}
                        value={editTechLead}
                        onChange={(e) => setEditTechLead(e.target.value)}
                        placeholder="e.g., Dr. Abel / Amare"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                        INITIATED BY / ORIGIN
                      </label>
                      <select
                        disabled={isReadOnlyRole}
                        value={editInitiator}
                        onChange={(e) => setEditInitiator(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12.5, background: '#fff' }}
                      >
                        <option value="">-- Select Initiator --</option>
                        {INITIATOR_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                        BID BOND STATUS
                      </label>
                      <select
                        disabled={isReadOnlyRole}
                        value={editBidBond}
                        onChange={(e) => setEditBidBond(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12.5, background: '#fff' }}
                      >
                        {BID_BOND_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                      COMMERCIAL STRATEGY &amp; FOLLOW-UP NOTES
                    </label>
                    <textarea
                      rows={3}
                      disabled={isReadOnlyRole}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Key client feedback, pricing assumptions, or bid bond instructions..."
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>

                  {!isReadOnlyRole && (
                    <button
                      type="submit"
                      disabled={savingFields}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#0284c7',
                        color: '#ffffff',
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: savingFields ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {savingFields ? 'Saving & Logging Audit Trail...' : 'Save Commercial Details'}
                    </button>
                  )}
                </form>
              )}

              {/* TAB 2: EVIDENCE-PROTECTED STAGE GATE */}
              {drawerTab === 'stage' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                    Regular roles can only advance proposals <strong>forward</strong> with verified proof. Rollbacks and reopening closed deals require a <strong>Super Admin Override</strong>.
                  </div>

                  {/* Stage Selector Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ALL_STAGES.map((stg) => {
                      const isCurrent = selectedNormStage === stg.id
                      const stgIdx = getStageIndex(stg.id)
                      const isLost = stg.id === LOST_STAGE.id
                      const isBackwardOrReopen =
                        !isCurrent && !isLost && (isSelectedClosed || stgIdx < selectedStageIdx)
                      const isLockedForUser =
                        isReadOnlyRole ||
                        (isSelectedClosed && !(hasSuperAdminAccess && adminOverrideEnabled)) ||
                        (isBackwardOrReopen && !(hasSuperAdminAccess && adminOverrideEnabled))

                      const isSelectedTarget = targetStage === stg.id

                      return (
                        <button
                          key={stg.id}
                          type="button"
                          disabled={isCurrent || isLockedForUser}
                          onClick={() => setTargetStage(stg.id)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: isCurrent
                              ? '1.5px solid #0284c7'
                              : isSelectedTarget
                              ? '2px solid #ea580c'
                              : '1px solid #e2e8f0',
                            background: isCurrent
                              ? '#f0f9ff'
                              : isSelectedTarget
                              ? '#fff7ed'
                              : isLockedForUser
                              ? '#f8fafc'
                              : '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: isCurrent || isLockedForUser ? 'not-allowed' : 'pointer',
                            opacity: isLockedForUser && !isCurrent ? 0.65 : 1,
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: isCurrent || isSelectedTarget ? 800 : 600, color: isCurrent ? '#0284c7' : '#0f172a' }}>
                            {stg.id}
                          </span>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: isCurrent ? '#0284c7' : isLockedForUser ? '#94a3b8' : '#ea580c' }}>
                            {isCurrent
                              ? 'Current Stage'
                              : isLockedForUser
                              ? '🔒 Locked'
                              : isSelectedTarget
                              ? 'Selected ✓'
                              : 'Select →'}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Evidence Proof Form when a target stage is selected */}
                  {targetStage && (
                    <form
                      onSubmit={handleStageTransition}
                      style={{
                        background: '#fff7ed',
                        border: '1.5px solid #fdba74',
                        borderRadius: 10,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 900, color: '#9a3412' }}>
                        Verify Transition → {targetStage}
                      </div>
                      <div style={{ fontSize: 11, color: '#9a3412' }}>
                        {getStageConfig(targetStage).gateHint}
                      </div>

                      {targetStage === LOST_STAGE.id ? (
                        <div>
                          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#7c2d12', marginBottom: 4 }}>
                            MANDATORY LOSS / NO-GO REASON *
                          </label>
                          <select
                            required
                            value={lossReason}
                            onChange={(e) => setLossReason(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #fdba74', fontSize: 12, background: '#fff' }}
                          >
                            {LOSS_REASON_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#7c2d12', marginBottom: 4 }}>
                              PROOF / EVIDENCE SUMMARY *
                            </label>
                            <input
                              type="text"
                              required={!(hasSuperAdminAccess && adminOverrideEnabled)}
                              value={evidenceTitle}
                              onChange={(e) => setEvidenceTitle(e.target.value)}
                              placeholder="e.g., Technical & Financial Proposal submitted to CBE on 2026-11-24"
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #fdba74', fontSize: 12, boxSizing: 'border-box', background: '#fff' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#7c2d12', marginBottom: 4 }}>
                              SUPPORTING DOCUMENT LINK (Drive / Email / Receipt URL)
                            </label>
                            <input
                              type="url"
                              value={evidenceUrl}
                              onChange={(e) => setEvidenceUrl(e.target.value)}
                              placeholder="https://drive.google.com/..."
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #fdba74', fontSize: 12, boxSizing: 'border-box', background: '#fff' }}
                            />
                          </div>
                        </>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: '#334155', background: '#ffffff', padding: 10, borderRadius: 7 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={criteriaChecked.c1}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, c1: e.target.checked })}
                          />
                          TOR / RFP scope &amp; eligibility criteria confirmed
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={criteriaChecked.c2}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, c2: e.target.checked })}
                          />
                          Financial pricing &amp; SBU lead sign-off verified
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={criteriaChecked.c3}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, c3: e.target.checked })}
                          />
                          Calendar deadline &amp; audit evidence logged
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="submit"
                          disabled={transitioningStage}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 7,
                            border: 'none',
                            background: '#ea580c',
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {transitioningStage ? 'Verifying...' : 'Confirm & Lock Transition'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetStage('')}
                          style={{ padding: '8px 12px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Non-Admin Correction Request Form */}
                  {!hasSuperAdminAccess && !isReadOnlyRole && (
                    <form
                      onSubmit={handleRequestCorrection}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a' }}>
                        Need a Stage Rollback or Locked-Field Correction?
                      </div>
                      <input
                        type="text"
                        required
                        value={correctionNote}
                        onChange={(e) => setCorrectionNote(e.target.value)}
                        placeholder="Explain what needs Super Admin review (e.g., Client extended deadline to Dec 10)..."
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box', background: '#fff' }}
                      />
                      <button
                        type="submit"
                        disabled={requestingCorrection}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '7px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#0f172a',
                          color: '#ffffff',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {requestingCorrection ? 'Sending...' : 'Request Super Admin Override →'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 3: EXISTING TOOLS, PARTNERS & DELIVERY HANDOFF */}
              {drawerTab === 'tools' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const d = selectedDeal
                        setSelectedDeal(null)
                        triggerChat(d)
                      }}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      💬 Live TOR Chat
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const d = selectedDeal
                        setSelectedDeal(null)
                        triggerStudio(d)
                      }}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 10,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      📋 Proposal Studio
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const d = selectedDeal
                        setSelectedDeal(null)
                        setAssessmentDeal(d)
                      }}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 10,
                        border: '1px solid #fed7aa',
                        background: '#fff7ed',
                        color: '#c2410c',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      ⚖️ Go / No-Go Matrix
                    </button>
                  </div>

                  {/* Post-Win Project Delivery Handoff Card */}
                  <div
                    style={{
                      background: selectedNormStage === ACTIVE_STAGES[4].id ? '#f0fdf4' : '#f8fafc',
                      border: selectedNormStage === ACTIVE_STAGES[4].id ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                      🚀 Post-Win Project Delivery &amp; SMEAL Handoff
                    </div>
                    {selectedNormStage === ACTIVE_STAGES[4].id ? (
                      linkedProjectOppIds.has(String(selectedDeal.id)) ? (
                        <div style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>
                          ✓ This won proposal is already registered in Project Delivery.
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 12, color: '#166534', marginBottom: 10 }}>
                            This mandate is Won / Signed. Open Project Delivery to upload the signed PDF/Word agreement (or link) and route to the SMEAL Team for approval.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDeal(null)
                              onNavigateTab?.('projects')
                            }}
                            style={{
                              padding: '9px 14px',
                              borderRadius: 8,
                              border: 'none',
                              background: '#16a34a',
                              color: '#ffffff',
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            📎 Open Project Delivery &amp; Attach Signed Agreement →
                          </button>
                        </>
                      )
                    ) : (
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Unlocks automatically once this proposal reaches <strong>5. Contract Won / Signed</strong>.
                      </div>
                    )}
                  </div>

                  {/* Linked Consortium / JV Partners */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>
                        🤝 Linked JV / Consortium Partners ({dealPartners.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeal(null)
                          onNavigateTab?.('partners')
                        }}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Manage Partners →
                      </button>
                    </div>
                    {loadingDrawerData ? (
                      <div style={{ fontSize: 12, color: '#64748b' }}>Loading linked partners...</div>
                    ) : dealPartners.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        No external consortium partners linked to this bid yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {dealPartners.map((dp) => (
                          <div key={dp.id} style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 7, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                            <strong>{dp.partners?.partner_name || 'Partner'}</strong>
                            <span style={{ color: '#0369a1', fontWeight: 700 }}>
                              {dp.partner_role} ({dp.revenue_share_pct || 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: IMMUTABLE AUDIT HISTORY */}
              {drawerTab === 'audit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    Append-only governance log recorded automatically by PostgreSQL triggers. Cannot be edited or deleted.
                  </div>

                  {loadingDrawerData ? (
                    <div style={{ fontSize: 12, color: '#64748b', padding: 16 }}>Loading immutable audit trail...</div>
                  ) : auditLogs.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8', padding: 20, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
                      No governance changes recorded yet for this deal. Future edits and stage transitions will appear here automatically.
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderLeft: `4px solid ${log.action_type === 'SOFT_DELETED' ? '#dc2626' : log.action_type === 'STAGE_CHANGED' ? '#0284c7' : '#10b981'}`,
                          borderRadius: 8,
                          padding: '10px 12px',
                          fontSize: 11.5,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 900, color: '#0f172a' }}>{log.action_type}</span>
                          <span style={{ fontSize: 10.5, color: '#64748b' }}>
                            {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        <div style={{ color: '#334155' }}>
                          <strong>{log.field_changed}:</strong>{' '}
                          <span style={{ color: '#94a3b8' }}>{log.old_value || '—'}</span> →{' '}
                          <strong style={{ color: '#0369a1' }}>{log.new_value || '—'}</strong>
                        </div>
                        {log.reason && (
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                            Reason: &quot;{log.reason}&quot;
                          </div>
                        )}
                        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                          Actor: <strong>{log.performed_by || 'System'}</strong> ({log.performed_role || 'staff'})
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer (Super Admin Soft-Delete Only) */}
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 22px', background: '#f8fafc' }}>
              {showDeleteConfirm && hasSuperAdminAccess ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: '#991b1b' }}>
                    Super Admin Soft-Delete (Moves to Recovery Bin &amp; Logs Audit Trail):
                  </div>
                  <input
                    type="text"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Mandatory reason (e.g., Duplicate entry created by officer)..."
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #fca5a5', fontSize: 12, boxSizing: 'border-box', background: '#fff' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deletingDeal}
                      onClick={handleSoftDeleteDeal}
                      style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}
                    >
                      {deletingDeal ? 'Archiving...' : 'Confirm Soft-Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {hasSuperAdminAccess ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 6,
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        fontSize: 11.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      🗑️ Soft-Delete (Admin)
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                      🔒 Delete restricted to Super Admin
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedDeal(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Close Workspace
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXISTING AUTOMATED GO / NO-GO COMPLIANCE MATRIX MODAL */}
      <TorComplianceMatrixModal
        isOpen={Boolean(assessmentDeal)}
        deal={assessmentDeal}
        onClose={() => setAssessmentDeal(null)}
        onSaved={() => {
          fetchOpportunitiesAndProjects()
          onRefresh?.()
        }}
      />

      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#ffffff',
            borderLeft: '5px solid #10b981',
            padding: '13px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            zIndex: 100000,
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  )
}