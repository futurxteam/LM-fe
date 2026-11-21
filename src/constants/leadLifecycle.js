export const LEAD_STATUSES = [
  'NEW LEAD',
  'HOT',
  'WARM',
  'COLD',
  'LOST',
  'NON-CONNECT',
  'NON PROSPECT',
  'QUALIFIED BUSINESS',
  'CONVERTED BUSINESS',
  'ONBOARDED BUSINESS',
]

export const BUSINESS_STATUSES = [
  'QUALIFIED BUSINESS',
  'CONVERTED BUSINESS',
  'ONBOARDED BUSINESS',
]

export const isBusinessStatus = status => BUSINESS_STATUSES.includes(status)

export const formatINR = amount => {
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(Number(amount))) {
    return '—'
  }
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export const getStatusBadgeStyle = status => {
  switch (status) {
    case 'NEW LEAD':
      return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
    case 'HOT':
      return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
    case 'WARM':
      return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' }
    case 'COLD':
      return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }
    case 'NON-CONNECT':
      return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' }
    case 'NON PROSPECT':
      return { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
    case 'LOST':
      return { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' }
    case 'QUALIFIED BUSINESS':
      return { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' }
    case 'CONVERTED BUSINESS':
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
    case 'ONBOARDED BUSINESS':
      return { bg: '#dcfce7', color: '#15803d', border: '#86efac' }
    default:
      return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
  }
}

export const getHeatBadgeStyle = heat => {
  switch (heat) {
    case 'HOT':
      return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', label: 'HOT' }
    case 'WARM':
      return { bg: '#fef3c7', color: '#b45309', border: '#fcd34d', label: 'WARM' }
    case 'COLD':
      return { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd', label: 'COLD' }
    default:
      return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', label: 'UNCLASSIFIED' }
  }
}

/**
 * Neutral display label for Sales users (hides HOT/WARM/COLD temperature terminology)
 */
export const getSalesDisplayStatus = lead => {
  if (!lead) return 'NEW LEAD'
  const st = lead.leadStatus || 'NEW LEAD'
  if (st === 'HOT' || st === 'WARM' || st === 'COLD') {
    return lead.selectedCategoryLabel || 'Active Follow-up'
  }
  return st
}
