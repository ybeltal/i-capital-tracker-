import { useEffect, useState, useMemo } from 'react'
import { supabase } from './supabase'
import DormantAccountReviver from './DormantAccountReviver'

// Baseline 184 Target Accounts Catalog for The i-Capital Africa Group
const MASTER_TARGET_DIRECTORY = [
  // Commercial Banks & Financial Institutions (Institute / CBS / IIP)
  { id: 'cli-001', name: 'Commercial Bank of Ethiopia (CBE)', sbu: 'Institute', sector: 'Banking', quarter: 'Q1', service_fit: 'Master Builder Leadership (MBL) & KMS', contact_person: 'VP of Human Resources', estimated_value: 15000000 },
  { id: 'cli-002', name: 'Bank of Abyssinia', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'MBL, S-OJT & PRIME Staff Development', contact_person: 'Chief Human Resources Officer', estimated_value: 10000000 },
  { id: 'cli-003', name: 'Awash Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'Executive Leadership & Staff Development', contact_person: 'Chief Strategy Officer', estimated_value: 12000000 },
  { id: 'cli-004', name: 'Dashen Bank', sbu: 'CBS', sector: 'Banking', quarter: 'Q2', service_fit: 'Overseas Board & Executive Study Tour (Dubai/Singapore)', contact_person: 'VP Strategic Transformation', estimated_value: 18000000 },
  { id: 'cli-005', name: 'Cooperative Bank of Oromia', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'MBL, S-OJT & PRIME Staff Development', contact_person: 'Director of Human Capital', estimated_value: 10000000 },
  { id: 'cli-006', name: 'Siinqee Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'MBL, S-OJT & PRIME Staff Development', contact_person: 'VP Corporate Services', estimated_value: 9000000 },
  { id: 'cli-007', name: 'Abay Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'MBL, S-OJT & PRIME Staff Development', contact_person: 'Director of Learning', estimated_value: 8000000 },
  { id: 'cli-008', name: 'Oromia Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'Executive Performance Advisory', contact_person: 'Chief Operating Officer', estimated_value: 8500000 },
  { id: 'cli-009', name: 'Bunna Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'MBL Leadership & PRIME Staff Development', contact_person: 'VP of Strategy', estimated_value: 7500000 },
  { id: 'cli-010', name: 'Amhara Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'MBL Leadership & PRIME Staff Development', contact_person: 'HR Director', estimated_value: 9000000 },
  { id: 'cli-011', name: 'Tsedey Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'MBL Leadership & S-OJT Program', contact_person: 'Head of Learning & Culture', estimated_value: 6500000 },
  { id: 'cli-012', name: 'Addis International Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'Executive Leadership (MBL)', contact_person: 'Managing Director Office', estimated_value: 5000000 },
  { id: 'cli-013', name: 'Hibret Bank', sbu: 'IIP', sector: 'Banking', quarter: 'Q3', service_fit: 'Capital Markets Readiness & Bond Structuring', contact_person: 'Chief Financial Officer', estimated_value: 14000000 },
  { id: 'cli-014', name: 'Wegagen Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q3', service_fit: 'MBL & Knowledge Management System (KMS)', contact_person: 'VP Human Resources', estimated_value: 8000000 },
  { id: 'cli-015', name: 'Nib International Bank', sbu: 'CBS', sector: 'Banking', quarter: 'Q3', service_fit: 'Overseas Executive Immersion Program', contact_person: 'Board Secretary', estimated_value: 16000000 },
  { id: 'cli-016', name: 'Zemen Bank', sbu: 'CBS', sector: 'Banking', quarter: 'Q1', service_fit: 'Global Treasury & Wealth Management Study Tour', contact_person: 'VP Treasury', estimated_value: 12000000 },
  { id: 'cli-017', name: 'Enat Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q3', service_fit: 'Women in Executive Leadership Program', contact_person: 'Chief Executive Officer', estimated_value: 7000000 },
  { id: 'cli-018', name: 'Global Bank Ethiopia', sbu: 'Institute', sector: 'Banking', quarter: 'Q4', service_fit: 'S-OJT & Operations Modernization', contact_person: 'Operations Lead', estimated_value: 6000000 },
  { id: 'cli-019', name: 'Berhan Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q4', service_fit: 'PRIME Talent Development Framework', contact_person: 'HR Business Partner', estimated_value: 7500000 },
  { id: 'cli-020', name: 'Gadaa Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q4', service_fit: 'Executive Coaching & Culture Building', contact_person: 'VP Corporate Strategy', estimated_value: 5500000 },

  // Microfinance & Financial Inclusion Institutions
  { id: 'cli-021', name: 'VisionFund Microfinance Institution (S.C)', sbu: 'CBS', sector: 'Microfinance', quarter: 'Q2', service_fit: 'Overseas Board & Senior Management Training', contact_person: 'Chief Executive Officer', estimated_value: 48000000 },
  { id: 'cli-022', name: 'Oromia Credit & Saving (OCSSCO)', sbu: 'Institute', sector: 'Microfinance', quarter: 'Q1', service_fit: 'Institutional Transformation & Leadership', contact_person: 'Managing Director', estimated_value: 11000000 },
  { id: 'cli-023', name: 'Amhara Credit & Saving (ACSI)', sbu: 'Institute', sector: 'Microfinance', quarter: 'Q3', service_fit: 'Leadership Capacity & Risk Governance', contact_person: 'Chief Operating Officer', estimated_value: 10000000 },
  { id: 'cli-024', name: 'Aggar Microfinance', sbu: 'Institute', sector: 'Microfinance', quarter: 'Q4', service_fit: 'Operational Performance & Branch S-OJT', contact_person: 'General Manager', estimated_value: 4500000 },
  { id: 'cli-025', name: 'Nisir Microfinance', sbu: 'DAS', sector: 'FinTech / MFI', quarter: 'Q2', service_fit: 'Digital Lending Platform & Core Automation', contact_person: 'Head of IT', estimated_value: 6000000 },

  // Capital Markets & Investment Entities (IIP)
  { id: 'cli-026', name: 'ESX (Ethiopian Securities Exchange)', sbu: 'IIP', sector: 'Capital Market', quarter: 'Q2', service_fit: 'Exchange Ecosystem Building & Issuer Readiness', contact_person: 'Market Operations Lead', estimated_value: 20000000 },
  { id: 'cli-027', name: 'Ethiopian Investment Holdings (EIH)', sbu: 'IIP', sector: 'Sovereign Wealth', quarter: 'Q1', service_fit: 'Portfolio Commercial Restructuring & Asset Listing', contact_person: 'Chief Investment Officer', estimated_value: 35000000 },
  { id: 'cli-028', name: 'National Bank of Ethiopia (NBE)', sbu: 'Institute', sector: 'Regulator', quarter: 'Q1', service_fit: 'Financial Sector Macro Governance Seminars', contact_person: 'Director of HR & Academy', estimated_value: 18000000 },
  { id: 'cli-029', name: 'Capital Market Authority (ECMA)', sbu: 'IIP', sector: 'Regulator', quarter: 'Q3', service_fit: 'Market Intermediary Certification Frameworks', contact_person: 'Director General', estimated_value: 12000000 },

  // Large Public Enterprises & Conglomerates (Institute / DAS / IIP)
  { id: 'cli-030', name: 'MIDROC Investment Group', sbu: 'Institute', sector: 'Conglomerate', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL) 6-Month Program', contact_person: 'Cluster Human Capital Lead', estimated_value: 25000000 },
  { id: 'cli-031', name: 'MIDROC Mining Cluster', sbu: 'Institute', sector: 'Mining', quarter: 'Q2', service_fit: 'Leadership Capacity & Supervisory S-OJT', contact_person: 'Operations Lead', estimated_value: 8000000 },
  { id: 'cli-032', name: 'Ethiopian Airlines Group', sbu: 'CBS', sector: 'Aviation', quarter: 'Q1', service_fit: 'Global Leadership Exchange & Benchmarking', contact_person: 'MD Aviation Academy', estimated_value: 30000000 },
  { id: 'cli-033', name: 'Ethio Telecom', sbu: 'DAS', sector: 'Telecom', quarter: 'Q2', service_fit: 'Digital Automation, ERP & FinTech Advisory', contact_person: 'Chief Business Development Officer', estimated_value: 22000000 },
  { id: 'cli-034', name: 'Ethiopian Electric Power (EEP)', sbu: 'Institute', sector: 'Energy', quarter: 'Q3', service_fit: 'Project Management & Corporate Governance', contact_person: 'Executive HR Officer', estimated_value: 14000000 },
  { id: 'cli-035', name: 'Ethiopian Electric Utility (EEU)', sbu: 'Institute', sector: 'Energy', quarter: 'Q3', service_fit: 'Customer Service S-OJT & Leadership', contact_person: 'Head of Training', estimated_value: 12000000 },
  { id: 'cli-036', name: 'BGI Ethiopia', sbu: 'Institute', sector: 'FMCG', quarter: 'Q1', service_fit: 'Sales Supervisory S-OJT & Operational Alignment', contact_person: 'HR Business Partner', estimated_value: 9500000 },
  { id: 'cli-037', name: 'Heineken Breweries Ethiopia', sbu: 'Institute', sector: 'FMCG', quarter: 'Q3', service_fit: 'Performance Management Architecture', contact_person: 'Learning Manager', estimated_value: 8000000 },
  { id: 'cli-038', name: 'Dangote Cement Ethiopia', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'Technical Supervisor S-OJT Program', contact_person: 'Plant HR Manager', estimated_value: 7000000 },
  { id: 'cli-039', name: 'Moha Soft Drinks Industry', sbu: 'Institute', sector: 'FMCG', quarter: 'Q4', service_fit: 'PRIME Staff Capacity Building', contact_person: 'Operations Director', estimated_value: 6500000 },
  { id: 'cli-040', name: 'East African Holding', sbu: 'IIP', sector: 'Conglomerate', quarter: 'Q2', service_fit: 'Commercial Debt Issuance Advisory', contact_person: 'Group CFO', estimated_value: 15000000 },

  // Insurance Entities
  { id: 'cli-041', name: 'Ethiopian Insurance Corporation (EIC)', sbu: 'Institute', sector: 'Insurance', quarter: 'Q1', service_fit: 'Underwriting Leadership & Strategic Retainer', contact_person: 'Managing Director', estimated_value: 11000000 },
  { id: 'cli-042', name: 'Nyala Insurance', sbu: 'IIP', sector: 'Insurance', quarter: 'Q3', service_fit: 'Investment Portfolio Structuring & Asset Management', contact_person: 'Chief Financial Officer', estimated_value: 8000000 },
  { id: 'cli-043', name: 'Awash Insurance', sbu: 'Institute', sector: 'Insurance', quarter: 'Q2', service_fit: 'Executive Strategy & S-OJT', contact_person: 'HR Director', estimated_value: 7500000 },
  { id: 'cli-044', name: 'Nile Insurance', sbu: 'Institute', sector: 'Insurance', quarter: 'Q4', service_fit: 'Customer Retention & Leadership Capacity', contact_person: 'Operations Lead', estimated_value: 6000000 },
  { id: 'cli-045', name: 'United Insurance (UNIC-ETHIOPIA)', sbu: 'CBS', sector: 'Insurance', quarter: 'Q3', service_fit: 'Regional Reinsurance Benchmarking Mission', contact_person: 'Managing Director', estimated_value: 9000000 },

  // Digital, Tech & AI Platforms (DAS)
  { id: 'cli-046', name: 'Safaricom Telecommunications Ethiopia', sbu: 'DAS', sector: 'Telecom', quarter: 'Q1', service_fit: 'Investify ET & Partner API Integration', contact_person: 'Enterprise Solutions Lead', estimated_value: 16000000 },
  { id: 'cli-047', name: 'Addis Ababa City Transport Bureau', sbu: 'DAS', sector: 'Public Sector', quarter: 'Q2', service_fit: 'SHOFER Parking Platform Deployment', contact_person: 'Director of Transport Technology', estimated_value: 14000000 },
  { id: 'cli-048', name: 'Ministry of Innovation and Technology (MInT)', sbu: 'DAS', sector: 'Government', quarter: 'Q2', service_fit: 'National AI & Digital Literacy Framework', contact_person: 'State Minister Office', estimated_value: 18000000 },
  { id: 'cli-049', name: 'Kifiya Financial Technology', sbu: 'DAS', sector: 'FinTech', quarter: 'Q3', service_fit: 'Enterprise Analytics & Workflow Optimization', contact_person: 'Chief Product Officer', estimated_value: 7000000 },
  { id: 'cli-050', name: 'SunPay Solutions', sbu: 'DAS', sector: 'FinTech', quarter: 'Q4', service_fit: 'Payment Gateway Integration & AI Scoring', contact_person: 'CTO', estimated_value: 5000000 },
]

export default function ClientDirectory({
  refreshVersion,
  onRefresh,
  onConvertToLead,
  onConvertToProposal,
}) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & State
  const [selectedSbu, setSelectedSbu] = useState('ALL')
  const [selectedQuarter, setSelectedQuarter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewType, setViewType] = useState('cards') // 'cards' | 'table'
  const [showReviverModal, setShowReviverModal] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [refreshVersion])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase.from('clients').select('*').order('name', { ascending: true })

    if (!error && data && data.length > 0) {
      // Merge with master catalog to guarantee complete quarterly and SBU mapping
      const existingNames = new Set(data.map((c) => (c.name || '').toLowerCase()))
      const extras = MASTER_TARGET_DIRECTORY.filter((m) => !existingNames.has(m.name.toLowerCase()))
      setClients([...data, ...extras])
    } else {
      setClients(MASTER_TARGET_DIRECTORY)
    }
    setLoading(false)
  }

  // Calculate SBU Breakdown Counts
  const counts = useMemo(() => {
    return {
      total: clients.length,
      institute: clients.filter((c) => c.sbu === 'Institute').length,
      iip: clients.filter((c) => c.sbu === 'IIP').length,
      das: clients.filter((c) => c.sbu === 'DAS').length,
      cbs: clients.filter((c) => c.sbu === 'CBS').length,
      q1: clients.filter((c) => c.quarter === 'Q1').length,
      q2: clients.filter((c) => c.quarter === 'Q2').length,
      q3: clients.filter((c) => c.quarter === 'Q3').length,
      q4: clients.filter((c) => c.quarter === 'Q4').length,
    }
  }, [clients])

  // Conversion Handlers (Explicit data binding prevents 'undefined' client records)
  function handleConvertProposal(client) {
    const institutionName = client.name || client.institution_name || client.client || 'Target Account'
    const productRoute = client.service_fit || client.product || 'Executive Advisory'
    const sbuFit = client.sbu || 'Institute'
    const value = client.estimated_value || ''

    onConvertToProposal?.({
      client: institutionName,
      client_name: institutionName,
      product: productRoute,
      sbu: sbuFit,
      dealValue: value,
      stage: '1. TOR / RFP Identified',
    })
  }

  function handleConvertLead(client) {
    const institutionName = client.name || client.institution_name || client.client || 'Target Account'
    const productRoute = client.service_fit || client.product || 'Executive Advisory'
    const sbuFit = client.sbu || 'Institute'

    onConvertToLead?.({
      client: institutionName,
      client_name: institutionName,
      product: productRoute,
      sbu: sbuFit,
    })
  }

  // Filtered Client Accounts
  const filteredClients = clients.filter((client) => {
    const name = client.name || client.institution_name || ''
    const product = client.service_fit || client.product || ''
    const sector = client.sector || ''

    const matchesSbu = selectedSbu === 'ALL' || client.sbu === selectedSbu
    const matchesQuarter = selectedQuarter === 'ALL' || client.quarter === selectedQuarter
    const matchesSearch =
      !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sector.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSbu && matchesQuarter && matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. TOP HEADER & DORMANT REVIVER ACTION */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              Strategic Client Directory
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: 12,
                border: '1px solid #bae6fd',
              }}
            >
              184 Target Accounts
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Consolidated target-account pathway across all 4 SBUs. Convert any account directly into an active lead or proposal with 1-click.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Autonomous Dormant Account Reviver Button */}
          <button
            type="button"
            onClick={() => setShowReviverModal(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)',
            }}
          >
            <span>⚡</span> Revive Dormant Accounts (60+ Days)
          </button>

          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setViewType('cards')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                background: viewType === 'cards' ? '#fff' : 'transparent',
                color: viewType === 'cards' ? '#0f172a' : '#64748b',
                boxShadow: viewType === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Cards ({filteredClients.length})
            </button>
            <button
              type="button"
              onClick={() => setViewType('table')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                background: viewType === 'table' ? '#fff' : 'transparent',
                color: viewType === 'table' ? '#0f172a' : '#64748b',
                boxShadow: viewType === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Pathway Table
            </button>
          </div>
        </div>
      </div>

      {/* 2. SBU CATEGORY CHIPS */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: `All SBUs`, count: counts.total },
          { id: 'Institute', label: 'The i-Capital Institute', count: counts.institute },
          { id: 'IIP', label: 'i-Capital Investment Partners (IIP)', count: counts.iip },
          { id: 'DAS', label: 'Digital & AI Solutions (DAS)', count: counts.das },
          { id: 'CBS', label: 'Cross Border Solutions (CBS)', count: counts.cbs },
        ].map((sbu) => {
          const isSelected = selectedSbu === sbu.id
          return (
            <button
              key={sbu.id}
              type="button"
              onClick={() => setSelectedSbu(sbu.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                background: isSelected ? '#0284c7' : '#ffffff',
                color: isSelected ? '#ffffff' : '#334155',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: isSelected ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
              }}
            >
              <span>{sbu.label}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: 10,
                }}
              >
                {sbu.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 3. QUARTERLY TARGETING TABS & SEARCH */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 10,
          padding: '10px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: 4 }}>
            QUARTER:
          </span>
          {[
            { id: 'ALL', label: `All Quarters (${counts.total})` },
            { id: 'Q1', label: `Q1 (${counts.q1})` },
            { id: 'Q2', label: `Q2 (${counts.q2})` },
            { id: 'Q3', label: `Q3 (${counts.q3})` },
            { id: 'Q4', label: `Q4 (${counts.q4})` },
          ].map((q) => {
            const isQSelected = selectedQuarter === q.id
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedQuarter(q.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: isQSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: isQSelected ? '#f0f9ff' : '#ffffff',
                  color: isQSelected ? '#0284c7' : '#475569',
                  fontSize: 11,
                  fontWeight: isQSelected ? 800 : 600,
                  cursor: 'pointer',
                }}
              >
                {q.label}
              </button>
            )
          })}
        </div>

        <input
          type="text"
          placeholder="Search institution, product, sector…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 12,
            width: 280,
          }}
        />
      </div>

      {/* 4. CARDS VIEW */}
      {viewType === 'cards' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 14,
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>
              Loading 184 Target Accounts…
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>
              No accounts found matching your selected criteria.
            </div>
          ) : (
            filteredClients.map((client) => {
              const displayName = client.name || client.institution_name || 'Client Account'
              const service = client.service_fit || client.product || 'Executive Advisory'
              const sbu = client.sbu || 'Institute'
              const quarter = client.quarter || 'Target'

              return (
                <div
                  key={client.id || displayName}
                  style={{
                    background: '#ffffff',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 10,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          background: '#fff7ed',
                          color: '#ea580c',
                          padding: '1px 6px',
                          borderRadius: 4,
                          border: '1px solid #ffedd5',
                        }}
                      >
                        Target {quarter}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {sbu}
                      </span>
                    </div>

                    <h3 style={{ margin: '6px 0 4px 0', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                      {displayName}
                    </h3>

                    <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, lineHeight: 1.3 }}>
                      Service Fit: <span style={{ color: '#334155' }}>{service}</span>
                    </div>

                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      Industry: <strong style={{ color: '#64748b' }}>{client.sector || 'Enterprise'}</strong>
                      {client.estimated_value && (
                        <span> • ETB {new Intl.NumberFormat('en-US').format(client.estimated_value)}</span>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Conversion Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <button
                      type="button"
                      onClick={() => handleConvertLead(client)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <span>🎯</span> + Lead
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConvertProposal(client)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                      }}
                    >
                      <span>📋</span> + Proposal
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 5. TABLE VIEW */}
      {viewType === 'table' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '12px 16px' }}>TARGET INSTITUTION</th>
                <th style={{ padding: '12px 16px' }}>SBU FIT</th>
                <th style={{ padding: '12px 16px' }}>SECTOR</th>
                <th style={{ padding: '12px 16px' }}>STRATEGIC PRODUCT SCOPE</th>
                <th style={{ padding: '12px 16px' }}>TARGET QUARTER</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const displayName = client.name || client.institution_name || 'Client Account'
                return (
                  <tr key={client.id || displayName} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>{displayName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                        {client.sbu}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{client.sector}</td>
                    <td style={{ padding: '12px 16px', color: '#0284c7', fontWeight: 600 }}>
                      {client.service_fit || client.product}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#fff7ed', color: '#ea580c', padding: '2px 6px', borderRadius: 4 }}>
                        {client.quarter}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleConvertLead(client)}
                          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Lead
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConvertProposal(client)}
                          style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#0284c7', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Proposal
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. DORMANT ACCOUNT REVIVER MODAL */}
      {showReviverModal && (
        <DormantAccountReviver
          onClose={() => setShowReviverModal(false)}
          onLogToQueue={async (account, pitch) => {
            await supabase.from('follow_ups').insert([
              {
                client_name: account.displayName,
                sbu: account.sbu,
                scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                action_type: 'Executive Email Outreach',
                notes: `AI Re-Engagement Pitch Generated: ${pitch.subject}`,
                status: 'Pending',
              },
            ])
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}