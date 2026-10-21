import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

const STATUS_PIPELINE = [
  { id: 'New Inquiry', label: 'New Inquiry', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  { id: 'Follow-up in Progress', label: 'Follow-up in Progress', bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  { id: 'Qualified Lead', label: 'Qualified Lead', bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  { id: 'Meeting Booked', label: 'Meeting Booked', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  { id: 'Converted Opportunity', label: 'Converted Opportunity', bg: '#d1fae5', text: '#047857', border: '#a7f3d0' },
  { id: 'Nurture', label: 'Nurture', bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  { id: 'Disqualified', label: 'Disqualified', bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
]

export default function DigitalMarketingLeads({ onConvertToProposal }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState('register') // 'register' | 'campaigns' | 'status' | 'dashboard'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedLead, setSelectedLead] = useState(null)

  // Quick Inline Status Update State
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    fetchMarketingLeads()

    // Realtime listener for incoming Google Form webhook entries
    const channel = supabase
      .channel('marketing-leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_leads' }, () => {
        fetchMarketingLeads()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchMarketingLeads() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('marketing_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setLeads(data)
      }
    } catch (err) {
      console.error('Error fetching marketing leads:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(leadId, newStatus) {
    setUpdatingId(leadId)
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l))
    )

    try {
      await supabase
        .from('marketing_leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId)
    } catch (err) {
      console.error('Failed to update lead status:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleUpdateNextAction(leadId, nextAction, nextDate) {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, next_action: nextAction, next_action_date: nextDate } : l))
    )

    try {
      await supabase
        .from('marketing_leads')
        .update({
          next_action: nextAction,
          next_action_date: nextDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
    } catch (err) {
      console.error('Error saving next action:', err)
    }
  }

  // Dashboard Aggregates
  const totalInquiries = leads.length
  const awaitingFollowup = leads.filter((l) => l.status === 'New Inquiry').length
  const inProgressCount = leads.filter((l) => l.status === 'Follow-up in Progress').length
  const qualifiedCount = leads.filter((l) => l.status === 'Qualified Lead' || l.status === 'Meeting Booked').length
  const convertedCount = leads.filter((l) => l.status === 'Converted Opportunity').length
  const conversionRate = totalInquiries > 0 ? ((convertedCount / totalInquiries) * 100).toFixed(1) : '0.0'

  // Campaign & Source Grouping
  const sourceStats = leads.reduce((acc, lead) => {
    const src = lead.source_channel || 'Direct Inbound'
    acc[src] = (acc[src] || 0) + 1
    return acc
  }, {})

  const serviceStats = leads.reduce((acc, lead) => {
    const svc = lead.service_of_interest || 'General Inquiries'
    acc[svc] = (acc[svc] || 0) + 1
    return acc
  }, {})

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    const term = search.toLowerCase()
    const matchesSearch =
      (l.full_name || '').toLowerCase().includes(term) ||
      (l.organization || '').toLowerCase().includes(term) ||
      (l.work_email || '').toLowerCase().includes(term) ||
      (l.service_of_interest || '').toLowerCase().includes(term) ||
      (l.campaign_name || '').toLowerCase().includes(term)

    const matchesStatus = statusFilter === 'All' || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* 4-PART MENU NAVIGATION BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'register', label: '👤 Lead Register' },
            { id: 'campaigns', label: '🎯 Campaign & Source Tracking' },
            { id: 'status', label: '⚡ Lead Status & Follow-up' },
            { id: 'dashboard', label: '📊 Digital Marketing Dashboard' },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? '#0284c7' : 'transparent',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: 12,
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 700,
              background: '#fff',
              color: '#0f172a',
            }}
          >
            <option value="All">All Pipeline Statuses</option>
            {STATUS_PIPELINE.map((stg) => (
              <option key={stg.id} value={stg.id}>{stg.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search prospect, org, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              width: 240,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* PART 1: LEAD REGISTER */}
      {activeSubTab === 'register' && (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                Inbound Prospect Register (Single Record Per Lead)
              </h3>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Captured automatically via Google Forms &amp; Landing Page Webhooks[cite: 17, 18]
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6 }}>
              {filteredLeads.length} Total Records
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', fontWeight: 800 }}>
                  <th style={{ padding: '12px 16px' }}>PROSPECT &amp; CONTACT</th>
                  <th style={{ padding: '12px 16px' }}>ORGANIZATION &amp; TITLE</th>
                  <th style={{ padding: '12px 16px' }}>SERVICE OF INTEREST[cite: 17, 18]</th>
                  <th style={{ padding: '12px 16px' }}>PREFERRED NEXT STEP[cite: 18]</th>
                  <th style={{ padding: '12px 16px' }}>PIPELINE STATUS</th>
                  <th style={{ padding: '12px 16px' }}>INQUIRY DATE[cite: 17]</th>
                  <th style={{ padding: '12px 16px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      Streaming inbound marketing records from Supabase…
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📬</div>
                      <strong>No marketing inquiries match the current filter.</strong>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        Submissions from your Google Form will appear here in real time.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const statusMeta = STATUS_PIPELINE.find((s) => s.id === lead.status) || STATUS_PIPELINE[0]
                    return (
                      <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{lead.full_name}</div>
                          <div style={{ fontSize: 11, color: '#0284c7', marginTop: 2 }}>{lead.work_email}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{lead.organization}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{lead.job_title || 'Lead Contact'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: 220 }}>
                          <div style={{ color: '#1e293b', fontWeight: 600 }}>{lead.service_of_interest}</div>
                          {lead.needs_description && (
                            <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 3 }}>
                              "{lead.needs_description.slice(0, 60)}{lead.needs_description.length > 60 ? '…' : ''}"
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#f0f9ff', padding: '3px 8px', borderRadius: 6, border: '1px solid #bae6fd' }}>
                            {lead.preferred_next_step || 'Request consultation'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <select
                            disabled={updatingId === lead.id}
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              background: statusMeta.bg,
                              color: statusMeta.text,
                              border: `1px solid ${statusMeta.border}`,
                              cursor: 'pointer',
                            }}
                          >
                            {STATUS_PIPELINE.map((stg) => (
                              <option key={stg.id} value={stg.id}>{stg.label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 11 }}>
                          {new Date(lead.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <button
                            type="button"
                            title="Convert to Bidding Pipeline Deal"
                            onClick={() => {
                              onConvertToProposal?.({
                                client: lead.organization,
                                name: lead.organization,
                                title: `${lead.organization} - ${lead.service_of_interest}`,
                                product: lead.service_of_interest,
                                notes: `Lead captured via Digital Marketing. Contact: ${lead.full_name} (${lead.work_email}, ${lead.job_title}). Inquiry: ${lead.needs_description || 'None'}. Next step requested: ${lead.preferred_next_step}`,
                              })
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: 'none',
                              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Convert to Deal →
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PART 2: CAMPAIGN AND SOURCE TRACKING */}
      {activeSubTab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
                Inbound Source Channels[cite: 17]
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(sourceStats).map(([src, count]) => {
                  const pct = totalInquiries > 0 ? ((count / totalInquiries) * 100).toFixed(0) : 0
                  return (
                    <div key={src}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: '#334155' }}>{src}</span>
                        <span style={{ color: '#0284c7' }}>{count} leads ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#0284c7' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
                Demand by Service Area[cite: 17, 18]
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(serviceStats).map(([svc, count]) => {
                  const pct = totalInquiries > 0 ? ((count / totalInquiries) * 100).toFixed(0) : 0
                  return (
                    <div key={svc}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: '#334155', maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {svc}
                        </span>
                        <span style={{ color: '#16a34a' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#16a34a' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Campaign Reference List */}
          <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
              Active Campaign Registry &amp; Performance Comparison[cite: 17]
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[
                { name: 'Executive Leadership Q2 Push', channel: 'LinkedIn Sponsored', id: 'LI-MBL-2026' },
                { name: 'AfCFTA Cross-Border Trade Webinar', channel: 'Telegram & Direct Email', id: 'CBS-TRADE-02' },
                { name: 'Corporate Governance Advisory', channel: 'Website Direct Inbound', id: 'WEB-INBOUND-01' },
                { name: 'Capital Markets Readiness Briefing', channel: 'Executive Outreach / Meta', id: 'IIP-CMR-26' },
              ].map((camp) => {
                const count = leads.filter((l) => (l.campaign_name || '').toLowerCase() === camp.name.toLowerCase()).length
                return (
                  <div key={camp.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                      {camp.id}
                    </span>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', marginTop: 6 }}>{camp.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{camp.channel}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#0284c7', marginTop: 10 }}>
                      {count} Captured Inquiries
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* PART 3: LEAD STATUS AND FOLLOW-UP */}
      {activeSubTab === 'status' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' }}>
          {STATUS_PIPELINE.slice(0, 5).map((col) => {
            const colLeads = filteredLeads.filter((l) => l.status === col.id)
            return (
              <div
                key={col.id}
                style={{
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  borderTop: `4px solid ${col.text}`,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 460,
                }}
              >
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{col.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, background: col.bg, color: col.text, padding: '2px 6px', borderRadius: 10 }}>
                    {colLeads.length}
                  </span>
                </div>

                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {colLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: 11 }}>
                      No prospects in this stage
                    </div>
                  ) : (
                    colLeads.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          padding: 12,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{item.full_name}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>{item.organization}</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>{item.service_of_interest}</div>

                        {/* Owner & Next Action Block[cite: 17] */}
                        <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 6, padding: '6px 8px', marginTop: 4 }}>
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            Owner: <strong style={{ color: '#0f172a' }}>{item.assigned_to?.split('@')[0] || 'BD Team'}</strong>[cite: 17]
                          </div>
                          <div style={{ fontSize: 10, color: '#166534', fontWeight: 700, marginTop: 2 }}>
                            Next: {item.next_action || 'Introductory qualification'}[cite: 17]
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              padding: '2px 4px',
                              background: '#fff',
                            }}
                          >
                            {STATUS_PIPELINE.map((stg) => (
                              <option key={stg.id} value={stg.id}>{stg.label}</option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              onConvertToProposal?.({
                                client: item.organization,
                                name: item.organization,
                                title: `${item.organization} - ${item.service_of_interest}`,
                                product: item.service_of_interest,
                                notes: `Converted from inbound lead: ${item.full_name} (${item.work_email}). Scope: ${item.needs_description || 'Direct request'}`,
                              })
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ea580c',
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            Convert →
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
      )}

      {/* PART 4: DIGITAL MARKETING DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL INQUIRIES[cite: 17]</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 6 }}>{totalInquiries}</div>
              <div style={{ fontSize: 11, color: '#0284c7', marginTop: 4 }}>Inbound digital inquiries captured[cite: 17]</div>
            </div>

            <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>AWAITING FOLLOW-UP[cite: 17]</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#ea580c', marginTop: 6 }}>{awaitingFollowup}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>New leads pending initial contact[cite: 17]</div>
            </div>

            <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>QUALIFIED &amp; MEETINGS[cite: 17]</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#6d28d9', marginTop: 6 }}>{qualifiedCount}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Exploratory sessions scheduled[cite: 17]</div>
            </div>

            <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>DEAL CONVERSION RATE[cite: 17]</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#166534', marginTop: 6 }}>{conversionRate}%</div>
              <div style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>{convertedCount} proposals registered in CRM[cite: 17]</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}