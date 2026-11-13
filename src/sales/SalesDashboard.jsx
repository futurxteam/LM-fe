import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Mail,
  FileText,
  Search,
  LogOut,
  PhoneCall,
  CalendarCheck,
  CheckCircle,
  Plus,
  RefreshCw,
  Send,
  User,
  MessageCircle,
  Clock,
  CheckCircle2,
  X,
  GraduationCap,
  Globe,
  AlertCircle,
  Menu,
} from 'lucide-react'
import { api } from '../api'

export default function SalesDashboard({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Log Call & Notes Modal
  const [callModalLead, setCallModalLead] = useState(null)
  const [callStatus, setCallStatus] = useState('Contacted')
  const [callSubStatus, setCallSubStatus] = useState('Interested - Sent Brochure')
  const [callNote, setCallNote] = useState('')
  const [callbackDateTime, setCallbackDateTime] = useState('')
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [leadsData, statsData] = await Promise.all([
        api.getLeads({ repId: user?.id || 'sales_01' }),
        api.getStats(),
      ])
      // If none explicitly matched repId, load all assigned leads for demonstration
      if (!leadsData || leadsData.length === 0) {
        const fallbackLeads = await api.getLeads({ role: 'sales' })
        setLeads(fallbackLeads || [])
      } else {
        setLeads(leadsData)
      }
      setStats(statsData)
    } catch (err) {
      console.error('Error fetching sales data:', err)
      showNotify('error', 'Failed to load assigned leads')
    } finally {
      setLoading(false)
    }
  }

  const showNotify = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const openCallModal = lead => {
    setCallModalLead(lead)
    setCallStatus(lead.status || 'Contacted')
    setCallSubStatus(lead.subStatus || 'Interested - Sent Brochure')
    setCallNote('')
    setCallbackDateTime('')
  }

  const submitCallLog = async e => {
    e.preventDefault()
    if (!callModalLead) return

    try {
      await api.updateLeadStatus(callModalLead.id, {
        status: callStatus,
        subStatus: callSubStatus,
        note: callNote || `Call logged by ${user?.name || 'Sales Rep'} (${callSubStatus})`,
        callbackAt: callbackDateTime || null,
        incrementCallAttempt: true,
        author: user?.name || 'Sales Rep',
      })

      showNotify('success', `Call logged for ${callModalLead.fullName}`)
      setCallModalLead(null)
      await loadData()
    } catch (err) {
      showNotify('error', err.message || 'Failed to log call')
    }
  }

  const quickMarkStatus = async (lead, newStatus, newSubStatus) => {
    try {
      await api.updateLeadStatus(lead.id, {
        status: newStatus,
        subStatus: newSubStatus,
        note: `Quick updated to ${newStatus} (${newSubStatus})`,
        incrementCallAttempt: true,
        author: user?.name || 'Sales Rep',
      })
      showNotify('success', `Status updated: ${newStatus}`)
      await loadData()
    } catch (err) {
      showNotify('error', err.message || 'Failed to update')
    }
  }

  // Filter leads
  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      !searchQuery ||
      (l.fullName && l.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.phone && l.phone.includes(searchQuery)) ||
      (l.preferredLocation && l.preferredLocation.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus =
      statusFilter === 'All' ||
      l.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Circular gauge definition
  const contactedCount = leads.filter(l => l.status === 'Contacted').length
  const notContactedCount = leads.filter(l => l.status === 'Not Contacted').length
  const enrolledCount = leads.filter(l => (l.subStatus || '').toLowerCase().includes('enrolled')).length
  const contactRate = leads.length ? Math.round((contactedCount / leads.length) * 100) : 0

  const salesGauges = [
    { label: 'Assigned Leads', subtext: `${leads.length} in Queue`, percent: 100, color: '#1b2b6b' },
    { label: 'Contact Rate', subtext: `${contactedCount} Connected`, percent: contactRate, color: '#10b981' },
    { label: 'Pending Calls', subtext: `${notContactedCount} Waiting`, percent: leads.length ? Math.round((notContactedCount / leads.length) * 100) : 0, color: '#f59e0b' },
    { label: 'Enrolled Deals', subtext: `${enrolledCount} Conversions`, percent: leads.length ? Math.round((enrolledCount / leads.length) * 100) : 0, color: '#059669' },
  ]

  return (
    <div className="app-container">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 1. Left Sidebar (Fixed desktop / Slide-over mobile drawer) */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-drawer-top">
            <span className="sidebar-drawer-badge">Counselor Portal</span>
            <button
              className="sidebar-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close Navigation"
              title="Close Menu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="brand-logo-container">
            <img src="/logo-brand-white.png" alt="Futureace Academy Logo" className="brand-logo-img" />
          </div>
          <div className="sidebar-brand-text">
            <h2>Futureace Academy CRM</h2>
            <span>Sales Counselor Portal</span>
          </div>
        </div>

        {/* Rep Profile Card */}
        <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.06)', margin: '0 12px 14px', borderRadius: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>{user?.name || 'Jordan Chase'}</div>
          <div style={{ fontSize: 11, color: '#93c5fd' }}>{user?.title || 'Healthcare Counselor'}</div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
            <span>Active Queue:</span>
            <strong style={{ color: '#00c6ff' }}>{leads.length} Leads</strong>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="sidebar-nav">
          <div
            className="nav-item active"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="nav-item-icon"><LayoutDashboard size={16} /></span>
            <span>My Calling Queue</span>
            <span style={{ marginLeft: 'auto', background: '#0284c7', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
              {leads.length}
            </span>
          </div>
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button className="btn-sidebar-logout" onClick={onLogout}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="main-content">
        <div className="content-area">
          {/* Sleek Minimal Header Row with Hamburger Menu on Mobile and Small Refresh Button */}
          <div className="page-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn-hamburger"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Navigation Menu"
                title="Open Navigation Menu"
              >
                <Menu size={18} />
              </button>
              <div>
                <h1 className="page-title">Admissions Outreach Queue</h1>
                <p className="page-subtitle">
                  Futureace Academy CRM • Instant Dialing & WhatsApp Inquiries
                </p>
              </div>
            </div>
            <button
              className="btn-refresh-icon"
              onClick={loadData}
              title="Refresh Queue"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Global Notification Banner */}
          {notification && (
            <div
              style={{
                padding: '12px 18px',
                borderRadius: 6,
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 500,
                background: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
                color: notification.type === 'error' ? '#991b1b' : '#166534',
              }}
            >
              {notification.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{notification.message}</span>
            </div>
          )}
          {/* Top Dials */}
          <div className="template-card" style={{ marginBottom: 20 }}>
            <div className="template-card-header">
              <h3>My Calling & Conversion Pipeline</h3>
              <span className="header-badge">{contactRate}% Contact Rate</span>
            </div>
            <div className="template-card-body">
              <div className="dial-grid">
                {salesGauges.map((gauge, idx) => {
                  const radius = 38
                  const circumference = 2 * Math.PI * radius
                  const offset = circumference - (gauge.percent / 100) * circumference
                  return (
                    <div key={idx} className="dial-item">
                      <div className="dial-circle-wrapper">
                        <svg className="dial-circle-svg" viewBox="0 0 96 96">
                          <circle className="dial-circle-bg" cx="48" cy="48" r={radius} />
                          <circle
                            className="dial-circle-fill"
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke={gauge.color}
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                          />
                        </svg>
                        <div className="dial-circle-text">{gauge.percent}%</div>
                      </div>
                      <div className="dial-label">{gauge.label}</div>
                      <div className="dial-subtext">{gauge.subtext}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Action Table Header Bar */}
          <div className="pool-action-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search assigned leads by name, phone or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {['All', 'Not Contacted', 'Contacted'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: statusFilter === st ? '#1b2b6b' : '#f1f5f9',
                    color: statusFilter === st ? '#ffffff' : '#475569',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Sales Assigned Leads Action Table */}
          <div className="template-card">
            <div className="template-card-header">
              <h3>My Assigned Leads ({filteredLeads.length})</h3>
              <span className="header-badge">Direct Contact Queue</span>
            </div>
            <div className="template-card-body" style={{ padding: 0 }}>
              {loading ? (
                <div className="data-loader-container">
                  <div className="data-loader-spinner" />
                  <div className="data-loader-text">Loading assigned leads queue...</div>
                  <div className="data-loader-sub">Fetching counselor pipeline from database</div>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                  <p style={{ fontWeight: 600 }}>No leads matching this filter.</p>
                </div>
              ) : (
                <div className="leads-table-container">
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Candidate / Phone</th>
                        <th>Qualification & Destination</th>
                        <th>Status</th>
                        <th>Attempts & Sub-status</th>
                        <th>Direct Connect</th>
                        <th>Log Interaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map(lead => {
                        const cleanPhone = (lead.phone || '').replace(/\D/g, '')
                        const waMsg = encodeURIComponent(
                          `Hello ${lead.fullName}, this is ${user?.name || 'Counselor'} regarding your inquiry for our Healthcare Management program. Are you available for a brief discussion?`
                        )
                        return (
                          <tr key={lead.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>{lead.fullName}</div>
                              <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>
                                <a href={`tel:${lead.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                  📞 {lead.phone}
                                </a>
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{lead.email}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>{lead.qualification}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>📍 {lead.preferredLocation}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{lead.learningMode}</div>
                            </td>
                            <td>
                              <span
                                className={`status-badge ${
                                  lead.status === 'Contacted' ? 'status-contacted' : 'status-not-contacted'
                                }`}
                              >
                                {lead.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                                {lead.subStatus}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                Attempts: {lead.callAttempts || 0}
                                {lead.callbackAt && (
                                  <span style={{ color: '#ea580c', fontWeight: 600, display: 'block' }}>
                                    Callback: {new Date(lead.callbackAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {/* WhatsApp */}
                                <a
                                  href={`https://wa.me/${cleanPhone}?text=${waMsg}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '5px 8px',
                                    background: '#25D366',
                                    color: '#fff',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                  }}
                                  title="Send WhatsApp message"
                                >
                                  <MessageCircle size={13} />
                                  <span>WhatsApp</span>
                                </a>

                                {/* Direct Call */}
                                <a
                                  href={`tel:${lead.phone}`}
                                  onClick={() => quickMarkStatus(lead, lead.status, 'Call Initiated')}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '5px 8px',
                                    background: '#0284c7',
                                    color: '#fff',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                  }}
                                  title="Dial Phone"
                                >
                                  <PhoneCall size={13} />
                                  <span>Dial</span>
                                </a>
                              </div>
                            </td>
                            <td>
                              <button
                                className="btn-pulse"
                                style={{ fontSize: 11, padding: '5px 10px' }}
                                onClick={() => openCallModal(lead)}
                              >
                                Log Outcome
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================
          MODAL: LOG CALL & INTERACTION OUTCOME
          ======================================================== */}
      {callModalLead && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneCall size={18} />
                <h3 style={{ margin: 0, fontSize: 16 }}>Log Call: {callModalLead.fullName}</h3>
              </div>
              <button
                onClick={() => setCallModalLead(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitCallLog}>
              <div className="modal-body">
                {/* Candidate Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>PHONE</div>
                    <div style={{ fontWeight: 700 }}>{callModalLead.phone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>QUALIFICATION</div>
                    <div style={{ fontWeight: 600 }}>{callModalLead.qualification}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>LOCATION</div>
                    <div style={{ fontWeight: 600 }}>📍 {callModalLead.preferredLocation}</div>
                  </div>
                </div>

                {/* Primary Status Toggle */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    CALL OUTCOME
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCallStatus('Contacted')
                        setCallSubStatus('Interested - Sent Brochure')
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: 6,
                        border: callStatus === 'Contacted' ? '2px solid #10b981' : '1px solid #cbd5e1',
                        background: callStatus === 'Contacted' ? '#ecfdf5' : '#ffffff',
                        color: callStatus === 'Contacted' ? '#065f46' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Contacted (Connected)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCallStatus('Not Contacted')
                        setCallSubStatus('Ringing / No Answer')
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: 6,
                        border: callStatus === 'Not Contacted' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                        background: callStatus === 'Not Contacted' ? '#fffbeb' : '#ffffff',
                        color: callStatus === 'Not Contacted' ? '#92400e' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ✕ Not Contacted
                    </button>
                  </div>
                </div>

                {/* Sub-status Selection */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    SUB-STAGE / REASON
                  </label>
                  <select
                    value={callSubStatus}
                    onChange={e => setCallSubStatus(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {callStatus === 'Contacted' ? (
                      <>
                        <option value="Interested - Sent Brochure">Interested - Sent Brochure</option>
                        <option value="Counseling Call Scheduled">Counseling Call Scheduled</option>
                        <option value="Follow-Up Required">Follow-Up Required</option>
                        <option value="Enrolled / Fee Paid">Enrolled / Fee Paid</option>
                        <option value="Not Interested / Other Career">Not Interested / Other Career</option>
                      </>
                    ) : (
                      <>
                        <option value="Ringing / No Answer">Ringing / No Answer</option>
                        <option value="Busy / Line In Use">Busy / Line In Use</option>
                        <option value="Switched Off / Out of Reach">Switched Off / Out of Reach</option>
                        <option value="Invalid / Wrong Number">Invalid / Wrong Number</option>
                        <option value="Callback Scheduled">Callback Scheduled (Pick Time Below)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Optional Callback DateTime */}
                {callSubStatus === 'Callback Scheduled' && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      SCHEDULE CALLBACK DATE & TIME
                    </label>
                    <input
                      type="datetime-local"
                      value={callbackDateTime}
                      onChange={e => setCallbackDateTime(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                )}

                {/* Notes Input */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    CONVERSATION NOTES
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter key points from candidate discussion..."
                    value={callNote}
                    onChange={e => setCallNote(e.target.value)}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-pulse-secondary"
                  onClick={() => setCallModalLead(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pulse">
                  Save & Log Call Attempt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
