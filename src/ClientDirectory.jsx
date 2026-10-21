import { useEffect, useState, useMemo } from 'react'
import { supabase } from './supabase'
import DormantAccountReviver from './DormantAccountReviver'

// Official 184 Master Target-Client Baseline Pathway (Reconciles exactly to 184)
export const MASTER_184_DIRECTORY = [
  // ==========================================
  // 1. THE i-CAPITAL INSTITUTE (93 Accounts)
  // ==========================================
  // Q1 Targets (12)
  { id: 'inst-001', name: 'Awash Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q1', service_fit: 'S-OJT & Master Builder Leadership (MBL)', contact_person: 'Chief Strategy Officer', estimated_value: 12000000 },
  { id: 'inst-002', name: 'Dashen Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q1', service_fit: 'S-OJT & Master Builder Leadership (MBL)', contact_person: 'VP Human Resources', estimated_value: 11000000 },
  { id: 'inst-003', name: 'Hibret Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q1', service_fit: 'S-OJT Program', contact_person: 'Head of Learning & Culture', estimated_value: 7000000 },
  { id: 'inst-004', name: 'Zemen Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q1', service_fit: 'S-OJT, MBL & PRIME Staff Development', contact_person: 'Director of HR & Academy', estimated_value: 9500000 },
  { id: 'inst-005', name: 'Nib International Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q1', service_fit: 'S-OJT, MBL & PRIME Staff Development', contact_person: 'HR Business Partner', estimated_value: 8500000 },
  { id: 'inst-006', name: 'Commercial Bank of Ethiopia (CBE)', sbu: 'Institute', sector: 'Banking', quarter: 'Q1', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'VP Human Resources', estimated_value: 16000000 },
  { id: 'inst-007', name: 'MIDROC Mining', sbu: 'Institute', sector: 'Mining', quarter: 'Q1', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Operations Lead', estimated_value: 9000000 },
  { id: 'inst-008', name: 'Coca-Cola Beverages Africa', sbu: 'Institute', sector: 'FMCG', quarter: 'Q1', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Talent Director', estimated_value: 8000000 },
  { id: 'inst-009', name: 'Enat Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q1', service_fit: 'BDS & VSM (Gender Bond)', contact_person: 'Managing Director Office', estimated_value: 6500000 },
  { id: 'inst-010', name: 'Oromia Credit & Saving (OCSSCO)', sbu: 'Institute', sector: 'Microfinance', quarter: 'Q1', service_fit: 'Institutional Transformation & Leadership', contact_person: 'Managing Director', estimated_value: 11000000 },
  { id: 'inst-011', name: 'Ethiopian Insurance Corporation (EIC)', sbu: 'Institute', sector: 'Insurance', quarter: 'Q1', service_fit: 'Executive Strategy Retainer', contact_person: 'Managing Director', estimated_value: 11000000 },
  { id: 'inst-012', name: 'BGI Ethiopia Q1 Unit', sbu: 'Institute', sector: 'FMCG', quarter: 'Q1', service_fit: 'Sales Supervisory S-OJT', contact_person: 'HR Business Partner', estimated_value: 9500000 },

  // Q2 Targets (36)
  { id: 'inst-013', name: 'Bank of Abyssinia', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'S-OJT, MBL & PRIME Staff Development', contact_person: 'Chief Human Resources Officer', estimated_value: 10000000 },
  { id: 'inst-014', name: 'Cooperative Bank of Oromia', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'S-OJT, MBL & PRIME Staff Development', contact_person: 'Director of Human Capital', estimated_value: 10000000 },
  { id: 'inst-015', name: 'Development Bank of Ethiopia (DBE)', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'S-OJT, MBL & PRIME Staff Development', contact_person: 'VP Corporate Planning', estimated_value: 12000000 },
  { id: 'inst-016', name: 'Siinqee Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'S-OJT, MBL & PRIME Staff Development', contact_person: 'VP Corporate Services', estimated_value: 9000000 },
  { id: 'inst-017', name: 'Abay Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'S-OJT, MBL & PRIME Staff Development', contact_person: 'Director of Learning', estimated_value: 8000000 },
  { id: 'inst-018', name: 'Oromia Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'S-OJT, MBL & PRIME Staff Development', contact_person: 'Chief Operating Officer', estimated_value: 8500000 },
  { id: 'inst-019', name: 'Wegagen Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'S-OJT, MBL & PRIME Staff Development', contact_person: 'VP Human Resources', estimated_value: 8000000 },
  { id: 'inst-020', name: 'Bunna Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL) & PRIME', contact_person: 'VP Strategy', estimated_value: 7500000 },
  { id: 'inst-021', name: 'Amhara Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL) & PRIME', contact_person: 'HR Director', estimated_value: 9000000 },
  { id: 'inst-022', name: 'Tsedey Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL) & PRIME', contact_person: 'Head of Learning', estimated_value: 6500000 },
  { id: 'inst-023', name: 'Addis International Bank', sbu: 'Institute', sector: 'Banking', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL) & PRIME', contact_person: 'Managing Director Office', estimated_value: 5500000 },
  { id: 'inst-024', name: 'BGI Ethiopia', sbu: 'Institute', sector: 'FMCG', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Corporate Affairs Director', estimated_value: 9500000 },
  { id: 'inst-025', name: 'Ethiopian Securities Exchange (ESX)', sbu: 'Institute', sector: 'Capital Market', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Market Operations Lead', estimated_value: 12000000 },
  { id: 'inst-026', name: 'National Bank of Ethiopia (NBE)', sbu: 'Institute', sector: 'Regulator', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Director HR & Academy', estimated_value: 15000000 },
  { id: 'inst-027', name: 'CSD Ethiopia', sbu: 'Institute', sector: 'Capital Market', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Operations Lead', estimated_value: 6000000 },
  { id: 'inst-028', name: 'Ethio telecom', sbu: 'Institute', sector: 'Telecom', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Chief Business Development Officer', estimated_value: 20000000 },
  { id: 'inst-029', name: 'Ethiopian Electric Power (EEP)', sbu: 'Institute', sector: 'Energy', quarter: 'Q2', service_fit: 'MBL, PRIME & Knowledge Management (KMS)', contact_person: 'Executive HR Officer', estimated_value: 14000000 },
  { id: 'inst-030', name: 'Ethiopian Electric Utility (EEU)', sbu: 'Institute', sector: 'Energy', quarter: 'Q2', service_fit: 'Knowledge Management System (KMS)', contact_person: 'Head of Training', estimated_value: 12000000 },
  { id: 'inst-031', name: 'Ethiopian Shipping & Logistics', sbu: 'Institute', sector: 'Logistics', quarter: 'Q2', service_fit: 'MBL & Knowledge Management System (KMS)', contact_person: 'Corporate Planning Lead', estimated_value: 11000000 },
  { id: 'inst-032', name: 'Ethiopian Investment Holdings (EIH)', sbu: 'Institute', sector: 'Sovereign Wealth', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Chief Investment Officer', estimated_value: 25000000 },
  { id: 'inst-033', name: 'Artificial Intelligence Institute', sbu: 'Institute', sector: 'Government', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Director General Office', estimated_value: 8000000 },
  { id: 'inst-034', name: 'MIDROC Agricultural Cluster', sbu: 'Institute', sector: 'Agriculture', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Cluster Director', estimated_value: 7500000 },
  { id: 'inst-035', name: 'Wave 1 & 2 Reform Institutions', sbu: 'Institute', sector: 'Public Sector', quarter: 'Q2', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Governance Secretariat', estimated_value: 18000000 },
  { id: 'inst-036', name: 'Federal Civil Service Commission', sbu: 'Institute', sector: 'Government', quarter: 'Q2', service_fit: 'Strategize Policy Advisory', contact_person: 'Commissioner Office', estimated_value: 10000000 },
  { id: 'inst-037', name: 'Ministry of Planning & Development', sbu: 'Institute', sector: 'Government', quarter: 'Q2', service_fit: 'Strategize Advisory', contact_person: 'Policy Director', estimated_value: 9000000 },
  { id: 'inst-038', name: 'Ministry of Finance', sbu: 'Institute', sector: 'Government', quarter: 'Q2', service_fit: 'Strategize Macro Advisory', contact_person: 'State Minister Office', estimated_value: 14000000 },
  { id: 'inst-039', name: 'Ministry of Innovation & Technology (MInT)', sbu: 'Institute', sector: 'Government', quarter: 'Q2', service_fit: 'Strategize Advisory', contact_person: 'State Minister Office', estimated_value: 11000000 },
  { id: 'inst-040', name: 'Office of the Prime Minister', sbu: 'Institute', sector: 'Government', quarter: 'Q2', service_fit: 'Strategize Institutional Alignment', contact_person: 'Delivery Unit', estimated_value: 16000000 },
  { id: 'inst-041', name: 'African Development Bank (AfDB)', sbu: 'Institute', sector: 'Development', quarter: 'Q2', service_fit: 'BDS, VSM & Afro Data', contact_person: 'Country Program Lead', estimated_value: 18000000 },
  { id: 'inst-042', name: 'Mastercard Foundation', sbu: 'Institute', sector: 'Development', quarter: 'Q2', service_fit: 'BDS, VSM & Afro Data', contact_person: 'Country Director', estimated_value: 22000000 },
  { id: 'inst-043', name: 'UNDP Ethiopia', sbu: 'Institute', sector: 'Development', quarter: 'Q2', service_fit: 'BDS & VSM Frameworks', contact_person: 'Inclusive Growth Lead', estimated_value: 12000000 },
  { id: 'inst-044', name: 'UNIDO', sbu: 'Institute', sector: 'Development', quarter: 'Q2', service_fit: 'BDS & VSM Frameworks', contact_person: 'Industrial Specialist', estimated_value: 10000000 },
  { id: 'inst-045', name: 'ILO Ethiopia', sbu: 'Institute', sector: 'Development', quarter: 'Q2', service_fit: 'BDS & VSM Frameworks', contact_person: 'Workforce Advisor', estimated_value: 9000000 },
  { id: 'inst-046', name: 'EU Delegation to Ethiopia', sbu: 'Institute', sector: 'Development', quarter: 'Q2', service_fit: 'BDS & VSM Frameworks', contact_person: 'Private Sector Desk', estimated_value: 14000000 },
  { id: 'inst-047', name: 'JICA Ethiopia', sbu: 'Institute', sector: 'Development', quarter: 'Q2', service_fit: 'BDS & VSM Frameworks', contact_person: 'Chief Representative', estimated_value: 10000000 },
  { id: 'inst-048', name: 'KOICA Ethiopia', sbu: 'Institute', sector: 'Development', quarter: 'Q2', service_fit: 'BDS & VSM Frameworks', contact_person: 'Country Director', estimated_value: 8500000 },

  // Q3 Targets (30)
  { id: 'inst-049', name: 'Awash Insurance', sbu: 'Institute', sector: 'Insurance', quarter: 'Q3', service_fit: 'Master Builder Leadership (MBL) & PRIME', contact_person: 'HR Director', estimated_value: 7500000 },
  { id: 'inst-050', name: 'Nyala Insurance', sbu: 'Institute', sector: 'Insurance', quarter: 'Q3', service_fit: 'Master Builder Leadership (MBL) & PRIME', contact_person: 'Chief Operating Officer', estimated_value: 8000000 },
  { id: 'inst-051', name: 'United Insurance', sbu: 'Institute', sector: 'Insurance', quarter: 'Q3', service_fit: 'Master Builder Leadership (MBL) & PRIME', contact_person: 'Managing Director', estimated_value: 7000000 },
  { id: 'inst-052', name: 'Africa Insurance', sbu: 'Institute', sector: 'Insurance', quarter: 'Q3', service_fit: 'Master Builder Leadership (MBL) & PRIME', contact_person: 'HR Business Partner', estimated_value: 6500000 },
  { id: 'inst-053', name: 'Oromia Insurance Company (OIC)', sbu: 'Institute', sector: 'Insurance', quarter: 'Q3', service_fit: 'Master Builder Leadership (MBL) & PRIME', contact_person: 'Chief Operating Officer', estimated_value: 7000000 },
  { id: 'inst-054', name: 'Nib Insurance', sbu: 'Institute', sector: 'Insurance', quarter: 'Q3', service_fit: 'PRIME Staff Development Program', contact_person: 'Learning Manager', estimated_value: 5500000 },
  { id: 'inst-055', name: 'Industrial Parks Development Corp (IPDC)', sbu: 'Institute', sector: 'Government', quarter: 'Q3', service_fit: 'S-OJT, MBL, PRIME & KMS', contact_person: 'CEO Office', estimated_value: 15000000 },
  { id: 'inst-056', name: 'Dangote Cement', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q3', service_fit: 'S-OJT, MBL, PRIME & KMS', contact_person: 'Plant HR Manager', estimated_value: 9000000 },
  { id: 'inst-057', name: 'East African Holding', sbu: 'Institute', sector: 'Conglomerate', quarter: 'Q3', service_fit: 'MBL, PRIME & Knowledge Management (KMS)', contact_person: 'Group HR Director', estimated_value: 12000000 },
  { id: 'inst-058', name: 'Heineken Breweries', sbu: 'Institute', sector: 'FMCG', quarter: 'Q3', service_fit: 'MBL, PRIME & Knowledge Management (KMS)', contact_person: 'People Director', estimated_value: 8500000 },
  { id: 'inst-059', name: 'Sunshine Construction & Investment', sbu: 'Institute', sector: 'Construction', quarter: 'Q3', service_fit: 'MBL & Knowledge Management (KMS)', contact_person: 'Corporate Director', estimated_value: 7000000 },
  { id: 'inst-060', name: 'Accounting & Auditing Board (AABE)', sbu: 'Institute', sector: 'Regulator', quarter: 'Q3', service_fit: 'S-OJT & Master Builder Leadership (MBL)', contact_person: 'Director General', estimated_value: 6000000 },
  { id: 'inst-061', name: 'Office of Federal Auditor General (OFAG)', sbu: 'Institute', sector: 'Government', quarter: 'Q3', service_fit: 'S-OJT & Master Builder Leadership (MBL)', contact_person: 'Auditor General Office', estimated_value: 7500000 },
  { id: 'inst-062', name: 'ETICPA', sbu: 'Institute', sector: 'Professional Body', quarter: 'Q3', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'President', estimated_value: 4500000 },
  { id: 'inst-063', name: 'Ethiopian Capital Market Authority (ECMA)', sbu: 'Institute', sector: 'Regulator', quarter: 'Q3', service_fit: 'Master Builder Leadership (MBL)', contact_person: 'Director General', estimated_value: 12000000 },
  { id: 'inst-064', name: 'Ministry of Labour & Skills', sbu: 'Institute', sector: 'Government', quarter: 'Q3', service_fit: 'Strategize Technical Advisory', contact_person: 'State Minister Office', estimated_value: 12000000 },
  { id: 'inst-065', name: 'Ministry of Revenue', sbu: 'Institute', sector: 'Government', quarter: 'Q3', service_fit: 'Strategize Institutional Advisory', contact_person: 'Transformation Director', estimated_value: 11000000 },
  { id: 'inst-066', name: 'Ministry of Agriculture', sbu: 'Institute', sector: 'Government', quarter: 'Q3', service_fit: 'Strategize Institutional Advisory', contact_person: 'Policy Secretariat', estimated_value: 10000000 },
  { id: 'inst-067', name: 'Ethiopian Investment Commission (EIC)', sbu: 'Institute', sector: 'Government', quarter: 'Q3', service_fit: 'Strategize Advisory', contact_person: 'Commissioner Office', estimated_value: 9000000 },
  { id: 'inst-068', name: 'Ethiopian Statistics Service', sbu: 'Institute', sector: 'Government', quarter: 'Q3', service_fit: 'Strategize Advisory', contact_person: 'Director General', estimated_value: 7000000 },
  { id: 'inst-069', name: 'Ethiopian Customs Commission', sbu: 'Institute', sector: 'Government', quarter: 'Q3', service_fit: 'Strategize Advisory', contact_person: 'Operations Lead', estimated_value: 8500000 },
  { id: 'inst-070', name: 'Ethiopian Civil Aviation Authority', sbu: 'Institute', sector: 'Aviation', quarter: 'Q3', service_fit: 'Strategize Advisory', contact_person: 'Director General', estimated_value: 9500000 },
  { id: 'inst-071', name: 'Ethiopian Enterprise Development', sbu: 'Institute', sector: 'Government', quarter: 'Q3', service_fit: 'Strategize Advisory', contact_person: 'Director', estimated_value: 8000000 },
  { id: 'inst-072', name: 'PRINCO', sbu: 'Institute', sector: 'Printing & Packaging', quarter: 'Q3', service_fit: 'Knowledge Management System (KMS)', contact_person: 'Operations Manager', estimated_value: 4000000 },
  { id: 'inst-073', name: 'SNV Netherlands Ethiopia', sbu: 'Institute', sector: 'Development', quarter: 'Q3', service_fit: 'BDS & VSM Programs', contact_person: 'Country Director', estimated_value: 7500000 },
  { id: 'inst-074', name: 'CARE Ethiopia', sbu: 'Institute', sector: 'Development', quarter: 'Q3', service_fit: 'BDS & VSM Programs', contact_person: 'Program Director', estimated_value: 7000000 },
  { id: 'inst-075', name: 'Mercy Corps', sbu: 'Institute', sector: 'Development', quarter: 'Q3', service_fit: 'BDS & VSM Programs', contact_person: 'Director', estimated_value: 6500000 },
  { id: 'inst-076', name: 'Save the Children', sbu: 'Institute', sector: 'Development', quarter: 'Q3', service_fit: 'BDS & VSM Programs', contact_person: 'Operations Lead', estimated_value: 6000000 },
  { id: 'inst-077', name: 'World Vision Ethiopia', sbu: 'Institute', sector: 'Development', quarter: 'Q3', service_fit: 'BDS & VSM Programs', contact_person: 'National Director', estimated_value: 8000000 },
  { id: 'inst-078', name: 'Palladium & DAI Consulting', sbu: 'Institute', sector: 'Consulting', quarter: 'Q3', service_fit: 'BDS & Afro Data', contact_person: 'Managing Partner', estimated_value: 9000000 },

  // Q4 Targets (15)
  { id: 'inst-079', name: 'Bole Lemi Industrial Park', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Park General Manager', estimated_value: 8000000 },
  { id: 'inst-080', name: 'Hawassa Industrial Park', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Park General Manager', estimated_value: 9000000 },
  { id: 'inst-081', name: 'Kilinto Industrial Park', sbu: 'Institute', sector: 'Pharmaceutical', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Park Director', estimated_value: 7500000 },
  { id: 'inst-082', name: 'Eastern Industry Zone', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Zone Administration', estimated_value: 8500000 },
  { id: 'inst-083', name: 'Kombolcha Industrial Park', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Park Manager', estimated_value: 6500000 },
  { id: 'inst-084', name: 'Mekelle Industrial Park', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Park Manager', estimated_value: 6500000 },
  { id: 'inst-085', name: 'Adama Industrial Park', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Park Manager', estimated_value: 7000000 },
  { id: 'inst-086', name: 'Dire Dawa Industrial Park', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Park Manager', estimated_value: 7000000 },
  { id: 'inst-087', name: 'Jimma Industrial Park', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Park Manager', estimated_value: 6000000 },
  { id: 'inst-088', name: 'Bahir Dar Industrial Park', sbu: 'Institute', sector: 'Manufacturing', quarter: 'Q4', service_fit: 'MBL, Strategize & Knowledge Management', contact_person: 'Park Manager', estimated_value: 6500000 },
  { id: 'inst-089', name: 'Ethiopian Women Entrepreneurs Association', sbu: 'Institute', sector: 'Business Association', quarter: 'Q4', service_fit: 'PRIME Staff Development Program', contact_person: 'Executive Director', estimated_value: 5000000 },
  { id: 'inst-090', name: 'Textile & Garment Exporter Association', sbu: 'Institute', sector: 'Association', quarter: 'Q4', service_fit: 'PRIME Staff Development Program', contact_person: 'Secretary General', estimated_value: 5500000 },
  { id: 'inst-091', name: 'Horticulture & Coffee Exporter Associations', sbu: 'Institute', sector: 'Agriculture', quarter: 'Q4', service_fit: 'PRIME Staff Development Program', contact_person: 'Executive Officer', estimated_value: 6000000 },
  { id: 'inst-092', name: 'Ethiopian Universities Research Consortium', sbu: 'Institute', sector: 'Higher Education', quarter: 'Q4', service_fit: 'Afro Data Platform', contact_person: 'Academic Research Lead', estimated_value: 7500000 },
  { id: 'inst-093', name: 'Global Bank Ethiopia', sbu: 'Institute', sector: 'Banking', quarter: 'Q4', service_fit: 'S-OJT & Operations Modernization', contact_person: 'Operations Lead', estimated_value: 6000000 },

  // ==========================================
  // 2. INVESTMENT PARTNERS - IIP (45 Accounts)
  // ==========================================
  // Q1 Targets (6)
  { id: 'iip-001', name: 'Nisir Microfinance', sbu: 'IIP', sector: 'FinTech / MFI', quarter: 'Q1', service_fit: 'Rights Offer Advisory', contact_person: 'Chief Executive Officer', estimated_value: 8000000 },
  { id: 'iip-002', name: 'Meklit Microfinance', sbu: 'IIP', sector: 'Microfinance', quarter: 'Q1', service_fit: 'Rights Offer Advisory', contact_person: 'Managing Director', estimated_value: 6000000 },
  { id: 'iip-003', name: 'Meftihe Microfinance', sbu: 'IIP', sector: 'Microfinance', quarter: 'Q1', service_fit: 'Rights Offer Advisory', contact_person: 'Operations Lead', estimated_value: 5500000 },
  { id: 'iip-004', name: 'Enat Bank IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q1', service_fit: 'Investor Solutions / Market Access', contact_person: 'VP Finance & Treasury', estimated_value: 12000000 },
  { id: 'iip-005', name: 'Ethio Life & General Insurance', sbu: 'IIP', sector: 'Insurance', quarter: 'Q1', service_fit: 'Capital Market Advisory', contact_person: 'Managing Director', estimated_value: 7500000 },
  { id: 'iip-006', name: 'Ethswitch', sbu: 'IIP', sector: 'FinTech', quarter: 'Q1', service_fit: 'Capital Restructuring Advisory', contact_person: 'CEO Office', estimated_value: 14000000 },

  // Q2 Targets (24)
  { id: 'iip-007', name: 'Dynamic Microfinance', sbu: 'IIP', sector: 'Microfinance', quarter: 'Q2', service_fit: 'Rights Offer Advisory', contact_person: 'Managing Director', estimated_value: 6000000 },
  { id: 'iip-008', name: 'Global Insurance', sbu: 'IIP', sector: 'Insurance', quarter: 'Q2', service_fit: 'Rights Offer & Capital Market Advisory', contact_person: 'Chief Financial Officer', estimated_value: 7500000 },
  { id: 'iip-009', name: 'Awash Insurance IIP', sbu: 'IIP', sector: 'Insurance', quarter: 'Q2', service_fit: 'Rights Offer & Capital Market Advisory', contact_person: 'Chief Financial Officer', estimated_value: 8500000 },
  { id: 'iip-010', name: 'Tsehay Insurance', sbu: 'IIP', sector: 'Insurance', quarter: 'Q2', service_fit: 'Rights Offer & Capital Market Advisory', contact_person: 'Managing Director', estimated_value: 6500000 },
  { id: 'iip-011', name: 'Hijra Bank', sbu: 'IIP', sector: 'Banking', quarter: 'Q2', service_fit: 'Rights Offer & Capital Market Readiness', contact_person: 'VP Treasury', estimated_value: 9000000 },
  { id: 'iip-012', name: 'Ethio Re', sbu: 'IIP', sector: 'Insurance', quarter: 'Q2', service_fit: 'Rights Offer Advisory', contact_person: 'Chief Investment Officer', estimated_value: 11000000 },
  { id: 'iip-013', name: 'Dashen Bank IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q2', service_fit: 'Corporate Bond & Commercial Paper Advisory', contact_person: 'Director Treasury & Investment', estimated_value: 25000000 },
  { id: 'iip-014', name: 'Hibret Bank IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q2', service_fit: 'Corporate Bond & Commercial Paper Advisory', contact_person: 'Chief Financial Officer', estimated_value: 20000000 },
  { id: 'iip-015', name: 'Flintstone Engineering & Homes', sbu: 'IIP', sector: 'Real Estate / Construction', quarter: 'Q2', service_fit: 'Corporate Bond & Commercial Paper Advisory', contact_person: 'Chief Executive Officer', estimated_value: 30000000 },
  { id: 'iip-016', name: 'Ayat Real Estate', sbu: 'IIP', sector: 'Real Estate', quarter: 'Q2', service_fit: 'Corporate Bond & Commercial Paper Advisory', contact_person: 'Chief Investment Officer', estimated_value: 35000000 },
  { id: 'iip-017', name: 'ZamZam Bank', sbu: 'IIP', sector: 'Banking', quarter: 'Q2', service_fit: 'Corporate Bond Advisory', contact_person: 'VP Finance', estimated_value: 14000000 },
  { id: 'iip-018', name: 'Public Servants Social Security Admin (PSSSA)', sbu: 'IIP', sector: 'Pension / Sovereign', quarter: 'Q2', service_fit: 'Capital Market Advisory Services', contact_person: 'Director of Investments', estimated_value: 30000000 },
  { id: 'iip-019', name: 'Private Organizations Social Security Agency (POESSA)', sbu: 'IIP', sector: 'Pension / Sovereign', quarter: 'Q2', service_fit: 'Capital Market Advisory Services', contact_person: 'Director of Investments', estimated_value: 28000000 },
  { id: 'iip-020', name: 'Anbessa Bank', sbu: 'IIP', sector: 'Banking', quarter: 'Q2', service_fit: 'Capital Market Readiness & Training', contact_person: 'VP Strategy', estimated_value: 8000000 },
  { id: 'iip-021', name: 'Gadaa Bank IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q2', service_fit: 'Capital Market Readiness & Training', contact_person: 'VP Treasury', estimated_value: 7000000 },
  { id: 'iip-022', name: 'Global Bank Ethiopia IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q2', service_fit: 'Capital Market Readiness & Training', contact_person: 'Director of Strategy', estimated_value: 7500000 },
  { id: 'iip-023', name: 'FSD Ethiopia & IFC Consortium', sbu: 'IIP', sector: 'Development Finance', quarter: 'Q2', service_fit: 'Capital Market Readiness & Training', contact_person: 'Capital Market Lead', estimated_value: 15000000 },
  { id: 'iip-024', name: 'Anbessa Insurance', sbu: 'IIP', sector: 'Insurance', quarter: 'Q2', service_fit: 'Capital Market Advisory Services', contact_person: 'Managing Director', estimated_value: 6500000 },
  { id: 'iip-025', name: 'Nile Insurance', sbu: 'IIP', sector: 'Insurance', quarter: 'Q2', service_fit: 'Capital Market Advisory Services', contact_person: 'Chief Operating Officer', estimated_value: 7000000 },
  { id: 'iip-026', name: 'Nice Insurance', sbu: 'IIP', sector: 'Insurance', quarter: 'Q2', service_fit: 'Capital Market Advisory Services', contact_person: 'Managing Director', estimated_value: 5500000 },
  { id: 'iip-027', name: 'Hibret Insurance', sbu: 'IIP', sector: 'Insurance', quarter: 'Q2', service_fit: 'Capital Market Advisory Services', contact_person: 'Head of Treasury', estimated_value: 6000000 },
  { id: 'iip-028', name: 'Chazma Asel Real Estate SC', sbu: 'IIP', sector: 'Real Estate', quarter: 'Q2', service_fit: 'Commercial Debt Issuance Advisory', contact_person: 'Managing Director', estimated_value: 16000000 },
  { id: 'iip-029', name: 'East African Holding IIP', sbu: 'IIP', sector: 'Conglomerate', quarter: 'Q2', service_fit: 'Commercial Paper Structuring', contact_person: 'Group CFO', estimated_value: 20000000 },
  { id: 'iip-030', name: 'MIDROC Investment Group IIP', sbu: 'IIP', sector: 'Conglomerate', quarter: 'Q2', service_fit: 'Corporate Bond Origination', contact_person: 'Chief Investment Officer', estimated_value: 40000000 },

  // Q3 Targets (12)
  { id: 'iip-031', name: 'Metemamen Microfinance', sbu: 'IIP', sector: 'Microfinance', quarter: 'Q3', service_fit: 'Capital Market Readiness & Training', contact_person: 'CEO', estimated_value: 5000000 },
  { id: 'iip-032', name: 'Cooperative Bank of Oromia IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q3', service_fit: 'Capital Market Readiness & Training', contact_person: 'Director Treasury', estimated_value: 12000000 },
  { id: 'iip-033', name: 'Oromia Insurance IIP', sbu: 'IIP', sector: 'Insurance', quarter: 'Q3', service_fit: 'Capital Market Readiness & Advisory', contact_person: 'Managing Director', estimated_value: 7000000 },
  { id: 'iip-034', name: 'Amhara Bank IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q3', service_fit: 'Capital Market Readiness & Training', contact_person: 'VP Treasury', estimated_value: 9000000 },
  { id: 'iip-035', name: 'Oromia Bank IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q3', service_fit: 'Capital Market Readiness & Training', contact_person: 'Head of Treasury', estimated_value: 8500000 },
  { id: 'iip-036', name: 'Bunna Bank IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q3', service_fit: 'Capital Market Readiness & Training', contact_person: 'VP Treasury', estimated_value: 7500000 },
  { id: 'iip-037', name: 'Global Insurance Q3 Unit', sbu: 'IIP', sector: 'Insurance', quarter: 'Q3', service_fit: 'Capital Market Advisory Services', contact_person: 'Chief Financial Officer', estimated_value: 7500000 },
  { id: 'iip-038', name: 'Nib Insurance IIP', sbu: 'IIP', sector: 'Insurance', quarter: 'Q3', service_fit: 'Capital Market Advisory Services', contact_person: 'Head of Investment', estimated_value: 6000000 },
  { id: 'iip-039', name: 'Africa Insurance IIP', sbu: 'IIP', sector: 'Insurance', quarter: 'Q3', service_fit: 'Capital Market Advisory Services', contact_person: 'Managing Director', estimated_value: 6500000 },
  { id: 'iip-040', name: 'United Insurance IIP', sbu: 'IIP', sector: 'Insurance', quarter: 'Q3', service_fit: 'Capital Market Advisory Services', contact_person: 'Chief Operating Officer', estimated_value: 7000000 },
  { id: 'iip-041', name: 'Nyala Insurance IIP', sbu: 'IIP', sector: 'Insurance', quarter: 'Q3', service_fit: 'Investment Portfolio Structuring', contact_person: 'Chief Financial Officer', estimated_value: 8000000 },
  { id: 'iip-042', name: 'Ethiopian Reinsurance IIP', sbu: 'IIP', sector: 'Insurance', quarter: 'Q3', service_fit: 'Capital Market Readiness & Advisory', contact_person: 'Chief Investment Officer', estimated_value: 12000000 },

  // Q4 Targets (3)
  { id: 'iip-043', name: 'Aggar Microfinance IIP', sbu: 'IIP', sector: 'Microfinance', quarter: 'Q4', service_fit: 'Rights Offer Advisory', contact_person: 'General Manager', estimated_value: 4500000 },
  { id: 'iip-044', name: 'Gadaa Bank Q4 Advisory', sbu: 'IIP', sector: 'Banking', quarter: 'Q4', service_fit: 'Share Registration Advisory', contact_person: 'VP Finance', estimated_value: 6000000 },
  { id: 'iip-045', name: 'Berhan Bank IIP', sbu: 'IIP', sector: 'Banking', quarter: 'Q4', service_fit: 'Share Registration & Bond Advisory', contact_person: 'VP Treasury', estimated_value: 7500000 },

  // ==========================================
  // 3. DIGITAL & AI SOLUTIONS - DAS (37 Accounts)
  // ==========================================
  // Q1 Targets (4)
  { id: 'das-001', name: 'Addis Ababa Government Parking Stations', sbu: 'DAS', sector: 'Public Sector', quarter: 'Q1', service_fit: 'SHOFER Parking Platform Deployment', contact_person: 'Transport Bureau Lead', estimated_value: 18000000 },
  { id: 'das-002', name: 'Commercial Bank of Ethiopia (CBE) DAS', sbu: 'DAS', sector: 'Banking', quarter: 'Q1', service_fit: 'Investify ET FinTech Integration', contact_person: 'Digital Banking VP', estimated_value: 14000000 },
  { id: 'das-003', name: 'MIDROC Shakiso Operations', sbu: 'DAS', sector: 'Mining', quarter: 'Q1', service_fit: 'Master Builder Leadership (MBL) Deployment', contact_person: 'Plant General Manager', estimated_value: 8000000 },
  { id: 'das-004', name: 'Safaricom Telecommunications Ethiopia', sbu: 'DAS', sector: 'Telecom', quarter: 'Q1', service_fit: 'Investify ET & Partner API Integration', contact_person: 'Enterprise Solutions Lead', estimated_value: 16000000 },

  // Q2 Targets (18)
  { id: 'das-005', name: 'Bishoftu Government Parking Stations', sbu: 'DAS', sector: 'Public Sector', quarter: 'Q2', service_fit: 'SHOFER Parking Platform Deployment', contact_person: 'Mayor Office Infrastructure', estimated_value: 8500000 },
  { id: 'das-006', name: 'Addis Ababa Car Wash Stations Consortium', sbu: 'DAS', sector: 'SME / Mobility', quarter: 'Q2', service_fit: 'SHOFER Car Wash Booking System', contact_person: 'Association Chairman', estimated_value: 5000000 },
  { id: 'das-007', name: 'Addis Ababa Garage & Auto-Care Stations', sbu: 'DAS', sector: 'Automotive', quarter: 'Q2', service_fit: 'SHOFER Auto Care Platform', contact_person: 'Lead Partner', estimated_value: 6000000 },
  { id: 'das-008', name: 'Top Five Insurance Platform Collaboration', sbu: 'DAS', sector: 'InsurTech', quarter: 'Q2', service_fit: 'SHOFER Insurance Micro-Policies', contact_person: 'Consortium Lead', estimated_value: 9000000 },
  { id: 'das-009', name: 'SHOFER Driver Users Mobility Network', sbu: 'DAS', sector: 'Mobility', quarter: 'Q2', service_fit: 'SHOFER Learning Academy Platform', contact_person: 'Platform Operations Head', estimated_value: 4500000 },
  { id: 'das-010', name: 'SHOFER Mobility Commercial Partners', sbu: 'DAS', sector: 'Advertising', quarter: 'Q2', service_fit: 'SHOFER Promotion & In-App Ads Engine', contact_person: 'Marketing Lead', estimated_value: 5500000 },
  { id: 'das-011', name: 'Enat Bank Micro-Credit Engine', sbu: 'DAS', sector: 'FinTech', quarter: 'Q2', service_fit: 'Micro-Credit Digital Scoring Engine', contact_person: 'Head of Digital Lending', estimated_value: 8000000 },
  { id: 'das-012', name: 'Bank of Abyssinia DAS', sbu: 'DAS', sector: 'Banking', quarter: 'Q2', service_fit: 'Investify ET FinTech Integration', contact_person: 'Digital Strategy Lead', estimated_value: 10000000 },
  { id: 'das-013', name: 'Cooperative Bank of Oromia DAS', sbu: 'DAS', sector: 'Banking', quarter: 'Q2', service_fit: 'Investify ET FinTech Integration', contact_person: 'Digital Banking VP', estimated_value: 10000000 },
  { id: 'das-014', name: 'Siinqee Bank DAS', sbu: 'DAS', sector: 'Banking', quarter: 'Q2', service_fit: 'Investify ET FinTech Integration', contact_person: 'Digital Banking Director', estimated_value: 9000000 },
  { id: 'das-015', name: 'Abay Bank DAS', sbu: 'DAS', sector: 'Banking', quarter: 'Q2', service_fit: 'Investify ET FinTech Integration', contact_person: 'Head of E-Banking', estimated_value: 8000000 },
  { id: 'das-016', name: 'Oromia Bank DAS', sbu: 'DAS', sector: 'Banking', quarter: 'Q2', service_fit: 'Investify ET FinTech Integration', contact_person: 'Digital Banking Lead', estimated_value: 8500000 },
  { id: 'das-017', name: 'Wegagen Bank DAS', sbu: 'DAS', sector: 'Banking', quarter: 'Q2', service_fit: 'Investify ET FinTech Integration', contact_person: 'VP Information Technology', estimated_value: 8000000 },
  { id: 'das-018', name: 'Bunna Bank DAS', sbu: 'DAS', sector: 'Banking', quarter: 'Q2', service_fit: 'Investify ET FinTech Integration', contact_person: 'Head of Digital Banking', estimated_value: 7500000 },
  { id: 'das-019', name: 'Amhara Bank DAS', sbu: 'DAS', sector: 'Banking', quarter: 'Q2', service_fit: 'Investify ET FinTech Integration', contact_person: 'Digital Innovation Lead', estimated_value: 9000000 },
  { id: 'das-020', name: 'Ethio Telecom DAS', sbu: 'DAS', sector: 'Telecom', quarter: 'Q2', service_fit: 'Enterprise ERP & Telebirr FinTech Advisory', contact_person: 'Chief Business Development Officer', estimated_value: 22000000 },
  { id: 'das-021', name: 'Ministry of Innovation and Technology (MInT) DAS', sbu: 'DAS', sector: 'Government', quarter: 'Q2', service_fit: 'National AI & Digital Literacy Framework', contact_person: 'State Minister Office', estimated_value: 18000000 },
  { id: 'das-022', name: 'Addis Ababa City Transport Bureau', sbu: 'DAS', sector: 'Public Sector', quarter: 'Q2', service_fit: 'SHOFER Parking Platform Deployment', contact_person: 'Director Transport Technology', estimated_value: 14000000 },

  // Q3 Targets (10)
  { id: 'das-023', name: 'Addis Ababa Private Parking Stations', sbu: 'DAS', sector: 'Private Commercial', quarter: 'Q3', service_fit: 'SHOFER Parking Platform Deployment', contact_person: 'Real Estate Consortium', estimated_value: 12000000 },
  { id: 'das-024', name: 'Adama Government Parking Stations', sbu: 'DAS', sector: 'Public Sector', quarter: 'Q3', service_fit: 'SHOFER Parking Platform Deployment', contact_person: 'Transport Head', estimated_value: 7000000 },
  { id: 'das-025', name: 'Bishoftu Car Wash Stations', sbu: 'DAS', sector: 'SME / Mobility', quarter: 'Q3', service_fit: 'SHOFER Car Wash Booking System', contact_person: 'Town Administration', estimated_value: 3500000 },
  { id: 'das-026', name: 'Bishoftu Garage & Auto-Care Stations', sbu: 'DAS', sector: 'Automotive', quarter: 'Q3', service_fit: 'SHOFER Auto Care Platform', contact_person: 'Operations Lead', estimated_value: 4000000 },
  { id: 'das-027', name: 'Ethio Re FinTech Integration', sbu: 'DAS', sector: 'Insurance', quarter: 'Q3', service_fit: 'Investify ET Data Feed Integration', contact_person: 'Chief Technology Officer', estimated_value: 6500000 },
  { id: 'das-028', name: 'Awash Insurance DAS', sbu: 'DAS', sector: 'Insurance', quarter: 'Q3', service_fit: 'Investify ET FinTech Integration', contact_person: 'Head of IT', estimated_value: 7500000 },
  { id: 'das-029', name: 'Global Insurance DAS', sbu: 'DAS', sector: 'Insurance', quarter: 'Q3', service_fit: 'Investify ET FinTech Integration', contact_person: 'IT Director', estimated_value: 6500000 },
  { id: 'das-030', name: 'Nib Insurance DAS', sbu: 'DAS', sector: 'Insurance', quarter: 'Q3', service_fit: 'Investify ET FinTech Integration', contact_person: 'Digital Transformation Lead', estimated_value: 5500000 },
  { id: 'das-031', name: 'Oromia Insurance DAS', sbu: 'DAS', sector: 'Insurance', quarter: 'Q3', service_fit: 'Investify ET FinTech Integration', contact_person: 'Chief Technology Officer', estimated_value: 7000000 },
  { id: 'das-032', name: 'Kifiya Financial Technology', sbu: 'DAS', sector: 'FinTech', quarter: 'Q3', service_fit: 'Enterprise Analytics & Workflow Optimization', contact_person: 'Chief Product Officer', estimated_value: 7000000 },

  // Q4 Targets (5)
  { id: 'das-033', name: 'Addis Ababa Private Parking Stations Q4', sbu: 'DAS', sector: 'Private Commercial', quarter: 'Q4', service_fit: 'SHOFER Parking Platform Deployment', contact_person: 'Commercial Association', estimated_value: 10000000 },
  { id: 'das-034', name: 'Bishoftu Government Parking Stations Q4', sbu: 'DAS', sector: 'Public Sector', quarter: 'Q4', service_fit: 'SHOFER Parking Platform Deployment', contact_person: 'City Administration', estimated_value: 6000000 },
  { id: 'das-035', name: 'Adama Government Parking Stations Q4', sbu: 'DAS', sector: 'Public Sector', quarter: 'Q4', service_fit: 'SHOFER Parking Platform Deployment', contact_person: 'Transport Office', estimated_value: 6500000 },
  { id: 'das-036', name: 'SunPay Solutions', sbu: 'DAS', sector: 'FinTech', quarter: 'Q4', service_fit: 'Payment Gateway Integration & AI Scoring', contact_person: 'CTO', estimated_value: 5000000 },
  { id: 'das-037', name: 'Priority Banks & SOE API Consortium', sbu: 'DAS', sector: 'Enterprise', quarter: 'Q4', service_fit: 'Enterprise ERP & Investify ET Integration', contact_person: 'Lead Architect', estimated_value: 12000000 },

  // ==========================================
  // 4. CROSS BORDER SOLUTIONS - CBS (9 Accounts)
  // ==========================================
  // Q1 Targets (2)
  { id: 'cbs-001', name: 'Ethiopian Airlines Group', sbu: 'CBS', sector: 'Aviation', quarter: 'Q1', service_fit: 'Overseas Executive Immersion & Study Tour', contact_person: 'MD Aviation Academy', estimated_value: 30000000 },
  { id: 'cbs-002', name: 'Zemen Bank CBS', sbu: 'CBS', sector: 'Banking', quarter: 'Q1', service_fit: 'Global Treasury & Wealth Management Mission', contact_person: 'VP Treasury', estimated_value: 12000000 },

  // Q2 Targets (3)
  { id: 'cbs-003', name: 'VisionFund Microfinance Institution (S.C)', sbu: 'CBS', sector: 'Microfinance', quarter: 'Q2', service_fit: 'Overseas Board & Senior Management Training', contact_person: 'Chief Executive Officer', estimated_value: 48000000 },
  { id: 'cbs-004', name: 'Dashen Bank CBS', sbu: 'CBS', sector: 'Banking', quarter: 'Q2', service_fit: 'Overseas Board Study Tour (Dubai/Singapore)', contact_person: 'VP Strategic Transformation', estimated_value: 18000000 },
  { id: 'cbs-005', name: 'Awash Bank CBS', sbu: 'CBS', sector: 'Banking', quarter: 'Q2', service_fit: 'Global Executive Benchmark Tour', contact_person: 'Chief Strategy Officer', estimated_value: 15000000 },

  // Q3 Targets (2)
  { id: 'cbs-006', name: 'Nib International Bank CBS', sbu: 'CBS', sector: 'Banking', quarter: 'Q3', service_fit: 'Overseas Executive Immersion Program', contact_person: 'Executive Board Secretariat', estimated_value: 16000000 },
  { id: 'cbs-007', name: 'United Insurance (UNIC-ETHIOPIA) CBS', sbu: 'CBS', sector: 'Insurance', quarter: 'Q3', service_fit: 'Regional Reinsurance Benchmarking Mission (Nairobi)', contact_person: 'Managing Director', estimated_value: 9000000 },

  // Q4 Targets (2)
  { id: 'cbs-008', name: 'Commercial Bank of Ethiopia (CBE) CBS', sbu: 'CBS', sector: 'Banking', quarter: 'Q4', service_fit: 'Global Corporate Governance Mission (London/Istanbul)', contact_person: 'Board Secretariat', estimated_value: 26000000 },
  { id: 'cbs-009', name: 'Corporate Board Study Tours Consortium', sbu: 'CBS', sector: 'Conglomerate', quarter: 'Q4', service_fit: 'Regional Industrial Benchmarking (Rwanda/Kenya)', contact_person: 'Executive Lead', estimated_value: 22000000 },
]

export default function ClientDirectory({
  refreshVersion,
  onRefresh,
  onConvertToLead,
  onConvertToProposal,
}) {
  const [clients, setClients] = useState(MASTER_184_DIRECTORY)
  const [loading, setLoading] = useState(false)

  // Filters & State
  const [selectedSbu, setSelectedSbu] = useState('ALL')
  const [selectedQuarter, setSelectedQuarter] = useState('ALL')
  const [selectedService, setSelectedService] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewType, setViewType] = useState('cards') // 'cards' | 'table'
  const [showReviverModal, setShowReviverModal] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [refreshVersion])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase.from('clients').select('*')

    if (!error && data && data.length > 0) {
      // Reconcile database records with the canonical master list, guaranteeing strictly valid sbu and quarter
      const sanitizedDb = data
        .filter((d) => d.name && d.name.trim() !== '')
        .map((d) => ({
          ...d,
          sbu: ['Institute', 'IIP', 'DAS', 'CBS'].includes(d.sbu) ? d.sbu : 'Institute',
          quarter: ['Q1', 'Q2', 'Q3', 'Q4'].includes(d.quarter) ? d.quarter : 'Q2',
        }))

      const dbNameMap = new Map(sanitizedDb.map((c) => [c.name.toLowerCase().trim(), c]))
      const reconciled = MASTER_184_DIRECTORY.map((masterItem) => {
        const found = dbNameMap.get(masterItem.name.toLowerCase().trim())
        return found ? { ...masterItem, ...found } : masterItem
      })

      setClients(reconciled)
    } else {
      setClients(MASTER_184_DIRECTORY)
    }
    setLoading(false)
  }

  // Exact Mathematical Reconciliation across SBUs and Quarters
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

  function handleConvertProposal(client) {
    const institutionName = client.name || client.institution_name || 'Target Account'
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
    const institutionName = client.name || client.institution_name || 'Target Account'
    const productRoute = client.service_fit || client.product || 'Executive Advisory'
    const sbuFit = client.sbu || 'Institute'

    onConvertToLead?.({
      client: institutionName,
      client_name: institutionName,
      product: productRoute,
      sbu: sbuFit,
    })
  }

  const filteredClients = clients.filter((client) => {
    const name = client.name || client.institution_name || ''
    const product = client.service_fit || client.product || ''
    const sector = client.sector || ''

    const matchesSbu = selectedSbu === 'ALL' || client.sbu === selectedSbu
    const matchesQuarter = selectedQuarter === 'ALL' || client.quarter === selectedQuarter
    const matchesService = selectedService === 'ALL' || product.toLowerCase().includes(selectedService.toLowerCase())
    const matchesSearch =
      !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sector.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSbu && matchesQuarter && matchesService && matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. TOP HEADER & REVIVER ACTION */}
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
              {filteredClients.length} of {counts.total} Accounts Mapped
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Consolidated target-account pathway mapped across all 4 SBUs and strategic products. Convert any account directly into an active lead or proposal with 1-click.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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

      {/* 2. SBU CATEGORY CHIPS (Reconciled: 93 + 45 + 37 + 9 = 184) */}
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

      {/* 3. QUARTERLY TABS (Reconciled: 24 + 81 + 54 + 25 = 184) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 10,
          padding: '12px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: '#1e293b',
              background: '#fff',
            }}
          >
            <option value="ALL">All Strategic Products / Services</option>
            <option value="MBL">Master Builder Leadership (MBL)</option>
            <option value="S-OJT">Structured On-the-Job Training (S-OJT)</option>
            <option value="PRIME">PRIME Staff Development</option>
            <option value="Bond">Corporate Bond Advisory</option>
            <option value="Commercial Paper">Commercial Paper Advisory</option>
            <option value="Rights Offer">Rights Offer Advisory</option>
            <option value="Capital Market">Capital Market Readiness</option>
            <option value="SHOFER">SHOFER Mobility Platform</option>
            <option value="Investify">Investify ET FinTech</option>
            <option value="BDS">BDS &amp; VSM Programs</option>
            <option value="Strategize">Strategize Policy Advisory</option>
            <option value="Knowledge Management">Knowledge Management (KMS)</option>
            <option value="Afro Data">Afro Data Platform</option>
          </select>

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
              width: 240,
            }}
          />
        </div>
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
              Loading Target Accounts…
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
                <th style={{ padding: '12px 16px' }}>SBU</th>
                <th style={{ padding: '12px 16px' }}>SECTOR</th>
                <th style={{ padding: '12px 16px' }}>STRATEGIC PRODUCT SCOPE</th>
                <th style={{ padding: '12px 16px' }}>QUARTER</th>
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