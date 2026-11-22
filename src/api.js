// API Service Handler for Backend Communication (Pure Real Backend - No Mocks)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://lm-be-yx0a.onrender.com/api'

// Helper for HTTP requests with automatic token attachment
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('leadpulse_token')
  const isFormData = options.body instanceof FormData

  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    if (res.status === 403 && errData.code === 'ACCOUNT_DISABLED' && !endpoint.startsWith('/auth/login')) {
      localStorage.removeItem('leadpulse_token')
      localStorage.removeItem('leadpulse_user')
      window.location.href = '/'
    }
    throw new Error(errData.message || `Request failed with status ${res.status}`)
  }

  return await res.json()
}

// Exported Backend API Handlers (Pure Live MongoDB Database Connection)
export const api = {
  // Auth API Handlers
  login: async (email, password, role) => {
    return await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    })
  },

  // Leads API Handlers (Supports backend pagination by 30)
  getLeads: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.role) query.append('role', params.role)
    if (params.repId) query.append('repId', params.repId)
    if (params.poolOnly) query.append('poolOnly', 'true')
    if (params.status && params.status !== 'All') query.append('status', params.status)
    if (params.qualification && params.qualification !== 'All') query.append('qualification', params.qualification)
    if (params.search) query.append('search', params.search)
    if (params.page !== undefined) query.append('page', params.page)
    if (params.limit !== undefined) query.append('limit', params.limit)

    const qs = query.toString()
    return await request(`/leads${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    })
  },

  getSalesReps: async () => {
    return await request('/leads/reps', {
      method: 'GET',
    })
  },

  getFollowupSchedule: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.date) query.append('date', params.date)
    query.append('tzOffset', String(new Date().getTimezoneOffset()))
    if (params.repId && params.repId !== 'All') query.append('repId', params.repId)
    if (params.search && params.search.trim()) query.append('search', params.search.trim())
    const qs = query.toString()
    return await request(`/leads/schedule${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    })
  },

  createLead: async leadData => {
    return await request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    })
  },

  uploadLeadsFile: async file => {
    const formData = new FormData()
    formData.append('file', file)
    return await request('/leads/upload', {
      method: 'POST',
      body: formData,
    })
  },

  pasteLeadsText: async text => {
    return await request('/leads/paste', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  },

  assignLeads: async (leadIds, repId, options = {}) => {
    return await request('/leads/assign', {
      method: 'POST',
      body: JSON.stringify({ leadIds, repId, ...options }),
    })
  },

  autoAssignLeads: async (leadIds = [], mode = 'round-robin', options = {}) => {
    return await request('/leads/auto-assign', {
      method: 'POST',
      body: JSON.stringify({ leadIds, mode, ...options }),
    })
  },

  unassignLeads: async leadIds => {
    return await request('/leads/unassign', {
      method: 'POST',
      body: JSON.stringify({ leadIds }),
    })
  },

  updateLeadStatus: async (leadId, updatePayload) => {
    return await request(`/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(updatePayload),
    })
  },

  updateLeadProfile: async (leadId, profilePayload) => {
    return await request(`/leads/${leadId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profilePayload),
    })
  },

  deleteLead: async (leadId) => {
    return await request(`/leads/${leadId}`, {
      method: 'DELETE',
    })
  },

  bulkDeleteLeads: async ({ leadIds = [], metaLeadIds = [], applyToAll = false, scope, filters } = {}) => {
    return await request('/leads/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ leadIds, metaLeadIds, applyToAll, scope, filters }),
    })
  },

  // Database Reset / Clean Leads Handlers
  resetLeadDatabase: async (mode = 'clean') => {
    return await request('/leads/reset-db', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    })
  },

  // Analytics & Dashboard Stats Handlers
  getStats: async () => {
    return await request('/stats', {
      method: 'GET',
    })
  },

  // Meta Graph API Integration & Lead Forms
  getMetaConfig: async () => {
    return await request('/meta/config', {
      method: 'GET',
    })
  },

  saveMetaConfig: async payload => {
    return await request('/meta/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  fetchPageForms: async (payload = {}) => {
    return await request('/meta/fetch-forms', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  saveSelectedForms: async forms => {
    return await request('/meta/save-forms', {
      method: 'POST',
      body: JSON.stringify({ forms }),
    })
  },

  syncMetaLeads: async (payload = {}) => {
    return await request('/meta/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  testTelegramAlert: async payload => {
    return await request('/meta/test-telegram', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  testWebhookAlert: async payload => {
    return await request('/meta/test-webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  previewFormLeads: async formId => {
    return await request('/meta/preview-form-leads', {
      method: 'POST',
      body: JSON.stringify({ formId }),
    })
  },

  importSelectedLeads: async leads => {
    return await request('/meta/import-selected-leads', {
      method: 'POST',
      body: JSON.stringify({ leads }),
    })
  },

  // User Management Handlers (Sales Advisors & Admins — Disable-Only, Zero Deletion)
  getUsers: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.page !== undefined) query.append('page', params.page)
    if (params.limit !== undefined) query.append('limit', params.limit)
    if (params.status && params.status !== 'all') query.append('status', params.status)
    if (params.role && params.role !== 'all') query.append('role', params.role)
    if (params.search && params.search.trim()) query.append('search', params.search.trim())
    const qs = query.toString()
    return await request(`/users${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    })
  },

  getUserHistory: async (id, params = {}) => {
    const query = new URLSearchParams()
    if (params.page !== undefined) query.append('page', params.page)
    if (params.limit !== undefined) query.append('limit', params.limit)
    if (params.search && params.search.trim()) query.append('search', params.search.trim())
    const qs = query.toString()
    return await request(`/users/${id}/history${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    })
  },

  createUser: async userData => {
    return await request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  updateUser: async (id, userData) => {
    return await request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  },

  disableOrEnableUser: async (id, payload = { active: false, handoverMode: 'keep' }) => {
    return await request(`/users/${id}/disable`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  // Counselor Groups & Hierarchy Handlers
  getGroups: async () => {
    return await request('/groups', {
      method: 'GET',
    })
  },

  createGroup: async groupData => {
    return await request('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    })
  },

  updateGroup: async (id, groupData) => {
    return await request(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    })
  },

  deleteGroup: async id => {
    return await request(`/groups/${id}`, {
      method: 'DELETE',
    })
  },

  // Lead Lifecycle Steps, Receipts & Recyclable Lost Handlers
  addLeadStep: async (leadId, payload) => {
    return await request(`/leads/${leadId}/steps`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  addLeadPaymentReceipt: async (leadId, payload) => {
    return await request(`/leads/${leadId}/receipts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  recycleLead: async (leadId, payload = {}) => {
    return await request(`/leads/${leadId}/recycle`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  bulkRecycleLeads: async payload => {
    return await request('/leads/bulk-recycle', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // CRM Lifecycle Meta, Settings & Program Master
  getCrmMeta: async () => {
    return await request('/crm/meta', { method: 'GET' })
  },

  getCrmSettings: async () => {
    return await request('/crm/settings', { method: 'GET' })
  },

  updateCrmSettings: async payload => {
    return await request('/crm/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  getCoursePrograms: async () => {
    return await request('/crm/programs', { method: 'GET' })
  },

  createCourseProgram: async payload => {
    return await request('/crm/programs', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateCourseProgram: async (id, payload) => {
    return await request(`/crm/programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  deleteCourseProgram: async id => {
    return await request(`/crm/programs/${id}`, {
      method: 'DELETE',
    })
  },

  // Admin-Only Advanced Reports (Hot/Warm/Cold, Lifecycle, Lost Cycles, Finance, Counselor Matrix)
  getAdvancedReports: async (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'All') {
        query.append(k, v)
      }
    })
    const qs = query.toString()
    return await request(`/stats/advanced${qs ? `?${qs}` : ''}`, { method: 'GET' })
  },

  // FRD Section 7 Reports (Business Report 7.1, Lead Conversion 7.2, Admin-Only Lead Status 7.3)
  getFrdReports: async (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'All') {
        query.append(k, v)
      }
    })
    const qs = query.toString()
    return await request(`/stats/frd-reports${qs ? `?${qs}` : ''}`, { method: 'GET' })
  },
}

export default api
