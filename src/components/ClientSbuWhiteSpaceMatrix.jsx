import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { MASTER_184_DIRECTORY } from '../ClientDirectory';

const MATRIX_STYLES = `
  .icap-matrix-wrap {
    margin-top: 8px;
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px 24px;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
    color: #1e293b;
  }
  .icap-matrix-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 14px;
  }
  .icap-matrix-search {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    font-size: 12.5px;
    min-width: 240px;
    outline: none;
  }
  .icap-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 11.5px;
    margin-bottom: 14px;
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
    font-size: 12px;
  }
  .icap-matrix-table th {
    background-color: #0f172a;
    color: #ffffff;
    padding: 10px 12px;
    text-align: left;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .icap-matrix-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .icap-cell-won {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 11px;
  }
  .icap-cell-pipe {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background-color: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 11px;
  }
  .icap-cell-target {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background-color: #f0f9ff;
    color: #0369a1;
    border: 1px solid #bae6fd;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 11px;
  }
  .icap-cell-white {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background-color: #fff7ed;
    color: #c2410c;
    border: 1px dashed #fdba74;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 11px;
  }
  .icap-rec-btn {
    background-color: #ea580c;
    color: #ffffff;
    border: none;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
`;

function normalizeSbu(raw) {
  const val = String(raw || '').toLowerCase();
  if (val.includes('cbs') || val.includes('cross')) return 'CBS';
  if (val.includes('iip') || val.includes('invest')) return 'IIP';
  if (val.includes('das') || val.includes('digital') || val.includes('ai')) return 'DAS';
  if (val.includes('inst')) return 'INST';
  return 'INST';
}

function cleanBaseAccountName(raw) {
  return String(raw || '')
    .replace(/\s+(IIP|DAS|CBS|Q1 Unit|Q3 Unit|Q4 Advisory|Q4)$/i, '')
    .trim();
}

function normalizeOrgKey(raw) {
  return cleanBaseAccountName(raw)
    .toLowerCase()
    .replace(/\b(s\.?c\.?|plc|share company|limited|ltd|ethiopia|bank of|international|company)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export default function ClientSbuWhiteSpaceMatrix() {
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  const loadMatrixData = async () => {
    setLoading(true);
    const [oppRes, propRes, leadsRes] = await Promise.all([
      supabase.from('opportunities').select('*'),
      supabase.from('proposals').select('*'),
      supabase.from('leads').select('*'),
    ]);

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
      const displayName = cleanBaseAccountName(rawName);
      if (!displayName) return null;
      const key = normalizeOrgKey(displayName) || displayName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: displayName,
          sector: sector || 'Institutional Sector',
          sbu: {
            INST: { won: 0, active: 0, targeted: false },
            CBS: { won: 0, active: 0, targeted: false },
            IIP: { won: 0, active: 0, targeted: false },
            DAS: { won: 0, active: 0, targeted: false },
          },
          wonDeals: [],
          score: 0,
        });
      }
      return map.get(key);
    };

    // 1. Map MASTER_184_DIRECTORY target pathways
    MASTER_184_DIRECTORY.forEach((m) => {
      const entry = getOrCreate(m.name, m.sector);
      const sbu = normalizeSbu(m.sbu);
      if (entry && sbu) {
        entry.sbu[sbu].targeted = true;
        entry.score += 1;
      }
    });

    // 2. Map Lead Intake
    leads.forEach((l) => {
      const entry = getOrCreate(
        l.client_organization || l.organization || l.client_name,
        l.sector
      );
      const sbu = normalizeSbu(l.sbu);
      if (entry && sbu) {
        entry.sbu[sbu].active += 1;
        entry.score += 2;
      }
    });

    // 3. Map Opportunities & Proposals
    deals.forEach((d) => {
      const entry = getOrCreate(
        d.client_organization || d.organization || d.client_name || d.client,
        d.sector
      );
      const sbu = normalizeSbu(d.sbu);
      if (entry && sbu) {
        const stage = `${d.stage || ''} ${d.status || ''}`.toLowerCase();
        const isWon = stage.includes('won') || stage.includes('signed') || stage.includes('completed');

        if (isWon) {
          entry.sbu[sbu].won += 1;
          entry.wonDeals.push(d);
          entry.score += 5;
        } else if (!stage.includes('lost') && !stage.includes('cancel')) {
          entry.sbu[sbu].active += 1;
          entry.score += 3;
        }
      }
    });

    return Array.from(map.values())
      .filter((row) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return row.name.toLowerCase().includes(q) || row.sector.toLowerCase().includes(q);
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [deals, leads, searchTerm]);

  const handleRecommendationAction = async (deal) => {
    const current = deal.recommendation_letter_status || 'Not Requested';
    const nextStatus =
      current === 'Not Requested' || current === 'Queued for Request'
        ? 'Requested'
        : 'Received';

    const targetTable = deal._table || 'opportunities';
    const { error } = await supabase
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
    if (stats.targeted) {
      return <span className="icap-cell-target">🎯 Target Pathway</span>;
    }
    return <span className="icap-cell-white">+ White Space</span>;
  };

  return (
    <div className="icap-matrix-wrap">
      <style>{MATRIX_STYLES}</style>

      <div className="icap-matrix-top">
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            🧩 4-SBU Cross-Sell &quot;White-Space&quot; Matrix &amp; Recommendation Tracker
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
            Reconciles active/won deals, mapped SBU target pathways, and untapped white space across all 4 SBUs.
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
            marginBottom: '12px',
            padding: '9px 12px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #93c5fd',
            color: '#1e3a8a',
            fontSize: '12px',
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
          <strong>Active Deal / Lead</strong>
        </span>
        <span>
          <span className="icap-legend-dot" style={{ backgroundColor: '#0284c7' }} />
          <strong>Mapped SBU Target Pathway</strong>
        </span>
        <span>
          <span className="icap-legend-dot" style={{ backgroundColor: '#ea580c' }} />
          <strong>White Space (Cross-Sell Opportunity)</strong>
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: '12.5px', color: '#64748b', padding: '12px 0' }}>
          Building 4-SBU Client Penetration Matrix...
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '460px' }}>
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
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{row.sector}</div>
                    </td>
                    <td>{renderSbuCell(row.sbu.INST)}</td>
                    <td>{renderSbuCell(row.sbu.CBS)}</td>
                    <td>{renderSbuCell(row.sbu.IIP)}</td>
                    <td>{renderSbuCell(row.sbu.DAS)}</td>
                    <td>
                      {!primaryWonDeal ? (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Eligible upon Won deal
                        </span>
                      ) : recStatus === 'Received' ? (
                        <span className="icap-cell-won">📜 Letter Received</span>
                      ) : (
                        <button
                          type="button"
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