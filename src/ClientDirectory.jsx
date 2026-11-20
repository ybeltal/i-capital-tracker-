/**
 * THE i-CAPITAL AFRICA INSTITUTE — STRATEGIC CLIENT DIRECTORY
 * Complete Self-Contained Directory with Working "+ Lead" & "+ Proposal" Modals,
 * SBU / Quarter / Product Filters, Pathway Table, Dormant Reviver & 4-SBU Matrix
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabaseAuthClient } from './utils/sessionSecurity';
import ClientSbuWhiteSpaceMatrix from './components/ClientSbuWhiteSpaceMatrix.jsx';

const DIR_STYLES = `
  .cd-wrap {
    font-family: 'Century Gothic', 'Plus Jakarta Sans', -apple-system, sans-serif;
    color: #1e293b;
    padding: 20px 24px 48px;
    max-width: 1440px;
    margin: 0 auto;
  }
  .cd-banner {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 22px 24px;
    margin-bottom: 18px;
    box-shadow: 0 2px 10px rgba(37, 62, 94, 0.05);
  }
  .cd-header-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 18px;
  }
  .cd-title {
    font-size: 20px;
    font-weight: 800;
    color: #253E5E;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .cd-count-pill {
    background: #e0f2fe;
    color: #0369a1;
    font-size: 11.5px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
  }
  .cd-subtitle {
    font-size: 12.5px;
    color: #64748b;
    margin: 4px 0 0 0;
  }
  .cd-actions-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .cd-btn-orange {
    background: #F78019;
    color: #ffffff;
    border: none;
    border-radius: 9px;
    padding: 9px 15px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(247, 128, 25, 0.25);
  }
  .cd-btn-orange:hover {
    background: #e06d0b;
  }
  .cd-view-toggle {
    display: inline-flex;
    background: #f1f5f9;
    padding: 3px;
    border-radius: 9px;
    border: 1px solid #e2e8f0;
  }
  .cd-toggle-btn {
    border: none;
    background: transparent;
    padding: 6px 12px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
  }
  .cd-toggle-btn.active {
    background: #ffffff;
    color: #253E5E;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }
  .cd-sbu-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 14px;
  }
  .cd-sbu-tab {
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #334155;
    padding: 7px 13px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .cd-sbu-tab.active {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
  }
  .cd-filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .cd-quarter-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .cd-q-btn {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #475569;
    padding: 5px 10px;
    border-radius: 7px;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .cd-q-btn.active {
    background: #e0f2fe;
    color: #0369a1;
    border-color: #7dd3fc;
  }
  .cd-search-group {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .cd-select, .cd-search {
    padding: 8px 12px;
    border-radius: 9px;
    border: 1px solid #cbd5e1;
    font-size: 12.5px;
    color: #1e293b;
    background: #ffffff;
    outline: none;
  }
  .cd-search {
    min-width: 240px;
  }
  .cd-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 16px;
  }
  .cd-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .cd-card:hover {
    transform: translateY(-2px);
    border-color: #4A7DBC;
    box-shadow: 0 10px 22px rgba(37, 62, 94, 0.09);
  }
  .cd-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .cd-target-badge {
    background: #fff7ed;
    color: #c2410c;
    font-size: 10.5px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
  }
  .cd-sbu-badge {
    background: #f1f5f9;
    color: #334155;
    font-size: 10.5px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
  }
  .cd-client-name {
    font-size: 15px;
    font-weight: 800;
    color: #253E5E;
    margin: 0 0 6px 0;
  }
  .cd-meta-line {
    font-size: 12px;
    color: #475569;
    margin: 3px 0;
    line-height: 1.4;
  }
  .cd-card-footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
  }
  .cd-btn-lead {
    background: #ffffff;
    color: #253E5E;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .cd-btn-lead:hover {
    background: #f1f5f9;
    border-color: #253E5E;
  }
  .cd-btn-prop {
    background: #0284c7;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .cd-btn-prop:hover {
    background: #0369a1;
  }
  .cd-table-wrap {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow-x: auto;
  }
  .cd-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  .cd-table th {
    background: #253E5E;
    color: #ffffff;
    text-align: left;
    padding: 11px 14px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .cd-table td {
    padding: 11px 14px;
    border-bottom: 1px solid #f1f5f9;
  }
  .cd-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 9999;
  }
  .cd-modal {
    background: #ffffff;
    border-radius: 16px;
    width: 100%;
    max-width: 520px;
    padding: 26px 28px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    border-top: 5px solid #F78019;
  }
  .cd-modal-title {
    font-size: 19px;
    font-weight: 800;
    color: #253E5E;
    margin: 0 0 6px 0;
  }
  .cd-form-group {
    margin-bottom: 14px;
  }
  .cd-form-label {
    display: block;
    font-size: 11.5px;
    font-weight: 700;
    color: #253E5E;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .cd-form-input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1.5px solid #cbd5e1;
    font-size: 13.5px;
    color: #0f172a;
    box-sizing: border-box;
  }
  .cd-form-input:focus {
    outline: none;
    border-color: #4A7DBC;
  }
  .cd-toast {
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

function normalizeSbuLabel(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('iip') || s.includes('invest')) return 'IIP';
  if (s.includes('das') || s.includes('digital') || s.includes('ai')) return 'DAS';
  if (s.includes('cbs') || s.includes('cross')) return 'CBS';
  return 'Institute';
}

function normalizeSbuCode(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('iip') || s.includes('invest')) return 'IIP';
  if (s.includes('das') || s.includes('digital') || s.includes('ai')) return 'DAS';
  if (s.includes('cbs') || s.includes('cross')) return 'CBS';
  return 'INST';
}

export default function ClientDirectory({
  clients: propClients = null,
  onCreateLead,
  onCreateProposal,
  onRefresh,
}) {
  const [clients, setClients] = useState(propClients || []);
  const [loading, setLoading] = useState(!propClients);
  const [activeDealsTable, setActiveDealsTable] = useState('opportunities');

  // Filters & View State
  const [activeSbu, setActiveSbu] = useState('ALL');
  const [activeQuarter, setActiveQuarter] = useState('ALL');
  const [selectedService, setSelectedService] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards');

  // Action Modals State
  const [modalMode, setModalMode] = useState(null); // 'lead' | 'proposal' | 'dormant' | null
  const [selectedClient, setSelectedClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSbu, setFormSbu] = useState('INST');
  const [formSector, setFormSector] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formPriorityOrStage, setFormPriorityOrStage] = useState('High');
  const [formDeadline, setFormDeadline] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Detect whether Deals & Proposals uses 'opportunities' or 'proposals'
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

  const loadClients = async () => {
    setLoading(true);
    const { data, error } = await supabaseAuthClient
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setClients(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (propClients && propClients.length > 0) {
      setClients(propClients);
      setLoading(false);
    } else {
      loadClients();
    }
  }, [propClients]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const normalizedClients = useMemo(() => {
    return clients.map((c, idx) => {
      const name = c.name || c.client_name || c.organization || `Account #${idx + 1}`;
      const sbuLabel = normalizeSbuLabel(c.sbu || c.primary_sbu);
      const quarter = String(c.target_quarter || c.quarter || 'Q2').toUpperCase().startsWith('Q')
        ? String(c.target_quarter || c.quarter || 'Q2').toUpperCase()
        : 'Q2';
      const serviceFit =
        c.service_fit || c.strategic_product || c.product_fit || 'Executive Advisory';
      const industry = c.industry || c.sector || 'Banking';
      const estRevenue = c.estimated_value || c.potential_value || '';

      return {
        ...c,
        _name: name,
        _sbuLabel: sbuLabel,
        _quarter: quarter,
        _serviceFit: serviceFit,
        _industry: industry,
        _estRevenue: estRevenue,
      };
    });
  }, [clients]);

  const counts = useMemo(() => {
    const res = {
      ALL: normalizedClients.length,
      Institute: 0,
      IIP: 0,
      DAS: 0,
      CBS: 0,
      Q1: 0,
      Q2: 0,
      Q3: 0,
      Q4: 0,
    };
    normalizedClients.forEach((c) => {
      if (res[c._sbuLabel] !== undefined) res[c._sbuLabel] += 1;
      if (res[c._quarter] !== undefined) res[c._quarter] += 1;
    });
    return res;
  }, [normalizedClients]);

  const serviceOptions = useMemo(() => {
    const set = new Set();
    normalizedClients.forEach((c) => {
      if (c._serviceFit) set.add(c._serviceFit);
    });
    return Array.from(set).sort();
  }, [normalizedClients]);

  const filteredClients = useMemo(() => {
    return normalizedClients.filter((c) => {
      if (activeSbu !== 'ALL' && c._sbuLabel !== activeSbu) return false;
      if (activeQuarter !== 'ALL' && c._quarter !== activeQuarter) return false;
      if (selectedService !== 'ALL' && c._serviceFit !== selectedService) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          c._name.toLowerCase().includes(q) ||
          c._serviceFit.toLowerCase().includes(q) ||
          c._industry.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [normalizedClients, activeSbu, activeQuarter, selectedService, searchQuery]);

  const handleOpenLeadModal = (client, e) => {
    if (e) e.stopPropagation();
    setSelectedClient(client);
    setFormTitle(`${client._serviceFit} — ${client._name}`);
    setFormSbu(normalizeSbuCode(client._sbuLabel));
    setFormSector(client._industry);
    setFormValue(client._estRevenue ? String(client._estRevenue) : '');
    setFormPriorityOrStage('High');
    setFormNotes(`Initiated from Strategic Client Directory (${client._quarter} Target Pathway).`);
    setModalError('');
    setModalMode('lead');
  };

  const handleOpenProposalModal = (client, e) => {
    if (e) e.stopPropagation();
    setSelectedClient(client);
    setFormTitle(`${client._serviceFit} Mandate — ${client._name}`);
    setFormSbu(normalizeSbuCode(client._sbuLabel));
    setFormSector(client._industry);
    setFormValue(client._estRevenue ? String(client._estRevenue) : '1500000');
    setFormPriorityOrStage('Stage 1: TOR / Opportunity Identified');
    setFormDeadline('');
    setFormNotes(`Converted directly from Strategic Client Directory (${client._quarter} Target).`);
    setModalError('');
    setModalMode('proposal');
  };

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setModalError('Please enter an opportunity scope or lead title.');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      const numericVal = parseFloat(String(formValue).replace(/[^0-9.]/g, '')) || 0;
      const payload = {
        client_id: selectedClient.id || null,
        client_organization: selectedClient._name,
        organization: selectedClient._name,
        client_name: selectedClient._name,
        opportunity_title: formTitle.trim(),
        title: formTitle.trim(),
        sbu: formSbu,
        sector: formSector || 'Institutional',
        screening_status: 'Unscreened',
        priority: formPriorityOrStage || 'High',
        estimated_value: numericVal,
        source: 'Strategic Client Directory',
        notes: formNotes,
      };

      const { data, error } = await supabaseAuthClient
        .from('leads')
        .insert([payload])
        .select();

      if (error) {
        throw new Error(error.message);
      }

      if (typeof onCreateLead === 'function') {
        onCreateLead(data?.[0] || payload);
      }
      if (typeof onRefresh === 'function') {
        onRefresh();
      }

      setModalMode(null);
      showToast(`✓ Lead created for ${selectedClient._name} in Lead Intake!`);
    } catch (err) {
      setModalError(`Unable to create lead: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setModalError('Please enter a proposal title.');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      const numericVal = parseFloat(String(formValue).replace(/[^0-9.]/g, '')) || 0;
      const probability = formPriorityOrStage.includes('Defense')
        ? 70
        : formPriorityOrStage.includes('Won')
        ? 100
        : 30;

      const payload = {
        client_id: selectedClient.id || null,
        client_organization: selectedClient._name,
        organization: selectedClient._name,
        client_name: selectedClient._name,
        opportunity_title: formTitle.trim(),
        title: formTitle.trim(),
        sbu: formSbu,
        sector: formSector || 'Institutional',
        stage: formPriorityOrStage,
        status: 'Active',
        probability,
        estimated_value: numericVal,
        contract_value: numericVal,
        submission_deadline: formDeadline || null,
        source: 'Strategic Client Directory',
        notes: formNotes,
      };

      let { data, error } = await supabaseAuthClient
        .from(activeDealsTable)
        .insert([payload])
        .select();

      // Fallback to alternate table if needed
      if (error) {
        const fallbackTable = activeDealsTable === 'opportunities' ? 'proposals' : 'opportunities';
        const fallbackRes = await supabaseAuthClient
          .from(fallbackTable)
          .insert([payload])
          .select();
        if (fallbackRes.error) {
          throw new Error(error.message);
        }
        data = fallbackRes.data;
      }

      if (typeof onCreateProposal === 'function') {
        onCreateProposal(data?.[0] || payload);
      }
      if (typeof onRefresh === 'function') {
        onRefresh();
      }

      setModalMode(null);
      showToast(`✓ Proposal created for ${selectedClient._name} in Deals & Proposals!`);
    } catch (err) {
      setModalError(`Unable to create proposal: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cd-wrap">
      <style>{DIR_STYLES}</style>

      <div className="cd-banner">
        <div className="cd-header-row">
          <div>
            <h2 className="cd-title">
              Strategic Client Directory
              <span className="cd-count-pill">
                {filteredClients.length} of {normalizedClients.length} Accounts Mapped
              </span>
            </h2>
            <p className="cd-subtitle">
              Consolidated target account pathway mapped across all 4 SBUs and strategic products. Convert any account directly into an active lead or proposal with 1 click.
            </p>
          </div>

          <div className="cd-actions-top">
            <button
              type="button"
              onClick={() => setModalMode('dormant')}
              className="cd-btn-orange"
            >
              ⚡ Revive Dormant Accounts (90+ Days)
            </button>

            <div className="cd-view-toggle">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`cd-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              >
                Cards ({filteredClients.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`cd-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              >
                Pathway Table
              </button>
            </div>
          </div>
        </div>

        <div className="cd-sbu-tabs">
          {[
            { key: 'ALL', label: `All SBUs (${counts.ALL})` },
            { key: 'Institute', label: `The i-Capital Institute (${counts.Institute})` },
            { key: 'IIP', label: `i-Capital Investment Partners (IIP) (${counts.IIP})` },
            { key: 'DAS', label: `Digital & AI Solutions (DAS) (${counts.DAS})` },
            { key: 'CBS', label: `Cross Border Solutions (CBS) (${counts.CBS})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSbu(tab.key)}
              className={`cd-sbu-tab ${activeSbu === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="cd-filter-bar">
          <div className="cd-quarter-group">
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
              QUARTER:
            </span>
            {[
              { key: 'ALL', label: `All Quarters (${counts.ALL})` },
              { key: 'Q1', label: `Q1 (${counts.Q1})` },
              { key: 'Q2', label: `Q2 (${counts.Q2})` },
              { key: 'Q3', label: `Q3 (${counts.Q3})` },
              { key: 'Q4', label: `Q4 (${counts.Q4})` },
            ].map((q) => (
              <button
                key={q.key}
                type="button"
                onClick={() => setActiveQuarter(q.key)}
                className={`cd-q-btn ${activeQuarter === q.key ? 'active' : ''}`}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="cd-search-group">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="cd-select"
            >
              <option value="ALL">All Strategic Products / Services</option>
              {serviceOptions.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search institution, product, sector..."
              className="cd-search"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          Loading Strategic Client Directory...
        </div>
      ) : viewMode === 'cards' ? (
        <div className="cd-grid">
          {filteredClients.map((client, idx) => (
            <div key={client.id || idx} className="cd-card">
              <div>
                <div className="cd-card-top">
                  <span className="cd-target-badge">Target {client._quarter}</span>
                  <span className="cd-sbu-badge">{client._sbuLabel}</span>
                </div>
                <h3 className="cd-client-name">{client._name}</h3>
                <p className="cd-meta-line">
                  <strong>Service Fit:</strong> {client._serviceFit}
                </p>
                <p className="cd-meta-line">
                  <strong>Industry:</strong> {client._industry}
                  {client._estRevenue
                    ? ` • ETB ${Number(client._estRevenue).toLocaleString()}`
                    : ''}
                </p>
              </div>

              <div className="cd-card-footer">
                <button
                  type="button"
                  onClick={(e) => handleOpenLeadModal(client, e)}
                  className="cd-btn-lead"
                >
                  + Lead
                </button>
                <button
                  type="button"
                  onClick={(e) => handleOpenProposalModal(client, e)}
                  className="cd-btn-prop"
                >
                  + Proposal
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cd-table-wrap">
          <table className="cd-table">
            <thead>
              <tr>
                <th>Institution / Client</th>
                <th>SBU</th>
                <th>Target Quarter</th>
                <th>Strategic Service Fit</th>
                <th>Industry</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client, idx) => (
                <tr key={client.id || idx}>
                  <td style={{ fontWeight: 700, color: '#253E5E' }}>{client._name}</td>
                  <td>{client._sbuLabel}</td>
                  <td>
                    <span className="cd-target-badge">{client._quarter}</span>
                  </td>
                  <td>{client._serviceFit}</td>
                  <td>{client._industry}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={(e) => handleOpenLeadModal(client, e)}
                        className="cd-btn-lead"
                        style={{ padding: '5px 10px' }}
                      >
                        + Lead
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenProposalModal(client, e)}
                        className="cd-btn-prop"
                        style={{ padding: '5px 10px' }}
                      >
                        + Proposal
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClientSbuWhiteSpaceMatrix />

      {/* MODAL 1: CREATE LEAD */}
      {modalMode === 'lead' && selectedClient && (
        <div className="cd-modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cd-modal-title">+ Create New Institutional Lead</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 18px 0' }}>
              Client Account: <strong style={{ color: '#253E5E' }}>{selectedClient._name}</strong>
            </p>

            {modalError && (
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
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitLead}>
              <div className="cd-form-group">
                <label className="cd-form-label">Opportunity / Lead Scope *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="cd-form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cd-form-group">
                  <label className="cd-form-label">Lead SBU</label>
                  <select
                    value={formSbu}
                    onChange={(e) => setFormSbu(e.target.value)}
                    className="cd-form-input"
                  >
                    <option value="INST">INST (The Institute)</option>
                    <option value="CBS">CBS (Cross Border Solutions)</option>
                    <option value="IIP">IIP (Investment Partners)</option>
                    <option value="DAS">DAS (Digital &amp; AI Solutions)</option>
                  </select>
                </div>

                <div className="cd-form-group">
                  <label className="cd-form-label">Priority Level</label>
                  <select
                    value={formPriorityOrStage}
                    onChange={(e) => setFormPriorityOrStage(e.target.value)}
                    className="cd-form-input"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cd-form-group">
                  <label className="cd-form-label">Sector / Industry</label>
                  <input
                    type="text"
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    className="cd-form-input"
                  />
                </div>

                <div className="cd-form-group">
                  <label className="cd-form-label">Estimated Value (ETB)</label>
                  <input
                    type="number"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="e.g. 1200000"
                    className="cd-form-input"
                  />
                </div>
              </div>

              <div className="cd-form-group">
                <label className="cd-form-label">Qualification Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="cd-form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="cd-btn-lead"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cd-btn-orange"
                >
                  {submitting ? 'Saving Lead...' : 'Save to Lead Intake →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE PROPOSAL */}
      {modalMode === 'proposal' && selectedClient && (
        <div className="cd-modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cd-modal-title">+ Create Active Proposal / Deal</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 18px 0' }}>
              Client Account: <strong style={{ color: '#253E5E' }}>{selectedClient._name}</strong>
            </p>

            {modalError && (
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
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitProposal}>
              <div className="cd-form-group">
                <label className="cd-form-label">Proposal / Mandate Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="cd-form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cd-form-group">
                  <label className="cd-form-label">Executing SBU</label>
                  <select
                    value={formSbu}
                    onChange={(e) => setFormSbu(e.target.value)}
                    className="cd-form-input"
                  >
                    <option value="INST">INST (The Institute)</option>
                    <option value="CBS">CBS (Cross Border Solutions)</option>
                    <option value="IIP">IIP (Investment Partners)</option>
                    <option value="DAS">DAS (Digital &amp; AI Solutions)</option>
                  </select>
                </div>

                <div className="cd-form-group">
                  <label className="cd-form-label">Pipeline Stage</label>
                  <select
                    value={formPriorityOrStage}
                    onChange={(e) => setFormPriorityOrStage(e.target.value)}
                    className="cd-form-input"
                  >
                    <option value="Stage 1: TOR / Opportunity Identified">
                      Stage 1: TOR Identified (30%)
                    </option>
                    <option value="Stage 2: Proposal In Defense">
                      Stage 2: Proposal In Defense (70%)
                    </option>
                    <option value="Stage 3: Contract Won / Signed">
                      Stage 3: Contract Won / Signed (100%)
                    </option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cd-form-group">
                  <label className="cd-form-label">Proposal Value (ETB)</label>
                  <input
                    type="number"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="e.g. 2500000"
                    className="cd-form-input"
                  />
                </div>

                <div className="cd-form-group">
                  <label className="cd-form-label">Submission Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="cd-form-input"
                  />
                </div>
              </div>

              <div className="cd-form-group">
                <label className="cd-form-label">Commercial Strategy Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="cd-form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="cd-btn-lead"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cd-btn-prop"
                  style={{ padding: '10px 16px' }}
                >
                  {submitting ? 'Creating Proposal...' : 'Launch in Deals & Proposals →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DORMANT ACCOUNT REVIVER */}
      {modalMode === 'dormant' && (
        <div className="cd-modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="cd-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="cd-modal-title">⚡ Dormant Account Reviver (90+ Days)</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
              Select any mapped institutional account below to immediately launch a re-engagement lead or proposal.
            </p>
            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              {normalizedClients.slice(0, 25).map((c, idx) => (
                <div
                  key={c.id || idx}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#253E5E' }}>
                      {c._name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {c._sbuLabel} • {c._serviceFit}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => handleOpenLeadModal(c, e)}
                      className="cd-btn-lead"
                      style={{ padding: '5px 10px' }}
                    >
                      + Lead
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleOpenProposalModal(c, e)}
                      className="cd-btn-prop"
                      style={{ padding: '5px 10px' }}
                    >
                      + Proposal
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setModalMode(null)} className="cd-btn-lead">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && <div className="cd-toast">{toastMessage}</div>}
    </div>
  );
}