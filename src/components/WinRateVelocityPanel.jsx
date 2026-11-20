/**
 * THE i-CAPITAL AFRICA INSTITUTE — EXECUTIVE DASHBOARD MODULE
 * Feature #2: True Decision-Based Win-Rate & Stage Velocity Analytics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabaseAuthClient } from '../utils/sessionSecurity';

const STYLES = `
  .icap-analytics-wrap {
    margin-top: 24px;
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 16px rgba(37, 62, 94, 0.06);
    font-family: 'Century Gothic', 'Plus Jakarta Sans', -apple-system, sans-serif;
    color: #1e293b;
  }
  .icap-analytics-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 20px;
  }
  .icap-analytics-title {
    font-size: 17px;
    font-weight: 800;
    color: #253E5E;
    margin: 0;
  }
  .icap-analytics-sub {
    font-size: 12.5px;
    color: #64748b;
    margin: 3px 0 0 0;
  }
  .icap-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }
  .icap-kpi-box {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
  }
  .icap-kpi-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-bottom: 6px;
  }
  .icap-kpi-num {
    font-size: 26px;
    font-weight: 800;
    color: #253E5E;
    line-height: 1.1;
  }
  .icap-kpi-foot {
    font-size: 11.5px;
    color: #64748b;
    margin-top: 6px;
  }
  .icap-split-panels {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 960px) {
    .icap-split-panels {
      grid-template-columns: 1.35fr 1fr;
    }
  }
  .icap-panel-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px;
    background-color: #ffffff;
  }
  .icap-panel-heading {
    font-size: 13.5px;
    font-weight: 800;
    color: #253E5E;
    margin: 0 0 12px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .icap-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  .icap-table th {
    text-align: left;
    padding: 9px 10px;
    background-color: #f1f5f9;
    color: #253E5E;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .icap-table td {
    padding: 10px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  .icap-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
  }
  .icap-stalled-item {
    padding: 10px 12px;
    border-radius: 10px;
    background-color: #fff7ed;
    border: 1px solid #fed7aa;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
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

function classifyOutcome(deal) {
  const stage = String(deal.stage || '').toLowerCase();
  const status = String(deal.status || '').toLowerCase();
  const combined = `${stage} ${status}`;

  if (combined.includes('won') || combined.includes('signed') || combined.includes('completed')) {
    return 'WON';
  }
  if (combined.includes('lost') || combined.includes('rejected') || combined.includes('cancel') || combined.includes('no-go')) {
    return 'LOST';
  }
  if (combined.includes('review') || combined.includes('submitted') || combined.includes('defense')) {
    return 'UNDER_REVIEW';
  }
  return 'ACTIVE_TOR';
}

export default function WinRateVelocityPanel({ deals: externalDeals = null }) {
  const [deals, setDeals] = useState(externalDeals || []);
  const [loading, setLoading] = useState(!externalDeals);

  useEffect(() => {
    if (externalDeals) {
      setDeals(externalDeals);
      setLoading(false);
      return;
    }

    let active = true;
    async function fetchDeals() {
      setLoading(true);
      const [oppRes, propRes] = await Promise.all([
        supabaseAuthClient.from('opportunities').select('*'),
        supabaseAuthClient.from('proposals').select('*'),
      ]);

      const opps = oppRes.data || [];
      const props = propRes.data || [];
      const merged = opps.length >= props.length ? [...opps, ...props] : [...props, ...opps];

      // Deduplicate by title + client_organization if mirrored
      const seen = new Set();
      const uniqueDeals = merged.filter((item) => {
        const key = `${(item.title || item.opportunity_title || '').toLowerCase()}::${(
          item.client_organization ||
          item.organization ||
          ''
        ).toLowerCase()}`;
        if (key !== '::' && seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (active) {
        setDeals(uniqueDeals);
        setLoading(false);
      }
    }

    fetchDeals();
    return () => {
      active = false;
    };
  }, [externalDeals]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const sbuMap = {
      INST: { code: 'INST', name: 'The Institute', won: 0, lost: 0, review: 0, tor: 0, daysList: [] },
      CBS: { code: 'CBS', name: 'Cross Border Solutions', won: 0, lost: 0, review: 0, tor: 0, daysList: [] },
      IIP: { code: 'IIP', name: 'Investment Partners', won: 0, lost: 0, review: 0, tor: 0, daysList: [] },
      DAS: { code: 'DAS', name: 'Digital & AI Solutions', won: 0, lost: 0, review: 0, tor: 0, daysList: [] },
    };

    let totalWon = 0;
    let totalLost = 0;
    let totalUnderReview = 0;
    let totalActiveTor = 0;
    const allOpenDays = [];
    const stalledDeals = [];

    deals.forEach((deal) => {
      const sbu = normalizeSbu(deal.sbu);
      const outcome = classifyOutcome(deal);
      const refDate = new Date(deal.stage_updated_at || deal.updated_at || deal.created_at || now).getTime();
      const daysInStage = Math.max(0, Math.floor((now - refDate) / (1000 * 60 * 60 * 24)));

      if (outcome === 'WON') {
        totalWon += 1;
        sbuMap[sbu].won += 1;
      } else if (outcome === 'LOST') {
        totalLost += 1;
        sbuMap[sbu].lost += 1;
      } else if (outcome === 'UNDER_REVIEW') {
        totalUnderReview += 1;
        sbuMap[sbu].review += 1;
        sbuMap[sbu].daysList.push(daysInStage);
        allOpenDays.push(daysInStage);
      } else {
        totalActiveTor += 1;
        sbuMap[sbu].tor += 1;
        sbuMap[sbu].daysList.push(daysInStage);
        allOpenDays.push(daysInStage);
      }

      if ((outcome === 'UNDER_REVIEW' || outcome === 'ACTIVE_TOR') && daysInStage >= 14) {
        stalledDeals.push({
          id: deal.id,
          title: deal.opportunity_title || deal.title || 'Untitled Mandate',
          client: deal.client_organization || deal.organization || deal.client_name || 'Institutional Client',
          sbu,
          stage: deal.stage || 'In Pipeline',
          days: daysInStage,
        });
      }
    });

    const decidedCount = totalWon + totalLost;
    const trueWinRate = decidedCount > 0 ? Math.round((totalWon / decidedCount) * 100) : 0;
    const avgVelocityDays =
      allOpenDays.length > 0
        ? Math.round(allOpenDays.reduce((a, b) => a + b, 0) / allOpenDays.length)
        : 0;

    const sbuRows = Object.values(sbuMap).map((row) => {
      const concluded = row.won + row.lost;
      const winPct = concluded > 0 ? `${Math.round((row.won / concluded) * 100)}%` : 'Pending';
      const avgDays =
        row.daysList.length > 0
          ? `${Math.round(row.daysList.reduce((a, b) => a + b, 0) / row.daysList.length)}d`
          : '—';
      return { ...row, concluded, winPct, avgDays };
    });

    stalledDeals.sort((a, b) => b.days - a.days);

    return {
      totalWon,
      totalLost,
      totalUnderReview,
      totalActiveTor,
      decidedCount,
      trueWinRate,
      avgVelocityDays,
      sbuRows,
      stalledDeals: stalledDeals.slice(0, 5),
    };
  }, [deals]);

  if (loading) {
    return (
      <div className="icap-analytics-wrap">
        <style>{STYLES}</style>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Loading Decision-Based Win-Rate &amp; Velocity Analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="icap-analytics-wrap">
      <style>{STYLES}</style>

      <div className="icap-analytics-header">
        <div>
          <h3 className="icap-analytics-title">
            📊 True Decision-Based Win Rate &amp; Stage Velocity
          </h3>
          <p className="icap-analytics-sub">
            Separates pending &quot;Under Review&quot; submissions from concluded decisions (Won ÷ [Won + Lost]) to prevent metric distortion.
          </p>
        </div>
        <span
          className="icap-badge"
          style={{ backgroundColor: '#eff6ff', color: '#253E5E', border: '1px solid #bfdbfe' }}
        >
          Governance Formula: Won ÷ Concluded Bids
        </span>
      </div>

      <div className="icap-kpi-grid">
        <div className="icap-kpi-box" style={{ borderLeft: '4px solid #F78019' }}>
          <div className="icap-kpi-label">True Decided Win Rate</div>
          <div className="icap-kpi-num" style={{ color: '#F78019' }}>
            {metrics.decidedCount > 0 ? `${metrics.trueWinRate}%` : 'Awaiting Decisions'}
          </div>
          <div className="icap-kpi-foot">
            <strong>{metrics.totalWon} Won</strong> vs. <strong>{metrics.totalLost} Lost</strong> ({metrics.decidedCount} concluded)
          </div>
        </div>

        <div className="icap-kpi-box" style={{ borderLeft: '4px solid #4A7DBC' }}>
          <div className="icap-kpi-label">Submitted / Under Review</div>
          <div className="icap-kpi-num" style={{ color: '#4A7DBC' }}>
            {metrics.totalUnderReview}
          </div>
          <div className="icap-kpi-foot">
            Excluded from win-rate denominator until client decision
          </div>
        </div>

        <div className="icap-kpi-box" style={{ borderLeft: '4px solid #253E5E' }}>
          <div className="icap-kpi-label">Active TOR &amp; Drafting</div>
          <div className="icap-kpi-num">{metrics.totalActiveTor}</div>
          <div className="icap-kpi-foot">
            Mandates currently in technical &amp; financial preparation
          </div>
        </div>

        <div className="icap-kpi-box" style={{ borderLeft: '4px solid #059669' }}>
          <div className="icap-kpi-label">Avg. Stage Dwell Time</div>
          <div className="icap-kpi-num" style={{ color: '#059669' }}>
            {metrics.avgVelocityDays} Days
          </div>
          <div className="icap-kpi-foot">
            Average age across active open pipeline deals
          </div>
        </div>
      </div>

      <div className="icap-split-panels">
        <div className="icap-panel-card">
          <div className="icap-panel-heading">
            <span>4-SBU Win Conversion &amp; Velocity Breakdown</span>
          </div>
          <table className="icap-table">
            <thead>
              <tr>
                <th>SBU</th>
                <th>Won</th>
                <th>Lost</th>
                <th>Under Review</th>
                <th>True Win %</th>
                <th>Avg Velocity</th>
              </tr>
            </thead>
            <tbody>
              {metrics.sbuRows.map((row) => (
                <tr key={row.code}>
                  <td>
                    <strong style={{ color: '#253E5E' }}>{row.code}</strong>{' '}
                    <span style={{ color: '#64748b', fontSize: '11.5px' }}>({row.name})</span>
                  </td>
                  <td>
                    <strong style={{ color: '#059669' }}>{row.won}</strong>
                  </td>
                  <td>{row.lost}</td>
                  <td>
                    <span
                      className="icap-badge"
                      style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                    >
                      {row.review} pending
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#253E5E' }}>{row.winPct}</strong>
                  </td>
                  <td>{row.avgDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="icap-panel-card">
          <div className="icap-panel-heading">
            <span>⏱️ Stage Bottleneck Watchlist (&ge; 14 Days)</span>
            <span
              className="icap-badge"
              style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}
            >
              {metrics.stalledDeals.length} Flagged
            </span>
          </div>

          {metrics.stalledDeals.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: '#64748b', padding: '14px 0' }}>
              All active mandates are moving within the 14-day stage velocity threshold.
            </div>
          ) : (
            metrics.stalledDeals.map((item) => (
              <div key={item.id} className="icap-stalled-item">
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#253E5E' }}>
                    {item.client}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#7c2d12' }}>
                    {item.title} • <strong>{item.sbu}</strong> ({item.stage})
                  </div>
                </div>
                <span
                  className="icap-badge"
                  style={{ backgroundColor: '#F78019', color: '#ffffff', whiteSpace: 'nowrap' }}
                >
                  {item.days}d in stage
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}