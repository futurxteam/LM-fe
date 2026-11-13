import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  Users,
  Upload,
  FileSpreadsheet,
  ClipboardPaste,
  UserCheck,
  CheckCircle2,
  PhoneCall,
  Search,
  LogOut,
  RefreshCw,
  X,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Globe,
  GraduationCap,
  Briefcase,
  Calendar,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Activity,
  Menu,
} from 'lucide-react'
import { api } from '../api'

export default function AdminDashboard({ user, onLogout }) {
  // Navigation Tabs: 'dashboard' | 'pool' | 'all-leads' | 'reports'
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Data states
  const [poolLeads, setPoolLeads] = useState([])
  const [masterLeads, setMasterLeads] = useState([])
  const [salesReps, setSalesReps] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Master List Backend Pagination (by 30)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeadsCount, setTotalLeadsCount] = useState(0)

  // Reports Sub-tab: 'stage' | 'reps' | 'campaigns' | 'demographics'
  const [activeReportSubTab, setActiveReportSubTab] = useState('stage')

  // Selection for bulk assignment in Pool
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [selectedRepId, setSelectedRepId] = useState('')

  // Filters & Search for Master List
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [qualFilter, setQualFilter] = useState('All')

  // Modals & Notifications
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteContent, setPasteContent] = useState('')
  const [activeLeadModal, setActiveLeadModal] = useState(null)
  const [notification, setNotification] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Load initial stats & pool
  useEffect(() => {
    loadOverviewData()
  }, [])

  // Load paginated master list whenever page or filters change
  useEffect(() => {
    if (activeTab === 'all-leads') {
      loadMasterLeads(page)
    }
  }, [page, statusFilter, qualFilter, searchQuery, activeTab])

  // Overview loader
  const loadOverviewData = async () => {
    setLoading(true)
    try {
      const [poolData, repsData, statsData] = await Promise.all([
        api.getLeads({ poolOnly: true }),
        api.getSalesReps(),
        api.getStats(),
      ])

      setPoolLeads(Array.isArray(poolData) ? poolData : (poolData?.leads || []))
      setSalesReps(repsData || [])
      setStats(statsData || null)
      if (repsData && repsData.length > 0) {
        setSelectedRepId(repsData[0].id)
      }
    } catch (err) {
      console.error('Error fetching overview data:', err)
      showNotify('error', err.message || 'Failed to load live data')
    } finally {
      setLoading(false)
    }
  }

  // Master leads loader (Backend-paginated by 30)
  const loadMasterLeads = async targetPage => {
    setLoading(true)
    try {
      const res = await api.getLeads({
        page: targetPage,
        limit: 30,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        qualification: qualFilter !== 'All' ? qualFilter : undefined,
        search: searchQuery.trim() || undefined,
      })

      if (res && res.leads) {
        setMasterLeads(res.leads)
        setTotalLeadsCount(res.total)
        setTotalPages(res.totalPages || 1)
        setPage(res.page || 1)
      } else if (Array.isArray(res)) {
        setMasterLeads(res.slice(0, 30))
        setTotalLeadsCount(res.length)
        setTotalPages(Math.ceil(res.length / 30) || 1)
        setPage(1)
      }
    } catch (err) {
      console.error('Failed to load master leads:', err)
      showNotify('error', err.message || 'Failed to load master leads')
    } finally {
      setLoading(false)
    }
  }

  const showNotify = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  // Handle Pool Selection
  const toggleSelectLead = id => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAllPool = () => {
    const unassignedIds = poolLeads.map(l => l.id)
    if (selectedLeadIds.length === unassignedIds.length) {
      setSelectedLeadIds([])
    } else {
      setSelectedLeadIds(unassignedIds)
    }
  }

  // Manual Assignment
  const handleManualAssign = async () => {
    if (selectedLeadIds.length === 0) {
      showNotify('error', 'Select at least one lead from the pool')
      return
    }
    if (!selectedRepId) {
      showNotify('error', 'Select a sales representative')
      return
    }

    try {
      const res = await api.assignLeads(selectedLeadIds, selectedRepId)
      showNotify('success', res.message || 'Leads assigned successfully')
      setSelectedLeadIds([])
      await loadOverviewData()
    } catch (err) {
      showNotify('error', err.message || 'Assignment failed')
    }
  }

  // Automated Round Robin
  const handleAutoAssign = async (mode = 'round-robin') => {
    try {
      const res = await api.autoAssignLeads(
        selectedLeadIds.length > 0 ? selectedLeadIds : [],
        mode
      )
      showNotify('success', res.message || `Auto-assigned ${res.assignedCount} leads`)
      setSelectedLeadIds([])
      await loadOverviewData()
    } catch (err) {
      showNotify('error', err.message || 'Auto-assignment failed')
    }
  }

  // Return to Pool
  const handleUnassign = async leadIds => {
    try {
      const res = await api.unassignLeads(leadIds)
      showNotify('success', res.message || 'Lead returned to unassigned pool')
      await loadOverviewData()
      if (activeTab === 'all-leads') {
        await loadMasterLeads(page)
      }
    } catch (err) {
      showNotify('error', err.message || 'Unassign failed')
    }
  }

  // File Upload (XLSX, XLS, CSV, TSV)
  const handleFileUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const res = await api.uploadLeadsFile(file)
      showNotify('success', res.message || `Imported ${res.addedCount} new leads from ${file.name}`)
      setShowUploadModal(false)
      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(1)
    } catch (err) {
      showNotify('error', err.message || 'File upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // Paste Text Submission
  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) {
      showNotify('error', 'Please paste TSV, CSV or Meta lead data')
      return
    }

    setUploading(true)
    try {
      const res = await api.pasteLeadsText(pasteContent)
      showNotify('success', res.message || `Extracted & added ${res.addedCount} leads to pool`)
      setPasteContent('')
      setShowPasteModal(false)
      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(1)
    } catch (err) {
      showNotify('error', err.message || 'Failed to parse pasted data')
    } finally {
      setUploading(false)
    }
  }

  // Status Change directly from Admin
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.updateLeadStatus(leadId, {
        status: newStatus,
        subStatus: newStatus === 'Contacted' ? 'Interested - Admin Update' : 'Ringing / No Answer',
        author: 'Admin',
        note: `Status updated to ${newStatus} by Admin`,
      })
      showNotify('success', `Lead status updated to ${newStatus}`)
      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(page)
    } catch (err) {
      showNotify('error', err.message || 'Failed to update status')
    }
  }

  // Dials definition for Overview tab
  const totalCount = stats?.totalLeads || 0
  const poolCount = stats?.poolCount || poolLeads.length || 0
  const assignedCount = stats?.assignedCount || 0
  const contactedCount = stats?.contactedCount || 0
  const notContactedCount = stats?.notContactedCount || 0
  const enrolledCount = stats?.enrolledCount || 0

  const gaugeMetrics = [
    { label: 'Unassigned Pool', subtext: `${poolCount} Leads Waiting`, percent: totalCount > 0 ? Math.round((poolCount / totalCount) * 100) : 0, color: '#8b5cf6' },
    { label: 'Assigned Leads', subtext: `${assignedCount} Distributed`, percent: totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0, color: '#00b4d8' },
    { label: 'Contacted Rate', subtext: `${contactedCount} Connected`, percent: stats?.contactRate || 0, color: '#10b981' },
    { label: 'Not Contacted', subtext: `${notContactedCount} Pending Calls`, percent: assignedCount > 0 ? Math.round((notContactedCount / assignedCount) * 100) : 0, color: '#f59e0b' },
    { label: 'Enrolled / Won', subtext: `${enrolledCount} Conversions`, percent: stats?.conversionRate || 0, color: '#059669' },
  ]

  return (
    <div className="app-container">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 1. Left Sidebar (Fixed desktop / Slide-over mobile drawer) */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <img src="/logo-brand-white.png" alt="Futureace Academy Logo" className="brand-logo-img" />
          </div>
          <div className="sidebar-brand-text">
            <h2>Futureace Academy CRM</h2>
            <span>Admin Portal</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Navigation"
            title="Close Menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard')
              setMobileMenuOpen(false)
            }}
          >
            <span className="nav-item-icon"><LayoutDashboard size={16} /></span>
            <span>Dashboard Overview</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'pool' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('pool')
              setMobileMenuOpen(false)
              loadOverviewData()
            }}
          >
            <span className="nav-item-icon"><Layers size={16} /></span>
            <span>Lead Pool & Assign</span>
            {poolCount > 0 && (
              <span style={{ marginLeft: 'auto', background: '#8b5cf6', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                {poolCount}
              </span>
            )}
          </div>

          <div
            className={`nav-item ${activeTab === 'all-leads' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('all-leads')
              setMobileMenuOpen(false)
              loadMasterLeads(1)
            }}
          >
            <span className="nav-item-icon"><Users size={16} /></span>
            <span>All Company Leads</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
              {totalCount || totalLeadsCount}
            </span>
          </div>

          <div
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('reports')
              setMobileMenuOpen(false)
            }}
          >
            <span className="nav-item-icon"><BarChart3 size={16} /></span>
            <span>Reports & Analytics</span>
          </div>
        </nav>

        {/* Rep Status Overview in Sidebar */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 700 }}>
            Sales Reps Active
          </div>
          {salesReps.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#cbd5e1' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                {r.name}
              </span>
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                {r.totalAssigned || 0} leads
              </span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="btn-sidebar-logout" onClick={onLogout}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area (Only pages scrollable) */}
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
                  {activeTab === 'dashboard' && 'Dashboard Overview'}
                  {activeTab === 'pool' && 'Lead Pool & Allocation'}
                  {activeTab === 'all-leads' && 'Master Company Leads Directory'}
                  {activeTab === 'reports' && 'Reports & Analytics'}
                </h1>
                <p className="page-subtitle">
                  Futureace Academy CRM • Admissions & Lead Allocation System
                </p>
              </div>
            </div>
            <button
              className="btn-refresh-icon"
              onClick={() => {
                loadOverviewData()
                if (activeTab === 'all-leads') loadMasterLeads(page)
              }}
              title="Refresh Live Data"
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
                border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
              }}
            >
              {notification.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{notification.message}</span>
            </div>
          )}
          {/* ========================================================
              TAB 1: DASHBOARD OVERVIEW
              Shows the Live Ingestion & Conversion Pipeline (ONLY HERE!)
              ======================================================== */}
          {activeTab === 'dashboard' && (
            <div>
              {/* LIVE INGESTION & CONVERSION PIPELINE (Only on Dashboard Overview!) */}
              <div className="template-card" style={{ marginBottom: 20 }}>
                <div className="template-card-header">
                  <h3>Live Ingestion & Conversion Pipeline</h3>
                  <span className="header-badge">{totalCount} Total Extracted Leads</span>
                </div>
                <div className="template-card-body">
                  <div className="dial-grid">
                    {gaugeMetrics.map((gauge, idx) => {
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

              {/* Quick Actions & Navigation Cards */}
              <div className="stage-report-grid">
                <div
                  className="stage-stat-card"
                  style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
                  onClick={() => setActiveTab('pool')}
                >
                  <div className="stage-stat-title">Unassigned Lead Pool</div>
                  <div className="stage-stat-value">{poolCount}</div>
                  <div className="stage-stat-sub">
                    Leads waiting for counselor assignment → Click to Allocate
                  </div>
                </div>

                <div
                  className="stage-stat-card"
                  style={{ borderLeft: '4px solid #10b981', cursor: 'pointer' }}
                  onClick={() => {
                    setActiveTab('all-leads')
                    setStatusFilter('Contacted')
                  }}
                >
                  <div className="stage-stat-title">Contacted Prospects</div>
                  <div className="stage-stat-value" style={{ color: '#10b981' }}>{contactedCount}</div>
                  <div className="stage-stat-sub">
                    {stats?.contactRate || 0}% overall contact rate across team
                  </div>
                </div>

                <div
                  className="stage-stat-card"
                  style={{ borderLeft: '4px solid #0284c7', cursor: 'pointer' }}
                  onClick={() => {
                    setActiveTab('reports')
                    setActiveReportSubTab('stage')
                  }}
                >
                  <div className="stage-stat-title">Active Outreach Stage</div>
                  <div className="stage-stat-value" style={{ color: '#0284c7' }}>
                    {assignedCount}
                  </div>
                  <div className="stage-stat-sub">
                    Distributed across {salesReps.length} admissions counselors
                  </div>
                </div>

                <div
                  className="stage-stat-card"
                  style={{ borderLeft: '4px solid #059669', cursor: 'pointer' }}
                  onClick={() => {
                    setActiveTab('reports')
                    setActiveReportSubTab('stage')
                  }}
                >
                  <div className="stage-stat-title">Confirmed Enrolled</div>
                  <div className="stage-stat-value" style={{ color: '#059669' }}>{enrolledCount}</div>
                  <div className="stage-stat-sub">
                    {stats?.conversionRate || 0}% student conversion rate
                  </div>
                </div>
              </div>

              {/* Rep Leaderboard Snapshot on Dashboard */}
              <div className="template-card">
                <div className="template-card-header">
                  <h3>Sales Representatives Quick Snapshot</h3>
                  <button
                    className="header-badge"
                    style={{ cursor: 'pointer', border: 'none' }}
                    onClick={() => {
                      setActiveTab('reports')
                      setActiveReportSubTab('reps')
                    }}
                  >
                    View Detailed Leaderboard →
                  </button>
                </div>
                <div className="template-card-body" style={{ padding: 0 }}>
                  <table className="reps-table">
                    <thead>
                      <tr>
                        <th>Counselor</th>
                        <th>Specialty Territory</th>
                        <th>Assigned</th>
                        <th>Contacted</th>
                        <th>Contact Rate %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesReps.map(rep => (
                        <tr key={rep.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className="rep-avatar">{rep.avatar}</span>
                              <div style={{ fontWeight: 600 }}>{rep.name}</div>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: '#475569' }}>{rep.specialty}</td>
                          <td style={{ fontWeight: 600 }}>{rep.totalAssigned || 0}</td>
                          <td style={{ color: '#166534', fontWeight: 600 }}>{rep.contactedCount || 0}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#10b981' }}>{rep.contactRate || 0}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: LEAD POOL & ASSIGN
              NO live ingestion pipeline card here!
              IMPORT OPTIONS ONLY HERE!
              ======================================================== */}
          {activeTab === 'pool' && (
            <div>
              {/* Pool Toolbar with IMPORT BUTTONS ONLY IN THIS TAB */}
              <div className="pool-action-bar">
                <div className="pool-action-group">
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    Pool Ingestion:
                  </span>
                  {/* IMPORT OPTIONS ONLY HERE */}
                  <button className="btn-pulse-accent" onClick={() => setShowUploadModal(true)}>
                    <FileSpreadsheet size={14} />
                    <span>Import XLSX / CSV</span>
                  </button>
                  <button className="btn-pulse-secondary" onClick={() => setShowPasteModal(true)}>
                    <ClipboardPaste size={14} />
                    <span>Paste Meta Data</span>
                  </button>
                </div>

                <div className="pool-action-group">
                  <button
                    className="btn-pulse-secondary"
                    onClick={toggleSelectAllPool}
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    {selectedLeadIds.length === poolLeads.length && poolLeads.length > 0
                      ? 'Deselect All'
                      : `Select All (${poolLeads.length})`}
                  </button>

                  {/* Manual Assign Select */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <select
                      value={selectedRepId}
                      onChange={e => setSelectedRepId(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      {salesReps.map(rep => (
                        <option key={rep.id} value={rep.id}>
                          Assign to: {rep.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-pulse"
                      onClick={handleManualAssign}
                      disabled={selectedLeadIds.length === 0}
                      style={{ opacity: selectedLeadIds.length === 0 ? 0.5 : 1 }}
                    >
                      <UserCheck size={14} />
                      <span>Assign ({selectedLeadIds.length})</span>
                    </button>
                  </div>

                  {/* Auto Assign Buttons */}
                  <button
                    className="btn-pulse-accent"
                    onClick={() => handleAutoAssign('round-robin')}
                    title="Evenly distribute pool leads among all active sales reps"
                  >
                    <Sparkles size={14} />
                    <span>Auto Round-Robin</span>
                  </button>

                  <button
                    className="btn-pulse-secondary"
                    onClick={() => handleAutoAssign('geo-smart')}
                    title="Routes GCC/UAE leads to International Admissions, others to domestic counselors"
                  >
                    <Globe size={14} color="#0284c7" />
                    <span>Geo-Smart GCC</span>
                  </button>
                </div>
              </div>

              {/* Pool Table Card */}
              <div className="template-card">
                <div className="template-card-header">
                  <h3>Unassigned Leads in Pool</h3>
                  <span className="header-badge">{poolLeads.length} Available to Allocate</span>
                </div>
                <div className="template-card-body" style={{ padding: 0 }}>
                  {poolLeads.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                      <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>
                        Lead pool is currently clear!
                      </p>
                      <p style={{ fontSize: 13, marginTop: 4 }}>
                        All incoming leads have been assigned. Use the <strong>Import XLSX / CSV</strong> button above to upload a new batch.
                      </p>
                    </div>
                  ) : (
                    <div className="leads-table-container">
                      <table className="leads-table">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}>
                              <input
                                type="checkbox"
                                checked={selectedLeadIds.length === poolLeads.length && poolLeads.length > 0}
                                onChange={toggleSelectAllPool}
                              />
                            </th>
                            <th>Candidate / Contact</th>
                            <th>Qualification & Degree</th>
                            <th>Preferred Location</th>
                            <th>Mode / Role</th>
                            <th>Campaign / Platform</th>
                            <th>Direct Assign</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poolLeads.map(lead => {
                            const isSelected = selectedLeadIds.includes(lead.id)
                            return (
                              <tr
                                key={lead.id}
                                style={{ background: isSelected ? '#f5f3ff' : 'transparent' }}
                              >
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectLead(lead.id)}
                                  />
                                </td>
                                <td>
                                  <div
                                    style={{ fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                                    onClick={() => setActiveLeadModal(lead)}
                                  >
                                    {lead.fullName}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#475569' }}>{lead.phone}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{lead.email}</div>
                                </td>
                                <td>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                                    <GraduationCap size={13} color="#0369a1" />
                                    {lead.qualification}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#334155' }}>
                                    <Globe size={13} color="#64748b" />
                                    {lead.preferredLocation}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, fontWeight: 500 }}>{lead.careerRole || 'Hospital Admin'}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>{lead.learningMode}</div>
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, fontWeight: 500 }}>{lead.platform}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.campaignName}>
                                    {lead.campaignName}
                                  </div>
                                </td>
                                <td>
                                  <select
                                    onChange={e => {
                                      if (e.target.value) {
                                        api.assignLeads([lead.id], e.target.value).then(() => {
                                          showNotify('success', `Assigned ${lead.fullName}`)
                                          loadOverviewData()
                                        })
                                      }
                                    }}
                                    defaultValue=""
                                    style={{ padding: '5px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #cbd5e1' }}
                                  >
                                    <option value="" disabled>Assign to...</option>
                                    {salesReps.map(r => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                  </select>
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
          )}

          {/* ========================================================
              TAB 3: ALL COMPANY LEADS (BACKEND PAGINATED BY 30)
              NO live ingestion pipeline card here!
              ======================================================== */}
          {activeTab === 'all-leads' && (
            <div>
              {/* Search & Filters */}
              <div className="pool-action-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                  <Search size={16} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search candidate by name, phone, email, qualification or city..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Status Badges Filter */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['All', 'Unassigned', 'Assigned', 'Contacted', 'Not Contacted'].map(st => (
                      <button
                        key={st}
                        onClick={() => {
                          setStatusFilter(st)
                          setPage(1)
                        }}
                        style={{
                          padding: '4px 10px',
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

                  {/* Qualification Filter */}
                  <select
                    value={qualFilter}
                    onChange={e => {
                      setQualFilter(e.target.value)
                      setPage(1)
                    }}
                    style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="All">All Qualifications</option>
                    <option value="Post Graduation">Post Graduation</option>
                    <option value="Graduation / Degree">Graduation / Degree</option>
                  </select>
                </div>
              </div>

              {/* Master Leads Table */}
              <div className="template-card">
                <div className="template-card-header">
                  <h3>Master Ingested Leads List</h3>
                  <span className="header-badge">
                    Page {page} of {totalPages} ({totalLeadsCount} total leads)
                  </span>
                </div>
                <div className="template-card-body" style={{ padding: 0 }}>
                  <div className="leads-table-container">
                    <table className="leads-table">
                      <thead>
                        <tr>
                          <th>Lead ID</th>
                          <th>Candidate & Contacts</th>
                          <th>Qualification / City</th>
                          <th>Assignment State</th>
                          <th>Contact Status</th>
                          <th>Attempts & Sub-status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {masterLeads.map(lead => {
                          const isAssigned = lead.assignmentStatus === 'ASSIGNED'
                          return (
                            <tr key={lead.id}>
                              <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
                                #{lead.metaLeadId ? lead.metaLeadId.slice(-6) : lead.id?.slice(-6)}
                              </td>
                              <td>
                                <div
                                  style={{ fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                                  onClick={() => setActiveLeadModal(lead)}
                                >
                                  {lead.fullName}
                                </div>
                                <div style={{ fontSize: 12, color: '#475569' }}>{lead.phone}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{lead.email}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{lead.qualification}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>📍 {lead.preferredLocation}</div>
                              </td>
                              <td>
                                {isAssigned ? (
                                  <div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <UserCheck size={13} /> {lead.assignedTo?.repName || 'Assigned'}
                                    </span>
                                    <button
                                      onClick={() => handleUnassign([lead.id])}
                                      style={{ fontSize: 10, color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                      Return to Pool
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '2px 8px', borderRadius: 4 }}>
                                    In Pool (Unassigned)
                                  </span>
                                )}
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
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{lead.subStatus}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  Attempts: {lead.callAttempts || 0}
                                  {lead.callbackAt && ' • Scheduled Call'}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <select
                                    value={lead.status}
                                    onChange={e => handleStatusChange(lead.id, e.target.value)}
                                    style={{ padding: '3px 6px', fontSize: 11, borderRadius: 4, border: '1px solid #cbd5e1' }}
                                  >
                                    <option value="Not Contacted">Not Contacted</option>
                                    <option value="Contacted">Contacted</option>
                                  </select>
                                  <button
                                    className="btn-action-sm"
                                    onClick={() => setActiveLeadModal(lead)}
                                  >
                                    Audit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Backend Pagination Bar (30 items per page) */}
                  <div className="pagination-container">
                    <div>
                      Showing{' '}
                      <strong>
                        {totalLeadsCount === 0 ? 0 : (page - 1) * 30 + 1} - {Math.min(page * 30, totalLeadsCount)}
                      </strong>{' '}
                      of <strong>{totalLeadsCount}</strong> total leads (Page {page} of {totalPages})
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="btn-pagination"
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        disabled={page <= 1 || loading}
                      >
                        <ChevronLeft size={14} />
                        <span>Previous</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          className={`btn-pagination ${page === p ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                          disabled={loading}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        className="btn-pagination"
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        disabled={page >= totalPages || loading}
                      >
                        <span>Next</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: REPORTS & ANALYTICS
              Contains the brand new "Current Success Status & Current Stage"
              NO live ingestion pipeline card here!
              ======================================================== */}
          {activeTab === 'reports' && (
            <div>
              {/* Report Sub-tabs Header */}
              <div className="admin-tab-nav">
                <button
                  className={`admin-tab-btn ${activeReportSubTab === 'stage' ? 'active' : ''}`}
                  onClick={() => setActiveReportSubTab('stage')}
                >
                  <Activity size={15} />
                  <span>Current Success Status & Current Stage</span>
                </button>
                <button
                  className={`admin-tab-btn ${activeReportSubTab === 'reps' ? 'active' : ''}`}
                  onClick={() => setActiveReportSubTab('reps')}
                >
                  <Users size={15} />
                  <span>Sales Rep Leaderboard</span>
                </button>
                <button
                  className={`admin-tab-btn ${activeReportSubTab === 'campaigns' ? 'active' : ''}`}
                  onClick={() => setActiveReportSubTab('campaigns')}
                >
                  <BarChart3 size={15} />
                  <span>Campaign & Channel ROI</span>
                </button>
                <button
                  className={`admin-tab-btn ${activeReportSubTab === 'demographics' ? 'active' : ''}`}
                  onClick={() => setActiveReportSubTab('demographics')}
                >
                  <Globe size={15} />
                  <span>Demographics & Geography</span>
                </button>
              </div>

              {/* ----------------------------------------------------
                  SUB-TAB 1: CURRENT SUCCESS STATUS & CURRENT STAGE
                  ---------------------------------------------------- */}
              {activeReportSubTab === 'stage' && (
                <div>
                  {/* High-level Success Status Overview Cards */}
                  <div className="stage-report-grid">
                    {stats?.successStatusReport?.map((st, i) => (
                      <div key={i} className="stage-stat-card" style={{ borderLeft: `4px solid ${st.color}` }}>
                        <div className="stage-stat-title">{st.status}</div>
                        <div className="stage-stat-value" style={{ color: st.color }}>
                          {st.count}
                        </div>
                        <div className="stage-stat-sub">
                          {st.percentage}% of all leads in database
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Current Stage Breakdown Table & Visual Bars */}
                  <div className="template-card">
                    <div className="template-card-header">
                      <h3>Current Lead Pipeline Stage & Sub-Status Breakdown</h3>
                      <span className="header-badge">{stats?.stageReport?.length || 0} Active Stages</span>
                    </div>
                    <div className="template-card-body" style={{ padding: 0 }}>
                      <table className="reps-table">
                        <thead>
                          <tr>
                            <th>Current Stage / Sub-Status</th>
                            <th>Category</th>
                            <th>Lead Volume</th>
                            <th>Pipeline Share (%)</th>
                            <th>Average Attempts</th>
                            <th>Progress Distribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats?.stageReport && stats.stageReport.length > 0 ? (
                            stats.stageReport.map((stage, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                      style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: stage.color,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <strong style={{ color: '#1e293b' }}>{stage.stage}</strong>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontSize: 11, background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, color: '#475569', fontWeight: 600 }}>
                                    {stage.category}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 700, fontSize: 14 }}>{stage.count}</td>
                                <td>
                                  <strong style={{ color: stage.color }}>{stage.percentage}%</strong>
                                </td>
                                <td style={{ color: '#64748b' }}>{stage.avgAttempts} calls</td>
                                <td style={{ width: 160 }}>
                                  <div style={{ width: '100%', height: 7, background: '#e2e8f0', borderRadius: 4 }}>
                                    <div
                                      style={{
                                        width: `${Math.min(stage.percentage * 2, 100)}%`,
                                        height: '100%',
                                        background: stage.color,
                                        borderRadius: 4,
                                      }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                                No stages recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  SUB-TAB 2: SALES REP LEADERBOARD
                  ---------------------------------------------------- */}
              {activeReportSubTab === 'reps' && (
                <div className="template-card">
                  <div className="template-card-header">
                    <h3>Counselor Productivity & Contact Leaderboard</h3>
                    <span className="header-badge">Live Team Performance</span>
                  </div>
                  <div className="template-card-body" style={{ padding: 0 }}>
                    <table className="reps-table">
                      <thead>
                        <tr>
                          <th>Sales Counselor</th>
                          <th>Specialty Territory</th>
                          <th>Total Assigned</th>
                          <th>Contacted</th>
                          <th>Pending</th>
                          <th>Contact Rate %</th>
                          <th>Avg Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.repsReport?.map(rep => (
                          <tr key={rep.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span className="rep-avatar">{rep.avatar}</span>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{rep.name}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>{rep.role}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize: 12, color: '#475569' }}>{rep.specialty}</td>
                            <td style={{ fontWeight: 600 }}>{rep.assignedCount}</td>
                            <td style={{ color: '#166534', fontWeight: 600 }}>{rep.contactedCount}</td>
                            <td style={{ color: '#c2410c', fontWeight: 600 }}>{rep.notContactedCount}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, maxWidth: 80 }}>
                                  <div
                                    style={{
                                      width: `${rep.contactRate}%`,
                                      height: '100%',
                                      background: '#10b981',
                                      borderRadius: 3,
                                    }}
                                  />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: 12 }}>{rep.contactRate}%</span>
                              </div>
                            </td>
                            <td>{rep.avgCallAttempts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  SUB-TAB 3: CAMPAIGNS & CHANNELS
                  ---------------------------------------------------- */}
              {activeReportSubTab === 'campaigns' && (
                <div className="grid-2-col">
                  {/* Campaign Breakdown */}
                  <div className="template-card">
                    <div className="template-card-header">
                      <h3>Meta Campaign Performance</h3>
                      <span className="header-badge">Lead Attribution</span>
                    </div>
                    <div className="template-card-body">
                      <div className="progress-list">
                        {stats?.campaignReport?.map((c, i) => (
                          <div key={i} className="progress-item-row" style={{ alignItems: 'flex-start' }}>
                            <div style={{ width: '45%' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }} title={c.name}>
                                {c.name.slice(0, 32)}...
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{c.total} Total Leads</div>
                            </div>
                            <div className="progress-bar-track" style={{ marginTop: 6 }}>
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${Math.min(c.contactRate, 100)}%` }}
                              />
                            </div>
                            <span className="progress-percentage">{c.contactRate}% Contacted</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Platform Split */}
                  <div className="template-card">
                    <div className="template-card-header">
                      <h3>Platform Split (Instagram vs Facebook)</h3>
                      <span className="header-badge">Source Platform</span>
                    </div>
                    <div className="template-card-body">
                      {stats?.platformReport?.map((p, i) => (
                        <div key={i} className="progress-item-row">
                          <span className="progress-country-name">{p.name}</span>
                          <div className="progress-bar-track">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${p.percentage}%`,
                                background: p.name === 'Instagram' ? '#e1306c' : '#1877f2',
                              }}
                            />
                          </div>
                          <span className="progress-percentage">{p.count} leads ({p.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  SUB-TAB 4: DEMOGRAPHICS & GEOGRAPHY
                  ---------------------------------------------------- */}
              {activeReportSubTab === 'demographics' && (
                <div className="grid-2-col">
                  {/* Preferred Location */}
                  <div className="template-card">
                    <div className="template-card-header">
                      <h3>Preferred Work City / Placement</h3>
                      <span className="header-badge">Kerala vs Abroad</span>
                    </div>
                    <div className="template-card-body">
                      <div className="progress-list">
                        {stats?.locationReport?.map((loc, i) => (
                          <div key={i} className="progress-item-row">
                            <span className="progress-country-name">📍 {loc.name}</span>
                            <div className="progress-bar-track">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${loc.percentage}%`, background: '#0284c7' }}
                              />
                            </div>
                            <span className="progress-percentage">{loc.count} ({loc.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Qualification */}
                  <div className="template-card">
                    <div className="template-card-header">
                      <h3>Qualification Demographics</h3>
                      <span className="header-badge">Highest Education</span>
                    </div>
                    <div className="template-card-body">
                      {stats?.qualificationReport?.map((q, i) => (
                        <div key={i} className="progress-item-row">
                          <span className="progress-country-name">{q.name}</span>
                          <div className="progress-bar-track">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${q.percentage}%`, background: '#8b5cf6' }}
                            />
                          </div>
                          <span className="progress-percentage">{q.count} leads ({q.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          MODAL: FILE UPLOAD (XLSX, XLS, CSV, TSV)
          Triggered from Pool tab only
          ======================================================== */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={18} />
                <h3 style={{ margin: 0, fontSize: 16 }}>Import Meta Lead Ads File</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                Upload any Facebook/Instagram lead export file. Supports <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>, and <strong>.tsv</strong> formats.
              </p>

              <label className="upload-dropzone">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <Upload size={32} color="#0284c7" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                  {uploading ? 'Processing & Extracting Leads...' : 'Click to select or drag & drop file'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Meta Lead Ads CSV, Excel (.xlsx/.xls) or Tab-separated (.tsv)
                </div>
              </label>

              <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>Auto-Extraction Capabilities:</div>
                <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
                  <li>Extracts candidate full name, phone number, email.</li>
                  <li>Normalizes phone numbers, stripping prefixes like <code>p:</code>.</li>
                  <li>Extracts educational qualification, preferred work city (supports Malayalam questions), and learning mode.</li>
                  <li>Deduplicates leads automatically by phone and email in MongoDB.</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-pulse-secondary" onClick={() => setShowUploadModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PASTE RAW META TEXT (TSV / CSV)
          Triggered from Pool tab only
          ======================================================== */}
      {showPasteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardPaste size={18} />
                <h3 style={{ margin: 0, fontSize: 16 }}>Paste Meta Lead Form Data</h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                Paste raw tab-separated or comma-separated lines directly from Meta Ads Manager or Google Sheets:
              </p>
              <textarea
                rows={10}
                placeholder="id&#9;created_time&#9;ad_id&#9;full_name&#9;phone_number&#9;email..."
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  background: '#f8fafc',
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-pulse-secondary" onClick={() => setShowPasteModal(false)}>
                Cancel
              </button>
              <button
                className="btn-pulse-accent"
                onClick={handlePasteSubmit}
                disabled={uploading || !pasteContent.trim()}
              >
                {uploading ? 'Processing...' : 'Parse & Ingest into Pool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: LEAD DETAILS & AUDIT TRAIL
          ======================================================== */}
      {activeLeadModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17 }}>{activeLeadModal.fullName}</h3>
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  Meta ID: {activeLeadModal.metaLeadId || activeLeadModal.id} • {activeLeadModal.platform}
                </span>
              </div>
              <button
                onClick={() => setActiveLeadModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {/* Contact & Profile Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>PHONE NUMBER</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{activeLeadModal.phone}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>EMAIL ADDRESS</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{activeLeadModal.email || 'N/A'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>EDUCATIONAL QUALIFICATION</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{activeLeadModal.qualification}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>PREFERRED WORK LOCATION</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>📍 {activeLeadModal.preferredLocation}</div>
                </div>
              </div>

              {/* Assignment Status */}
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 6, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  ASSIGNMENT & WORKFLOW STATUS
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Assigned To: </span>
                    <strong style={{ color: '#0369a1' }}>
                      {activeLeadModal.assignedTo ? activeLeadModal.assignedTo.repName : 'Unassigned (In Pool)'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Status: </span>
                    <span className={`status-badge ${activeLeadModal.status === 'Contacted' ? 'status-contacted' : 'status-not-contacted'}`}>
                      {activeLeadModal.status}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Sub-Status: </span>
                    <strong style={{ fontSize: 12 }}>{activeLeadModal.subStatus}</strong>
                  </div>
                </div>
              </div>

              {/* Audit & Call Notes */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                  ACTIVITY & AUDIT TRAIL ({activeLeadModal.notes?.length || 0})
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
                  {activeLeadModal.notes && activeLeadModal.notes.length > 0 ? (
                    activeLeadModal.notes.map((note, i) => (
                      <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 8, fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 11, marginBottom: 2 }}>
                          <strong>{note.author}</strong>
                          <span>{new Date(note.timestamp).toLocaleString()}</span>
                        </div>
                        <div style={{ color: '#1e293b' }}>{note.text}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 10 }}>No activity notes recorded.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-pulse-secondary" onClick={() => setActiveLeadModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
