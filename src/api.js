// API Service Handler for Backend Communication (Pure Real Backend - No Mocks)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

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

  assignLeads: async (leadIds, repId) => {
    return await request('/leads/assign', {
      method: 'POST',
      body: JSON.stringify({ leadIds, repId }),
    })
  },

  autoAssignLeads: async (leadIds = [], mode = 'round-robin') => {
    return await request('/leads/auto-assign', {
      method: 'POST',
      body: JSON.stringify({ leadIds, mode }),
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

  // Analytics & Dashboard Stats Handlers
  getStats: async () => {
    return await request('/stats', {
      method: 'GET',
    })
  },
}

export default api
