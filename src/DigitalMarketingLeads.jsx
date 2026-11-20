/**
 * THE i-CAPITAL AFRICA INSTITUTE — DIGITAL MARKETING LEADS MODULE
 * Complete Inbound Prospect Register with Working "Convert to Deal ->" Modal,
 * Live Status Updates, Campaign Source Tracking & Clean Headers
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabaseAuthClient } from './utils/sessionSecurity';

const DM_STYLES = `
  .dm-wrap {
    font-family: 'Century Gothic', 'Plus Jakarta Sans', -apple-system, sans-serif;
    color: #1e293b;
    padding: 20px 24px 48px;
    max-width: 1440px;
    margin: 0 auto;
  }
  .dm-subnav {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }
  .dm-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .dm-tab {
    border: none;
    background: transparent;
    color: #475569;
    padding: 8px 14px;
    border-radius: 9px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .dm-tab.active {
    background: #0284c7;
    color: #ffffff;
  }
  .dm-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .dm-select, .dm-search {
    padding: 8px 12px;
    border-radius: 9px;
    border: 1px solid #cbd5e1;
    font-size: 12.5px;
    background: #ffffff;
    color: #1e293b;
    outline: none;
  }
  .dm-search {
    min-width: 230px;
  }
  .dm-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 22px 24px;
    box-shadow: 0 2px 12px rgba(37, 62, 94, 0.05);
  }
  .dm-card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 18px;
  }
  .dm-title {
    font-size: 17px;
    font-weight: 800;
    color: #253E5E;
    margin: 0;
  }
  .dm-sub {
    font-size: 12px;
    color: #64748b;
    margin: 3px 0 0 0;
  }
  .dm-badge-total {
    background: #e0f2fe;
    color: #0369a1;
    font-size: 11.5px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 999px;
  }
  .dm-table-wrap {
    overflow-x: auto;
  }
  .dm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  .dm-table th {
    text-align: left;
    padding: 11px 12px;
    border-bottom: 1.5px solid #e2e8f0;
    color: #475569;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .dm-table td {
    padding: 14px 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .dm-step-pill {
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    padding: 4px 10px;
    border-radius: 7px;
    font-size: 11.5px;
    font-weight: 600;
  }
  .dm-status-select {
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid #cbd5e1;
    cursor: pointer;
  }
  .dm-convert-btn {
    background: #ea580c;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 3px 10px rgba(234, 88, 12, 0.25);
    transition: background 0.15s ease;
  }
  .dm-convert-btn:hover {
    background: #c2410c;
  }
  .dm-converted-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 700;
  }
  .dm-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 9999;
  }
  .dm-modal {
    background: #ffffff;
    border-radius: 16px;
    width: 100%;
    max-width: 530px;
    padding: 26px 28px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    border-top: 5px solid #F78019;
  }
  .dm-form-group {
    margin-bottom: 14px;
  }
  .dm-form-label {
    display: block;
    font-size: 11.5px;
    font-weight: 700;
    color: #253E5E;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .dm-form-input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1.5px solid #cbd5e1;
    font-size: 13.5px;
    color: #0f172a;
    box-sizing: border-box;
  }
  .dm-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #253E5E;
    color: #ffffff;
    border-left: 5px solid #F78019;
    padding: 14px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    z-index: 10000;
  }
`;

function detectSbuFromService(serviceText) {
  const s = String(serviceText || '').toLowerCase();
  if (s.includes('ai') || s.includes('digital') || s.includes('software')) return 'DAS';
  if (s.includes('bond') || s.includes('invest') || s.includes('capital market')) return 'IIP';
  if (s.includes('strategy') || s.includes('restructur') || s.includes('ifrs')) return 'CBS';
  return 'INST';
}

function getStatusColors(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('convert')) {
    return { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
  }
  if (s.includes('progress') || s.includes('contact')) {
    return { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' };
  }
  if (s.includes('qualif')) {
    return { backgroundColor: '#e0e7ff', color: '#3730a3', borderColor: '#a5b4fc' };
  }
  return { backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc' };
}

export default function DigitalMarketingLeads({ onConvertToDeal, onRefresh }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDealsTable, setActiveDealsTable] = useState('opportunities');
  const [subTab, setSubTab] = useState('register');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Conversion Modal States
  const [convertingLead, setConvertingLead] = useState(null);
  const [dealTitle, setDealTitle] = useState('');
  const [dealClient, setDealClient] = useState('');
  const [dealSbu, setDealSbu] = useState('INST');
  const [dealValue, setDealValue] = useState('');
  const [dealStage, setDealStage] = useState('Stage 1: TOR / Opportunity Identified');
  const [alsoCreateLeadIntake, setAlsoCreateLeadIntake] = useState(true);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    async function detectDealsTable() {
      const [oppRes, propRes] = await Promise.all([
        supabaseAuthClient.from('opportunities').select('id', { count: 'exact', head: true }),
        supabaseAuthClient.from('proposals').select('id', { count: 'exact', head: true }),
      ]);
      const oppCount = oppRes.count || 0;
      const propCount = propRes.count || 0;
      if (!oppRes.error && oppCount >= propCount) {
        setActiveDealsTable('opportunities');
      } else if (!propRes.error) {
        setActiveDealsTable('proposals');
      }
    }
    detectDealsTable();
  }, []);

  const fetchMarketingLeads = async () => {
    setLoading(true);
    const { data, error } = await supabaseAuthClient
      .from('marketing_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRecords(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMarketingLeads();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  const normalizedRecords = useMemo(() => {
    return records.map((r) => ({
      ...r,
      _name: r.prospect_name || r.full_name || 'Inbound Prospect',
      _email: r.work_email || r.email || '',
      _org: r.organization || 'Not Specified',
      _role: r.title || 'Lead Contact',
      _service: r.service_of_interest || 'General Inquiry',
      _nextStep: r.preferred_next_step || 'Request a consultation',
      _status: r.pipeline_status || r.status || 'New Inquiry',
      _source: r.source || "Google Form: Let's Work Together",
      _date: r.inquiry_date || r.created_at,
    }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return normalizedRecords.filter((item) => {
      if (statusFilter !== 'ALL' && item._status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hit =
          item._name.toLowerCase().includes(q) ||
          item._org.toLowerCase().includes(q) ||
          item._email.toLowerCase().includes(q) ||
          item._service.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [normalizedRecords, statusFilter, searchTerm]);

  const handleStatusChange = async (leadId, newStatus) => {
    const { error } = await supabaseAuthClient
      .from('marketing_leads')
      .update({ pipeline_status: newStatus, status: newStatus })
      .eq('id', leadId);

    if (!error) {
      setRecords((prev) =>
        prev.map((row) =>
          row.id === leadId
            ? { ...row, pipeline_status: newStatus, status: newStatus }
            : row
        )
      );
      showToast(`Updated pipeline status to "${newStatus}".`);
    }
  };

  const handleOpenConvertModal = (lead) => {
    setConvertingLead(lead);
    setDealClient(lead._org);
    setDealTitle(`${lead._service} — ${lead._org}`);
    setDealSbu(detectSbuFromService(lead._service));
    setDealValue('1000000');
    setDealStage('Stage 1: TOR / Opportunity Identified');
    setAlsoCreateLeadIntake(true);
    setConvertError('');
  };

  const handleConfirmConversion = async (e) => {
    e.preventDefault();
    if (!convertingLead) return;

    setConverting(true);
    setConvertError('');
    try {
      const numericValue = parseFloat(String(dealValue).replace(/[^0-9.]/g, '')) || 0;
      const probability = dealStage.includes('Defense') ? 70 : 30;

      const dealPayload = {
        client_organization: dealClient.trim() || convertingLead._org,
        organization: dealClient.trim() || convertingLead._org,
        client_name: dealClient.trim() || convertingLead._org,
        opportunity_title: dealTitle.trim(),
        title: dealTitle.trim(),
        sbu: dealSbu,
        stage: dealStage,
        status: 'Active',
        probability,
        estimated_value: numericValue,
        contract_value: numericValue,
        source: convertingLead._source,
        contact_name: convertingLead._name,
        contact_email: convertingLead._email,
        notes: `Converted from Digital Marketing Lead (${convertingLead._name} • ${convertingLead._email}). Preferred next step: ${convertingLead._nextStep}.`,
      };

      // 1. Insert into active Deals & Proposals table ('opportunities' or 'proposals')
      let { data: createdDeals, error: dealErr } = await supabaseAuthClient
        .from(activeDealsTable)
        .insert([dealPayload])
        .select();

      if (dealErr) {
        const fallbackTable = activeDealsTable === 'opportunities' ? 'proposals' : 'opportunities';
        const fallbackRes = await supabaseAuthClient
          .from(fallbackTable)
          .insert([dealPayload])
          .select();
        if (fallbackRes.error) {
          throw new Error(dealErr.message);
        }
        createdDeals = fallbackRes.data;
      }

      // 2. Optionally log into Lead Intake Register as Qualified
      if (alsoCreateLeadIntake) {
        await supabaseAuthClient.from('leads').insert([
          {
            client_organization: dealClient.trim() || convertingLead._org,
            organization: dealClient.trim() || convertingLead._org,
            client_name: dealClient.trim() || convertingLead._org,
            opportunity_title: dealTitle.trim(),
            title: dealTitle.trim(),
            sbu: dealSbu,
            screening_status: 'Qualified',
            priority: 'High',
            estimated_value: numericValue,
            source: convertingLead._source,
            contact_name: convertingLead._name,
            contact_email: convertingLead._email,
          },
        ]);
      }

      // 3. Mark Marketing Lead as Converted to Deal
      await supabaseAuthClient
        .from('marketing_leads')
        .update({
          pipeline_status: 'Converted to Deal',
          status: 'Converted to Deal',
          converted_deal_id: createdDeals?.[0]?.id ? String(createdDeals[0].id) : 'CONVERTED',
        })
        .eq('id', convertingLead.id);

      if (typeof onConvertToDeal === 'function') {
        onConvertToDeal(createdDeals?.[0] || dealPayload, convertingLead);
      }
      if (typeof onRefresh === 'function') {
        onRefresh();
      }

      setConvertingLead(null);
      await fetchMarketingLeads();
      showToast(`✓ ${convertingLead._name} converted to active proposal deal!`);
    } catch (err) {
      setConvertError(`Conversion error: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="dm-wrap">
      <style>{DM_STYLES}</style>

      <div className="dm-subnav">
        <div className="dm-tabs">
          <button
            type="button"
            onClick={() => setSubTab('register')}
            className={`dm-tab ${subTab === 'register' ? 'active' : ''}`}
          >
            👤 Lead Register
          </button>
          <button
            type="button"
            onClick={() => setSubTab('sources')}
            className={`dm-tab ${subTab === 'sources' ? 'active' : ''}`}
          >
            🎯 Campaign &amp; Source Tracking
          </button>
          <button
            type="button"
            onClick={() => setSubTab('followup')}
            className={`dm-tab ${subTab === 'followup' ? 'active' : ''}`}
          >
            ⚡ Lead Status &amp; Follow-up
          </button>
          <button
            type="button"
            onClick={() => setSubTab('dashboard')}
            className={`dm-tab ${subTab === 'dashboard' ? 'active' : ''}`}
          >
            📊 Digital Marketing Dashboard
          </button>
        </div>

        <div className="dm-filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="dm-select"
          >
            <option value="ALL">All Pipeline Statuses</option>
            <option value="New Inquiry">New Inquiry</option>
            <option value="Follow-up in Progress">Follow-up in Progress</option>
            <option value="Qualified">Qualified</option>
            <option value="Converted to Deal">Converted to Deal</option>
            <option value="Disqualified">Disqualified</option>
          </select>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search prospect, org, email..."
            className="dm-search"
          />
        </div>
      </div>

      {subTab === 'register' && (
        <div className="dm-card">
          <div className="dm-card-head">
            <div>
              <h3 className="dm-title">Inbound Prospect Register (Single Record Per Lead)</h3>
              <p className="dm-sub">
                Captured automatically via Google Forms &amp; Landing Page Webhooks
              </p>
            </div>
            <span className="dm-badge-total">{filteredRecords.length} Total Records</span>
          </div>

          {loading ? (
            <div style={{ padding: '24px', color: '#64748b' }}>Loading inbound prospects...</div>
          ) : (
            <div className="dm-table-wrap">
              <table className="dm-table">
                <thead>
                  <tr>
                    <th>Prospect &amp; Contact</th>
                    <th>Organization &amp; Title</th>
                    <th>Service of Interest</th>
                    <th>Preferred Next Step</th>
                    <th>Pipeline Status</th>
                    <th>Inquiry Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((lead) => {
                    const isConverted = lead._status === 'Converted to Deal';
                    const badgeStyle = getStatusColors(lead._status);
                    const formattedDate = lead._date
                      ? new Date(lead._date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—';

                    return (
                      <tr key={lead.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#253E5E' }}>{lead._name}</div>
                          <div style={{ fontSize: '11.5px', color: '#0284c7' }}>{lead._email}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{lead._org}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>{lead._role}</div>
                        </td>
                        <td style={{ maxWidth: '250px' }}>
                          <div style={{ fontWeight: 600, color: '#334155' }}>{lead._service}</div>
                        </td>
                        <td>
                          <span className="dm-step-pill">{lead._nextStep}</span>
                        </td>
                        <td>
                          <select
                            value={lead._status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className="dm-status-select"
                            style={badgeStyle}
                          >
                            <option value="New Inquiry">New Inquiry</option>
                            <option value="Follow-up in Progress">Follow-up in Progress</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Converted to Deal">Converted to Deal</option>
                            <option value="Disqualified">Disqualified</option>
                          </select>
                        </td>
                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{formattedDate}</td>
                        <td>
                          {isConverted ? (
                            <span className="dm-converted-badge">✓ Converted to Deal</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenConvertModal(lead)}
                              className="dm-convert-btn"
                            >
                              Convert to Deal →
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'sources' && (
        <div className="dm-card">
          <h3 className="dm-title" style={{ marginBottom: '14px' }}>
            🎯 Campaign &amp; Acquisition Source Breakdown
          </h3>
          <table className="dm-table">
            <thead>
              <tr>
                <th>Acquisition Source</th>
                <th>Total Leads</th>
                <th>Converted Deals</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#253E5E' }}>
                  Google Form: Let&apos;s Work Together
                </td>
                <td>{normalizedRecords.length}</td>
                <td>
                  {normalizedRecords.filter((r) => r._status === 'Converted to Deal').length}
                </td>
                <td>
                  {normalizedRecords.length > 0
                    ? `${Math.round(
                        (normalizedRecords.filter((r) => r._status === 'Converted to Deal').length /
                          normalizedRecords.length) *
                          100
                      )}%`
                    : '0%'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'followup' && (
        <div className="dm-card">
          <h3 className="dm-title" style={{ marginBottom: '14px' }}>
            ⚡ Pending Inbound Consultation Queue
          </h3>
          {normalizedRecords
            .filter((r) => r._status !== 'Converted to Deal')
            .map((lead) => (
              <div
                key={lead.id}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong style={{ color: '#253E5E' }}>{lead._name}</strong> ({lead._org}) —{' '}
                  <span style={{ color: '#475569' }}>{lead._service}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenConvertModal(lead)}
                  className="dm-convert-btn"
                >
                  Convert to Deal →
                </button>
              </div>
            ))}
        </div>
      )}

      {subTab === 'dashboard' && (
        <div className="dm-card">
          <h3 className="dm-title" style={{ marginBottom: '16px' }}>
            📊 Inbound Marketing Funnel Summary
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>TOTAL INBOUND LEADS</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#253E5E', marginTop: '4px' }}>
                {normalizedRecords.length}
              </div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>AWAITING ACTION</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#F78019', marginTop: '4px' }}>
                {normalizedRecords.filter((r) => r._status === 'New Inquiry').length}
              </div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>CONVERTED TO DEALS</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                {normalizedRecords.filter((r) => r._status === 'Converted to Deal').length}
              </div>
            </div>
          </div>
        </div>
      )}

      {convertingLead && (
        <div className="dm-modal-backdrop" onClick={() => setConvertingLead(null)}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#253E5E', margin: '0 0 6px 0' }}>
              Convert Inbound Lead to Active Deal
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 18px 0' }}>
              Promoting <strong>{convertingLead._name}</strong> ({convertingLead._email}) into your commercial pipeline.
            </p>

            {convertError && (
              <div
                style={{
                  background: '#fef2f2',
                  color: '#b91c1c',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                ⚠️ {convertError}
              </div>
            )}

            <form onSubmit={handleConfirmConversion}>
              <div className="dm-form-group">
                <label className="dm-form-label">Client / Organization Name *</label>
                <input
                  type="text"
                  required
                  value={dealClient}
                  onChange={(e) => setDealClient(e.target.value)}
                  className="dm-form-input"
                />
              </div>

              <div className="dm-form-group">
                <label className="dm-form-label">Proposal / Opportunity Title *</label>
                <input
                  type="text"
                  required
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className="dm-form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="dm-form-group">
                  <label className="dm-form-label">Executing SBU</label>
                  <select
                    value={dealSbu}
                    onChange={(e) => setDealSbu(e.target.value)}
                    className="dm-form-input"
                  >
                    <option value="INST">INST (The Institute)</option>
                    <option value="CBS">CBS (Cross Border Solutions)</option>
                    <option value="IIP">IIP (Investment Partners)</option>
                    <option value="DAS">DAS (Digital &amp; AI Solutions)</option>
                  </select>
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Estimated Value (ETB)</label>
                  <input
                    type="number"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="dm-form-input"
                  />
                </div>
              </div>

              <div className="dm-form-group">
                <label className="dm-form-label">Initial Deal Stage</label>
                <select
                  value={dealStage}
                  onChange={(e) => setDealStage(e.target.value)}
                  className="dm-form-input"
                >
                  <option value="Stage 1: TOR / Opportunity Identified">
                    Stage 1: TOR / Opportunity Identified (30%)
                  </option>
                  <option value="Stage 2: Proposal In Defense">
                    Stage 2: Proposal In Defense (70%)
                  </option>
                </select>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: '#334155',
                  marginBottom: '18px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={alsoCreateLeadIntake}
                  onChange={(e) => setAlsoCreateLeadIntake(e.target.checked)}
                />
                <span>Also register a Qualified Lead record in Lead Intake</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="dm-convert-btn"
                  style={{ padding: '10px 18px' }}
                >
                  {converting ? 'Converting...' : 'Confirm & Convert to Deal →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMsg && <div className="dm-toast">{toastMsg}</div>}
    </div>
  );
}