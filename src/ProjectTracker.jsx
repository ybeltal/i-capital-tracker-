/**
 * THE i-CAPITAL AFRICA INSTITUTE — POST-WIN PROJECT DELIVERY TRACKER
 * Enforces Mandatory Signed Agreement (PDF/Word Upload OR Document Link)
 * and SMEAL Team Approval Gate before Delivery Execution Unlocks.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'

const DELIVERY_STAGES = [
  '0. Pending SMEAL Approval',
  '1. Kickoff & Inception',
  '2. Design & Customization',
  '3. Active Execution / Training',
  '4. Outcome Evaluation (LogFrame / Kirkpatrick)',
  '5. Final Showcase & Report',
  '6. Closed & Certified',
]

const HEALTH_OPTIONS = [
  'Pending Approval',
  'On Track',
  'At Risk',
  'Delayed',
  'Action Required (SMEAL)',
  'Completed',
]

const MILESTONE_STATUSES = ['Pending', 'In Progress', 'Submitted', 'Approved', 'Paid']

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function normalizeSbuCode(raw) {
  const s = String(raw || '').toLowerCase()
  if (s.includes('iip') || s.includes('invest')) return 'IIP'
  if (s.includes('das') || s.includes('digital') || s.includes('ai')) return 'DAS'
  if (s.includes('cbs') || s.includes('cross')) return 'CBS'
  return 'INST'
}

function formatEtb(amount) {
  const num = Number(amount) || 0
  return `ETB ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function getSmealBadgeStyle(status) {
  if (status === 'Approved') {
    return { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
  }
  if (status === 'Changes Requested') {
    return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }
  }
  return { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }
}

function getHealthBadgeStyle(health) {
  if (health === 'On Track' || health === 'Completed') {
    return { background: '#dcfce7', color: '#166534' }
  }
  if (health === 'At Risk' || health === 'Action Required (SMEAL)') {
    return { background: '#ffedd5', color: '#c2410c' }
  }
  if (health === 'Delayed') {
    return { background: '#fee2e2', color: '#b91c1c' }
  }
  return { background: '#e0f2fe', color: '#0369a1' }
}

function isValidHttpUrl(str) {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function ProjectTracker({ userProfile, effectiveRole, onRefresh }) {
  const [projects, setProjects] = useState([])
  const [wonPendingDeals, setWonPendingDeals] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusTab, setStatusTab] = useState('ALL') // 'ALL' | 'PENDING_SMEAL' | 'ACTIVE' | 'CLOSED'
  const [sbuFilter, setSbuFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Launch New Signed Project Modal
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [sourceDeal, setSourceDeal] = useState(null)
  const [formClient, setFormClient] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formSbu, setFormSbu] = useState('INST')
  const [formSector, setFormSector] = useState('')
  const [formContractValue, setFormContractValue] = useState('')
  const [formContractRef, setFormContractRef] = useState('')
  const [formSignedDate, setFormSignedDate] = useState(new Date().toISOString().split('T')[0])
  const [formKickoffDate, setFormKickoffDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formDeliveryLead, setFormDeliveryLead] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Mandatory Signed Agreement State (File Upload OR Link)
  const [agreementLink, setAgreementLink] = useState('')
  const [agreementFile, setAgreementFile] = useState(null)
  const [submittingProject, setSubmittingProject] = useState(false)
  const [formError, setFormError] = useState('')

  // Project Workspace Drawer State
  const [selectedProject, setSelectedProject] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [linkedPartners, setLinkedPartners] = useState([])
  const [drawerLoading, setDrawerLoading] = useState(false)

  // SMEAL Review State
  const [smealNotes, setSmealNotes] = useState('')
  const [updatingSmeal, setUpdatingSmeal] = useState(false)

  // Replacement Agreement Upload inside Drawer (if SMEAL requested changes)
  const [reuploadLink, setReuploadLink] = useState('')
  const [reuploadFile, setReuploadFile] = useState(null)
  const [updatingAgreement, setUpdatingAgreement] = useState(false)

  // New Milestone Form State
  const [msTitle, setMsTitle] = useState('')
  const [msType, setMsType] = useState('Deliverable & Invoice')
  const [msPct, setMsPct] = useState('')
  const [msAmount, setMsAmount] = useState('')
  const [msDueDate, setMsDueDate] = useState('')
  const [msLink, setMsLink] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)

  const [toastMsg, setToastMsg] = useState('')

  const activeRole = effectiveRole || userProfile?.role || 'read_only'
  const canApproveSmeal = ['admin', 'exec_mgmt', 'smeal', 'smeal_lead'].includes(activeRole)

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4500)
  }

  useEffect(() => {
    loadProjectsAndWonDeals()
  }, [])

  async function loadProjectsAndWonDeals() {
    setLoading(true)
    const [projRes, oppRes, propRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('opportunities').select('*').order('created_at', { ascending: false }),
      supabase.from('proposals').select('*').order('created_at', { ascending: false }),
    ])

    const loadedProjects = projRes.data || []
    setProjects(loadedProjects)

    const linkedOppIds = new Set(
      loadedProjects.map((p) => String(p.source_opportunity_id || '')).filter(Boolean)
    )
    const linkedPropIds = new Set(
      loadedProjects.map((p) => String(p.source_proposal_id || '')).filter(Boolean)
    )

    const isWonDeal = (d) => {
      const combined = `${d.stage || ''} ${d.status || ''}`.toLowerCase()
      return combined.includes('won') || combined.includes('signed') || combined.includes('awarded')
    }

    const wonOpps = (oppRes.data || [])
      .filter((o) => isWonDeal(o) && !linkedOppIds.has(String(o.id)))
      .map((o) => ({ ...o, _sourceTable: 'opportunities' }))

    const wonProps = (propRes.data || [])
      .filter((p) => isWonDeal(p) && !linkedPropIds.has(String(p.id)))
      .map((p) => ({ ...p, _sourceTable: 'proposals' }))

    // Deduplicate won deals across opportunities & proposals by title + client
    const seen = new Set()
    const mergedWon = [...wonOpps, ...wonProps].filter((item) => {
      const title = (item.opportunity_title || item.title || '').toLowerCase().trim()
      const client = (
        item.client_organization ||
        item.organization ||
        item.client_name ||
        item.client ||
        ''
      )
        .toLowerCase()
        .trim()
      const key = `${client}::${title}`
      if (key !== '::' && seen.has(key)) return false
      seen.add(key)
      return true
    })

    setWonPendingDeals(mergedWon)
    setLoading(false)
  }

  async function openProjectWorkspace(project) {
    setSelectedProject(project)
    setSmealNotes(project.smeal_review_notes || '')
    setReuploadLink(project.agreement_link || '')
    setReuploadFile(null)
    setDrawerLoading(true)

    const [msRes, partnerRes] = await Promise.all([
      supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', project.id)
        .order('due_date', { ascending: true }),
      supabase
        .from('deal_partners')
        .select('*, partners(partner_name, partner_type, contact_person)')
        .eq('project_id', project.id),
    ])

    setMilestones(msRes.data || [])
    setLinkedPartners(partnerRes.data || [])
    setDrawerLoading(false)
  }

  function handleOpenLaunchModal(deal = null) {
    setSourceDeal(deal)
    if (deal) {
      setFormClient(
        deal.client_organization || deal.organization || deal.client_name || deal.client || ''
      )
      setFormTitle(deal.opportunity_title || deal.title || '')
      setFormSbu(normalizeSbuCode(deal.sbu))
      setFormSector(deal.sector || '')
      setFormContractValue(String(deal.contract_value || deal.estimated_value || ''))
      setFormNotes(deal.notes || '')
    } else {
      setFormClient('')
      setFormTitle('')
      setFormSbu('INST')
      setFormSector('')
      setFormContractValue('')
      setFormNotes('')
    }
    setFormContractRef('')
    setFormSignedDate(new Date().toISOString().split('T')[0])
    setFormKickoffDate('')
    setFormEndDate('')
    setFormDeliveryLead('')
    setAgreementLink('')
    setAgreementFile(null)
    setFormError('')
    setShowLaunchModal(true)
  }

  function validateSelectedFile(file) {
    if (!file) return null
    const ext = file.name.split('.').pop()?.toLowerCase()
    const validExt = ['pdf', 'doc', 'docx'].includes(ext)
    const validMime = !file.type || ACCEPTED_MIME_TYPES.includes(file.type)
    if (!validExt && !validMime) {
      return 'Only PDF (.pdf) or Word (.doc, .docx) signed agreement files are permitted.'
    }
    if (file.size > 20 * 1024 * 1024) {
      return 'File exceeds the 20 MB maximum size limit.'
    }
    return null
  }

  async function uploadAgreementToStorage(file, clientName) {
    const safeClient = String(clientName || 'client')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 32)
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${safeClient}/${Date.now()}_${safeFileName}`

    const { error: uploadErr } = await supabase.storage
      .from('signed-agreements')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('signed-agreements')
      .getPublicUrl(storagePath)

    return {
      url: urlData.publicUrl,
      name: file.name,
      mime: file.type || 'application/octet-stream',
    }
  }

  async function handleLaunchProject(e) {
    e.preventDefault()
    setFormError('')

    const cleanLink = agreementLink.trim()
    if (!cleanLink && !agreementFile) {
      setFormError(
        'Signed Agreement is mandatory: upload a PDF/Word file or paste a valid signed agreement link.'
      )
      return
    }
    if (cleanLink && !isValidHttpUrl(cleanLink)) {
      setFormError('Please enter a valid http:// or https:// URL for the signed agreement link.')
      return
    }
    if (agreementFile) {
      const fileErr = validateSelectedFile(agreementFile)
      if (fileErr) {
        setFormError(fileErr)
        return
      }
    }

    setSubmittingProject(true)
    try {
      let uploadedMeta = null
      if (agreementFile) {
        uploadedMeta = await uploadAgreementToStorage(agreementFile, formClient)
      }

      const sourceType =
        uploadedMeta && cleanLink ? 'both' : uploadedMeta ? 'file' : 'link'
      const numericVal = parseFloat(String(formContractValue).replace(/[^0-9.]/g, '')) || 0

      const payload = {
        source_opportunity_id:
          sourceDeal?._sourceTable === 'opportunities' ? String(sourceDeal.id) : null,
        source_proposal_id:
          sourceDeal?._sourceTable === 'proposals' ? String(sourceDeal.id) : null,
        client_organization: formClient.trim(),
        project_title: formTitle.trim(),
        sbu: formSbu,
        sector: formSector.trim() || 'Institutional',
        contract_value: numericVal,
        currency: 'ETB',
        contract_ref_no: formContractRef.trim() || null,
        signed_date: formSignedDate || new Date().toISOString().split('T')[0],
        kickoff_date: formKickoffDate || null,
        end_date: formEndDate || null,
        delivery_lead: formDeliveryLead.trim() || 'Operations Division',
        delivery_stage: '0. Pending SMEAL Approval',
        health_status: 'Pending Approval',
        agreement_source_type: sourceType,
        agreement_link: cleanLink || null,
        agreement_file_url: uploadedMeta?.url || null,
        agreement_file_name: uploadedMeta?.name || null,
        agreement_file_mime: uploadedMeta?.mime || null,
        smeal_approval_status: 'Pending SMEAL Approval',
        notes: formNotes.trim() || null,
        created_by: userProfile?.full_name || userProfile?.email || 'CRM Officer',
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('projects')
        .insert([payload])
        .select()

      if (insertErr) throw new Error(insertErr.message)

      const created = inserted?.[0]

      // Automatically queue SMEAL Agreement Verification task in follow_up_logs
      const dueIn2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      await supabase.from('follow_up_logs').insert([
        {
          title: `SMEAL Approval Required: Verify Signed Agreement — ${formClient.trim()}`,
          client_name: formClient.trim(),
          client_organization: formClient.trim(),
          sbu: formSbu,
          due_date: dueIn2Days,
          scheduled_date: dueIn2Days,
          action_type: 'SMEAL Signed Agreement Review',
          status: 'Pending',
          notes: `Project ${created?.project_code || ''} (${formTitle.trim()}) submitted with signed agreement for SMEAL sign-off.`,
        },
      ])

      setShowLaunchModal(false)
      await loadProjectsAndWonDeals()
      onRefresh?.()
      showToast(
        `✓ Project ${created?.project_code || ''} registered and routed to SMEAL Team for signed agreement approval.`
      )
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmittingProject(false)
    }
  }

  async function handleSmealDecision(decision) {
    if (!selectedProject) return
    if (decision === 'Changes Requested' && !smealNotes.trim()) {
      alert('Please enter SMEAL review notes explaining what needs to be corrected in the signed agreement.')
      return
    }

    setUpdatingSmeal(true)
    try {
      const approverName =
        userProfile?.full_name || userProfile?.email || 'SMEAL Reviewer'

      const updates = {
        smeal_approval_status: decision,
        smeal_approved_by: approverName,
        smeal_approved_at: new Date().toISOString(),
        smeal_review_notes: smealNotes.trim() || null,
      }

      if (decision === 'Approved') {
        if (selectedProject.delivery_stage === '0. Pending SMEAL Approval') {
          updates.delivery_stage = '1. Kickoff & Inception'
        }
        updates.health_status = 'On Track'
      } else {
        updates.health_status = 'Action Required (SMEAL)'
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', selectedProject.id)
        .select()

      if (error) throw new Error(error.message)

      const updatedProject = data?.[0]
      setSelectedProject(updatedProject)
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      )
      showToast(
        decision === 'Approved'
          ? `✓ SMEAL Approved ${updatedProject.project_code} — Project Delivery stages unlocked!`
          : `↩ SMEAL requested agreement revisions for ${updatedProject.project_code}.`
      )
    } catch (err) {
      alert(`SMEAL update failed: ${err.message}`)
    } finally {
      setUpdatingSmeal(false)
    }
  }

  async function handleUpdateAgreementEvidence(e) {
    e.preventDefault()
    if (!selectedProject) return

    const cleanLink = reuploadLink.trim()
    if (!cleanLink && !reuploadFile) {
      alert('Attach a PDF/Word file or provide a valid agreement URL.')
      return
    }
    if (cleanLink && !isValidHttpUrl(cleanLink)) {
      alert('Please provide a valid http:// or https:// URL.')
      return
    }
    if (reuploadFile) {
      const fileErr = validateSelectedFile(reuploadFile)
      if (fileErr) {
        alert(fileErr)
        return
      }
    }

    setUpdatingAgreement(true)
    try {
      let uploadedMeta = null
      if (reuploadFile) {
        uploadedMeta = await uploadAgreementToStorage(
          reuploadFile,
          selectedProject.client_organization
        )
      }

      const nextFileUrl = uploadedMeta?.url || selectedProject.agreement_file_url || null
      const nextLink = cleanLink || null
      const nextSourceType =
        nextFileUrl && nextLink ? 'both' : nextFileUrl ? 'file' : 'link'

      const { data, error } = await supabase
        .from('projects')
        .update({
          agreement_source_type: nextSourceType,
          agreement_link: nextLink,
          agreement_file_url: nextFileUrl,
          agreement_file_name: uploadedMeta?.name || selectedProject.agreement_file_name,
          agreement_file_mime: uploadedMeta?.mime || selectedProject.agreement_file_mime,
          smeal_approval_status: 'Pending SMEAL Approval',
          health_status: 'Pending Approval',
        })
        .eq('id', selectedProject.id)
        .select()

      if (error) throw new Error(error.message)

      const updated = data?.[0]
      setSelectedProject(updated)
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setReuploadFile(null)
      showToast('✓ Updated signed agreement re-submitted for SMEAL review.')
    } catch (err) {
      alert(`Agreement update failed: ${err.message}`)
    } finally {
      setUpdatingAgreement(false)
    }
  }

  async function handleStageOrHealthUpdate(field, value) {
    if (!selectedProject) return
    if (
      field === 'delivery_stage' &&
      selectedProject.smeal_approval_status !== 'Approved'
    ) {
      alert('SMEAL Team approval is required before advancing project delivery stages.')
      return
    }

    const updates = { [field]: value }
    if (field === 'delivery_stage' && value === '6. Closed & Certified') {
      updates.health_status = 'Completed'
      updates.recommendation_letter_status = 'Queued for Request'
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', selectedProject.id)
      .select()

    if (!error && data?.[0]) {
      const updated = data[0]
      setSelectedProject(updated)
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

      // Queue Recommendation Letter automatically on Project Closure
      if (field === 'delivery_stage' && value === '6. Closed & Certified') {
        const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
        await supabase.from('follow_up_logs').insert([
          {
            title: `Request Official Recommendation Letter — ${updated.project_title}`,
            client_name: updated.client_organization,
            client_organization: updated.client_organization,
            sbu: updated.sbu,
            due_date: dueDate,
            scheduled_date: dueDate,
            action_type: 'Post-Delivery Recommendation Letter',
            status: 'Pending',
            notes: `Project ${updated.project_code} marked Closed & Certified. Request signed recommendation letter for future tender bids.`,
          },
        ])
        showToast('✓ Project Closed & Recommendation Letter task queued in Follow-up Queue!')
      } else {
        showToast('✓ Project delivery record updated.')
      }
    }
  }

  async function handleAddMilestone(e) {
    e.preventDefault()
    if (!selectedProject || !msTitle.trim()) return

    setAddingMilestone(true)
    const pctNum = parseFloat(msPct) || 0
    const amtNum =
      parseFloat(msAmount) ||
      (pctNum > 0 && selectedProject.contract_value
        ? Math.round((pctNum / 100) * Number(selectedProject.contract_value))
        : 0)

    const { data, error } = await supabase
      .from('project_milestones')
      .insert([
        {
          project_id: selectedProject.id,
          milestone_title: msTitle.trim(),
          milestone_type: msType,
          payment_percentage: pctNum,
          invoice_amount: amtNum,
          due_date: msDueDate || null,
          status: 'Pending',
          deliverable_link: msLink.trim() || null,
        },
      ])
      .select()

    if (!error && data?.[0]) {
      setMilestones((prev) => [...prev, data[0]])
      setMsTitle('')
      setMsPct('')
      setMsAmount('')
      setMsDueDate('')
      setMsLink('')
      showToast('✓ Deliverable / payment milestone added.')
    }
    setAddingMilestone(false)
  }

  async function handleMilestoneStatusChange(milestoneId, newStatus) {
    const { error } = await supabase
      .from('project_milestones')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', milestoneId)

    if (!error) {
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? { ...m, status: newStatus } : m))
      )
    }
  }

  async function handleDeleteMilestone(milestoneId) {
    const { error } = await supabase
      .from('project_milestones')
      .delete()
      .eq('id', milestoneId)

    if (!error) {
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId))
    }
  }

  // Computed KPIs
  const kpis = useMemo(() => {
    const pendingSmeal = projects.filter(
      (p) => p.smeal_approval_status !== 'Approved'
    ).length
    const activeDelivery = projects.filter(
      (p) =>
        p.smeal_approval_status === 'Approved' &&
        p.delivery_stage !== '6. Closed & Certified'
    ).length
    const closedCount = projects.filter(
      (p) => p.delivery_stage === '6. Closed & Certified'
    ).length
    const totalContractValue = projects.reduce(
      (sum, p) => sum + (Number(p.contract_value) || 0),
      0
    )

    return {
      total: projects.length,
      pendingSmeal,
      activeDelivery,
      closedCount,
      totalContractValue,
    }
  }, [projects])

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusTab === 'PENDING_SMEAL' && p.smeal_approval_status === 'Approved') return false
      if (
        statusTab === 'ACTIVE' &&
        (p.smeal_approval_status !== 'Approved' || p.delivery_stage === '6. Closed & Certified')
      )
        return false
      if (statusTab === 'CLOSED' && p.delivery_stage !== '6. Closed & Certified') return false
      if (sbuFilter !== 'ALL' && normalizeSbuCode(p.sbu) !== sbuFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const hit =
          (p.project_title || '').toLowerCase().includes(q) ||
          (p.client_organization || '').toLowerCase().includes(q) ||
          (p.project_code || '').toLowerCase().includes(q) ||
          (p.contract_ref_no || '').toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    })
  }, [projects, statusTab, sbuFilter, searchQuery])

  const paidAmountTotal = useMemo(() => {
    return milestones
      .filter((m) => m.status === 'Paid')
      .reduce((sum, m) => sum + (Number(m.invoice_amount) || 0), 0)
  }, [milestones])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* 1. HEADER & ACTION BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '18px 22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#0f172a' }}>
              🚀 Post-Win Project Delivery &amp; SMEAL Governance Tracker
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 10px',
                borderRadius: 999,
              }}
            >
              {kpis.total} Projects
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Every post-win mandate requires a signed agreement (PDF/Word upload or verified link) and SMEAL Team approval prior to delivery kickoff.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenLaunchModal(null)}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
            color: '#ffffff',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
          }}
        >
          + Register Signed Project
        </button>
      </div>

      {/* 2. TOP 4 GOVERNANCE KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
        }}
      >
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Pending SMEAL Approval
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#b45309', marginTop: 4 }}>
            {kpis.pendingSmeal}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Signed agreements awaiting SMEAL sign-off
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Approved &amp; In Delivery
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>
            {kpis.activeDelivery}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Cleared by SMEAL &amp; executing milestones
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Closed &amp; Certified
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#166534', marginTop: 4 }}>
            {kpis.closedCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Completed mandates &amp; recommendation letters
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderLeft: '4px solid #0f172a' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Signed Portfolio Value
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginTop: 6 }}>
            {formatEtb(kpis.totalContractValue)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Verified post-win contracts across 4 SBUs
          </div>
        </div>
      </div>

      {/* 3. WON PROPOSALS AWAITING SIGNED AGREEMENT HANDOFF BANNER */}
      {wonPendingDeals.length > 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: 12,
            padding: '14px 18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>
              📑 Won Proposals Awaiting Signed Agreement Handoff ({wonPendingDeals.length})
            </div>
            <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>
              Attach PDF/Word agreement or link to activate project tracking &amp; SMEAL review
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {wonPendingDeals.slice(0, 6).map((deal) => (
              <div
                key={`${deal._sourceTable}-${deal.id}`}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, marginRight: 8 }}>
                    {normalizeSbuCode(deal.sbu)}
                  </span>
                  <strong style={{ fontSize: 13, color: '#0f172a' }}>
                    {deal.client_organization || deal.organization || deal.client_name || deal.client || 'Institutional Client'}
                  </strong>
                  <span style={{ fontSize: 12, color: '#475569' }}>
                    {' '}— {deal.opportunity_title || deal.title || 'Won Mandate'}
                  </span>
                  {(deal.contract_value || deal.estimated_value) > 0 && (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#166534', marginLeft: 8 }}>
                      ({formatEtb(deal.contract_value || deal.estimated_value)})
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenLaunchModal(deal)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📎 Attach Signed Agreement &amp; Launch →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FILTER BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 10,
          padding: '12px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All Projects (${kpis.total})` },
            { id: 'PENDING_SMEAL', label: `SMEAL Approval Desk (${kpis.pendingSmeal})` },
            { id: 'ACTIVE', label: `In Delivery (${kpis.activeDelivery})` },
            { id: 'CLOSED', label: `Closed (${kpis.closedCount})` },
          ].map((tab) => {
            const active = statusTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: active ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: active ? '#0284c7' : '#f8fafc',
                  color: active ? '#ffffff' : '#334155',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={sbuFilter}
            onChange={(e) => setSbuFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              background: '#fff',
            }}
          >
            <option value="ALL">All SBUs</option>
            <option value="INST">INST (The Institute)</option>
            <option value="IIP">IIP (Investment Partners)</option>
            <option value="DAS">DAS (Digital &amp; AI)</option>
            <option value="CBS">CBS (Cross Border)</option>
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, project title, ref..."
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              minWidth: 230,
            }}
          />
        </div>
      </div>

      {/* 5. PROJECTS TABLE */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Loading Post-Win Projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              No signed projects in this view yet
            </div>
            <div style={{ fontSize: 12 }}>
              Click <strong>&quot;+ Register Signed Project&quot;</strong> above or hand off a Won proposal with its signed agreement PDF/Word file or link.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Code &amp; Mandate</th>
                <th style={{ padding: '12px 14px' }}>SBU &amp; Value</th>
                <th style={{ padding: '12px 14px' }}>Signed Agreement</th>
                <th style={{ padding: '12px 14px' }}>SMEAL Approval</th>
                <th style={{ padding: '12px 14px' }}>Delivery Stage &amp; Health</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Workspace</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((proj) => {
                const smealStyle = getSmealBadgeStyle(proj.smeal_approval_status)
                const healthStyle = getHealthBadgeStyle(proj.health_status)

                return (
                  <tr key={proj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0284c7' }}>
                        {proj.project_code} {proj.contract_ref_no ? `• Ref: ${proj.contract_ref_no}` : ''}
                      </div>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                        {proj.client_organization}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#475569' }}>{proj.project_title}</div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, background: '#f1f5f9', color: '#334155', padding: '2px 7px', borderRadius: 5 }}>
                        {proj.sbu}
                      </span>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                        {formatEtb(proj.contract_value)}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        Signed: {proj.signed_date || '—'}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {proj.agreement_file_url && (
                          <a
                            href={proj.agreement_file_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: '#0369a1',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            📄 {proj.agreement_file_name || 'View Uploaded File'}
                          </a>
                        )}
                        {proj.agreement_link && (
                          <a
                            href={proj.agreement_link}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: '#0d9488',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            🔗 Open Agreement Link
                          </a>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          ...smealStyle,
                          padding: '4px 9px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          display: 'inline-block',
                        }}
                      >
                        {proj.smeal_approval_status === 'Approved'
                          ? '✓ SMEAL Approved'
                          : proj.smeal_approval_status === 'Changes Requested'
                          ? '⚠ Changes Requested'
                          : '⏳ Pending SMEAL'}
                      </span>
                      {proj.smeal_approved_by && (
                        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                          By: {proj.smeal_approved_by}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 12 }}>
                        {proj.delivery_stage}
                      </div>
                      <span
                        style={{
                          ...healthStyle,
                          display: 'inline-block',
                          marginTop: 4,
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 10.5,
                          fontWeight: 700,
                        }}
                      >
                        {proj.health_status}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => openProjectWorkspace(proj)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 7,
                          border: 'none',
                          background: proj.smeal_approval_status !== 'Approved' ? '#ea580c' : '#0284c7',
                          color: '#ffffff',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {proj.smeal_approval_status !== 'Approved'
                          ? 'Review / Approve →'
                          : 'Open Workspace →'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ====================================================================
          MODAL 1: REGISTER NEW SIGNED PROJECT (MANDATORY AGREEMENT ENFORCED)
      ==================================================================== */}
      {showLaunchModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() => setShowLaunchModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 640,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 26,
              borderTop: '5px solid #ea580c',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              🚀 Register Signed Project &amp; Submit to SMEAL Team
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#64748b' }}>
              A signed agreement (PDF/Word upload or verified URL link) is strictly required. Delivery stages unlock once SMEAL approves.
            </p>

            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleLaunchProject} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    CLIENT ORGANIZATION *
                  </label>
                  <input
                    type="text"
                    required
                    value={formClient}
                    onChange={(e) => setFormClient(e.target.value)}
                    placeholder="e.g., Dashen Bank S.C."
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    EXECUTING SBU *
                  </label>
                  <select
                    value={formSbu}
                    onChange={(e) => setFormSbu(e.target.value)}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="INST">INST (The Institute)</option>
                    <option value="IIP">IIP (Investment Partners)</option>
                    <option value="DAS">DAS (Digital &amp; AI Solutions)</option>
                    <option value="CBS">CBS (Cross Border Solutions)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  PROJECT / SIGNED MANDATE TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., AI Startup Support Program Cohort II / MBL Delivery"
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    CONTRACT VALUE (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formContractValue}
                    onChange={(e) => setFormContractValue(e.target.value)}
                    placeholder="e.g., 1288000"
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    CONTRACT REF NO.
                  </label>
                  <input
                    type="text"
                    value={formContractRef}
                    onChange={(e) => setFormContractRef(e.target.value)}
                    placeholder="e.g., EAII/SSP/01/2026"
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    SIGNED DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={formSignedDate}
                    onChange={(e) => setFormSignedDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    DELIVERY LEAD
                  </label>
                  <input
                    type="text"
                    value={formDeliveryLead}
                    onChange={(e) => setFormDeliveryLead(e.target.value)}
                    placeholder="e.g., Operations Director"
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    KICKOFF DATE
                  </label>
                  <input
                    type="date"
                    value={formKickoffDate}
                    onChange={(e) => setFormKickoffDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    CONTRACT END DATE
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* MANDATORY SIGNED AGREEMENT BOX */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1.5px solid #0284c7',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0369a1', marginBottom: 4 }}>
                  📎 MANDATORY SIGNED AGREEMENT EVIDENCE (Upload PDF/Word OR Paste Link) *
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
                  Provide at least one option below. The SMEAL Team will verify this document before unlocking project delivery.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                      Option A: Upload Signed PDF or Word File (.pdf, .doc, .docx — Max 20MB)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setAgreementFile(e.target.files?.[0] || null)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#ffffff',
                        borderRadius: 8,
                        border: '1px dashed #0284c7',
                        fontSize: 12,
                        boxSizing: 'border-box',
                      }}
                    />
                    {agreementFile && (
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, marginTop: 4 }}>
                        ✓ Ready to upload: {agreementFile.name} ({(agreementFile.size / 1024).toFixed(0)} KB)
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                      Option B: Paste Signed Agreement Document Link (Google Drive / SharePoint / Cloud URL)
                    </label>
                    <input
                      type="url"
                      value={agreementLink}
                      onChange={(e) => setAgreementLink(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box', background: '#fff' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  KICKOFF &amp; GOVERNANCE NOTES
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Key payment terms, deliverables, or LogFrame evaluation scope..."
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowLaunchModal(false)}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProject}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#ea580c',
                    color: '#fff',
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: submittingProject ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingProject ? 'Uploading & Registering...' : 'Submit Signed Project for SMEAL Approval →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: PROJECT WORKSPACE (SMEAL APPROVAL + MILESTONES + PARTNERS)
      ==================================================================== */}
      {selectedProject && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() => setSelectedProject(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 960,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Workspace Header */}
            <div
              style={{
                background: 'linear-gradient(90deg, #060b18 0%, #0f172a 100%)',
                color: '#ffffff',
                padding: '18px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8' }}>
                  {selectedProject.project_code} • {selectedProject.sbu} • {formatEtb(selectedProject.contract_value)}
                </div>
                <h3 style={{ margin: '3px 0 0 0', fontSize: 18, fontWeight: 900 }}>
                  {selectedProject.client_organization} — {selectedProject.project_title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 22, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* SECTION A: SIGNED AGREEMENT & SMEAL APPROVAL GATE */}
              <div
                style={{
                  borderRadius: 12,
                  padding: 18,
                  border:
                    selectedProject.smeal_approval_status === 'Approved'
                      ? '1.5px solid #86efac'
                      : '1.5px solid #f59e0b',
                  background:
                    selectedProject.smeal_approval_status === 'Approved' ? '#f0fdf4' : '#fffbeb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                      🛡️ SMEAL Signed Agreement Verification Gate
                    </div>
                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                      Contract Ref: <strong>{selectedProject.contract_ref_no || 'N/A'}</strong> • Signed Date: <strong>{selectedProject.signed_date || '—'}</strong>
                    </div>
                  </div>
                  <span
                    style={{
                      ...getSmealBadgeStyle(selectedProject.smeal_approval_status),
                      padding: '5px 12px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 800,
                    }}
                  >
                    {selectedProject.smeal_approval_status}
                  </span>
                </div>

                {/* Attached Agreement Links */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  {selectedProject.agreement_file_url && (
                    <a
                      href={selectedProject.agreement_file_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: '#ffffff',
                        border: '1px solid #0284c7',
                        color: '#0369a1',
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      📄 Open / Download Signed File ({selectedProject.agreement_file_name || 'PDF/Word'})
                    </a>
                  )}
                  {selectedProject.agreement_link && (
                    <a
                      href={selectedProject.agreement_link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: '#ffffff',
                        border: '1px solid #0d9488',
                        color: '#0f766e',
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      🔗 Open External Agreement Link
                    </a>
                  )}
                </div>

                {selectedProject.smeal_approval_status === 'Approved' ? (
                  <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
                    ✓ Verified and approved by <strong>{selectedProject.smeal_approved_by || 'SMEAL Team'}</strong>
                    {selectedProject.smeal_approved_at
                      ? ` on ${new Date(selectedProject.smeal_approved_at).toLocaleString()}`
                      : ''}
                    {selectedProject.smeal_review_notes
                      ? ` — Notes: "${selectedProject.smeal_review_notes}"`
                      : ''}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {canApproveSmeal ? (
                      <>
                        <textarea
                          rows={2}
                          value={smealNotes}
                          onChange={(e) => setSmealNotes(e.target.value)}
                          placeholder="SMEAL verification notes (e.g., Confirmed signatures, TOR scope, LogFrame evaluation annex, and payment schedule)..."
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box', background: '#fff' }}
                        />
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={updatingSmeal}
                            onClick={() => handleSmealDecision('Approved')}
                            style={{
                              padding: '9px 16px',
                              borderRadius: 8,
                              border: 'none',
                              background: '#16a34a',
                              color: '#ffffff',
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            ✓ Approve Signed Agreement &amp; Unlock Delivery
                          </button>
                          <button
                            type="button"
                            disabled={updatingSmeal}
                            onClick={() => handleSmealDecision('Changes Requested')}
                            style={{
                              padding: '9px 16px',
                              borderRadius: 8,
                              border: '1px solid #dc2626',
                              background: '#ffffff',
                              color: '#dc2626',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            ↩ Request Agreement Revision
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                        ⏳ Awaiting SMEAL Team sign-off on the attached signed agreement before delivery stages unlock.
                      </div>
                    )}

                    {/* Allow BD Officer to replace/re-submit agreement if changes requested */}
                    {selectedProject.smeal_approval_status === 'Changes Requested' && (
                      <form
                        onSubmit={handleUpdateAgreementEvidence}
                        style={{
                          marginTop: 8,
                          padding: 12,
                          borderRadius: 8,
                          background: '#ffffff',
                          border: '1px dashed #dc2626',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#991b1b' }}>
                          Re-Submit Corrected Signed Agreement (PDF/Word or Link):
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => setReuploadFile(e.target.files?.[0] || null)}
                          style={{ fontSize: 12 }}
                        />
                        <input
                          type="url"
                          value={reuploadLink}
                          onChange={(e) => setReuploadLink(e.target.value)}
                          placeholder="Or paste updated signed agreement link..."
                          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                        <button
                          type="submit"
                          disabled={updatingAgreement}
                          style={{
                            alignSelf: 'flex-start',
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#0284c7',
                            color: '#fff',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {updatingAgreement ? 'Re-Submitting...' : 'Upload & Re-Submit to SMEAL'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION B: DELIVERY STAGE & HEALTH CONTROLS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                    DELIVERY LIFECYCLE STAGE {selectedProject.smeal_approval_status !== 'Approved' ? '(LOCKED UNTIL SMEAL APPROVES)' : ''}
                  </label>
                  <select
                    disabled={selectedProject.smeal_approval_status !== 'Approved'}
                    value={selectedProject.delivery_stage}
                    onChange={(e) => handleStageOrHealthUpdate('delivery_stage', e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, fontWeight: 700 }}
                  >
                    {DELIVERY_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                    PROJECT HEALTH STATUS
                  </label>
                  <select
                    disabled={selectedProject.smeal_approval_status !== 'Approved'}
                    value={selectedProject.health_status}
                    onChange={(e) => handleStageOrHealthUpdate('health_status', e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, fontWeight: 700 }}
                  >
                    {HEALTH_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION C: DELIVERABLES & PAYMENT MILESTONES */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    📋 Deliverables &amp; Payment Tranches ({milestones.length})
                  </h4>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '4px 10px', borderRadius: 8 }}>
                    Collected: {formatEtb(paidAmountTotal)} / {formatEtb(selectedProject.contract_value)}
                  </span>
                </div>

                {drawerLoading ? (
                  <div style={{ fontSize: 12, color: '#64748b' }}>Loading milestones...</div>
                ) : (
                  <>
                    {milestones.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px' }}>Milestone / Deliverable</th>
                            <th style={{ padding: '8px 10px' }}>Type</th>
                            <th style={{ padding: '8px 10px' }}>Tranche</th>
                            <th style={{ padding: '8px 10px' }}>Due Date</th>
                            <th style={{ padding: '8px 10px' }}>Status</th>
                            <th style={{ padding: '8px 10px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {milestones.map((m) => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                                {m.milestone_title}
                                {m.deliverable_link && (
                                  <div>
                                    <a href={m.deliverable_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#0284c7' }}>
                                      View Deliverable ↗
                                    </a>
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>{m.milestone_type}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                                {m.payment_percentage ? `${m.payment_percentage}% • ` : ''}
                                {formatEtb(m.invoice_amount)}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>{m.due_date || '—'}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <select
                                  value={m.status}
                                  onChange={(e) => handleMilestoneStatusChange(m.id, e.target.value)}
                                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11.5, fontWeight: 700 }}
                                >
                                  {MILESTONE_STATUSES.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMilestone(m.id)}
                                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Quick Add Milestone Form */}
                    <form
                      onSubmit={handleAddMilestone}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 0.7fr 1fr 1fr auto',
                        gap: 8,
                        alignItems: 'center',
                        background: '#f8fafc',
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <input
                        type="text"
                        required
                        value={msTitle}
                        onChange={(e) => setMsTitle(e.target.value)}
                        placeholder="Milestone title (e.g., 30% Advance / Inception Report)"
                        style={{ padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                      <select
                        value={msType}
                        onChange={(e) => setMsType(e.target.value)}
                        style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11.5 }}
                      >
                        <option value="Deliverable & Invoice">Deliverable &amp; Invoice</option>
                        <option value="Payment Tranche">Payment Tranche</option>
                        <option value="Deliverable">Deliverable</option>
                        <option value="M&E Evaluation">M&amp;E Evaluation</option>
                      </select>
                      <input
                        type="number"
                        value={msPct}
                        onChange={(e) => setMsPct(e.target.value)}
                        placeholder="%"
                        style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                      <input
                        type="number"
                        value={msAmount}
                        onChange={(e) => setMsAmount(e.target.value)}
                        placeholder="ETB (auto if %)"
                        style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                      <input
                        type="date"
                        value={msDueDate}
                        onChange={(e) => setMsDueDate(e.target.value)}
                        style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11.5 }}
                      />
                      <button
                        type="submit"
                        disabled={addingMilestone}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#0284c7',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Add
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* SECTION D: LINKED PARTNERS ON THIS PROJECT */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  🤝 Consortium / Delivery Partners Linked ({linkedPartners.length})
                </div>
                {linkedPartners.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    No external partners linked yet. Assign JV or associate partners from the <strong>Partners &amp; Consortiums</strong> tab.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {linkedPartners.map((lp) => (
                      <span
                        key={lp.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          padding: '5px 10px',
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        {lp.partners?.partner_name || 'Partner'} • {lp.partner_role} ({lp.revenue_share_pct || 0}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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