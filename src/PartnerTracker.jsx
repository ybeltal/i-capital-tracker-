/**
 * THE i-CAPITAL AFRICA INSTITUTE — PARTNERS, CONSORTIUMS & MOU TRACKER
 * Tracks JV Partners, Associate Consultants, MOUs/NDAs (PDF/Word Upload or Link),
 * Tender Compliance Readiness, and Revenue-Share Links to Proposals & Projects.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'

const PARTNER_TYPES = [
  'Joint Venture / Consortium',
  'International Technical Firm',
  'Associate Consultant / Facilitator',
  'Venue / Hospitality',
  'Referral / Channel Partner',
]

const MOU_STATUSES = [
  'Active MOU',
  'Under Negotiation',
  'Expiring Soon',
  'Expired',
  'No MOU',
]

const PARTNER_ROLES = [
  'Lead Firm',
  'Local JV Partner',
  'Sub-Contractor',
  'Lead Facilitator',
  'Referral Partner',
]

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function formatEtb(amount) {
  const num = Number(amount) || 0
  return `ETB ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

function computeEffectiveMouStatus(partner) {
  const days = getDaysUntil(partner.mou_expiry_date)
  if (days !== null && partner.mou_status !== 'No MOU' && partner.mou_status !== 'Under Negotiation') {
    if (days < 0) return 'Expired'
    if (days <= 30) return 'Expiring Soon'
  }
  return partner.mou_status || 'No MOU'
}

function getMouBadgeStyle(status) {
  if (status === 'Active MOU') {
    return { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
  }
  if (status === 'Expiring Soon') {
    return { background: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' }
  }
  if (status === 'Expired') {
    return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }
  }
  if (status === 'Under Negotiation') {
    return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }
  }
  return { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }
}

function generatePartnerCode() {
  const yr = new Date().getFullYear()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `PRT-${yr}-${rand}`
}

function isValidHttpUrl(str) {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function PartnerTracker({ userProfile, onRefresh }) {
  const [partners, setPartners] = useState([])
  const [dealLinks, setDealLinks] = useState([])
  const [availableProjects, setAvailableProjects] = useState([])
  const [availableDeals, setAvailableDeals] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sbuFilter, setSbuFilter] = useState('ALL')
  const [mouFilter, setMouFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Register / Edit Partner Modal State
  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('Joint Venture / Consortium')
  const [formCountry, setFormCountry] = useState('Ethiopia')
  const [formSbu, setFormSbu] = useState('All SBUs')
  const [formExpertise, setFormExpertise] = useState('')
  const [formContactPerson, setFormContactPerson] = useState('')
  const [formContactEmail, setFormContactEmail] = useState('')
  const [formContactPhone, setFormContactPhone] = useState('')
  const [formMouStatus, setFormMouStatus] = useState('Active MOU')
  const [formMouSigned, setFormMouSigned] = useState('')
  const [formMouExpiry, setFormMouExpiry] = useState('')
  const [formMouUrl, setFormMouUrl] = useState('')
  const [formMouFile, setFormMouFile] = useState(null)
  const [formComplianceReady, setFormComplianceReady] = useState(true)
  const [formStatus, setFormStatus] = useState('Active')
  const [formNotes, setFormNotes] = useState('')
  const [savingPartner, setSavingPartner] = useState(false)
  const [partnerFormError, setPartnerFormError] = useState('')

  // Partner Detail & Mandate Linking Workspace Modal
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [linkTargetMode, setLinkTargetMode] = useState('project') // 'project' | 'deal' | 'manual'
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [linkMandateTitle, setLinkMandateTitle] = useState('')
  const [linkClientOrg, setLinkClientOrg] = useState('')
  const [linkRole, setLinkRole] = useState('Local JV Partner')
  const [linkSharePct, setLinkSharePct] = useState('')
  const [linkShareVal, setLinkShareVal] = useState('')
  const [linkBaseValue, setLinkBaseValue] = useState(0)
  const [linkNotes, setLinkNotes] = useState('')
  const [savingLink, setSavingLink] = useState(false)

  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4500)
  }

  useEffect(() => {
    loadPartnerData()
  }, [])

  async function loadPartnerData() {
    setLoading(true)
    const [partnersRes, linksRes, projRes, oppRes, propRes] = await Promise.all([
      supabase.from('partners').select('*').order('created_at', { ascending: false }),
      supabase.from('deal_partners').select('*').order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id, project_code, project_title, client_organization, sbu, contract_value')
        .order('created_at', { ascending: false }),
      supabase
        .from('opportunities')
        .select('id, title, opportunity_title, client_organization, organization, client_name, sbu, estimated_value, contract_value')
        .order('created_at', { ascending: false }),
      supabase
        .from('proposals')
        .select('id, title, opportunity_title, client_organization, organization, client_name, sbu, estimated_value, contract_value')
        .order('created_at', { ascending: false }),
    ])

    setPartners(partnersRes.data || [])
    setDealLinks(linksRes.data || [])
    setAvailableProjects(projRes.data || [])

    // Combine opportunities and proposals for dropdown selection
    const opps = (oppRes.data || []).map((o) => ({
      id: `opp:${o.id}`,
      rawId: String(o.id),
      source: 'opportunity',
      title: o.opportunity_title || o.title || 'Untitled Opportunity',
      client: o.client_organization || o.organization || o.client_name || 'Institutional Client',
      value: Number(o.contract_value || o.estimated_value) || 0,
      sbu: o.sbu || 'INST',
    }))

    const props = (propRes.data || []).map((p) => ({
      id: `prop:${p.id}`,
      rawId: String(p.id),
      source: 'proposal',
      title: p.opportunity_title || p.title || 'Untitled Proposal',
      client: p.client_organization || p.organization || p.client_name || 'Institutional Client',
      value: Number(p.contract_value || p.estimated_value) || 0,
      sbu: p.sbu || 'INST',
    }))

    setAvailableDeals([...opps, ...props])
    setLoading(false)
  }

  function openNewPartnerModal() {
    setEditingPartner(null)
    setFormName('')
    setFormType('Joint Venture / Consortium')
    setFormCountry('Ethiopia')
    setFormSbu('All SBUs')
    setFormExpertise('')
    setFormContactPerson('')
    setFormContactEmail('')
    setFormContactPhone('')
    setFormMouStatus('Active MOU')
    setFormMouSigned('')
    setFormMouExpiry('')
    setFormMouUrl('')
    setFormMouFile(null)
    setFormComplianceReady(true)
    setFormStatus('Active')
    setFormNotes('')
    setPartnerFormError('')
    setShowPartnerModal(true)
  }

  function openEditPartnerModal(partner) {
    setEditingPartner(partner)
    setFormName(partner.partner_name || '')
    setFormType(partner.partner_type || 'Joint Venture / Consortium')
    setFormCountry(partner.country || 'Ethiopia')
    setFormSbu(partner.primary_sbu || 'All SBUs')
    setFormExpertise(partner.expertise_areas || '')
    setFormContactPerson(partner.contact_person || '')
    setFormContactEmail(partner.contact_email || '')
    setFormContactPhone(partner.contact_phone || '')
    setFormMouStatus(partner.mou_status || 'Active MOU')
    setFormMouSigned(partner.mou_signed_date || '')
    setFormMouExpiry(partner.mou_expiry_date || '')
    setFormMouUrl(partner.mou_document_url || '')
    setFormMouFile(null)
    setFormComplianceReady(partner.compliance_ready !== false)
    setFormStatus(partner.status || 'Active')
    setFormNotes(partner.notes || '')
    setPartnerFormError('')
    setShowPartnerModal(true)
  }

  async function uploadMouFile(file, partnerName) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const validExt = ['pdf', 'doc', 'docx'].includes(ext)
    const validMime = !file.type || ACCEPTED_MIME_TYPES.includes(file.type)
    if (!validExt && !validMime) {
      throw new Error('Only PDF (.pdf) or Word (.doc, .docx) MOU files are permitted.')
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('MOU file exceeds the 20 MB size limit.')
    }

    const safeName = String(partnerName || 'partner')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 32)
    const safeFile = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `partner-mous/${safeName}/${Date.now()}_${safeFile}`

    const { error } = await supabase.storage
      .from('signed-agreements')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false })

    if (error) throw new Error(`MOU upload failed: ${error.message}`)

    const { data } = supabase.storage.from('signed-agreements').getPublicUrl(storagePath)
    return data.publicUrl
  }

  async function handleSavePartner(e) {
    e.preventDefault()
    setPartnerFormError('')

    if (!formName.trim()) {
      setPartnerFormError('Partner organization or consultant name is required.')
      return
    }
    if (formMouUrl.trim() && !isValidHttpUrl(formMouUrl.trim())) {
      setPartnerFormError('Please enter a valid http:// or https:// link for the MOU document.')
      return
    }

    setSavingPartner(true)
    try {
      let resolvedMouUrl = formMouUrl.trim() || null
      if (formMouFile) {
        resolvedMouUrl = await uploadMouFile(formMouFile, formName)
      }

      const payload = {
        partner_name: formName.trim(),
        partner_type: formType,
        country: formCountry.trim() || 'Ethiopia',
        primary_sbu: formSbu,
        expertise_areas: formExpertise.trim() || null,
        contact_person: formContactPerson.trim() || null,
        contact_email: formContactEmail.trim() || null,
        contact_phone: formContactPhone.trim() || null,
        mou_status: formMouStatus,
        mou_signed_date: formMouSigned || null,
        mou_expiry_date: formMouExpiry || null,
        mou_document_url: resolvedMouUrl,
        compliance_ready: formComplianceReady,
        status: formStatus,
        notes: formNotes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (editingPartner) {
        const { data, error } = await supabase
          .from('partners')
          .update(payload)
          .eq('id', editingPartner.id)
          .select()

        if (error) throw new Error(error.message)
        if (selectedPartner && selectedPartner.id === editingPartner.id && data?.[0]) {
          setSelectedPartner(data[0])
        }
        showToast(`✓ Updated partner profile for ${formName.trim()}.`)
      } else {
        payload.partner_code = generatePartnerCode()
        const { error } = await supabase.from('partners').insert([payload]).select()
        if (error) throw new Error(error.message)
        showToast(`✓ Registered ${formName.trim()} in Partners & Consortiums!`)
      }

      setShowPartnerModal(false)
      await loadPartnerData()
      onRefresh?.()
    } catch (err) {
      setPartnerFormError(err.message)
    } finally {
      setSavingPartner(false)
    }
  }

  function handleSelectMandateTarget(targetValue) {
    setSelectedTargetId(targetValue)
    if (linkTargetMode === 'project') {
      const proj = availableProjects.find((p) => p.id === targetValue)
      if (proj) {
        setLinkMandateTitle(`${proj.project_code || 'PRJ'} — ${proj.project_title}`)
        setLinkClientOrg(proj.client_organization || '')
        const baseVal = Number(proj.contract_value) || 0
        setLinkBaseValue(baseVal)
        if (linkSharePct) {
          setLinkShareVal(String(Math.round((parseFloat(linkSharePct) / 100) * baseVal)))
        }
      }
    } else if (linkTargetMode === 'deal') {
      const deal = availableDeals.find((d) => d.id === targetValue)
      if (deal) {
        setLinkMandateTitle(deal.title)
        setLinkClientOrg(deal.client)
        const baseVal = Number(deal.value) || 0
        setLinkBaseValue(baseVal)
        if (linkSharePct) {
          setLinkShareVal(String(Math.round((parseFloat(linkSharePct) / 100) * baseVal)))
        }
      }
    }
  }

  function handleSharePctChange(pctStr) {
    setLinkSharePct(pctStr)
    const pct = parseFloat(pctStr)
    if (!Number.isNaN(pct) && linkBaseValue > 0) {
      setLinkShareVal(String(Math.round((pct / 100) * linkBaseValue)))
    }
  }

  async function handleAddPartnerLink(e) {
    e.preventDefault()
    if (!selectedPartner || !linkMandateTitle.trim()) return

    setSavingLink(true)
    try {
      let projectId = null
      let opportunityId = null
      let proposalId = null

      if (linkTargetMode === 'project' && selectedTargetId) {
        projectId = selectedTargetId
      } else if (linkTargetMode === 'deal' && selectedTargetId) {
        if (selectedTargetId.startsWith('opp:')) {
          opportunityId = selectedTargetId.replace('opp:', '')
        } else if (selectedTargetId.startsWith('prop:')) {
          proposalId = selectedTargetId.replace('prop:', '')
        }
      }

      const payload = {
        partner_id: selectedPartner.id,
        project_id: projectId,
        opportunity_id: opportunityId,
        proposal_id: proposalId,
        mandate_title: linkMandateTitle.trim(),
        client_organization: linkClientOrg.trim() || null,
        partner_role: linkRole,
        revenue_share_pct: parseFloat(linkSharePct) || 0,
        contract_share_value: parseFloat(linkShareVal) || 0,
        status: 'Active',
        notes: linkNotes.trim() || null,
      }

      const { data, error } = await supabase
        .from('deal_partners')
        .insert([payload])
        .select()

      if (error) throw new Error(error.message)

      if (data?.[0]) {
        setDealLinks((prev) => [data[0], ...prev])
      }
      setSelectedTargetId('')
      setLinkMandateTitle('')
      setLinkClientOrg('')
      setLinkSharePct('')
      setLinkShareVal('')
      setLinkBaseValue(0)
      setLinkNotes('')
      showToast(`✓ Linked ${selectedPartner.partner_name} to "${payload.mandate_title}".`)
    } catch (err) {
      alert(`Could not link partner: ${err.message}`)
    } finally {
      setSavingLink(false)
    }
  }

  async function handleRemovePartnerLink(linkId) {
    const { error } = await supabase.from('deal_partners').delete().eq('id', linkId)
    if (!error) {
      setDealLinks((prev) => prev.filter((l) => l.id !== linkId))
      showToast('Partner link removed.')
    }
  }

  async function handleLogMouRenewalTask(partner) {
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { error } = await supabase.from('follow_up_logs').insert([
      {
        title: `Renew Partner MOU / NDA — ${partner.partner_name}`,
        client_name: partner.partner_name,
        client_organization: partner.partner_name,
        sbu: partner.primary_sbu || 'All SBUs',
        due_date: dueDate,
        scheduled_date: dueDate,
        action_type: 'Partner MOU Renewal',
        status: 'Pending',
        notes: `Partner MOU status: ${computeEffectiveMouStatus(partner)} (Expiry: ${partner.mou_expiry_date || 'N/A'}). Contact: ${partner.contact_person || 'Partner Lead'} (${partner.contact_email || 'No email'}). Logged by ${userProfile?.full_name || 'CRM Officer'}.`,
      },
    ])

    if (!error) {
      showToast(`✓ MOU renewal reminder for ${partner.partner_name} logged in Follow-up Queue!`)
      onRefresh?.()
    }
  }

  // Aggregated partner metrics
  const enrichedPartners = useMemo(() => {
    const linksByPartner = new Map()
    dealLinks.forEach((l) => {
      if (!linksByPartner.has(l.partner_id)) linksByPartner.set(l.partner_id, [])
      linksByPartner.get(l.partner_id).push(l)
    })

    return partners.map((p) => {
      const pLinks = linksByPartner.get(p.id) || []
      const effectiveMou = computeEffectiveMouStatus(p)
      const daysToExpiry = getDaysUntil(p.mou_expiry_date)
      const totalSharedValue = pLinks.reduce(
        (sum, item) => sum + (Number(item.contract_share_value) || 0),
        0
      )
      return {
        ...p,
        _effectiveMou: effectiveMou,
        _daysToExpiry: daysToExpiry,
        _links: pLinks,
        _totalSharedValue: totalSharedValue,
      }
    })
  }, [partners, dealLinks])

  const kpis = useMemo(() => {
    const activeCount = enrichedPartners.filter((p) => p.status === 'Active').length
    const activeMouCount = enrichedPartners.filter((p) => p._effectiveMou === 'Active MOU').length
    const expiringAlerts = enrichedPartners.filter(
      (p) => p._effectiveMou === 'Expiring Soon' || p._effectiveMou === 'Expired'
    )
    const totalSharedPortfolio = dealLinks.reduce(
      (sum, l) => sum + (Number(l.contract_share_value) || 0),
      0
    )

    return {
      total: enrichedPartners.length,
      activeCount,
      activeMouCount,
      expiringAlerts,
      totalSharedPortfolio,
    }
  }, [enrichedPartners, dealLinks])

  const filteredPartners = useMemo(() => {
    return enrichedPartners.filter((p) => {
      if (typeFilter !== 'ALL' && p.partner_type !== typeFilter) return false
      if (sbuFilter !== 'ALL' && p.primary_sbu !== sbuFilter && p.primary_sbu !== 'All SBUs') {
        return false
      }
      if (mouFilter !== 'ALL' && p._effectiveMou !== mouFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const hit =
          (p.partner_name || '').toLowerCase().includes(q) ||
          (p.partner_code || '').toLowerCase().includes(q) ||
          (p.expertise_areas || '').toLowerCase().includes(q) ||
          (p.contact_person || '').toLowerCase().includes(q) ||
          (p.country || '').toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    })
  }, [enrichedPartners, typeFilter, sbuFilter, mouFilter, searchQuery])

  const selectedPartnerLinks = useMemo(() => {
    if (!selectedPartner) return []
    return dealLinks.filter((l) => l.partner_id === selectedPartner.id)
  }, [selectedPartner, dealLinks])

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
              🤝 Partners, Consortiums &amp; MOU Tracker
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
              {kpis.total} Registered Partners
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Manage Joint Venture (JV) firms, associate facilitators, MOU validity, compliance readiness, and mandate revenue splits across all 4 SBUs.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewPartnerModal}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.28)',
          }}
        >
          + Register New Partner
        </button>
      </div>

      {/* 2. TOP 4 PARTNER KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
        }}
      >
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Active Strategic Partners
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>
            {kpis.activeCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            JV firms, associates &amp; channel allies
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Active MOUs / NDAs
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#166534', marginTop: 4 }}>
            {kpis.activeMouCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Valid agreements ready for joint bidding
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderLeft: '4px solid #ea580c' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            MOU Expiry Alerts (≤30d)
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#c2410c', marginTop: 4 }}>
            {kpis.expiringAlerts.length}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Expiring soon or already expired
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderLeft: '4px solid #0f172a' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Partner Fee-Share Portfolio
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginTop: 6 }}>
            {formatEtb(kpis.totalSharedPortfolio)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Across {dealLinks.length} linked bids &amp; projects
          </div>
        </div>
      </div>

      {/* 3. MOU EXPIRY WATCHLIST BANNER */}
      {kpis.expiringAlerts.length > 0 && (
        <div
          style={{
            background: '#fff7ed',
            border: '1px solid #fdba74',
            borderRadius: 12,
            padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: '#9a3412', marginBottom: 10 }}>
            ⏰ Partner MOU Renewal Watchlist ({kpis.expiringAlerts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {kpis.expiringAlerts.slice(0, 5).map((p) => (
              <div
                key={p.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fed7aa',
                  borderRadius: 8,
                  padding: '9px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12.5 }}>
                  <strong style={{ color: '#0f172a' }}>{p.partner_name}</strong>{' '}
                  <span style={{ color: '#64748b' }}>({p.partner_type})</span> —{' '}
                  <strong style={{ color: p._effectiveMou === 'Expired' ? '#dc2626' : '#ea580c' }}>
                    {p._effectiveMou === 'Expired'
                      ? `Expired on ${p.mou_expiry_date || 'N/A'}`
                      : `Expires in ${p._daysToExpiry} day(s) (${p.mou_expiry_date})`}
                  </strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleLogMouRenewalTask(p)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid #ea580c',
                      background: '#ffffff',
                      color: '#ea580c',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Queue Renewal Task
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditPartnerModal(p)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#ea580c',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Update MOU
                  </button>
                </div>
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
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
          >
            <option value="ALL">All Partner Classifications</option>
            {PARTNER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={sbuFilter}
            onChange={(e) => setSbuFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
          >
            <option value="ALL">All SBUs</option>
            <option value="INST">INST (The Institute)</option>
            <option value="IIP">IIP (Investment Partners)</option>
            <option value="DAS">DAS (Digital &amp; AI)</option>
            <option value="CBS">CBS (Cross Border)</option>
          </select>

          <select
            value={mouFilter}
            onChange={(e) => setMouFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
          >
            <option value="ALL">All MOU Statuses</option>
            {MOU_STATUSES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search partner, expertise, contact, country..."
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 12,
            minWidth: 250,
          }}
        />
      </div>

      {/* 5. PARTNERS DIRECTORY TABLE */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Loading Partners &amp; Consortiums...
          </div>
        ) : filteredPartners.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              No partners match your current filter
            </div>
            <div style={{ fontSize: 12 }}>
              Click <strong>&quot;+ Register New Partner&quot;</strong> above to onboard a JV partner, associate consultant, or venue partner.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Partner &amp; Classification</th>
                <th style={{ padding: '12px 14px' }}>SBU &amp; Expertise</th>
                <th style={{ padding: '12px 14px' }}>Primary Contact</th>
                <th style={{ padding: '12px 14px' }}>MOU / NDA &amp; Compliance</th>
                <th style={{ padding: '12px 14px' }}>Linked Mandates</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((p) => {
                const mouStyle = getMouBadgeStyle(p._effectiveMou)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0284c7' }}>
                        {p.partner_code || 'PRT'} • {p.country || 'Ethiopia'}
                      </div>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                        {p.partner_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {p.partner_type}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px', maxWidth: 230 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, background: '#f1f5f9', color: '#334155', padding: '2px 7px', borderRadius: 5 }}>
                        {p.primary_sbu || 'All SBUs'}
                      </span>
                      <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
                        {p.expertise_areas || 'General Advisory / Support'}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12 }}>
                        {p.contact_person || '—'}
                      </div>
                      {p.contact_email && (
                        <div style={{ fontSize: 11, color: '#0284c7' }}>{p.contact_email}</div>
                      )}
                      {p.contact_phone && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>{p.contact_phone}</div>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          ...mouStyle,
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          display: 'inline-block',
                        }}
                      >
                        {p._effectiveMou}
                      </span>
                      <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                        {p.mou_expiry_date ? `Exp: ${p.mou_expiry_date}` : 'No expiry date'}
                        {p.mou_document_url && (
                          <>
                            {' • '}
                            <a
                              href={p.mou_document_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}
                            >
                              View MOU ↗
                            </a>
                          </>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: p.compliance_ready ? '#166534' : '#b45309',
                          marginTop: 2,
                        }}
                      >
                        {p.compliance_ready ? '✓ Bid Compliance Ready' : '⚠ Docs Pending'}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>
                        {p._links.length} Linked Mandate{p._links.length === 1 ? '' : 's'}
                      </div>
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, marginTop: 2 }}>
                        {formatEtb(p._totalSharedValue)} shared
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => openEditPartnerModal(p)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#334155',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPartner(p)}
                          style={{
                            padding: '6px 11px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#0284c7',
                            color: '#ffffff',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Link &amp; View →
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ====================================================================
          MODAL 1: REGISTER / EDIT PARTNER PROFILE
      ==================================================================== */}
      {showPartnerModal && (
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
          onClick={() => setShowPartnerModal(false)}
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
              borderTop: '5px solid #0284c7',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              {editingPartner ? `Edit Partner: ${editingPartner.partner_name}` : '🤝 Register New Strategic Partner'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#64748b' }}>
              Capture JV consortium credentials, MOU validity, and contact details for bidding and co-delivery.
            </p>

            {partnerFormError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                ⚠️ {partnerFormError}
              </div>
            )}

            <form onSubmit={handleSavePartner} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    PARTNER / CONSULTANT NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., HST Consulting / Global Leadership Academy"
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    CLASSIFICATION *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  >
                    {PARTNER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    PRIMARY SBU
                  </label>
                  <select
                    value={formSbu}
                    onChange={(e) => setFormSbu(e.target.value)}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  >
                    <option value="All SBUs">All SBUs</option>
                    <option value="INST">INST (The Institute)</option>
                    <option value="IIP">IIP (Investment Partners)</option>
                    <option value="DAS">DAS (Digital &amp; AI)</option>
                    <option value="CBS">CBS (Cross Border)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    COUNTRY / BASE
                  </label>
                  <input
                    type="text"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    placeholder="Ethiopia / Kenya / UAE"
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    PARTNER STATUS
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  >
                    <option value="Active">Active</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  CORE EXPERTISE / TECHNICAL CAPABILITY
                </label>
                <input
                  type="text"
                  value={formExpertise}
                  onChange={(e) => setFormExpertise(e.target.value)}
                  placeholder="e.g., IFRS Training, Capital Market Structuring, Overseas Study Tour Hosting"
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    CONTACT PERSON
                  </label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="Full Name & Role"
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={formContactEmail}
                    onChange={(e) => setFormContactEmail(e.target.value)}
                    placeholder="contact@partner.org"
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    PHONE NUMBER
                  </label>
                  <input
                    type="text"
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                    placeholder="+251..."
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* MOU / NDA SECTION */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                  📜 MOU / NDA &amp; Bid Compliance Details
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      MOU / NDA STATUS
                    </label>
                    <select
                      value={formMouStatus}
                      onChange={(e) => setFormMouStatus(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12 }}
                    >
                      {MOU_STATUSES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      MOU SIGNED DATE
                    </label>
                    <input
                      type="date"
                      value={formMouSigned}
                      onChange={(e) => setFormMouSigned(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      MOU EXPIRY DATE
                    </label>
                    <input
                      type="date"
                      value={formMouExpiry}
                      onChange={(e) => setFormMouExpiry(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Upload Signed MOU (PDF/Word)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setFormMouFile(e.target.files?.[0] || null)}
                      style={{ width: '100%', fontSize: 11.5, background: '#fff', padding: 6, borderRadius: 6, border: '1px dashed #94a3b8', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Or Paste MOU Link (Drive / Cloud)
                    </label>
                    <input
                      type="url"
                      value={formMouUrl}
                      onChange={(e) => setFormMouUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box', background: '#fff' }}
                    />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formComplianceReady}
                    onChange={(e) => setFormComplianceReady(e.target.checked)}
                  />
                  <span>Tender Compliance Ready (Valid Trade License, TIN, Tax Clearance &amp; CVs on file)</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  COMMERCIAL TERMS &amp; NOTES
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Standard fee split agreements, preferred sectors, or exclusivity notes..."
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPartner}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0284c7',
                    color: '#fff',
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: savingPartner ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingPartner ? 'Saving Partner...' : editingPartner ? 'Save Partner Changes' : 'Register Partner →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: PARTNER WORKSPACE (LINK TO PROPOSALS / SIGNED PROJECTS)
      ==================================================================== */}
      {selectedPartner && (
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
          onClick={() => setSelectedPartner(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 880,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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
                  {selectedPartner.partner_code || 'PARTNER'} • {selectedPartner.partner_type} • {selectedPartner.primary_sbu}
                </div>
                <h3 style={{ margin: '3px 0 0 0', fontSize: 18, fontWeight: 900 }}>
                  {selectedPartner.partner_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 22, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Partner Summary Strip */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                  <div>
                    <strong>Contact:</strong> {selectedPartner.contact_person || '—'}{' '}
                    {selectedPartner.contact_email ? `(${selectedPartner.contact_email})` : ''}{' '}
                    {selectedPartner.contact_phone ? `• ${selectedPartner.contact_phone}` : ''}
                  </div>
                  <div>
                    <strong>Expertise:</strong> {selectedPartner.expertise_areas || 'General Institutional Advisory'}
                  </div>
                  <div>
                    <strong>MOU:</strong> {computeEffectiveMouStatus(selectedPartner)}{' '}
                    {selectedPartner.mou_expiry_date ? `(Expires: ${selectedPartner.mou_expiry_date})` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedPartner.mou_document_url && (
                    <a
                      href={selectedPartner.mou_document_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '7px 12px',
                        borderRadius: 7,
                        border: '1px solid #0284c7',
                        background: '#ffffff',
                        color: '#0369a1',
                        fontSize: 11.5,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      📄 Open MOU Document
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleLogMouRenewalTask(selectedPartner)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 7,
                      border: '1px solid #ea580c',
                      background: '#fff7ed',
                      color: '#c2410c',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⏰ Log MOU Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditPartnerModal(selectedPartner)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 7,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

              {/* Linked Proposals & Projects Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    🔗 Linked Proposals &amp; Co-Delivered Projects ({selectedPartnerLinks.length})
                  </h4>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '4px 10px', borderRadius: 8 }}>
                    Total Share: {formatEtb(selectedPartnerLinks.reduce((s, x) => s + (Number(x.contract_share_value) || 0), 0))}
                  </span>
                </div>

                {selectedPartnerLinks.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                    No joint bids or co-delivered projects linked to this partner yet. Use the form below to link one.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Mandate / Project</th>
                        <th style={{ padding: '8px 10px' }}>Client</th>
                        <th style={{ padding: '8px 10px' }}>Partner Role</th>
                        <th style={{ padding: '8px 10px' }}>Fee Share</th>
                        <th style={{ padding: '8px 10px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPartnerLinks.map((lnk) => (
                        <tr key={lnk.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                            {lnk.mandate_title}
                            <div style={{ fontSize: 10.5, color: '#0284c7', fontWeight: 600 }}>
                              {lnk.project_id ? '🚀 Signed Project' : '📑 Active Bid / Proposal'}
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#475569' }}>
                            {lnk.client_organization || '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
                              {lnk.partner_role}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#166534' }}>
                            {lnk.revenue_share_pct || 0}% ({formatEtb(lnk.contract_share_value)})
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleRemovePartnerLink(lnk.id)}
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

                {/* Link Partner to Project or Proposal Form */}
                <form
                  onSubmit={handleAddPartnerLink}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                    + Link {selectedPartner.partner_name} to a Project or Proposal
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { id: 'project', label: `🚀 Signed Project (${availableProjects.length})` },
                      { id: 'deal', label: `📑 Active Proposal / Deal (${availableDeals.length})` },
                      { id: 'manual', label: '✍️ Manual Mandate Entry' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setLinkTargetMode(m.id)
                          setSelectedTargetId('')
                          setLinkBaseValue(0)
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          border: linkTargetMode === m.id ? '1px solid #0284c7' : '1px solid #cbd5e1',
                          background: linkTargetMode === m.id ? '#0284c7' : '#ffffff',
                          color: linkTargetMode === m.id ? '#ffffff' : '#334155',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {linkTargetMode === 'project' && (
                    <select
                      value={selectedTargetId}
                      onChange={(e) => handleSelectMandateTarget(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                    >
                      <option value="">-- Select a Signed Project from Project Delivery --</option>
                      {availableProjects.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.project_code} • {pr.client_organization} — {pr.project_title} ({formatEtb(pr.contract_value)})
                        </option>
                      ))}
                    </select>
                  )}

                  {linkTargetMode === 'deal' && (
                    <select
                      value={selectedTargetId}
                      onChange={(e) => handleSelectMandateTarget(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                    >
                      <option value="">-- Select an Active Opportunity or Proposal --</option>
                      {availableDeals.map((d) => (
                        <option key={d.id} value={d.id}>
                          [{d.sbu}] {d.client} — {d.title} ({formatEtb(d.value)})
                        </option>
                      ))}
                    </select>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
                    <input
                      type="text"
                      required
                      value={linkMandateTitle}
                      onChange={(e) => setLinkMandateTitle(e.target.value)}
                      placeholder="Mandate / Project Title *"
                      style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                    />
                    <input
                      type="text"
                      value={linkClientOrg}
                      onChange={(e) => setLinkClientOrg(e.target.value)}
                      placeholder="Client Organization"
                      style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 1fr auto', gap: 10, alignItems: 'center' }}>
                    <select
                      value={linkRole}
                      onChange={(e) => setLinkRole(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                    >
                      {PARTNER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={linkSharePct}
                      onChange={(e) => handleSharePctChange(e.target.value)}
                      placeholder="Share %"
                      style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                    />

                    <input
                      type="number"
                      value={linkShareVal}
                      onChange={(e) => setLinkShareVal(e.target.value)}
                      placeholder="Share Value (ETB)"
                      style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                    />

                    <button
                      type="submit"
                      disabled={savingLink}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 7,
                        border: 'none',
                        background: '#ea580c',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {savingLink ? 'Linking...' : '+ Link Partner'}
                    </button>
                  </div>
                </form>
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
            borderLeft: '5px solid #0284c7',
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