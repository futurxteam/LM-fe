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
  Layers,
  Users,
  MapPin,
  Phone,
  XCircle,
  BarChart3,
  IndianRupee,
  TrendingUp,
  ArrowRight,
  Calendar,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { formatArrivalTime } from '../utils/alertUtils'
import StudentProfileModal from '../components/StudentProfileModal'
import LeadStepModal from '../components/LeadStepModal'
import FrdReportsView from '../components/FrdReportsView'
import FollowupScheduleView from '../components/FollowupScheduleView'
import { getSalesDisplayStatus } from '../constants/leadLifecycle'

export default function SalesDashboard({ user, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Track active route: personal queue, follow-up schedule, manager team view, or sales reports
  const isTeamView = location.pathname.includes('/team')
  const isScheduleView = location.pathname.startsWith('/schedule')
  const isReportsView = location.pathname.startsWith('/reports')
  const salesReportSlug = location.pathname.startsWith('/reports/')
    ? location.pathname.replace('/reports/', '').split('/')[0]
    : ''
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(30)
  const [totalLeadsCount, setTotalLeadsCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Student Profile Drawer / Modal & Step Progression Modal
  const [activeStudentModal, setActiveStudentModal] = useState(null)
  const [activeStepLead, setActiveStepLead] = useState(null)
  const [crmMeta, setCrmMeta] = useState(null)

  // Log Call & Notes Modal (legacy kept for fallback)
  const [callModalLead, setCallModalLead] = useState(null)
  const [callStatus, setCallStatus] = useState('Contacted')
  const [callSubStatus, setCallSubStatus] = useState('Interested - Sent Brochure')
  const [callNote, setCallNote] = useState('')
  const [callbackDateTime, setCallbackDateTime] = useState('')
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    api.getCrmMeta().then(setCrmMeta).catch(() => { })
  }, [])

  useEffect(() => {
    setPage(1)
  }, [location.pathname, statusFilter, searchQuery])

  useEffect(() => {
    loadData(page)
  }, [location.pathname, page, statusFilter, searchQuery])

  const isLeadAssignedToMe = lead => {
    if (!lead || !user) return false
    if (lead.assignmentStatus !== 'ASSIGNED' || !lead.assignedTo) return false
    const repId = lead.assignedTo.repId ? String(lead.assignedTo.repId) : ''
    const myId = String(user.id || user._id || '')
    if (repId && myId && repId === myId) return true
    if (lead.assignedTo.repName && user.name) {
      return lead.assignedTo.repName.toLowerCase() === user.name.toLowerCase()
    }
    return false
  }

  const loadData = async (targetPage = page) => {
    setLoading(true)
    try {
      const commonParams = {
        page: targetPage,
        limit: pageSize,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      }
      const leadsPromise = isTeamView
        ? api.getLeads({ ...commonParams, role: 'sales' })
        : api.getLeads({ ...commonParams, repId: user?.id || user?._id || 'sales_01' })

      const [leadsData, statsData] = await Promise.all([
        leadsPromise,
        api.getStats(),
      ])

      const list = Array.isArray(leadsData) ? leadsData : (leadsData?.leads || [])
      setLeads(list)
      setTotalLeadsCount(Array.isArray(leadsData) ? list.length : (leadsData?.total ?? list.length))
      setTotalPages(Array.isArray(leadsData) ? 1 : (leadsData?.totalPages || 1))
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

  // Leads are already filtered & paginated on backend
  const filteredLeads = leads

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
            <h2>CRM</h2>
            <span>Sales Counselor Portal</span>
          </div>
        </div>

        {/* Rep Profile Card */}
        <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.06)', margin: '0 12px 14px', borderRadius: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>{user?.name || 'Counselor'}</div>
          <div style={{ fontSize: 11, color: '#93c5fd' }}>{user?.title || 'Healthcare Counselor'}</div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
            <span>Active Queue:</span>
            <strong style={{ color: '#00c6ff' }}>{leads.length} Leads</strong>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="sidebar-nav">
          <div
            className={`nav-item ${!isTeamView && !isReportsView && !isScheduleView ? 'active' : ''}`}
            onClick={() => {
              setMobileMenuOpen(false)
              navigate('/queue')
            }}
          >
            <span className="nav-item-icon"><LayoutDashboard size={16} /></span>
            <span>My Outreach Queue</span>
            <span style={{ marginLeft: 'auto', background: '#0284c7', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
              {!isTeamView && !isReportsView && !isScheduleView ? leads.length : ''}
            </span>
          </div>

          <div
            className={`nav-item ${isScheduleView ? 'active' : ''}`}
            onClick={() => {
              setMobileMenuOpen(false)
              navigate('/schedule')
            }}
          >
            <span className="nav-item-icon"><Calendar size={16} /></span>
            <span>Contact Schedule</span>
          </div>

          <div
            className={`nav-item ${isReportsView ? 'active' : ''}`}
            onClick={() => {
              setMobileMenuOpen(false)
              navigate('/reports')
            }}
          >
            <span className="nav-item-icon"><BarChart3 size={16} /></span>
            <span>My Reports</span>
          </div>

          {/* Group Manager Team View */}
          {user?.isGroupManager && (
            <div
              className={`nav-item ${isTeamView ? 'active' : ''}`}
              onClick={() => {
                setMobileMenuOpen(false)
                navigate('/team')
              }}
            >
              <span className="nav-item-icon"><Users size={16} /></span>
              <span>My Team Leads</span>
              <span style={{ marginLeft: 'auto', background: '#8b5cf6', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                Manager
              </span>
            </div>
          )}
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
                <h1 className="page-title">
                  {isScheduleView
                    ? 'Next Contact & Follow-Up Schedule'
                    : isReportsView
                      ? 'My Performance Reports'
                      : isTeamView
                        ? 'My Team Leads'
                        : 'Admissions Outreach Queue'}
                </h1>
                <p className="page-subtitle">
                  {isScheduleView
                    ? 'Daily, Next Day & Custom Date Callback Schedule'
                    : 'Futureace Academy CRM • Instant Dialing & WhatsApp Inquiries'}
                </p>
              </div>
            </div>
            <button
              className="btn-refresh-icon"
              onClick={() => {
                loadData()
                setScheduleRefreshKey(k => k + 1)
              }}
              title="Refresh Queue & Schedule"
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
          {/* Dedicated Contact Schedule View */}
          {isScheduleView ? (
            <FollowupScheduleView
              isAdmin={false}
              currentUser={user}
              refreshKey={scheduleRefreshKey}
              onOpenStep={setActiveStepLead}
              onOpenProfile={setActiveStudentModal}
              onQuickDial={lead => quickMarkStatus(lead, lead.status, 'Call Initiated')}
              showNotify={showNotify}
            />
          ) : isReportsView ? (
            salesReportSlug === 'business' || salesReportSlug === 'conversion' ? (
              <FrdReportsView
                reportType={salesReportSlug}
                isAdmin={false}
                onBack={() => navigate('/reports')}
                showNotify={showNotify}
              />
            ) : (
              <div>
                <div className="pool-action-bar" style={{ marginBottom: 18 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      My Performance Reports
                    </h3>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Select a report card to open your dedicated Business Turnover or Conversion report.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {[
                    {
                      slug: 'business',
                      title: 'My Business Report',
                      desc: 'Track your Leads Allocated, Unique Aggregate Business Count, Course Fees (Turnover), Actual Paid Revenue, and Qualified / Converted / Onboarded splits.',
                      color: '#059669',
                      bg: '#ecfdf5',
                      Icon: IndianRupee,
                    },
                    {
                      slug: 'conversion',
                      title: 'My Lead Conversion Report',
                      desc: 'View your monthly and till-date conversion ratios across Aggregate, Qualified, Converted, and Onboarded Business milestones.',
                      color: '#0284c7',
                      bg: '#f0f9ff',
                      Icon: TrendingUp,
                    },
                  ].map(card => {
                    const CardIcon = card.Icon
                    return (
                      <div
                        key={card.slug}
                        className="template-card"
                        onClick={() => navigate(`/reports/${card.slug}`)}
                        style={{
                          padding: 18,
                          cursor: 'pointer',
                          borderTop: `3px solid ${card.color}`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: card.bg,
                              color: card.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 10,
                            }}
                          >
                            <CardIcon size={20} />
                          </div>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                            {card.title}
                          </h4>
                          <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                            {card.desc}
                          </p>
                        </div>
                        <div style={{ paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: card.color }}>
                          <span>Open Report Page</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          ) : (
          <>
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

          {/* Next Contact Schedule (Day + Next Day + Date Selector right inside Queue) */}
          {!isTeamView && (
            <div style={{ marginBottom: 20 }}>
              <FollowupScheduleView
                isAdmin={false}
                currentUser={user}
                refreshKey={scheduleRefreshKey}
                collapsible={true}
                onOpenStep={setActiveStepLead}
                onOpenProfile={setActiveStudentModal}
                onQuickDial={lead => quickMarkStatus(lead, lead.status, 'Call Initiated')}
                showNotify={showNotify}
              />
            </div>
          )}

          {/* Action Table Header Bar */}
          <div className="pool-action-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, width: '100%' }}>
              <Search size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search leads by name, ID, phone or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', minWidth: 0, fontSize: 13 }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'inline-flex', flexShrink: 0 }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                <>
                {/* MOBILE-FIRST CARD QUEUE (Zero horizontal scroll, thumb-friendly 1-tap actions) */}
                <div className="sales-mobile-cards">
                  {filteredLeads.map(lead => {
                    const cleanPhone = (lead.phone || '').replace(/\D/g, '')
                    const waMsg = encodeURIComponent(
                      `Hello ${lead.fullName}, this is ${user?.name || 'Counselor'} regarding your inquiry for our ${lead.courseProgram || 'Healthcare Management'} program. Are you available for a brief discussion?`
                    )
                    const canEditLead = isLeadAssignedToMe(lead)
                    return (
                      <div key={lead.id} className="sales-lead-card">
                        {/* Card Top Row: Name + Status Pill */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <div
                              onClick={() => setActiveStudentModal(lead)}
                              style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', cursor: 'pointer', wordBreak: 'break-word' }}
                            >
                              {lead.fullName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                              <a
                                href={`tel:${lead.phone}`}
                                style={{ fontSize: 13, color: '#0369a1', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <Phone size={12} />
                                <span>{lead.phone}</span>
                              </a>
                              <span style={{ fontSize: 11, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={11} color="#0284c7" />
                                {formatArrivalTime(lead.createdTime || lead.createdAt)}
                              </span>
                            </div>
                            {lead.email && (
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, wordBreak: 'break-all' }}>
                                {lead.email}
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: 12,
                              background: lead.isCycleEnded ? '#1e293b' : '#f1f5f9',
                              color: lead.isCycleEnded ? '#ffffff' : '#334155',
                              border: '1px solid #cbd5e1',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {getSalesDisplayStatus(lead)}
                          </span>
                        </div>

                        {/* Course Enquired & Metadata Pills */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
                          <span
                            style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <GraduationCap size={12} />
                            <span>
                              {lead.courseProgram || lead.businessProgramName || 'Not Specified'}
                              {(lead.courseVariant || lead.businessProgramVariant)
                                ? ` • ${lead.courseVariant || lead.businessProgramVariant}`
                                : ''}
                            </span>
                          </span>
                          {lead.qualification && (
                            <span style={{ background: '#f1f5f9', color: '#334155', fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>
                              {lead.qualification}
                            </span>
                          )}
                          {lead.preferredLocation && lead.preferredLocation !== 'Not Specified' && (
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <MapPin size={11} />
                              <span>{lead.preferredLocation}</span>
                            </span>
                          )}
                        </div>

                        {/* Sub-status & Counters */}
                        <div style={{ fontSize: 12, color: '#475569', background: '#f8fafc', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {lead.selectedCategoryLabel || lead.subStatus || 'Pending First Call'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <span>Steps: <strong>{lead.steps?.length || 0}</strong> • Calls: <strong>{lead.callAttempts || 0}</strong></span>
                            {lead.callbackAt && (
                              <span style={{ color: '#ea580c', fontWeight: 700 }}>
                                Callback: {new Date(lead.callbackAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 1-Tap Thumb-Friendly Action Buttons */}
                        <div className="sales-lead-card-actions">
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={() => quickMarkStatus(lead, lead.status, 'Call Initiated')}
                            className="sales-lead-card-btn"
                            style={{ background: '#0284c7', color: '#ffffff' }}
                          >
                            <PhoneCall size={15} />
                            <span>Call Now</span>
                          </a>
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${waMsg}`}
                            target="_blank"
                            rel="noreferrer"
                            className="sales-lead-card-btn"
                            style={{ background: '#25D366', color: '#ffffff' }}
                          >
                            <MessageCircle size={15} />
                            <span>WhatsApp</span>
                          </a>
                          {canEditLead ? (
                            <>
                              <button
                                type="button"
                                className="sales-lead-card-btn"
                                onClick={() => setActiveStepLead(lead)}
                                style={{ background: '#1b2b6b', color: '#ffffff' }}
                              >
                                <Plus size={15} />
                                <span>Log Step</span>
                              </button>
                              <button
                                type="button"
                                className="sales-lead-card-btn"
                                onClick={() => setActiveStudentModal(lead)}
                                style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }}
                              >
                                <User size={15} />
                                <span>Profile</span>
                              </button>
                            </>
                          ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 11, color: '#64748b', padding: '4px 0' }}>
                              Assigned to {lead.assignedTo?.repName || 'Other'} (Read-Only)
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="leads-table-container sales-desktop-table">
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Candidate / Phone</th>
                        <th>Course Enquired</th>
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
                              <div
                                style={{ fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}
                                onClick={() => setActiveStudentModal(lead)}
                                title="Click to view & edit student profile"
                              >
                                {lead.fullName}
                              </div>
                              <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>
                                <a href={`tel:${lead.phone}`} style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Phone size={12} />
                                  <span>{lead.phone}</span>
                                </a>
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{lead.email}</div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', marginTop: 3 }}>
                                <Clock size={11} color="#0284c7" />
                                <span>{formatArrivalTime(lead.createdTime || lead.createdAt)}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
                                {lead.courseProgram || lead.businessProgramName || 'Not Specified'}
                              </div>
                              {(lead.courseVariant || lead.businessProgramVariant) && (
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  {lead.courseVariant || lead.businessProgramVariant}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>{lead.qualification}</div>
                              <div style={{ fontSize: 11, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={11} color="#64748b" />
                                <span>{lead.preferredLocation}</span>
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{lead.learningMode}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    background: lead.isCycleEnded ? '#1e293b' : '#f1f5f9',
                                    color: lead.isCycleEnded ? '#ffffff' : '#334155',
                                    border: '1px solid #cbd5e1',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {getSalesDisplayStatus(lead)}
                                </span>
                                {lead.isCycleEnded && (
                                  <span style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>
                                    Closed
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                                {lead.selectedCategoryLabel || lead.subStatus}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                Steps: {lead.steps?.length || 0} • Calls: {lead.callAttempts || 0}
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
                              {isLeadAssignedToMe(lead) ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    type="button"
                                    className="btn-pulse-secondary"
                                    style={{ fontSize: 11, padding: '5px 8px' }}
                                    onClick={() => setActiveStudentModal(lead)}
                                    title="View & Edit Student Profile"
                                  >
                                    Profile
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-pulse"
                                    style={{ fontSize: 11, padding: '5px 10px' }}
                                    onClick={() => setActiveStepLead(lead)}
                                    title="Add step, update category/status, or view timeline"
                                  >
                                    + Step
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                                  Assigned to {lead.assignedTo?.repName || 'Other'} (Read-Only)
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              )}
              {totalLeadsCount > 0 && (
                <div className="pagination-container">
                  <div>
                    Showing{' '}
                    <strong>
                      {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalLeadsCount)}
                    </strong>{' '}
                    of <strong>{totalLeadsCount}</strong> leads (Page {page} of {totalPages})
                  </div>
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn-pagination"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn-pagination"
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
          )}
        </div>
      </main>

      {/* Mobile Sticky Bottom Navigation for Sales Counselors */}
      <nav className="sales-mobile-bottom-nav" aria-label="Mobile navigation">
        <button
          type="button"
          className={`sales-bottom-nav-btn ${!isTeamView && !isReportsView && !isScheduleView ? 'active' : ''}`}
          onClick={() => navigate('/queue')}
        >
          <LayoutDashboard size={18} />
          <span>Queue</span>
        </button>
        <button
          type="button"
          className={`sales-bottom-nav-btn ${isScheduleView ? 'active' : ''}`}
          onClick={() => navigate('/schedule')}
        >
          <Calendar size={18} />
          <span>Schedule</span>
        </button>
        <button
          type="button"
          className={`sales-bottom-nav-btn ${isReportsView ? 'active' : ''}`}
          onClick={() => navigate('/reports')}
        >
          <BarChart3 size={18} />
          <span>Reports</span>
        </button>
        {user?.isGroupManager && (
          <button
            type="button"
            className={`sales-bottom-nav-btn ${isTeamView ? 'active' : ''}`}
            onClick={() => navigate('/team')}
          >
            <Users size={18} />
            <span>Team</span>
          </button>
        )}
        <button
          type="button"
          className="sales-bottom-nav-btn"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </nav>

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
                    <div style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color="#64748b" />
                      <span>{callModalLead.preferredLocation}</span>
                    </div>
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle size={14} />
                      <span>Contacted (Connected)</span>
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <XCircle size={14} />
                      <span>Not Contacted</span>
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

      {/* Lead Step Progression & Timeline Modal (Assigned Leads Only — No Hot/Warm/Cold exposed) */}
      {activeStepLead && (
        <LeadStepModal
          lead={activeStepLead}
          currentUser={user}
          crmMeta={crmMeta}
          onClose={() => setActiveStepLead(null)}
          onUpdated={() => {
            setActiveStepLead(null)
            loadData()
            setScheduleRefreshKey(k => k + 1)
          }}
          showNotify={showNotify}
        />
      )}

      {/* Student Profile Modal (Editable & Starts Open) */}
      {activeStudentModal && (
        <StudentProfileModal
          lead={activeStudentModal}
          currentUser={user}
          onClose={() => setActiveStudentModal(null)}
          onUpdated={updatedLead => {
            setActiveStudentModal(updatedLead)
            loadData()
            setScheduleRefreshKey(k => k + 1)
          }}
          showNotify={showNotify}
        />
      )}
    </div>
  )
}
