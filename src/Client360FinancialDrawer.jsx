import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Client360FinancialDrawer({
  isOpen,
  client,
  onClose,
  onOpenProposal,
}) {
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState([])
  const [opportunities, setOpportunities] = useState([])

  // New Contact Form State
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({
    full_name: '',
    job_title: '',
    email: '',
    phone: '',
    is_primary: false,
  })

  useEffect(() => {
    if (isOpen && client) {
      loadClientRecord()
    }
  }, [isOpen, client])

  async function loadClientRecord() {
    setLoading(true)
    try {
      const clientName = client.name || client.client || client.client_name

      // 1. Fetch all institutional contacts
      const { data: contactData } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', client.id)
        .order('is_primary_decision_maker', { ascending: false })

      // 2. Fetch all child opportunities/proposals for this client
      const { data: oppsData } = await supabase
        .from('opportunities')
        .select('*')
        .or(`client_id.eq.${client.id},client.ilike.%${clientName}%,client_name.ilike.%${clientName}%`)
        .order('created_at', { ascending: false })

      setContacts(contactData || [])
      setOpportunities(oppsData || [])
    } catch (err) {
      console.error('Error loading Client 360 data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddContact(e) {
    e.preventDefault()
    try {
      const payload = {
        client_id: client.id,
        full_name: newContact.full_name,
        job_title: newContact.job_title,
        email: newContact.email,
        phone: newContact.phone,
        is_primary_decision_maker: newContact.is_primary,
      }
      const { data, error } = await supabase.from('client_contacts').insert([payload]).select()
      if (!error && data) {
        setContacts([data[0], ...contacts])
        setShowAddContact(false)
        setNewContact({ full_name: '', job_title: '', email: '', phone: '', is_primary: false })
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (!isOpen || !client) return null

  // Calculate Separate Financial Tiers
  const totalSubmitted = opportunities.reduce((sum, o) => sum + (Number(o.submitted_proposal_value) || Number(o.deal_value) || 0), 0)
  const totalWeighted = opportunities.reduce((sum, o) => sum + (Number(o.weighted_forecast_value) || (Number(o.deal_value || 0) * 0.3)), 0)
  const totalAwarded = opportunities.reduce((sum, o) => sum + (Number(o.awarded_contract_value) || 0), 0)
  const totalRecognized = opportunities.reduce((sum, o) => sum + (Number(o.recognized_revenue) || 0), 0)
  const totalCashCollected = opportunities.reduce((sum, o) => sum + (Number(o.cash_collected) || 0), 0)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        zIndex: 99990,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '740px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: '#070d1e', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, background: '#0284c7', padding: '2px 8px', borderRadius: 6 }}>
                SINGLE SOURCE OF TRUTH
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Account ID: {client.id || 'ACC-REF'}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{client.name || client.client}</h2>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Sector: <strong>{client.sector || client.industry || 'Corporate'}</strong> • Tier: <strong>{client.tier || 'Enterprise'}</strong>
            </div>
          </div>

          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {/* FINANCIAL ACCOUNTING LEDGER (Strict Separation of Metrics) */}
        <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: 12 }}>
            Commercial Financial Ledger (Independent Measures)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b' }}>SUBMITTED PROPOSALS</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                ETB {new Intl.NumberFormat('en-US').format(totalSubmitted)}
              </div>
              <div style={{ fontSize: 9, color: '#0284c7' }}>Face Value of Bids</div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b' }}>WEIGHTED FORECAST</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0284c7', marginTop: 2 }}>
                ETB {new Intl.NumberFormat('en-US').format(Math.round(totalWeighted))}
              </div>
              <div style={{ fontSize: 9, color: '#64748b' }}>Risk-Adjusted P%</div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#166534' }}>AWARDED CONTRACTS</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#166534', marginTop: 2 }}>
                ETB {new Intl.NumberFormat('en-US').format(totalAwarded)}
              </div>
              <div style={{ fontSize: 9, color: '#166534' }}>Signed Legal Sum</div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#1d4ed8' }}>RECOGNIZED REVENUE</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#1d4ed8', marginTop: 2 }}>
                ETB {new Intl.NumberFormat('en-US').format(totalRecognized)}
              </div>
              <div style={{ fontSize: 9, color: '#1d4ed8' }}>Delivery Invoiced</div>
            </div>

            <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#be185d' }}>CASH COLLECTED</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#be185d', marginTop: 2 }}>
                ETB {new Intl.NumberFormat('en-US').format(totalCashCollected)}
              </div>
              <div style={{ fontSize: 9, color: '#be185d' }}>Settled Bank Funds</div>
            </div>
          </div>
        </div>

        {/* BODY: CONTACTS & OPPORTUNITIES */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 1: Institutional Decision Makers */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                Key Decision Makers &amp; Procurement Contacts ({contacts.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddContact(!showAddContact)}
                style={{ fontSize: 11, fontWeight: 800, color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showAddContact ? '✕ Cancel' : '+ Add Stakeholder Contact'}
              </button>
            </div>

            {showAddContact && (
              <form onSubmit={handleAddContact} style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={newContact.full_name}
                    onChange={(e) => setNewContact({ ...newContact, full_name: e.target.value })}
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11 }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Job Title / Position *"
                    value={newContact.job_title}
                    onChange={(e) => setNewContact({ ...newContact, job_title: e.target.value })}
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    type="email"
                    required
                    placeholder="Work Email *"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11 }}
                  />
                  <input
                    type="text"
                    placeholder="Phone (Optional)"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11 }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={newContact.is_primary}
                      onChange={(e) => setNewContact({ ...newContact, is_primary: e.target.checked })}
                    />
                    Primary Procurement Decision Maker
                  </label>
                  <button type="submit" style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#0284c7', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                    Save Contact
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {contacts.length === 0 ? (
                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No client contacts linked yet.</div>
              ) : (
                contacts.map((c) => (
                  <div key={c.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 12, color: '#0f172a' }}>{c.full_name}</strong>
                      {c.is_primary_decision_maker && (
                        <span style={{ fontSize: 9, fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4 }}>
                          ★ PRIMARY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{c.job_title}</div>
                    <div style={{ fontSize: 10, color: '#0284c7' }}>{c.email} • {c.phone || 'No phone'}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: All Linked Opportunities & Engagements */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
              Linked Opportunities, Proposals &amp; Engagements ({opportunities.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {opportunities.length === 0 ? (
                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No commercial proposals linked to this client.</div>
              ) : (
                opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    onClick={() => onOpenProposal?.(opp)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#0284c7' }}>{opp.code || 'DEAL'}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                          {opp.sbu || 'Institute'}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#166534' }}>{opp.stage}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                        {opp.title || opp.product}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                        Owner: <strong>{opp.commercial_owner_email || 'Unassigned'}</strong> • Next: <strong>{opp.next_action}</strong> ({opp.next_action_due_date || 'No due date'})
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                        ETB {new Intl.NumberFormat('en-US').format(opp.submitted_proposal_value || opp.deal_value || 0)}
                      </div>
                      <span style={{ fontSize: 10, color: '#0284c7', fontWeight: 700 }}>Open Details →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}