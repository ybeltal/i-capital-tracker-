import { useState } from 'react'

// Master Target Client Pathway from FY 2026/27 SBU Pipeline Readiness Report (§4.2, §5.2, §6.2)
const MASTER_TARGET_CLIENTS = [
  // =========================================================================
  // 1. THE i-CAPITAL INSTITUTE (§4.2)
  // =========================================================================
  // Q1
  { id: 'inst-1', client: 'CBE (Commercial Bank of Ethiopia)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-2', client: 'MIDROC Mining', sbu: 'Institute', product: 'Master Builder Leadership (MBL) & S-OJT', quarter: 'Q1', category: 'Mining / Industrial' },
  { id: 'inst-3', client: 'Awash Bank', sbu: 'Institute', product: 'S-OJT & Master Builder Leadership (MBL)', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-4', client: 'Dashen Bank', sbu: 'Institute', product: 'S-OJT & Master Builder Leadership (MBL)', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-5', client: 'Coca-Cola (CCBA Ethiopia)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q1', category: 'FMCG / Manufacturing' },
  { id: 'inst-6', client: 'Hibret Bank', sbu: 'Institute', product: 'Structured On-the-Job Training (S-OJT)', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-7', client: 'Zemen Bank', sbu: 'Institute', product: 'PRIME Staff Development & S-OJT', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-8', client: 'Nib Bank', sbu: 'Institute', product: 'PRIME Staff Development & S-OJT', quarter: 'Q1', category: 'Banking' },
  { id: 'inst-9', client: 'Enat Bank', sbu: 'Institute', product: 'BDS & Value Stream Mapping (Gender Bond)', quarter: 'Q1', category: 'Banking' },

  // Q2
  { id: 'inst-10', client: 'Bank of Abyssinia', sbu: 'Institute', product: 'MBL, S-OJT & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-11', client: 'Cooperative Bank of Oromia', sbu: 'Institute', product: 'MBL, S-OJT & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-12', client: 'Development Bank of Ethiopia (DBE)', sbu: 'Institute', product: 'MBL, S-OJT & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-13', client: 'Siinqee Bank', sbu: 'Institute', product: 'MBL, S-OJT & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-14', client: 'Abay Bank', sbu: 'Institute', product: 'MBL, S-OJT & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-15', client: 'Oromia Bank', sbu: 'Institute', product: 'MBL, S-OJT & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-16', client: 'Wegagen Bank', sbu: 'Institute', product: 'MBL, S-OJT & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-17', client: 'Bunna Bank', sbu: 'Institute', product: 'MBL Leadership & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-18', client: 'Amhara Bank', sbu: 'Institute', product: 'MBL Leadership & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-19', client: 'Tsedey Bank', sbu: 'Institute', product: 'MBL Leadership & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-20', client: 'Addis International Bank', sbu: 'Institute', product: 'MBL Leadership & PRIME Staff Development', quarter: 'Q2', category: 'Banking' },
  { id: 'inst-21', client: 'ESX (Ethiopian Securities Exchange)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q2', category: 'Capital Market' },
  { id: 'inst-22', client: 'NBE (National Bank of Ethiopia)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q2', category: 'Regulatory' },
  { id: 'inst-23', client: 'CSD Ethiopia (Central Securities Depository)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q2', category: 'Capital Market' },
  { id: 'inst-24', client: 'Ethio telecom', sbu: 'Institute', product: 'MBL Leadership & Knowledge Management (KMS)', quarter: 'Q2', category: 'Telecom' },
  { id: 'inst-25', client: 'EEP (Ethiopian Electric Power)', sbu: 'Institute', product: 'MBL, PRIME & Knowledge Management (KMS)', quarter: 'Q2', category: 'Energy' },
  { id: 'inst-26', client: 'EEU (Ethiopian Electric Utility)', sbu: 'Institute', product: 'Knowledge Management System (KMS)', quarter: 'Q2', category: 'Energy' },
  { id: 'inst-27', client: 'Wave 1 & 2 Public Reform Institutions', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q2', category: 'Public Sector' },
  { id: 'inst-28', client: 'MIDROC Agricultural Cluster', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q2', category: 'Agribusiness' },
  { id: 'inst-29', client: 'Ethiopian Shipping & Logistics (ESL)', sbu: 'Institute', product: 'MBL Leadership & KMS Deployment', quarter: 'Q2', category: 'Logistics' },
  { id: 'inst-30', client: 'EIH (Ethiopian Investment Holdings)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q2', category: 'Sovereign Wealth' },
  { id: 'inst-31', client: 'Ethiopian Artificial Intelligence Institute', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q2', category: 'Government / AI' },
  { id: 'inst-32', client: 'BGI Ethiopia', sbu: 'Institute', product: 'Executive Leadership Transition (MBL)', quarter: 'Q2', category: 'Manufacturing' },
  { id: 'inst-33', client: 'African Development Bank (AfDB)', sbu: 'Institute', product: 'BDS & Afro Data Research Subscription', quarter: 'Q2', category: 'Development Partner' },
  { id: 'inst-34', client: 'Mastercard Foundation', sbu: 'Institute', product: 'BDS & Afro Data Research Subscription', quarter: 'Q2', category: 'Development Partner' },
  { id: 'inst-35', client: 'World Bank / IFC', sbu: 'Institute', product: 'Afro Data & BDS Advisory', quarter: 'Q2', category: 'Development Partner' },
  { id: 'inst-36', client: 'UNDP Ethiopia', sbu: 'Institute', product: 'Business Development Services (BDS) & VSM', quarter: 'Q2', category: 'UN Agency' },
  { id: 'inst-37', client: 'UNIDO Ethiopia', sbu: 'Institute', product: 'Business Development Services (BDS) & VSM', quarter: 'Q2', category: 'UN Agency' },
  { id: 'inst-38', client: 'ILO (International Labour Organization)', sbu: 'Institute', product: 'Business Development Services (BDS) & VSM', quarter: 'Q2', category: 'UN Agency' },
  { id: 'inst-39', client: 'EU Delegation to Ethiopia', sbu: 'Institute', product: 'Business Development Services (BDS) & VSM', quarter: 'Q2', category: 'Development Partner' },
  { id: 'inst-40', client: 'JICA & KOICA Ethiopia', sbu: 'Institute', product: 'Business Development Services (BDS) & VSM', quarter: 'Q2', category: 'Development Partner' },
  { id: 'inst-41', client: 'GIZ Ethiopia', sbu: 'Institute', product: 'Afro Data Research & Intelligence', quarter: 'Q2', category: 'Development Partner' },
  { id: 'inst-42', client: 'Ethiopian Economics Association (EEA)', sbu: 'Institute', product: 'Afro Data Research & Intelligence', quarter: 'Q2', category: 'Research / Think Tank' },
  { id: 'inst-43', client: 'Federal Civil Service Commission', sbu: 'Institute', product: 'Strategize / Institutional Transformation', quarter: 'Q2', category: 'Government Body' },
  { id: 'inst-44', client: 'Ministry of Planning & Development', sbu: 'Institute', product: 'Strategize / Institutional Transformation', quarter: 'Q2', category: 'Ministry' },
  { id: 'inst-45', client: 'Ministry of Finance', sbu: 'Institute', product: 'Strategize / Institutional Transformation', quarter: 'Q2', category: 'Ministry' },
  { id: 'inst-46', client: 'Ministry of Innovation & Technology (MInT)', sbu: 'Institute', product: 'Strategize / Institutional Transformation', quarter: 'Q2', category: 'Ministry' },
  { id: 'inst-47', client: 'Office of the Prime Minister (PMO)', sbu: 'Institute', product: 'Strategize / Institutional Transformation', quarter: 'Q2', category: 'Government Body' },

  // Q3
  { id: 'inst-48', client: 'EIC (Ethiopian Investment Commission)', sbu: 'Institute', product: 'MBL, S-OJT, PRIME & Strategize', quarter: 'Q3', category: 'Government Agency' },
  { id: 'inst-49', client: 'IPDC (Industrial Parks Dev. Corp.)', sbu: 'Institute', product: 'S-OJT, MBL, PRIME & KMS Deployment', quarter: 'Q3', category: 'Industrial Infrastructure' },
  { id: 'inst-50', client: 'Dangote Cement Ethiopia', sbu: 'Institute', product: 'S-OJT, MBL, PRIME & KMS Deployment', quarter: 'Q3', category: 'Manufacturing' },
  { id: 'inst-51', client: 'Awash Insurance', sbu: 'Institute', product: 'MBL Leadership & PRIME Staff Development', quarter: 'Q3', category: 'Insurance' },
  { id: 'inst-52', client: 'Nyala Insurance', sbu: 'Institute', product: 'MBL Leadership & PRIME Staff Development', quarter: 'Q3', category: 'Insurance' },
  { id: 'inst-53', client: 'United Insurance', sbu: 'Institute', product: 'MBL Leadership & PRIME Staff Development', quarter: 'Q3', category: 'Insurance' },
  { id: 'inst-54', client: 'Africa Insurance', sbu: 'Institute', product: 'MBL Leadership & PRIME Staff Development', quarter: 'Q3', category: 'Insurance' },
  { id: 'inst-55', client: 'Nib Insurance', sbu: 'Institute', product: 'PRIME Staff Development Program', quarter: 'Q3', category: 'Insurance' },
  { id: 'inst-56', client: 'OIC (Oromia Insurance Company)', sbu: 'Institute', product: 'MBL Leadership & PRIME Staff Development', quarter: 'Q3', category: 'Insurance' },
  { id: 'inst-57', client: 'East African Holding', sbu: 'Institute', product: 'MBL, PRIME & KMS Deployment', quarter: 'Q3', category: 'Conglomerate' },
  { id: 'inst-58', client: 'Heineken Ethiopia', sbu: 'Institute', product: 'MBL, PRIME & KMS Deployment', quarter: 'Q3', category: 'FMCG / Brewery' },
  { id: 'inst-59', client: 'Sunshine Construction & Investment', sbu: 'Institute', product: 'MBL, PRIME & KMS Deployment', quarter: 'Q3', category: 'Construction / Hotel' },
  { id: 'inst-60', client: 'AABE (Accounting & Auditing Board)', sbu: 'Institute', product: 'S-OJT & Master Builder Leadership (MBL)', quarter: 'Q3', category: 'Regulatory Body' },
  { id: 'inst-61', client: 'OFAG (Federal Auditor General)', sbu: 'Institute', product: 'S-OJT & Master Builder Leadership (MBL)', quarter: 'Q3', category: 'Government Audit' },
  { id: 'inst-62', client: 'ECMA (Ethiopian Capital Market Authority)', sbu: 'Institute', product: 'Master Builder Leadership (MBL)', quarter: 'Q3', category: 'Regulatory' },
  { id: 'inst-63', client: 'PRINCO', sbu: 'Institute', product: 'PRIME Staff Development & KMS', quarter: 'Q3', category: 'Manufacturing' },
  { id: 'inst-64', client: 'SNV Netherlands Development Org.', sbu: 'Institute', product: 'BDS, VSM & Afro Data', quarter: 'Q3', category: 'Development Partner' },
  { id: 'inst-65', client: 'CARE Ethiopia', sbu: 'Institute', product: 'BDS, VSM & Afro Data', quarter: 'Q3', category: 'Development Partner' },
  { id: 'inst-66', client: 'Mercy Corps Ethiopia', sbu: 'Institute', product: 'BDS, VSM & Afro Data', quarter: 'Q3', category: 'Development Partner' },
  { id: 'inst-67', client: 'Save the Children Ethiopia', sbu: 'Institute', product: 'BDS, VSM & Afro Data', quarter: 'Q3', category: 'Development Partner' },
  { id: 'inst-68', client: 'World Vision Ethiopia', sbu: 'Institute', product: 'BDS, VSM & Afro Data', quarter: 'Q3', category: 'Development Partner' },
  { id: 'inst-69', client: 'Palladium Group Ethiopia', sbu: 'Institute', product: 'BDS, VSM & Afro Data', quarter: 'Q3', category: 'Consulting / Advisory' },
  { id: 'inst-70', client: 'DAI Global Ethiopia', sbu: 'Institute', product: 'BDS, VSM & Afro Data', quarter: 'Q3', category: 'Development Advisory' },
  { id: 'inst-71', client: 'Chemonics International Ethiopia', sbu: 'Institute', product: 'BDS, VSM & Afro Data', quarter: 'Q3', category: 'Development Advisory' },
  { id: 'inst-72', client: 'Ministry of Labour & Skills (MoLS)', sbu: 'Institute', product: 'Strategize / Institutional Modernization', quarter: 'Q3', category: 'Ministry' },
  { id: 'inst-73', client: 'Ministry of Revenue (MoR)', sbu: 'Institute', product: 'Strategize / Institutional Modernization', quarter: 'Q3', category: 'Ministry' },
  { id: 'inst-74', client: 'Ministry of Agriculture (MoA)', sbu: 'Institute', product: 'Strategize / Institutional Modernization', quarter: 'Q3', category: 'Ministry' },
  { id: 'inst-75', client: 'Ethiopian Statistics Service (ESS)', sbu: 'Institute', product: 'Strategize & Afro Data Intelligence', quarter: 'Q3', category: 'Government Agency' },
  { id: 'inst-76', client: 'Ethiopian Customs Commission (ECC)', sbu: 'Institute', product: 'Strategize / Institutional Modernization', quarter: 'Q3', category: 'Government Commission' },
  { id: 'inst-77', client: 'Ethiopian Civil Aviation Authority (ECAA)', sbu: 'Institute', product: 'Strategize / Transformation', quarter: 'Q3', category: 'Aviation Regulatory' },

  // Q4
  { id: 'inst-78', client: 'ETICPA (Institute of Certified Public Accountants)', sbu: 'Institute', product: 'S-OJT In-Company Trainer Certification', quarter: 'Q4', category: 'Professional Body' },
  { id: 'inst-79', client: 'Ethiopian Enterprise Development (EED)', sbu: 'Institute', product: 'PRIME Staff Development & Strategize', quarter: 'Q4', category: 'Government Enterprise' },
  { id: 'inst-80', client: 'Ethiopian Women Entrepreneurs Association', sbu: 'Institute', product: 'PRIME Staff Development & BDS', quarter: 'Q4', category: 'Business Association' },
  { id: 'inst-81', client: 'Ethiopian Leather Industries Association', sbu: 'Institute', product: 'PRIME Staff Development Program', quarter: 'Q4', category: 'Industry Association' },
  { id: 'inst-82', client: 'Ethiopian Textile & Garment Association', sbu: 'Institute', product: 'PRIME Staff Development Program', quarter: 'Q4', category: 'Industry Association' },
  { id: 'inst-83', client: 'Ethiopian Horticulture Producer Exporters', sbu: 'Institute', product: 'PRIME Staff Development Program', quarter: 'Q4', category: 'Export Association' },
  { id: 'inst-84', client: 'Ethiopian Coffee Exporters Association', sbu: 'Institute', product: 'PRIME Staff Development Program', quarter: 'Q4', category: 'Export Association' },
  { id: 'inst-85', client: 'Bole Lemi Industrial Park Tenants', sbu: 'Institute', product: 'MBL, Strategize & KMS Deployment', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-86', client: 'Hawassa Industrial Park Tenants', sbu: 'Institute', product: 'MBL, Strategize & KMS Deployment', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-87', client: 'Kilinto Industrial Park Tenants', sbu: 'Institute', product: 'MBL, Strategize & KMS Deployment', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-88', client: 'Eastern Industry Zone (Dukem) Tenants', sbu: 'Institute', product: 'MBL, Strategize & KMS Deployment', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-89', client: 'Kombolcha & Mekelle Industrial Parks', sbu: 'Institute', product: 'MBL, Strategize & KMS Deployment', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-90', client: 'Adama & Dire Dawa Industrial Parks', sbu: 'Institute', product: 'MBL, Strategize & KMS Deployment', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-91', client: 'Jimma & Bahir Dar Industrial Parks', sbu: 'Institute', product: 'MBL, Strategize & KMS Deployment', quarter: 'Q4', category: 'Industrial Park' },
  { id: 'inst-92', client: 'Addis Ababa City Administration', sbu: 'Institute', product: 'MBL, Strategize & Afro Data Subscription', quarter: 'Q4', category: 'Municipal Government' },
  { id: 'inst-93', client: 'Sheger City Administration', sbu: 'Institute', product: 'MBL, Strategize & Afro Data Subscription', quarter: 'Q4', category: 'Municipal Government' },

  // =========================================================================
  // 2. i-CAPITAL INVESTMENT PARTNERS (IIP) (§5.2)
  // =========================================================================
  // Q1
  { id: 'iip-1', client: 'Nisir Microfinance Institution (MFI)', sbu: 'IIP', product: 'Rights Offer Advisory', quarter: 'Q1', category: 'Microfinance' },
  { id: 'iip-2', client: 'Meklit Microfinance Institution (MFI)', sbu: 'IIP', product: 'Rights Offer Advisory', quarter: 'Q1', category: 'Microfinance' },
  { id: 'iip-3', client: 'Meftihe Microfinance Institution (MFI)', sbu: 'IIP', product: 'Rights Offer Advisory', quarter: 'Q1', category: 'Microfinance' },
  { id: 'iip-4', client: 'Enat Bank', sbu: 'IIP', product: 'Investor Solutions / Market Access Route', quarter: 'Q1', category: 'Banking' },

  // Q2
  { id: 'iip-5', client: 'Dynamic Microfinance Institution (MFI)', sbu: 'IIP', product: 'Rights Offer Advisory', quarter: 'Q2', category: 'Microfinance' },
  { id: 'iip-6', client: 'Global Insurance', sbu: 'IIP', product: 'Rights Offer & Capital Market Advisory', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-7', client: 'Tsehay Insurance', sbu: 'IIP', product: 'Rights Offer & Capital Market Advisory', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-8', client: 'Ethio Re (Ethiopian Reinsurance)', sbu: 'IIP', product: 'Rights Offer & Investor Advisory', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-9', client: 'Bunna Bank', sbu: 'IIP', product: 'Rights Offer Advisory & Capital Market Training', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-10', client: 'Hijra Bank', sbu: 'IIP', product: 'Rights Offer Advisory & Market Readiness', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-11', client: 'Zemen Bank', sbu: 'IIP', product: 'Rights Offer Advisory & Investor Solutions', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-12', client: 'Enat Bank', sbu: 'IIP', product: 'Corporate Bond & Commercial Paper Advisory', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-13', client: 'Dashen Bank', sbu: 'IIP', product: 'Corporate Bond & Commercial Paper Advisory', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-14', client: 'Hibret Bank', sbu: 'IIP', product: 'Corporate Bond & Commercial Paper Advisory', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-15', client: 'Flintstone Engineering & Homes', sbu: 'IIP', product: 'Corporate Bond & Commercial Paper Advisory', quarter: 'Q2', category: 'Real Estate / Construction' },
  { id: 'iip-16', client: 'Ayat Real Estate', sbu: 'IIP', product: 'Corporate Bond & Commercial Paper Advisory', quarter: 'Q2', category: 'Real Estate' },
  { id: 'iip-17', client: 'ZamZam Bank', sbu: 'IIP', product: 'Corporate Bond / Sukuk Advisory', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-18', client: 'Public Servants Social Security Admin (PSSSA)', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Institutional Investor' },
  { id: 'iip-19', client: 'POESSA (Private Org. Employees Security Agency)', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Institutional Investor' },
  { id: 'iip-20', client: 'Anbessa Insurance', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-21', client: 'Oromia Insurance', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-22', client: 'Nile Insurance', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-23', client: 'Nice Insurance', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-24', client: 'Nib Insurance', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-25', client: 'Hibret Insurance', sbu: 'IIP', product: 'Capital Market Advisory Services', quarter: 'Q2', category: 'Insurance' },
  { id: 'iip-26', client: 'Awash Bank', sbu: 'IIP', product: 'Capital Market Readiness & Investor Solutions', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-27', client: 'Amhara Bank', sbu: 'IIP', product: 'Capital Market Readiness & Investor Solutions', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-28', client: 'Global Bank Ethiopia', sbu: 'IIP', product: 'Capital Market Readiness & Market Access', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-29', client: 'Anbessa Bank', sbu: 'IIP', product: 'Capital Market Readiness & Market Access', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-30', client: 'Gadaa Bank', sbu: 'IIP', product: 'Capital Market Readiness & Market Access', quarter: 'Q2', category: 'Banking' },
  { id: 'iip-31', client: 'IFC (International Finance Corporation)', sbu: 'IIP', product: 'Capital Market Readiness & Training Route', quarter: 'Q2', category: 'Multilateral' },
  { id: 'iip-32', client: 'FSD Ethiopia (Financial Sector Deepening)', sbu: 'IIP', product: 'Capital Market Readiness & Training Route', quarter: 'Q2', category: 'Development Partner' },
  { id: 'iip-33', client: 'GIZ Capital Market Program', sbu: 'IIP', product: 'Capital Market Readiness & Training Route', quarter: 'Q2', category: 'Development Partner' },

  // Q3
  { id: 'iip-34', client: 'Metemamen Microfinance Institution (MFI)', sbu: 'IIP', product: 'Capital Market Readiness & Training', quarter: 'Q3', category: 'Microfinance' },
  { id: 'iip-35', client: 'Nisir Microfinance Institution (MFI)', sbu: 'IIP', product: 'Capital Market Readiness & Training', quarter: 'Q3', category: 'Microfinance' },
  { id: 'iip-36', client: 'Meklit Microfinance Institution (MFI)', sbu: 'IIP', product: 'Capital Market Readiness & Training', quarter: 'Q3', category: 'Microfinance' },
  { id: 'iip-37', client: 'Hijra Bank', sbu: 'IIP', product: 'Capital Market Readiness & Training', quarter: 'Q3', category: 'Banking' },
  { id: 'iip-38', client: 'Cooperative Bank of Oromia', sbu: 'IIP', product: 'Capital Market Readiness & Debt Market Access', quarter: 'Q3', category: 'Banking' },
  { id: 'iip-39', client: 'Oromia Bank', sbu: 'IIP', product: 'Capital Market Readiness & Debt Market Access', quarter: 'Q3', category: 'Banking' },
  { id: 'iip-40', client: 'Ethio Re (Ethiopian Reinsurance)', sbu: 'IIP', product: 'Capital Market Readiness & Investor Solutions', quarter: 'Q3', category: 'Insurance' },
  { id: 'iip-41', client: 'Africa Insurance', sbu: 'IIP', product: 'Capital Market Readiness & Training', quarter: 'Q3', category: 'Insurance' },

  // Q4
  { id: 'iip-42', client: 'Commercial Bank of Ethiopia (CBE)', sbu: 'IIP', product: 'Strategic Transactions & M&A Route', quarter: 'Q4', category: 'Banking' },
  { id: 'iip-43', client: 'Target Corporate Issuers Pool', sbu: 'IIP', product: 'Equity Market Access & Public Listing Route', quarter: 'Q4', category: 'Capital Market Issuers' },
  { id: 'iip-44', client: 'Institutional Asset Owners & Wealth Clients', sbu: 'IIP', product: 'Investor Advisory & Wealth Management Route', quarter: 'Q4', category: 'Wealth / Institutional' },
  { id: 'iip-45', client: 'Direct Share Brokerage (DSB) Clients', sbu: 'IIP', product: 'Direct Share Brokerage (DSB) Route', quarter: 'Q4', category: 'Retail / Institutional' },

  // =========================================================================
  // 3. DIGITAL & AI SOLUTIONS (DAS) (§6.2)
  // =========================================================================
  // Q1
  { id: 'das-1', client: 'Addis Ababa Government Parking Stations', sbu: 'DAS', product: 'SHOFER Parking Platform Deployment', quarter: 'Q1', category: 'Mobility / Municipal' },
  { id: 'das-2', client: 'CBE (Commercial Bank of Ethiopia)', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q1', category: 'Banking' },
  { id: 'das-3', client: 'Awash Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q1', category: 'Banking' },
  { id: 'das-4', client: 'Dashen Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q1', category: 'Banking' },
  { id: 'das-5', client: 'Zemen Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q1', category: 'Banking' },
  { id: 'das-6', client: 'Nib Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q1', category: 'Banking' },
  { id: 'das-7', client: 'Enat Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q1', category: 'Banking' },
  { id: 'das-8', client: 'MIDROC Shakiso Mining Cluster', sbu: 'DAS', product: 'Master Builder Leadership (MBL)', quarter: 'Q1', category: 'Mining' },

  // Q2
  { id: 'das-9', client: 'Addis Ababa City Parking Stations', sbu: 'DAS', product: 'SHOFER Parking Platform Deployment', quarter: 'Q2', category: 'Mobility / Municipal' },
  { id: 'das-10', client: 'Bishoftu Government Parking Stations', sbu: 'DAS', product: 'SHOFER Parking Platform Deployment', quarter: 'Q2', category: 'Mobility / Municipal' },
  { id: 'das-11', client: 'Addis Ababa Car Wash Stations Pool', sbu: 'DAS', product: 'SHOFER Car Wash Solutions Platform', quarter: 'Q2', category: 'Mobility / Auto' },
  { id: 'das-12', client: 'Addis Ababa Garage & Auto-Care Stations', sbu: 'DAS', product: 'SHOFER Auto Care Platform Deployment', quarter: 'Q2', category: 'Mobility / Auto' },
  { id: 'das-13', client: 'Top 5 Motor Insurance Companies Pool', sbu: 'DAS', product: 'SHOFER Insurance Integration Engine', quarter: 'Q2', category: 'InsurTech' },
  { id: 'das-14', client: 'SHOFER Driver Community', sbu: 'DAS', product: 'SHOFER Learning & Driver Academy', quarter: 'Q2', category: 'EdTech / Mobility' },
  { id: 'das-15', client: 'SHOFER Ecosystem Mobility Partners', sbu: 'DAS', product: 'SHOFER Ecosystem Promotion & Media', quarter: 'Q2', category: 'Platform Media' },
  { id: 'das-16', client: 'Enat Bank', sbu: 'DAS', product: 'Micro-Credit Digital Lending Engine', quarter: 'Q2', category: 'FinTech' },
  { id: 'das-17', client: 'Bank of Abyssinia', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-18', client: 'Cooperative Bank of Oromia', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-19', client: 'Development Bank of Ethiopia (DBE)', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-20', client: 'Siinqee Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-21', client: 'Abay Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-22', client: 'Oromia Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-23', client: 'Wegagen Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-24', client: 'Bunna Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-25', client: 'Amhara Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-26', client: 'Global Bank Ethiopia', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-27', client: 'Anbessa Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },
  { id: 'das-28', client: 'Gadaa Bank', sbu: 'DAS', product: 'Investify ET Digital Retail Infrastructure', quarter: 'Q2', category: 'Banking' },

  // Q3
  { id: 'das-29', client: 'Addis Ababa Private Parking Stations Pool', sbu: 'DAS', product: 'SHOFER Parking Platform Deployment', quarter: 'Q3', category: 'Mobility / Private' },
  { id: 'das-30', client: 'Bishoftu Car Wash & Auto-Care Stations', sbu: 'DAS', product: 'SHOFER Car Wash & Auto Care Platform', quarter: 'Q3', category: 'Mobility / Auto' },
  { id: 'das-31', client: 'Adama Government Parking Stations', sbu: 'DAS', product: 'SHOFER Parking Platform Deployment', quarter: 'Q3', category: 'Mobility / Municipal' },
  { id: 'das-32', client: 'CSD Ethiopia (Central Securities Depository)', sbu: 'DAS', product: 'Investify ET Platform Integration', quarter: 'Q3', category: 'FinTech' },
  { id: 'das-33', client: 'ESX (Ethiopian Securities Exchange)', sbu: 'DAS', product: 'Investify ET Platform Integration', quarter: 'Q3', category: 'FinTech' },
  { id: 'das-34', client: 'Ethiopian Enterprise Accounts Pool', sbu: 'DAS', product: 'Enterprise ERP Implementation & AI Strategy', quarter: 'Q3', category: 'Enterprise AI' },

  // Q4
  { id: 'das-35', client: 'Adama Private Parking Stations Pool', sbu: 'DAS', product: 'SHOFER Parking Platform Deployment', quarter: 'Q4', category: 'Mobility / Municipal' },
  { id: 'das-36', client: 'Regional Mobility Corridors & Fleet Operators', sbu: 'DAS', product: 'SHOFER Platform Commercialization', quarter: 'Q4', category: 'Mobility Ecosystem' },
  { id: 'das-37', client: 'Priority Retail Investors & Corporates Pool', sbu: 'DAS', product: 'Investify ET Retail Investment Engine', quarter: 'Q4', category: 'FinTech' },

  // =========================================================================
  // 4. CROSS BORDER SOLUTIONS (CBS)
  // =========================================================================
  // Q1
  { id: 'cbs-1', client: 'Bank of Abyssinia Executive Delegation', sbu: 'CBS', product: 'Executive Leadership Immersion (Thailand)', quarter: 'Q1', category: 'Study Tour' },
  { id: 'cbs-2', client: 'Hibret Bank Board of Directors', sbu: 'CBS', product: 'Board Study Tour & Benchmark (Singapore)', quarter: 'Q1', category: 'Study Tour' },
  { id: 'cbs-3', client: 'Gohbetoch Bank Leadership', sbu: 'CBS', product: 'Board & CEO Training Immersion', quarter: 'Q1', category: 'Study Tour' },

  // Q2
  { id: 'cbs-4', client: 'National Switch & Payment Infrastructure', sbu: 'CBS', product: 'Digital Payments & Interoperability Advisory', quarter: 'Q2', category: 'Financial Infrastructure' },
  { id: 'cbs-5', client: 'EthSwitch & Commercial Banks Consortium', sbu: 'CBS', product: 'Cross-Border Switch Capacity Building', quarter: 'Q2', category: 'Financial Infrastructure' },

  // Q3
  { id: 'cbs-6', client: 'EthSwitch & Financial Institutions Delegation', sbu: 'CBS', product: 'National Financial Mission (Dubai / Singapore)', quarter: 'Q3', category: 'Study Tour' },
  { id: 'cbs-7', client: 'East African Trade & Banking Delegations', sbu: 'CBS', product: 'Cross-Border Industrial & Financial Mission', quarter: 'Q3', category: 'Trade Mission' },

  // Q4
  { id: 'cbs-8', client: 'Regional Corridor & Logistics Authorities', sbu: 'CBS', product: 'Cross-Border Trade & Policy Solutions', quarter: 'Q4', category: 'Trade Corridor' },
  { id: 'cbs-9', client: 'Bilateral Trade Modernization Entities', sbu: 'CBS', product: 'Regional Trade Corridor Advisory', quarter: 'Q4', category: 'Trade Policy' },
]

export default function ClientDirectory({ onConvertToLead, onConvertToProposal }) {
  const [selectedQuarter, setSelectedQuarter] = useState('ALL')
  const [selectedSbu, setSelectedSbu] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('cards')

  const filteredClients = MASTER_TARGET_CLIENTS.filter((item) => {
    const matchesQuarter = selectedQuarter === 'ALL' || item.quarter === selectedQuarter
    const matchesSbu = selectedSbu === 'ALL' || item.sbu === selectedSbu
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      item.client.toLowerCase().includes(q) ||
      item.product.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)

    return matchesQuarter && matchesSbu && matchesSearch
  })

  const sbuCounts = {
    ALL: MASTER_TARGET_CLIENTS.length,
    Institute: MASTER_TARGET_CLIENTS.filter((c) => c.sbu === 'Institute').length,
    IIP: MASTER_TARGET_CLIENTS.filter((c) => c.sbu === 'IIP').length,
    DAS: MASTER_TARGET_CLIENTS.filter((c) => c.sbu === 'DAS').length,
    CBS: MASTER_TARGET_CLIENTS.filter((c) => c.sbu === 'CBS').length,
  }

  const currentSbuPool = MASTER_TARGET_CLIENTS.filter(
    (c) => selectedSbu === 'ALL' || c.sbu === selectedSbu
  )
  const quarterCounts = {
    ALL: currentSbuPool.length,
    Q1: currentSbuPool.filter((c) => c.quarter === 'Q1').length,
    Q2: currentSbuPool.filter((c) => c.quarter === 'Q2').length,
    Q3: currentSbuPool.filter((c) => c.quarter === 'Q3').length,
    Q4: currentSbuPool.filter((c) => c.quarter === 'Q4').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header & Governance Baseline */}
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
            Consolidated target-account pathway mapped across all SBUs and strategic products. Convert any account directly into an active lead or proposal with 1-click.
          </p>
        </div>

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

      {/* 2. SBU Filter Navigation Buttons */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
        }}
      >
        {[
          { id: 'ALL', label: 'All SBUs' },
          { id: 'Institute', label: 'The i-Capital Institute' },
          { id: 'IIP', label: 'i-Capital Investment Partners (IIP)' },
          { id: 'DAS', label: 'Digital & AI Solutions (DAS)' },
          { id: 'CBS', label: 'Cross Border Solutions (CBS)' },
        ].map((sbu) => {
          const isActive = selectedSbu === sbu.id
          return (
            <button
              key={sbu.id}
              type="button"
              onClick={() => setSelectedSbu(sbu.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: isActive ? '1px solid #0284c7' : '1px solid #cbd5e1',
                background: isActive ? '#0284c7' : '#f8fafc',
                color: isActive ? '#ffffff' : '#334155',
                fontSize: 12,
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isActive ? '0 3px 8px rgba(2, 132, 199, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{sbu.label}</span>
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: isActive ? '#ffffff' : '#e2e8f0',
                  color: isActive ? '#0284c7' : '#64748b',
                  fontWeight: 800,
                }}
              >
                {sbuCounts[sbu.id]}
              </span>
            </button>
          )
        })}
      </div>

      {/* 3. Quarter Selector & Search Filter */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginRight: 4 }}>
            Quarter:
          </span>
          {['ALL', 'Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
            const isActive = selectedQuarter === q
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
                {q === 'ALL' ? 'All Quarters' : q} ({quarterCounts[q]})
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search institution, product, sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, width: 260 }}
          />
        </div>
      </div>

      {/* 4. Directory Cards */}
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

              {/* Pass the complete object */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => onConvertToLead?.(item)}
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
                  onClick={() => onConvertToProposal?.(item)}
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
        /* Pathway Table */
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Quarter</th>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Target Account</th>
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
                      onClick={() => onConvertToLead?.(c)}
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
                      onClick={() => onConvertToProposal?.(c)}
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