import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import TorClarificationChat from './TorClarificationChat'
import ProposalDocumentEditor from './ProposalDocumentEditor'

const STAGES = [
  { id: '1. TOR / RFP Identified', title: '1. TOR / RFP Identified', color: '#6366f1', badgeBg: '#e0e7ff', badgeText: '#4338ca' },
  { id: '2. Proposal In Defense', title: '2. Proposal In Defense', color: '#f59e0b', badgeBg: '#fef3c7', badgeText: '#b45309' },
  { id: '3. Contract Won / Signed', title: '3. Contract Won / Signed', color: '#10b981', badgeBg: '#d1fae5', badgeText: '#047857' },
  { id: '4. Delivery & Repeat Business', title: '4. Delivery & Repeat Business', color: '#8b5cf6', badgeBg: '#ede9fe', badgeText: '#6d28d9' },
]

const SAMPLE_CLIENTS = [
  { id: 'c1', name: 'awash bank', sbu: 'The i-Capital Institute', quarter: 'Q2', fit: 'Executive Advisory', industry: 'Enterprise', code: 'INST-2026-685', defaultValue: 1234567 },
  { id: 'c2', name: 'Dashen Bank', sbu: 'The i-Capital Institute', quarter: 'Q2', fit: 'Executive Advisory', industry: 'Banking', code: 'INST-2026-686', defaultValue: 3256700 },
  { id: 'c3', name: 'Commercial Bank of Ethiopia (CBE)', sbu: 'The i-Capital Institute', quarter: 'Q1', fit: 'Master Builder Leadership (MBL)', industry: 'Banking', code: 'INST-2026-687', defaultValue: 16000000 },
  { id: 'c4', name: 'MIDROC Mining', sbu: 'The i-Capital Institute', quarter: 'Q2', fit: 'Executive Advisory', industry: 'Mining / Industrial', code: 'INST-2026-688', defaultValue: 8200000 },
  { id: 'c5', name: 'Nib International Bank', sbu: 'The i-Capital Institute', quarter: 'Q1', fit: 'S-OJT, MBL & PRIME Staff Development', industry: 'Banking', code: 'INST-2026-689', defaultValue: 8500000 },
  { id: 'c6', name: 'Oromia Credit & Saving (OCSSCO)', sbu: 'The i-Capital Institute', quarter: 'Q1', fit: 'Institutional Transformation & Leadership', industry: 'Microfinance', code: 'INST-2026-690', defaultValue: 11000000 },
  { id: 'c7', name: 'Ethiopian Insurance Corporation (EIC)', sbu: 'The i-Capital Institute', quarter: 'Q1', fit: 'Executive Strategy Retainer', industry: 'Insurance', code: 'INST-2026-691', defaultValue: 11000000 },
  { id: 'c8', name: 'BGI Ethiopia Q1 Unit', sbu: 'The i-Capital Institute', quarter: 'Q1', fit: 'Sales Supervisory S-OJT', industry: 'FMCG', code: 'INST-2026-692', defaultValue: 8000000 },
  { id: 'c9', name: 'Bank of Abyssinia', sbu: 'The i-Capital Institute', quarter: 'Q2', fit: 'Executive Advisory', industry: 'Banking', code: 'INST-2026-693', defaultValue: 9500000 },
  { id: 'c10', name: 'Cooperative Bank of Oromia', sbu: 'The i-Capital Institute', quarter: 'Q2', fit: 'Executive Advisory', industry: 'Banking', code: 'INST-2026-694', defaultValue: 10200000 },
  { id: 'c11', name: 'Development Bank of Ethiopia (DBE)', sbu: 'The i-Capital Institute', quarter: 'Q2', fit: 'Executive Advisory', industry: 'Banking', code: 'INST-2026-695', defaultValue: 14000000 },
  { id: 'c12', name: 'Siinqee Bank', sbu: 'The i-Capital Institute', quarter: 'Q2', fit: 'Executive Advisory', industry: 'Banking', code: 'INST-2026-696', defaultValue: 7800000 },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('deals')
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sbuFilter, setSbuFilter] = useState('All')
  const [quarterFilter, setQuarterFilter] = useState('Q2')

  // Modals & Drawers State
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [showTorChat, setShowTorChat] = useState(false)
  const [showProposalStudio, setShowProposalStudio] = useState(false)
  const [convertModalClient, setConvertModalClient] = useState(null)
  const [proposalFormData, setProposalFormData] = useState({
    client: '',
    sbu: 'The i-Capital Institute',
    product: 'Executive Advisory',
    title: '',
    deal_value: 1500000,
    stage: '1. TOR / RFP Identified',
    deadline: '2026-10-30',
    notes: '',
  })

  // Stage Drawer Checklist State
  const [criteriaChecked, setCriteriaChecked] = useState({
    c1: false,
    c2: false,
    c3: false,
  })

  useEffect(() => {
    fetchOpportunities()

    // Realtime subscription for opportunities table updates
    const channel = supabase
      .channel('opportunities-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => {
        fetchOpportunities()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchOpportunities() {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        setDeals(data)
      } else {
        // Fallback default state if table is newly provisioned
        setDeals([
          {
            id: 'd-101',
            code: 'INST-2026-685',
            client: 'awash bank',
            sbu: 'Institute',
            title: 'awash bank Proposal',
            product: 'Executive Advisory',
            deal_value: 1234567,
            stage: '1. TOR / RFP Identified',
            deadline: '2026-10-22',
            notes: 'Official TOR parsed via AI Tender Engine.',
          },
          {
            id: 'd-102',
            code: 'DEAL-2026-002',
            client: 'Institutional Client',
            sbu: 'Institute',
            title: 'Master Builder Leadership (MBL) & S-OJT Engagement',
            product: 'Leadership Advisory',
            deal_value: 0,
            stage: '3. Contract Won / Signed',
            deadline: '2026-11-15',
            notes: 'Contract awarded; onboarding technical delivery experts.',
          },
        ])
      }
    } catch (err) {
      console.error('Error loading opportunities:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdvanceStage(e, deal) {
    e.stopPropagation()
    const currentIndex = STAGES.findIndex((s) => s.id === deal.stage)
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1].id
      await updateDealStage(deal.id, nextStage)
    }
  }

  async function updateDealStage(dealId, newStage) {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    )
    if (selectedDeal && selectedDeal.id === dealId) {
      setSelectedDeal((prev) => ({ ...prev, stage: newStage }))
    }

    try {
      await supabase
        .from('opportunities')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', dealId)
    } catch (err) {
      console.error('Failed to update stage:', err)
    }
  }

  async function handleDeleteDeal(dealId) {
    if (!window.confirm('Are you sure you want to delete this proposal opportunity?')) return
    setDeals((prev) => prev.filter((d) => d.id !== dealId))
    setSelectedDeal(null)

    try {
      await supabase.from('opportunities').delete().eq('id', dealId)
    } catch (err) {
      console.error('Failed to delete deal:', err)
    }
  }

  function openConvertModal(client) {
    setConvertModalClient(client)
    setProposalFormData({
      client: client.name,
      sbu: client.sbu || 'The i-Capital Institute',
      product: client.fit || 'Executive Advisory',
      title: `${client.name} Proposal`,
      deal_value: client.defaultValue || 1500000,
      stage: '1. TOR / RFP Identified',
      deadline: '2026-10-30',
      notes: `Target account mapped from Strategic Client Directory (${client.quarter}).`,
    })
  }

  async function handleSaveNewProposal(e) {
    e.preventDefault()
    const newCode = `INST-2026-${Math.floor(100 + Math.random() * 900)}`
    const payload = {
      code: newCode,
      client: proposalFormData.client,
      client_name: proposalFormData.client,
      sbu: proposalFormData.sbu.includes('Institute') ? 'Institute' : proposalFormData.sbu,
      product: proposalFormData.product,
      title: proposalFormData.title || `${proposalFormData.client} Proposal`,
      deal_value: Number(proposalFormData.deal_value) || 0,
      stage: proposalFormData.stage || '1. TOR / RFP Identified',
      deadline: proposalFormData.deadline || null,
      submission_deadline: proposalFormData.deadline || null,
      notes: proposalFormData.notes,
      commercial_owner: 'ybeltalsemagn8899@gmail.com',
      alert_48h_sent: false,
    }

    // Optimistic UI update
    const optimisticDeal = { ...payload, id: `temp-${Date.now()}` }
    setDeals((prev) => [optimisticDeal, ...prev])
    setConvertModalClient(null)

    try {
      const { data, error } = await supabase.from('opportunities').insert([payload]).select()
      if (error) {
        console.error('Error inserting proposal:', error.message)
      } else if (data && data[0]) {
        setDeals((prev) => prev.map((d) => (d.id === optimisticDeal.id ? data[0] : d)))
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Filter deals
  const filteredDeals = deals.filter((d) => {
    const matchSearch =
      (d.client || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchSbu = sbuFilter === 'All' || (d.sbu || '').toLowerCase() === sbuFilter.toLowerCase()
    return matchSearch && matchSbu
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Corporate Brand Header */}
      <header
        style={{
          background: 'linear-gradient(90deg, #070d1e 0%, #0f172a 60%, #172554 100%)',
          padding: '12px 28px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 16,
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
            }}
          >
            iC
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.4px' }}>THE i-CAPITAL CRM</span>
              <span style={{ fontSize: 9, fontWeight: 800, background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>
                ● LIVE GOVERNANCE
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Group Commercial Intelligence &amp; Multi-SBU Pipeline Tracker
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              fontSize: 11,
              background: 'rgba(255,255,255,0.08)',
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1',
            }}
          >
            VIEW: <strong style={{ color: '#fff' }}>🏛️ Executive Admin (Group)</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              Y
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: 11, fontWeight: 800 }}>ybeltalsemagn8899</div>
              <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 800 }}>ADMIN</span>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-header Banner & Quick Actions */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Welcome back, ybeltalsemagn8899</h2>
            <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
              Developed by Ybeltal Semagn
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            The i-Capital Africa Group • Commercial Governance &amp; Revenue Operations Platform
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => alert('AI Tender Parser Engine active. Drag and drop any TOR / RFP PDF to auto-extract scopes.')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#0284c7',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>✨</span> AI Tender Parser
          </button>
          <button
            type="button"
            onClick={() => openConvertModal({ name: 'Commercial Target', sbu: 'The i-Capital Institute', quarter: 'Q2', defaultValue: 2500000 })}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#ea580c',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            + New Proposal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            + New Lead
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{ padding: '16px 28px 0 28px', display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0' }}>
        {[
          { id: 'deals', label: '📊 Deals & Proposals', badge: deals.length },
          { id: 'clients', label: '🏛️ Client Directory', badge: '184 Mapped' },
          { id: 'leads', label: '🎯 Lead Intake', badge: 'Active' },
          { id: 'dashboard', label: '📈 Executive Dashboard' },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: isActive ? '#0284c7' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                borderRadius: '8px 8px 0 0',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 10,
                    background: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    color: isActive ? '#fff' : '#475569',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      <main style={{ padding: '24px 28px' }}>
        {/* VIEW 1: DEALS & PROPOSALS KANBAN */}
        {activeTab === 'deals' && (
          <div>
            {/* Filter Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select
                  value={sbuFilter}
                  onChange={(e) => setSbuFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontWeight: 700,
                    background: '#fff',
                  }}
                >
                  <option value="All">All Business Units (Institute, CBS, IIP, DAS)</option>
                  <option value="Institute">The i-Capital Institute</option>
                  <option value="CBS">Corporate Business Solutions (CBS)</option>
                  <option value="IIP">Investment Platform (IIP)</option>
                </select>

                <input
                  type="text"
                  placeholder="Search institution, proposal, code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    width: 280,
                    background: '#fff',
                  }}
                />
              </div>

              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>
                Active Commercial Deals: <span style={{ color: '#0f172a' }}>{filteredDeals.length}</span>
              </div>
            </div>

            {/* Kanban Columns Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 18,
                alignItems: 'start',
              }}
            >
              {STAGES.map((stg) => {
                const stageDeals = filteredDeals.filter((d) => (d.stage || '').trim() === stg.id)
                const totalStageValue = stageDeals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0)

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
                      minHeight: 480,
                    }}
                  >
                    {/* Stage Header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{stg.title}</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: stg.badgeBg,
                            color: stg.badgeText,
                          }}
                        >
                          {stageDeals.length}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginTop: 4 }}>
                        ETB {new Intl.NumberFormat('en-US').format(totalStageValue)}
                      </div>
                    </div>

                    {/* Cards Container */}
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                      {stageDeals.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: 12 }}>
                          No proposals in this stage
                        </div>
                      ) : (
                        stageDeals.map((deal) => (
                          <div
                            key={deal.id}
                            onClick={() => setSelectedDeal(deal)}
                            style={{
                              background: '#ffffff',
                              borderRadius: 10,
                              border: '1px solid #e2e8f0',
                              padding: 14,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)'
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none'
                              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 900, color: '#0284c7' }}>
                                {deal.code || 'DEAL'}
                              </span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#64748b',
                                  background: '#f1f5f9',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {deal.sbu || 'Institute'}
                              </span>
                            </div>

                            <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                              {deal.client || deal.client_name || 'Strategic Client'}
                            </div>

                            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.3 }}>
                              {deal.title || deal.product || 'Proposal Mandate'}
                            </div>

                            <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', marginTop: 4 }}>
                              ETB {new Intl.NumberFormat('en-US').format(deal.deal_value || 0)}
                            </div>

                            {deal.deadline && (
                              <div style={{ fontSize: 10, fontWeight: 800, color: '#dc2626' }}>
                                ⏰ Deadline: {deal.deadline}
                              </div>
                            )}

                            {/* Card Footer Actions */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: '1px solid #f1f5f9',
                                paddingTop: 8,
                                marginTop: 6,
                              }}
                            >
                              <div style={{ display: 'flex', gap: 6 }}>
                                {/* 1-Click TOR Chat Trigger */}
                                <button
                                  type="button"
                                  title="Open Live TOR Chat"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedDeal(deal)
                                    setShowTorChat(true)
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #bae6fd',
                                    background: '#f0f9ff',
                                    color: '#0284c7',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  💬 Chat
                                </button>

                                {/* 1-Click Proposal Studio Trigger */}
                                <button
                                  type="button"
                                  title="Open Proposal Studio"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedDeal(deal)
                                    setShowProposalStudio(true)
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  📋 Studio
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleAdvanceStage(e, deal)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  fontSize: 11,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                Advance →
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: STRATEGIC CLIENT DIRECTORY */}
        {activeTab === 'clients' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Strategic Client Directory</h3>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Consolidated target-account pathway mapped across all 4 SBUs and strategic program routes.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {['All Quarters', 'Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuarterFilter(q)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: quarterFilter === q ? '#0284c7' : '#fff',
                      color: quarterFilter === q ? '#fff' : '#0f172a',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {SAMPLE_CLIENTS.filter(
                (c) => quarterFilter === 'All Quarters' || c.quarter === quarterFilter
              ).map((client) => (
                <div
                  key={client.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    padding: 16,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#ea580c', textTransform: 'uppercase' }}>
                        Target {client.quarter}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                        Institute
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 900 }}>{client.name}</h4>
                    <div style={{ fontSize: 11, color: '#475569' }}>Service Fit: <strong>{client.fit}</strong></div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Industry: {client.industry}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => openConvertModal(client)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#0284c7',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      + Proposal
                    </button>
                    <button
                      type="button"
                      onClick={() => alert(`Lead registered for ${client.name} in Lead Intake pipeline.`)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Lead
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: LEAD INTAKE */}
        {activeTab === 'leads' && (
          <div style={{ background: '#ffffff', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 900 }}>Direct Lead Intake &amp; Qualification Pipeline</h3>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Active institutional inbound inquiries and prospective stakeholder engagements awaiting pre-qualification and conversion into formal bidding dossiers.
            </p>
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={() => openConvertModal({ name: 'New Inbound Enterprise Target', sbu: 'The i-Capital Institute', quarter: 'Q2', defaultValue: 1800000 })}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0284c7',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                + Register New Corporate Lead
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: EXECUTIVE DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>TOTAL ACTIVE PIPELINE VALUE</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>
                ETB {new Intl.NumberFormat('en-US').format(deals.reduce((acc, d) => acc + (Number(d.deal_value) || 0), 0))}
              </div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>ACTIVE BIDDING DOSSIERS</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0284c7', marginTop: 8 }}>{deals.length}</div>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>AUTONOMOUS WATCHDOG STATUS</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981', marginTop: 8 }}>● Cloud Runner Active</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Next scan: 08:00 AM / 02:00 PM EAT</div>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT-SIDE SLIDE-OUT DEAL STAGE & CRITERIA DRAWER */}
      {selectedDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            zIndex: 99990,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedDeal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              height: '100%',
              background: '#ffffff',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#0284c7' }}>
                      {selectedDeal.code || 'DEAL'}
                    </span>
                    <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                      {selectedDeal.sbu || 'Institute'}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                    {selectedDeal.client || selectedDeal.client_name}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {selectedDeal.title || selectedDeal.product}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDeal(null)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
                >
                  ✕
                </button>
              </div>

              {/* ACTION BUTTONS FOR TOR CHAT AND PROPOSAL STUDIO */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '20px 0' }}>
                <button
                  type="button"
                  onClick={() => setShowTorChat(true)}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  <span>💬</span> Live TOR Chat
                </button>

                <button
                  type="button"
                  onClick={() => setShowProposalStudio(true)}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span>📋</span> Proposal Studio
                </button>
              </div>

              {/* Move Stage Section */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  MOVE STAGE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {STAGES.map((stg) => {
                    const isCurrent = (selectedDeal.stage || '').trim() === stg.id
                    return (
                      <div
                        key={stg.id}
                        onClick={() => updateDealStage(selectedDeal.id, stg.id)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: isCurrent ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                          background: isCurrent ? '#f0f9ff' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#0284c7' : '#334155' }}>
                          {stg.title}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#0284c7' : '#94a3b8' }}>
                          {isCurrent ? 'Current' : 'Set →'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Stage Criteria Checklist */}
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  STAGE CRITERIA
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={criteriaChecked.c1}
                      onChange={(e) => setCriteriaChecked({ ...criteriaChecked, c1: e.target.checked })}
                    />
                    Official TOR / RFP document uploaded and parsed via AI
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={criteriaChecked.c2}
                      onChange={(e) => setCriteriaChecked({ ...criteriaChecked, c2: e.target.checked })}
                    />
                    Strategic SBU fit confirmed (Institute, CBS, IIP, DAS)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={criteriaChecked.c3}
                      onChange={(e) => setCriteriaChecked({ ...criteriaChecked, c3: e.target.checked })}
                    />
                    Submission deadline logged in calendar
                  </label>
                </div>
              </div>

              {/* Deal Value & Deadline Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 22 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>DEAL VALUE</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#166534', marginTop: 4 }}>
                    ETB {new Intl.NumberFormat('en-US').format(selectedDeal.deal_value || 0)}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>DEADLINE</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#dc2626', marginTop: 4 }}>
                    {selectedDeal.deadline || '2026-10-30'}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => handleDeleteDeal(selectedDeal.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>

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
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE FORMAL PROPOSAL MODAL */}
      {convertModalClient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 99995,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setConvertModalClient(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: '640px',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                Convert to Proposal: {convertModalClient.name}
              </h3>
              <button
                type="button"
                onClick={() => setConvertModalClient(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f0f9ff', padding: '8px 12px', borderRadius: 6, fontSize: 11, color: '#0369a1', marginBottom: 16 }}>
              ⚡ Converting account: <strong>{convertModalClient.name}</strong> (will register in active pipeline)
            </div>

            <form onSubmit={handleSaveNewProposal} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Client Account *
                  </label>
                  <input
                    type="text"
                    required
                    value={proposalFormData.client}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, client: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Strategic Business Unit (SBU) *
                  </label>
                  <select
                    value={proposalFormData.sbu}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, sbu: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  >
                    <option value="The i-Capital Institute">The i-Capital Institute</option>
                    <option value="Corporate Business Solutions">Corporate Business Solutions (CBS)</option>
                    <option value="Investment Platform">Investment Platform (IIP)</option>
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
                    value={proposalFormData.product}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, product: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Proposal Title / Mandate Scope
                  </label>
                  <input
                    type="text"
                    value={proposalFormData.title}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, title: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Deal Value (ETB)
                  </label>
                  <input
                    type="number"
                    value={proposalFormData.deal_value}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, deal_value: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Pipeline Target Stage
                  </label>
                  <select
                    value={proposalFormData.stage}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, stage: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Submission Deadline
                  </label>
                  <input
                    type="date"
                    value={proposalFormData.deadline}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, deadline: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Notes &amp; Scope Requirements
                </label>
                <textarea
                  rows={3}
                  value={proposalFormData.notes}
                  onChange={(e) => setProposalFormData({ ...proposalFormData, notes: e.target.value })}
                  placeholder="Deliverables, scope notes, or AI extraction metadata..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setConvertModalClient(null)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#ea580c',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Save &amp; Register Deal →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OUT REALTIME TOR CLARIFICATION DRAWER */}
      <TorClarificationChat
        isOpen={showTorChat}
        onClose={() => setShowTorChat(false)}
        opportunityId={selectedDeal?.id}
        tenderCode={selectedDeal?.code || 'TENDER'}
        clientName={selectedDeal?.client || selectedDeal?.client_name || 'Client Target'}
        currentUserEmail="ybeltalsemagn8899@gmail.com"
        currentUserName="Ybeltal Semagn"
      />

      {/* FULL PROPOSAL DOCUMENT EDITOR STUDIO */}
      {showProposalStudio && (
        <ProposalDocumentEditor
          proposal={selectedDeal}
          onClose={() => setShowProposalStudio(false)}
          onSave={() => {
            fetchOpportunities()
            setShowProposalStudio(false)
          }}
        />
      )}
    </div>
  )
}