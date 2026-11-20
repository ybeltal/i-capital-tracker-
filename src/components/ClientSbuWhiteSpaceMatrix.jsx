/**
 * THE i-CAPITAL AFRICA INSTITUTE — CLIENT DIRECTORY MODULE
 * Feature #3: 4-SBU Cross-Sell "White-Space" Matrix & Recommendation Letter Tracker
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabaseAuthClient } from '../utils/sessionSecurity';

const MATRIX_STYLES = `
  .icap-matrix-wrap {
    margin-top: 24px;
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 16px rgba(37, 62, 94, 0.06);
    font-family: 'Century Gothic', 'Plus Jakarta Sans', -apple-system, sans-serif;
    color: #1e293b;
  }
  .icap-matrix-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 18px;
  }
  .icap-matrix-search {
    padding: 9px 14px;
    border-radius: 10px;
    border: 1.5px solid #cbd5e1;
    font-size: 13px;
    min-width: 260px;
    outline: none;
  }
  .icap-matrix-search:focus {
    border-color: #4A7DBC;
  }
  .icap-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 11.5px;
    margin-bottom: 16px;
    color: #475569;
  }
  .icap-legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    margin-right: 5px;
  }
  .icap-matrix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  .icap-matrix-table th {
    background-color: #253E5E;
    color: #ffffff;
    padding: 11px 12px;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .icap-matrix-table td {
    padding: 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .icap-cell-won {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
    padding: 4px 10px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 11px;
  }
  .icap-cell-pipe {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background-color: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
    padding: 4px 10px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 11px;
  }
  .icap-cell-white {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background-color: #fff7ed;
    color: #c2410c;
    border: 1px dashed #F78019;
    padding: 4px 10px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 11px;
  }
  .icap-rec-btn {
    background-color: #F78019;
    color: #ffffff;
    border: none;
    padding: 5px 10px;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .icap-rec-btn:hover {
    background-color: #e06d0b;
  }
`;

function normalizeSbu(raw) {
  const val = String(raw || '').toLowerCase();
  if (val.includes('inst')) return 'INST';
  if (val.includes('cbs') || val.includes('cross')) return 'CBS';
  if (val.includes('iip') || val.includes('invest')) return 'IIP';
  if (val.includes('das') || val.includes('digital') || val.includes('ai')) return 'DAS';
  return 'INST';
}

export default function ClientSbuWhiteSpaceMatrix() {
  const [clients, setClients] = useState([]);
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  const loadMatrixData = async () => {
    setLoading(true);
    const [clientsRes, oppRes, propRes, leadsRes] = await Promise.all([
      supabaseAuthClient.from('clients').select('*'),
      supabaseAuthClient.from('opportunities').select('*'),
      supabaseAuthClient.from('proposals').select('*'),
      supabaseAuthClient.from('leads').select('*'),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (leadsRes.data) setLeads(leadsRes.data);

    const taggedOpps = (oppRes.data || []).map((o) => ({ ...o, _table: 'opportunities' }));
    const taggedProps = (propRes.data || []).map((p) => ({ ...p, _table: 'proposals' }));
    setDeals([...taggedOpps, ...taggedProps]);
    setLoading(false);
  };

  useEffect(() => {
    loadMatrixData();
  }, []);

  const matrixRows = useMemo(() => {
    const map = new Map();

    const getOrCreate = (rawName, sector = '') => {
      const cleanName = String(rawName || '').trim();
      if (!cleanName) return null;
      const key = cleanName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: cleanName,
          sector: sector || 'Institutional Sector',
          sbu: {
            INST: { won: 0, active: 0 },
            CBS: { won: 0, active: 0 },
            IIP: { won: 0, active: 0 },
            DAS: { won: 0, active: 0 },
          },
          wonDeals: [],
        });
      }
      return map.get(key);
    };

    clients.forEach((c) => {
      getOrCreate(c.name || c.client_name || c.organization, c.industry || c.sector);
    });

    leads.forEach((l) => {
      const entry = getOrCreate(
        l.client_organization || l.organization || l.client_name,
        l.sector
      );
      if (entry) {
        const sbu = normalizeSbu(l.sbu);
        entry.sbu[sbu].active += 1;
      }
    });

    deals.forEach((d) => {
      const entry = getOrCreate(
        d.client_organization || d.organization || d.client_name,
        d.sector
      );
      if (entry) {
        const sbu = normalizeSbu(d.sbu);
        const stage = `${d.stage || ''} ${d.status || ''}`.toLowerCase();
        const isWon = stage.includes('won') || stage.includes('signed') || stage.includes('completed');

        if (isWon) {
          entry.sbu[sbu].won += 1;
          entry.wonDeals.push(d);
        } else if (!stage.includes('lost')) {
          entry.sbu[sbu].active += 1;
        }
      }
    });

    return Array.from(map.values())
      .filter((row) =>
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.sector.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, deals, leads, searchTerm]);

  const handleRecommendationAction = async (deal) => {
    const current = deal.recommendation_letter_status || 'Not Requested';
    const nextStatus =
      current === 'Not Requested' || current === 'Queued for Request'
        ? 'Requested'
        : 'Received';

    const targetTable = deal._table || 'opportunities';
    const { error } = await supabaseAuthClient
      .from(targetTable)
      .update({ recommendation_letter_status: nextStatus })
      .eq('id', deal.id);

    if (!error) {
      setToastMsg(
        `Updated recommendation letter status for ${deal.client_organization || deal.title} to "${nextStatus}".`
      );
      setTimeout(() => setToastMsg(''), 4000);
      loadMatrixData();
    }
  };

  const renderSbuCell = (stats) => {
    if (stats.won > 0) {
      return <span className="icap-cell-won">✓ Won ({stats.won})</span>;
    }
    if (stats.active > 0) {
      return <span className="icap-cell-pipe">● Active ({stats.active})</span>;
    }
    return <span className="icap-cell-white">+ White Space</span>;
  };

  return (
    <div className="icap-matrix-wrap">
      <style>{MATRIX_STYLES}</style>

      <div className="icap-matrix-top">
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#253E5E', margin: 0 }}>
            🧩 4-SBU Cross-Sell &quot;White-Space&quot; Matrix &amp; Recommendation Tracker
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
            Identify untapped SBU expansion opportunities across existing clients and track post-delivery recommendation letters.
          </p>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter client organization or sector..."
          className="icap-matrix-search"
        />
      </div>

      {toastMsg && (
        <div
          style={{
            marginBottom: '14px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #93c5fd',
            color: '#1e3a8a',
            fontSize: '12.5px',
            fontWeight: 600,
          }}
        >
          ✓ {toastMsg}
        </div>
      )}

      <div className="icap-legend">
        <span>
          <span className="icap-legend-dot" style={{ backgroundColor: '#22c55e' }} />
          <strong>Won / Delivered</strong>
        </span>
        <span>
          <span className="icap-legend-dot" style={{ backgroundColor: '#3b82f6' }} />
          <strong>Active Pipeline / Screening</strong>
        </span>
        <span>
          <span className="icap-legend-dot" style={{ backgroundColor: '#F78019' }} />
          <strong>White Space (Cross-Sell Opportunity)</strong>
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: '13px', color: '#64748b', padding: '12px 0' }}>
          Building 4-SBU Client Penetration Matrix...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="icap-matrix-table">
            <thead>
              <tr>
                <th>Client Organization</th>
                <th>INST (Institute)</th>
                <th>CBS (Advisory)</th>
                <th>IIP (Capital Markets)</th>
                <th>DAS (Digital &amp; AI)</th>
                <th>Recommendation Letter</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => {
                const primaryWonDeal = row.wonDeals[0];
                const recStatus = primaryWonDeal?.recommendation_letter_status || 'Not Requested';

                return (
                  <tr key={row.name}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#253E5E' }}>{row.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{row.sector}</div>
                    </td>
                    <td>{renderSbuCell(row.sbu.INST)}</td>
                    <td>{renderSbuCell(row.sbu.CBS)}</td>
                    <td>{renderSbuCell(row.sbu.IIP)}</td>
                    <td>{renderSbuCell(row.sbu.DAS)}</td>
                    <td>
                      {!primaryWonDeal ? (
                        <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                          Eligible upon Won deal
                        </span>
                      ) : recStatus === 'Received' ? (
                        <span className="icap-cell-won">📜 Letter Received</span>
                      ) : (
                        <button
                          onClick={() => handleRecommendationAction(primaryWonDeal)}
                          className="icap-rec-btn"
                        >
                          {recStatus === 'Requested'
                            ? 'Mark Letter Received ✓'
                            : 'Request Recommendation Letter'}
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
  );
}