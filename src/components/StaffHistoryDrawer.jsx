import React, { useState, useEffect } from 'react'
import {
  X,
  Search,
  History,
  UserCheck,
  UserX,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { api } from '../api'
import { formatINR, getStatusBadgeStyle } from '../constants/leadLifecycle'

export default function StaffHistoryDrawer({
  userId,
  onClose,
  onInspectLead,
  onStatusChanged,
  showNotify,
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expandedLeadId, setExpandedLeadId] = useState(null)
  const [reEnabling, setReEnabling] = useState(false)

  const loadHistory = async (targetPage = page, targetSearch = search) => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await api.getUserHistory(userId, {
        page: targetPage,
        limit: 20,
        search: targetSearch,
      })
      setData(res)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to load staff lead history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    setExpandedLeadId(null)
  }, [userId])

  useEffect(() => {
    if (userId) {
      loadHistory(page, search)
    }
  }, [userId, page, search])

  if (!userId) return null

  const staff = data?.user
  const summary = data?.summary || {}
  const leads = data?.leads || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }

  const handleReEnable = async () => {
    if (!staff) return
    if (!window.confirm(`Re-enable ${staff.name}'s account so they can log in again?`)) return
    setReEnabling(true)
    try {
      const res = await api.disableOrEnableUser(staff.id, { active: true })
      showNotify?.('success', res.message || `${staff.name} re-enabled`)
      await loadHistory(page, search)
      onStatusChanged?.()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to re-enable user')
    } finally {
      setReEnabling(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1060, justifyContent: 'flex-end', padding: 0 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 960,
          height: '100vh',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: staff?.active === false ? '#475569' : '#0284c7',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              {staff?.avatar || 'SR'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                  {staff?.name || 'Loading Staff History...'}
                </h3>
                {staff && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: staff.active ? '#166534' : '#991b1b',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {staff.active ? <UserCheck size={11} /> : <UserX size={11} />}
                    <span>{staff.active ? 'Active Staff' : 'Disabled / Old Rep'}</span>
                  </span>
                )}
              </div>
              {staff && (
                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3 }}>
                  {staff.email} • {staff.title}
                  {staff.disabledAt && (
                    <span style={{ color: '#fca5a5', marginLeft: 8 }}>
                      • Disabled on {new Date(staff.disabledAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {staff && staff.active === false && (
              <button
                type="button"
                onClick={handleReEnable}
                disabled={reEnabling}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '7px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: reEnabling ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <RotateCcw size={13} />
                <span>{reEnabling ? 'Re-Enabling...' : 'Re-Enable Login'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#ffffff',
                borderRadius: 6,
                padding: 7,
                cursor: 'pointer',
                display: 'inline-flex',
              }}
              title="Close Detail Panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10 }}>
            <div className="template-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Allocated History</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{summary.totalAllocatedHistory || 0}</div>
            </div>
            <div className="template-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>Initial Advisor On</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>{summary.initialAdvisorCount || 0}</div>
            </div>
            <div className="template-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Currently Assigned</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginTop: 2 }}>{summary.currentlyAssigned || 0}</div>
            </div>
            <div className="template-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Conv / Onboarded</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                {(summary.convertedCount || 0) + (summary.onboardedCount || 0)}
              </div>
            </div>
            <div className="template-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>Steps Logged</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', marginTop: 2 }}>{summary.totalStepsLogged || 0}</div>
            </div>
            <div className="template-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Fees / Paid</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{formatINR(summary.totalBusinessValue || 0)}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Paid: {formatINR(summary.totalPaidAmount || 0)}</div>
            </div>
          </div>

          {/* Search Bar */}
          <div
            className="template-card"
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Search size={15} color="#64748b" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search this advisor's leads by name, ID, phone, email, or course..."
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13, background: 'transparent' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'inline-flex' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Allocated Leads History Table */}
          <div className="template-card">
            <div className="template-card-header">
              <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <History size={15} />
                <span>Allocated Leads History (Click any lead to inspect activity)</span>
              </h3>
              <span className="header-badge">{pagination.total} Lead(s)</span>
            </div>
            <div className="template-card-body" style={{ padding: 0 }}>
              {loading ? (
                <div className="data-loader-container">
                  <div className="data-loader-spinner" />
                  <div className="data-loader-text">Loading allocated leads & activity...</div>
                </div>
              ) : leads.length === 0 ? (
                <div style={{ padding: '42px 20px', textAlign: 'center', color: '#64748b' }}>
                  <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>No allocated leads found</p>
                  <p style={{ fontSize: 12 }}>
                    {search ? 'Try clearing the search filter.' : 'This staff member has no allocated leads on record.'}
                  </p>
                </div>
              ) : (
                <div className="leads-table-container">
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Lead / Contact</th>
                        <th>Course Enquired</th>
                        <th>Advisor Attribution</th>
                        <th>Status</th>
                        <th>Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map(lead => {
                        const isExpanded = expandedLeadId === lead.id
                        const sb = getStatusBadgeStyle(lead.leadStatus)
                        const steps = Array.isArray(lead.steps) ? [...lead.steps].reverse() : []
                        const notes = Array.isArray(lead.notes) ? lead.notes : []

                        return (
                          <React.Fragment key={lead.id}>
                            <tr
                              onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                              style={{
                                cursor: 'pointer',
                                background: isExpanded ? '#eff6ff' : 'transparent',
                              }}
                              title="Click to expand lead activity & interaction timeline"
                            >
                              <td>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{lead.fullName}</div>
                                <div style={{ fontSize: 11, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Phone size={10} /> {lead.phone}
                                </div>
                                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                  {lead.email ? `${lead.email} • ` : ''}
                                  <span style={{ fontFamily: 'monospace' }}>
                                    #{lead.metaLeadId ? lead.metaLeadId.slice(-6) : lead.id?.slice(-6)}
                                  </span>
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
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 10,
                                    background: lead.advisorRelation.includes('Initial') ? '#e0f2fe' : '#f1f5f9',
                                    color: lead.advisorRelation.includes('Initial') ? '#0369a1' : '#334155',
                                  }}
                                >
                                  {lead.advisorRelation}
                                </span>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                                  Now: <strong>{lead.assignedTo?.repName || 'System Pool'}</strong>
                                </div>
                                {lead.initialAdvisor?.repName && (
                                  <div style={{ fontSize: 10, color: '#64748b' }}>
                                    Initial: {lead.initialAdvisor.repName}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 12,
                                    background: sb.bg,
                                    color: sb.color,
                                    border: `1px solid ${sb.border}`,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {lead.leadStatus}
                                </span>
                                {lead.selectedCategoryLabel && (
                                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                                    {lead.selectedCategoryLabel}
                                  </div>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    className="btn-pulse-secondary"
                                    onClick={e => {
                                      e.stopPropagation()
                                      setExpandedLeadId(isExpanded ? null : lead.id)
                                    }}
                                    style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  >
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    <span>{lead.totalStepsCount || notes.length} Activity</span>
                                  </button>
                                  {onInspectLead && (
                                    <button
                                      type="button"
                                      className="btn-action-sm"
                                      onClick={e => {
                                        e.stopPropagation()
                                        onInspectLead(lead)
                                      }}
                                      title="Open full Lead Timeline modal"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                    >
                                      <ExternalLink size={11} />
                                      <span>Full</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Activity / Timeline Panel */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={5} style={{ background: '#f8fafc', padding: '14px 18px', borderBottom: '2px solid #cbd5e1' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                      <MessageSquare size={13} color="#0284c7" />
                                      <span>Activity & Interaction Timeline — {lead.fullName}</span>
                                    </div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                      {steps.length} step(s) • {notes.length} note(s)
                                    </span>
                                  </div>

                                  {steps.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {steps.map((step, idx) => {
                                        const isThisRep = String(step.updatedBy?.userId || '') === String(staff?.id || '')
                                        return (
                                          <div
                                            key={idx}
                                            style={{
                                              background: '#ffffff',
                                              border: isThisRep ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                              borderLeft: `3px solid ${isThisRep ? '#0284c7' : '#94a3b8'}`,
                                              borderRadius: 6,
                                              padding: '8px 12px',
                                              fontSize: 12,
                                            }}
                                          >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                                Step #{step.stepNumber}: {step.previousStatus} → {step.newStatus}
                                                {step.selectedCategoryLabel && (
                                                  <span style={{ fontWeight: 500, color: '#475569' }}> ({step.selectedCategoryLabel})</span>
                                                )}
                                              </div>
                                              <div style={{ fontSize: 11, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={11} />
                                                <span>{step.timestamp ? new Date(step.timestamp).toLocaleString() : ''}</span>
                                              </div>
                                            </div>
                                            {step.note && (
                                              <div style={{ marginTop: 4, color: '#334155', lineHeight: 1.4 }}>{step.note}</div>
                                            )}
                                            {step.lostReason && (
                                              <div style={{ marginTop: 3, fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>
                                                Lost Reason: {step.lostReason}
                                              </div>
                                            )}
                                            <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                                              By: <strong>{step.updatedBy?.name || 'System'}</strong>
                                              {isThisRep && (
                                                <span style={{ marginLeft: 6, color: '#0284c7', fontWeight: 700 }}>
                                                  (This Rep)
                                                </span>
                                              )}
                                              {step.businessSnapshot?.businessProgramName && (
                                                <span style={{ marginLeft: 8, color: '#047857', fontWeight: 600 }}>
                                                  • {step.businessSnapshot.businessProgramName} (Fees: {formatINR(step.businessSnapshot.courseFees)} / Paid: {formatINR(step.businessSnapshot.paidAmount)})
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : notes.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {notes.map((n, idx) => {
                                        const displayAuthor =
                                          n.author === 'Meta Real-Time Allocation Engine'
                                            ? 'Live Lead from Meta'
                                            : n.author || 'System'
                                        const displayText = String(n.text || '').replace(
                                          /^Live Webhook Ingestion:\s*(Automatically assigned to Counselor\s*)?/i,
                                          (_, matchedAssign) =>
                                            matchedAssign ? 'Live Lead from Meta — Assigned to ' : 'Live Lead from Meta — '
                                        )
                                        return (
                                          <div
                                            key={idx}
                                            style={{
                                              background: '#ffffff',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: 6,
                                              padding: '7px 10px',
                                              fontSize: 12,
                                            }}
                                          >
                                            <div style={{ color: '#0f172a' }}>{displayText}</div>
                                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                                              {displayAuthor} • {n.timestamp ? new Date(n.timestamp).toLocaleString() : ''}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                                      No interaction steps or call notes logged for this lead yet.
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="pagination-container">
                  <div>
                    Showing{' '}
                    <strong>
                      {(pagination.page - 1) * pagination.limit + 1} -{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </strong>{' '}
                    of <strong>{pagination.total}</strong> leads (Page {pagination.page} of {pagination.totalPages})
                  </div>
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn-pagination"
                      disabled={pagination.page <= 1 || loading}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      className="btn-pagination"
                      disabled={pagination.page >= pagination.totalPages || loading}
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
