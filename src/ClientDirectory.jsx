import { useState } from 'react'

// Official Target Client Architecture from FY 2026/27 Readiness Report (§4.2, §5.2, §6.2)
const TARGET_CLIENT_PATHWAY = [
  // ==========================================
  // THE i-CAPITAL INSTITUTE
  // ==========================================
  { id: 'inst-1', client: 'CBE (Commercial Bank of Ethiopia)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-2', client: 'MIDROC Mining', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q1', category: 'Mining / Industrial' },
  { id: 'inst-3', client: 'Awash Bank', sbu: 'Institute', product: 'S-OJT & MBL', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-4', client: 'Dashen Bank', sbu: 'Institute', product: 'S-OJT & MBL', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-5', client: 'Coca-Cola (CCBA Ethiopia)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q1', category: 'FMCG / Manufacturing' },
  { id: 'inst-6', client: 'Hibret Bank', sbu: 'Institute', product: 'S-OJT', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-7', client: 'Zemen Bank', sbu: 'Institute', product: 'PRIME & S-OJT', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-8', client: 'Nib Bank', sbu: 'Institute', product: 'PRIME & S-OJT', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-9', client: 'Enat Bank', sbu: 'Institute', product: 'BDS & VSM (Gender Bond)', quarter: 'Q1', category: 'Banking' },

  { id: 'inst-10', client: 'Bank of Abyssinia', sbu: 'Institute', product: 'MBL, S-OJT & PRIME', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-11', client: 'Cooperative Bank of Oromia', sbu: 'Institute', product: 'MBL, S-OJT & PRIME', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-12', client: 'DBE (Development Bank of Ethiopia)', sbu: 'Institute', product: 'MBL, S-OJT & PRIME', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-13', client: 'Siinqee Bank', sbu: 'Institute', product: 'MBL, S-OJT & PRIME', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-14', client: 'Abay Bank', sbu: 'Institute', product: 'MBL & S-OJT', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-15', client: 'Oromia Bank', sbu: 'Institute', product: 'MBL & S-OJT', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-16', client: 'Wegagen Bank', sbu: 'Institute', product: 'MBL & S-OJT', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-17', client: 'Bunna Bank', sbu: 'Institute', product: 'MBL & PRIME', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-18', client: 'Amhara Bank', sbu: 'Institute', product: 'MBL & PRIME', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-19', client: 'Tsedey Bank', sbu: 'Institute', product: 'MBL & PRIME', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-20', client: 'ESX (Ethiopian Securities Exchange)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q2', category: 'Capital Market' },
  { id: 'inst-21', client: 'NBE (National Bank of Ethiopia)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q2', category: 'Regulatory' },
  { id: 'inst-22', client: 'Ethio telecom', sbu: 'Institute', product: 'MBL & KMS', quarter: 'Q2', category: 'Telecom' },
  { id: 'inst-23', client: 'EEP (Ethiopian Electric Power)', sbu: 'Institute', product: 'MBL & KMS', quarter: 'Q2', category: 'Energy' },
  { id: 'inst-24', client: 'BGI Ethiopia', sbu: 'Institute', product: 'MBL Leadership Transition', quarter: 'Q2', category: 'Manufacturing' },
  { id: 'inst-25', client: 'African Development Bank (AfDB)', sbu: 'Institute', product: 'BDS & Afro Data', quarter: 'Q2', category: 'Development Partner' },
  { id: 'inst-26', client: 'Mastercard Foundation', sbu: 'Institute', product: 'BDS & Afro Data', quarter: 'Q2', category: 'Development Partner' },
  { id: 'inst-27', client: 'World Bank / IFC', sbu: 'Institute', product: 'Afro Data & BDS', quarter: 'Q2', category: 'Development Partner' },

  { id: 'inst-28', client: 'EIC (Ethiopian Investment Commission)', sbu: 'Institute', product: 'MBL, S-OJT & Strategize', quarter: 'Q3', category: 'Government Agency' },
  { id: 'inst-29', client: 'IPDC (Industrial Parks Dev. Corp.)', sbu: 'Institute', product: 'S-OJT & KMS', quarter: 'Q3', category: 'Industrial' },
  { id: 'inst-30', client: 'Dangote Cement Ethiopia', sbu: 'Institute', product: 'S-OJT & KMS', quarter: 'Q3', category: 'Manufacturing' },
  { id: 'inst-31', client: 'Awash Insurance', sbu: 'Institute', product: 'MBL & PRIME', quarter: 'Q3', category: 'Insurance' },
  { id: 'inst-32', client: 'Nyala Insurance', sbu: 'Institute', product: 'MBL & PRIME', quarter: 'Q3', category: 'Insurance' },
  { id: 'inst-33', client: 'United Insurance', sbu: 'Institute', product: 'MBL & PRIME', quarter: 'Q3', category: 'Insurance' },
  { id: 'inst-34', client: 'EEU (Ethiopian Electric Utility)', sbu: 'Institute', product: 'MBL & KMS', quarter: 'Q3', category: 'Energy' },
  { id: 'inst-35', client: 'Heineken Ethiopia', sbu: 'Institute', product: 'MBL & KMS', quarter: 'Q3', category: 'FMCG' },
  { id: 'inst-36', client: 'East African Holding', sbu: 'Institute', product: 'MBL & KMS', quarter: 'Q3', category: 'Conglomerate' },
  { id: 'inst-37', client: 'OFAG (Office of the Federal Auditor General)', sbu: 'Institute', product: 'MBL & S-OJT', quarter: 'Q3', category: 'Government Body' },
  { id: 'inst-38', client: 'ECMA (Ethiopian Capital Market Authority)', sbu: 'Institute', product: 'MBL Governance', quarter: 'Q3', category: 'Regulatory' },

  { id: 'inst-39', client: 'ETICPA', sbu: 'Institute', product: 'S-OJT In-Company Trainer', quarter: 'Q4', category: 'Professional Association' },
  { id: 'inst-40', client: 'Bole Lemi Industrial Park', sbu: 'Institute', product: 'MBL & KMS', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-41', client: 'Hawassa Industrial Park', sbu: 'Institute', product: 'MBL & KMS', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-42', client: 'Kilinto Industrial Park', sbu: 'Institute', product: 'MBL & KMS', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-43', client: 'Adama & Dire Dawa Industrial Parks', sbu: 'Institute', product: 'MBL & KMS', quarter: 'Q4', category: 'Industrial Park' },

  // ==========================================
  // i-CAPITAL INVESTMENT PARTNERS (IIP)
  // ==========================================
  { id: 'iip-1', client: 'Nisir Microfinance Institution', sbu: 'IIP', product: 'Rights Offer Advisory', quarter: 'Q1', category: 'Microfinance' },
  { id: 'iip-2', client: 'Meklit MFI', sbu: 'IIP', product: 'Rights Offer Advisory', quarter: 'Q1', category: 'Microfinance' },
  { id: 'iip-3', client: 'Meftihe MFI', sbu: 'IIP', product: 'Rights Offer Advisory', quarter: 'Q1', category: 'Microfinance' },

  { id: 'iip-4', client: 'Dynamic MFI', sbu: 'IIP', product: 'Rights Offer Advisory', quarter: 'Q2', category: 'Microfinance' },
  { id: 'iip-5', client: 'Global Insurance', sbu: 'IIP', product: 'Rights Offer & Capital Market Advisory', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-6', client: 'Tsehay Insurance', sbu: 'IIP', product: 'Rights Offer & Capital Market Advisory', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-7', client: 'Ethio Re (Ethiopian Reinsurance)', sbu: 'IIP', product: 'Rights Offer & Investor Advisory', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-8', client: 'Flintstone Engineering & Homes', sbu: 'IIP', product: 'Corporate Bond & Commercial Paper Advisory', quarter: 'Q2', category: 'Real Estate / Construction' },
  { id: 'iip-9', client: 'Ayat Real Estate', sbu: 'IIP', product: 'Corporate Bond & Commercial Paper Advisory', quarter: 'Q2', category: 'Real Estate' },
  { id: 'iip-10', client: 'Public Servants Social Security Admin', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Institutional Investor' },
  { id: 'iip-11', client: 'POESSA (Private Org. Employees Security Agency)', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Institutional Investor' },
  { id: 'iip-12', client: 'ZamZam Bank', sbu: 'IIP', product: 'Corporate Bond Advisory', quarter: 'Q2', category: 'Banking' },

  { id: 'iip-13', client: 'Hijra Bank', sbu: 'IIP', product: 'Capital Market Readiness & Training', quarter: 'Q3', category: 'Banking' },
  { id: 'iip-14', client: 'Metemamen MFI', sbu: 'IIP', product: 'Capital Market Readiness & Training', quarter: 'Q3', category: 'Microfinance' },
  { id: 'iip-15', client: 'Oromia Insurance', sbu: 'IIP', product: 'Capital Market Advisory', quarter: 'Q3', category: 'Insurance' },
  { id: 'iip-16', client: 'Global Bank Ethiopia', sbu: 'IIP', product: 'Equity Market Access Route', quarter: 'Q3', category: 'Banking' },
  { id: 'iip-17', client: 'Anbessa Bank', sbu: 'IIP', product: 'Equity Market Access Route', quarter: 'Q4', category: 'Banking' },
  { id: 'iip-18', client: 'Gadaa Bank', sbu: 'IIP', product: 'Equity Market Access Route', quarter: 'Q4', category: 'Banking' },

  // ==========================================
  // DIGITAL & AI SOLUTIONS (DAS)
  // ==========================================
  { id: 'das-1', client: 'Addis Ababa Government Parking Stations', sbu: 'DAS', product: 'SHOFER Parking Platform', quarter: 'Q1', category: 'Mobility / Public' },
  { id: 'das-2', client: 'Bishoftu Government Parking Stations', sbu: 'DAS', product: 'SHOFER Parking Platform', quarter: 'Q2', category: 'Mobility / Municipal' },
  { id: 'das-3', client: 'Addis Ababa Car Wash & Garage Stations', sbu: 'DAS', product: 'SHOFER Car Wash & Auto Care', quarter: 'Q2', category: 'Mobility Ecosystem' },
  { id: 'das-4', client: 'Top 5 Motor Insurers Pool', sbu: 'DAS', product: 'SHOFER Insurance Integration', quarter: 'Q2', category: 'FinTech / InsurTech' },
  { id: 'das-5', client: 'Adama Government Parking Stations', sbu: 'DAS', product: 'SHOFER Parking Platform', quarter: 'Q3', category: 'Mobility / Municipal' },
  { id: 'das-6', client: 'CSD Ethiopia (Central Securities Depository)', sbu: 'DAS', product: 'Investify ET Platform', quarter: 'Q3', category: 'FinTech' },
  { id: 'das-7', client: 'Ethiopian Enterprise ERP Accounts', sbu: 'DAS', product: 'Enterprise ERP Implementation', quarter: 'Q3', category: 'Enterprise AI' },

  // ==========================================
  // CROSS BORDER SOLUTIONS (CBS)
  // ==========================================
  { id: 'cbs-1', client: 'Bank of Abyssinia Executive Delegation', sbu: 'CBS', product: 'Executive Leadership Immersion (Thailand)', quarter: 'Q1', category: 'Study Tour' },
  { id: 'cbs-2', client: 'Hibret Bank Board of Directors', sbu: 'CBS', product: 'Board Study Tour & Benchmark (Singapore)', quarter: 'Q1', category: 'Study Tour' },
  { id: 'cbs-3', client: 'Gohbetoch Bank Leadership', sbu: 'CBS', product: 'Board & CEO Training Immersion', quarter: 'Q1', category: 'Study Tour' },
  { id: 'cbs-4', client: 'National Switch & Payment Infrastructure', sbu: 'CBS', product: 'Digital Payments & Interoperability Advisory', quarter: 'Q2', category: 'Financial Infrastructure' },
  { id: 'cbs-5', client: 'EthSwitch & Financial Institutions', sbu: 'CBS', product: 'National Financial Mission', quarter: 'Q3', category: 'Financial Infrastructure' },
  { id: 'cbs-6', client: 'Regional Corridor & Logistics Mission', sbu: 'CBS', product: 'Cross-Border Trade & Policy Solutions', quarter: 'Q4', category: 'Trade Corridor' },
]

export default function ClientDirectory({ onConvertToLead, onConvertToProposal }) {
  const [selectedQuarter, setSelectedQuarter] = useState('ALL')
  const [selectedSbu, setSelectedSbu] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('cards') // 'cards' vs 'table'

  const filteredClients = TARGET_CLIENT_PATHWAY.filter((item) => {
    const matchesQuarter = selectedQuarter === 'ALL' || item.quarter === selectedQuarter
    const matchesSbu = selectedSbu === 'ALL' || item.sbu === selectedSbu
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      item.client.toLowerCase().includes(q) ||
      item.product.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)

    return matchesQuarter && matchesSbu && matchesSearch
  })

  const quarterCounts = {
    Q1: TARGET_CLIENT_PATHWAY.filter((c) => c.quarter === 'Q1').length,
    Q2: TARGET_CLIENT_PATHWAY.filter((c) => c.quarter === 'Q2').length,
    Q3: TARGET_CLIENT_PATHWAY.filter((c) => c.quarter === 'Q3').length,
    Q4: TARGET_CLIENT_PATHWAY.filter((c) => c.quarter === 'Q4').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Header & Governance Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '20px 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: 18 }}>
              Official Institutional Target Client Directory
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              FY 2026/27 Approved Readiness Baseline
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
            Multi-SBU quarterly target-account pathways mapped by strategic product fit. Convert any target into an active CRM deal with one click.
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', background: '#e2e8f0', padding: 3, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: viewMode === 'cards' ? '#fff' : 'transparent',
              color: viewMode === 'cards' ? '#0f172a' : '#64748b',
            }}
          >
            Directory Cards ({filteredClients.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: viewMode === 'table' ? '#fff' : 'transparent',
              color: viewMode === 'table' ? '#0f172a' : '#64748b',
            }}
          >
            Pathway Table
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        {/* Quarter Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginRight: 4 }}>
            Quarter:
          </span>
          {['ALL', 'Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
            const isActive = selectedQuarter === q
            const count = q === 'ALL' ? TARGET_CLIENT_PATHWAY.length : quarterCounts[q]
            return (
              <button
                key={q}
                type="button"
                onClick={() => setSelectedQuarter(q)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #0284c7' : '1px solid #cbd5e1',
                  background: isActive ? '#0284c7' : '#f8fafc',
                  color: isActive ? '#fff' : '#475569',
                }}
              >
                {q === 'ALL' ? 'All Quarters' : q} ({count})
              </button>
            )
          })}
        </div>

        {/* SBU & Search Filter */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedSbu}
            onChange={(e) => setSelectedSbu(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, background: '#fff' }}
          >
            <option value="ALL">All SBUs (Institute, IIP, DAS, CBS)</option>
            <option value="Institute">The i-Capital Institute</option>
            <option value="IIP">Investment Partners (IIP)</option>
            <option value="DAS">Digital &amp; AI Solutions (DAS)</option>
            <option value="CBS">Cross Border Solutions (CBS)</option>
          </select>

          <input
            type="text"
            placeholder="Search account, product, sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, width: 240 }}
          />
        </div>
      </div>

      {/* View 1: Card Grid */}
      {viewMode === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredClients.map((item) => (
            <div
              key={item.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 16,
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284c7')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: item.quarter === 'Q1' ? '#e0f2fe' : item.quarter === 'Q2' ? '#fef3c7' : item.quarter === 'Q3' ? '#dcfce7' : '#f3e8ff',
                      color: item.quarter === 'Q1' ? '#0369a1' : item.quarter === 'Q2' ? '#92400e' : item.quarter === 'Q3' ? '#166534' : '#6b21a8',
                    }}
                  >
                    Target {item.quarter}
                  </span>

                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                    {item.sbu}
                  </span>
                </div>

                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  {item.client}
                </div>

                <div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>
                  <strong style={{ color: '#64748b', fontSize: 11 }}>Service Fit: </strong>
                  {item.product}
                </div>

                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Industry: {item.category}
                </div>
              </div>

              {/* Conversion Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => onConvertToLead?.(item.client)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #0284c7',
                    background: '#f0f9ff',
                    color: '#0284c7',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🎯 + Lead
                </button>
                <button
                  type="button"
                  onClick={() => onConvertToProposal?.(item.client)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0284c7',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📋 + Proposal
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* View 2: Table */
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Target Quarter</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Client Account Name</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Strategic SBU</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Product / Route Fit</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Sector Category</th>
                <th style={{ padding: '10px 14px', color: '#475569', textAlign: 'right' }}>Convert to Deal</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: c.quarter === 'Q1' ? '#e0f2fe' : c.quarter === 'Q2' ? '#fef3c7' : c.quarter === 'Q3' ? '#dcfce7' : '#f3e8ff',
                        color: c.quarter === 'Q1' ? '#0369a1' : c.quarter === 'Q2' ? '#92400e' : c.quarter === 'Q3' ? '#166534' : '#6b21a8',
                      }}
                    >
                      {c.quarter}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{c.client}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0369a1' }}>{c.sbu}</td>
                  <td style={{ padding: '10px 14px', color: '#334155' }}>{c.product}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{c.category}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => onConvertToLead?.(c.client)}
                      style={{
                        padding: '4px 8px',
                        marginRight: 6,
                        borderRadius: 4,
                        border: '1px solid #0284c7',
                        background: '#f0f9ff',
                        color: '#0284c7',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => onConvertToProposal?.(c.client)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: 'none',
                        background: '#0284c7',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Proposal
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}