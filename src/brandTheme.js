/**
 * THE i-CAPITAL AFRICA INSTITUTE — OFFICIAL 3-COLOR BRAND SYSTEM
 * Single source of truth for colors, tints, typography, and role badges.
 *
 * 1st Primary   : The i-Capital Deep Blue   (#253E5E)
 * 2nd Secondary : The i-Capital Light Blue  (#4A7DBC)
 * 3rd Highlight : The i-Capital Orange      (#F78019)
 */

export const BRAND = {
  // 1st — Primary (60% institutional anchor)
  deepBlue: '#253E5E',
  deepBlueDark: '#1A2D45',
  deepBlueTint: '#E9EEF4',

  // 2nd — Secondary (30% interactive & structure)
  lightBlue: '#4A7DBC',
  lightBlueDark: '#3A68A3',
  lightBlueTint: '#EDF3FA',
  lightBlueBorder: '#C3D7EE',

  // 3rd — Highlight (10% urgent actions, SMEAL alerts & CTAs)
  orange: '#F78019',
  orangeDark: '#D96B0C',
  orangeTint: '#FFF4EA',
  orangeBorder: '#FCD2AE',

  // Clean workspace neutrals (canvas & readability)
  canvas: '#F6F8FB',
  white: '#FFFFFF',
  border: '#DCE4EE',
  textPrimary: '#253E5E',
  textMuted: '#5B6E84',

  // Official Typography
  fontHeading: '"Josefin Sans", "Century Gothic", sans-serif',
  fontBody: '"Century Gothic", "Questrial", -apple-system, BlinkMacSystemFont, sans-serif',
}

export const ROLE_CONFIGS = {
  admin: {
    label: 'Executive Administrator',
    badgeBg: BRAND.deepBlueDark,
    badgeText: BRAND.white,
    badgeBorder: `1px solid ${BRAND.orange}`,
    canManageRoles: true,
    canEditTargets: true,
    canApproveSmeal: true,
  },
  exec_mgmt: {
    label: 'Senior Management',
    badgeBg: BRAND.deepBlue,
    badgeText: BRAND.white,
    badgeBorder: `1px solid ${BRAND.lightBlue}`,
    canManageRoles: false,
    canEditTargets: false,
    canApproveSmeal: true,
  },
  smeal: {
    label: 'SMEAL Team',
    badgeBg: BRAND.orange,
    badgeText: BRAND.white,
    badgeBorder: `1px solid ${BRAND.orangeDark}`,
    canManageRoles: false,
    canEditTargets: false,
    canApproveSmeal: true,
  },
  bd_manager: {
    label: 'BD Manager',
    badgeBg: BRAND.lightBlue,
    badgeText: BRAND.white,
    badgeBorder: `1px solid ${BRAND.lightBlueDark}`,
    canManageRoles: false,
    canEditTargets: false,
    canApproveSmeal: false,
  },
  tech_lead: {
    label: 'Technical Proposal Lead',
    badgeBg: BRAND.lightBlue,
    badgeText: BRAND.white,
    badgeBorder: `1px solid ${BRAND.lightBlueDark}`,
    canManageRoles: false,
    canEditTargets: false,
    canApproveSmeal: false,
  },
  sales_officer: {
    label: 'Sales Officer',
    badgeBg: BRAND.lightBlueTint,
    badgeText: BRAND.deepBlue,
    badgeBorder: `1px solid ${BRAND.lightBlue}`,
    canManageRoles: false,
    canEditTargets: false,
    canApproveSmeal: false,
  },
  read_only: {
    label: 'Reporting Viewer',
    badgeBg: BRAND.deepBlueTint,
    badgeText: BRAND.deepBlue,
    badgeBorder: `1px solid ${BRAND.border}`,
    canManageRoles: false,
    canEditTargets: false,
    canApproveSmeal: false,
  },
}

export function getSmealBadgeStyle(status) {
  if (status === 'Approved') {
    return {
      background: BRAND.deepBlue,
      color: BRAND.white,
      border: `1px solid ${BRAND.deepBlueDark}`,
    }
  }
  if (status === 'Changes Requested') {
    return {
      background: BRAND.orange,
      color: BRAND.white,
      border: `1px solid ${BRAND.orangeDark}`,
    }
  }
  return {
    background: BRAND.orangeTint,
    color: BRAND.orangeDark,
    border: `1px solid ${BRAND.orangeBorder}`,
  }
}

export function getHealthBadgeStyle(health) {
  if (health === 'Completed') {
    return { background: BRAND.deepBlue, color: BRAND.white }
  }
  if (health === 'On Track') {
    return { background: BRAND.lightBlueTint, color: BRAND.deepBlue }
  }
  if (
    health === 'At Risk' ||
    health === 'Delayed' ||
    health === 'Action Required (SMEAL)'
  ) {
    return { background: BRAND.orangeTint, color: BRAND.orangeDark }
  }
  return { background: BRAND.deepBlueTint, color: BRAND.deepBlue }
}