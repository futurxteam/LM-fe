import React, { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  PhoneCall,
  MessageCircle,
  Plus,
  User,
  AlertTriangle,
  Download,
  RefreshCw,
  ArrowLeft,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Phone,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react'
import { api } from '../api'
import {
  getSalesDisplayStatus,
  getStatusBadgeStyle,
  getHeatBadgeStyle,
} from '../constants/leadLifecycle'

function getLocalDateStr(dateObj = new Date()) {
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function shiftDateStr(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + deltaDays)
  return getLocalDateStr(dt)
}

function formatReadableDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const todayStr = getLocalDateStr(new Date())
  const tomorrowStr = shiftDateStr(todayStr, 1)
  const formatted = dt.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  if (dateStr === todayStr) return `Today — ${formatted}`
  if (dateStr === tomorrowStr) return `Tomorrow — ${formatted}`
  return formatted
}

function formatCallbackTime(iso) {
  if (!iso) return '—'
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatCallbackDateTime(iso) {
  if (!iso) return '—'
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function csvEscape(val) {
  const s = String(val ?? '').replace(/\r?\n/g, ' ')
  if (s.includes(',') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export default function FollowupScheduleView({
  isAdmin = false,
  salesReps = [],
  currentUser = null,
  refreshKey = 0,
  collapsible = false,
  onBack = null,
  onOpenStep = null,
  onOpenProfile = null,
  onQuickDial = null,
  showNotify = null,
}) {
  const todayStr = getLocalDateStr(new Date())
  const tomorrowStr = shiftDateStr(todayStr, 1)

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedRepId, setSelectedRepId] = useState('All')
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState('both') // 'both' | 'selected' | 'next' | 'overdue'
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    selectedDate: todayStr,
    nextDate: tomorrowStr,
    counts: { selectedDay: 0, nextDay: 0, overdue: 0, later: 0 },
    selectedDayLeads: [],
    nextDayLeads: [],
    overdueLeads: [],
    byCounselor: [],
  })

  const loadSchedule = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        date: selectedDate,
        search: searchText.trim() || undefined,
      }
      if (isAdmin && selectedRepId && selectedRepId !== 'All') {
        params.repId = selectedRepId
      }
      const res = await api.getFollowupSchedule(params)
      if (res) {
        setData({
          selectedDate: res.selectedDate || selectedDate,
          nextDate: res.nextDate || shiftDateStr(selectedDate, 1),
          counts: res.counts || { selectedDay: 0, nextDay: 0, overdue: 0, later: 0 },
          selectedDayLeads: Array.isArray(res.selectedDayLeads) ? res.selectedDayLeads : [],
          nextDayLeads: Array.isArray(res.nextDayLeads) ? res.nextDayLeads : [],
          overdueLeads: Array.isArray(res.overdueLeads) ? res.overdueLeads : [],
          byCounselor: Array.isArray(res.byCounselor) ? res.byCounselor : [],
        })
      }
    } catch (err) {
      if (showNotify) {
        showNotify('error', err.message || 'Failed to load contact schedule')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedRepId, searchText, isAdmin, showNotify])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSchedule()
    }, searchText ? 250 : 0)
    return () => clearTimeout(timer)
  }, [loadSchedule, refreshKey])

  const handleExportCsv = () => {
    const rows = []
    const pushRows = (bucketLabel, list) => {
      list.forEach(lead => {
        const latestNote = lead.notes?.[0]?.text || lead.steps?.[lead.steps.length - 1]?.note || ''
        rows.push([
          bucketLabel,
          formatCallbackDateTime(lead.callbackAt),
          lead.assignedTo?.repName || 'Unassigned',
          lead.fullName || '',
          lead.phone || '',
          lead.courseProgram || lead.businessProgramName || 'Not Specified',
          isAdmin ? (lead.leadStatus || lead.status || '') : getSalesDisplayStatus(lead),
          lead.selectedCategoryLabel || lead.subStatus || '',
          latestNote,
        ])
      })
    }

    pushRows(`Selected Day (${data.selectedDate})`, data.selectedDayLeads)
    pushRows(`Next Day (${data.nextDate})`, data.nextDayLeads)
    pushRows('Overdue Callback', data.overdueLeads)

    const headers = [
      'Schedule Bucket',
      'Callback Date & Time',
      'Sales Counselor',
      'Candidate Name',
      'Phone',
      'Course Enquired',
      'Status',
      'Category / Sub-Status',
      'Latest Note',
    ]

    const csvContent = [
      headers.map(csvEscape).join(','),
      ...rows.map(r => r.map(csvEscape).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contact-schedule-${data.selectedDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    if (showNotify) {
      showNotify('success', `Exported ${rows.length} scheduled follow-up(s) to CSV`)
    }
  }

  const renderLeadCard = (lead, bucketType) => {
    const cleanPhone = (lead.phone || '').replace(/\D/g, '')
    const waMsg = encodeURIComponent(
      `Hello ${lead.fullName}, this is ${currentUser?.name || lead.assignedTo?.repName || 'Counselor'} following up regarding your inquiry for ${lead.courseProgram || lead.businessProgramName || 'our Healthcare program'}.`
    )
    const isOverdue = bucketType === 'overdue'
    const accentColor = isOverdue ? '#dc2626' : bucketType === 'next' ? '#7c3aed' : '#0284c7'
    const timeBg = isOverdue ? '#fef2f2' : bucketType === 'next' ? '#f5f3ff' : '#e0f2fe'
    const timeColor = isOverdue ? '#b91c1c' : bucketType === 'next' ? '#6d28d9' : '#0369a1'
    const latestStep = lead.steps?.length ? lead.steps[lead.steps.length - 1] : null
    const latestNote = latestStep?.note || lead.notes?.[0]?.text || ''
    const statusStyle = isAdmin ? getStatusBadgeStyle(lead.leadStatus || 'NEW LEAD') : null
    const heatStyle = isAdmin && lead.heatTier ? getHeatBadgeStyle(lead.heatTier) : null

    return (
      <div
        key={`${bucketType}-${lead.id}`}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Top Row: Time + Candidate + Status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: timeBg,
                  color: timeColor,
                }}
              >
                <Clock size={11} />
                <span>
                  {isOverdue
                    ? `Overdue: ${formatCallbackDateTime(lead.callbackAt)}`
                    : formatCallbackTime(lead.callbackAt)}
                </span>
              </span>
              {isAdmin && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: '#eff6ff',
                    color: '#1b2b6b',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  <User size={11} />
                  <span>{lead.assignedTo?.repName || 'Unassigned'}</span>
                </span>
              )}
            </div>

            <div
              onClick={() => onOpenProfile && onOpenProfile(lead)}
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: '#0f172a',
                cursor: onOpenProfile ? 'pointer' : 'default',
                wordBreak: 'break-word',
              }}
            >
              {lead.fullName}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
              <a
                href={`tel:${lead.phone}`}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#0369a1',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Phone size={12} />
                <span>{lead.phone}</span>
              </a>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <GraduationCap size={12} color="#0284c7" />
                <span>
                  {lead.courseProgram || lead.businessProgramName || 'Not Specified'}
                  {(lead.courseVariant || lead.businessProgramVariant)
                    ? ` • ${lead.courseVariant || lead.businessProgramVariant}`
                    : ''}
                </span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', flexShrink: 0 }}>
            {isAdmin ? (
              <>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: statusStyle?.bg || '#f1f5f9',
                    color: statusStyle?.color || '#334155',
                    border: `1px solid ${statusStyle?.border || '#cbd5e1'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {lead.leadStatus || 'NEW LEAD'}
                </span>
                {heatStyle && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 12,
                      background: heatStyle.bg,
                      color: heatStyle.color,
                      border: `1px solid ${heatStyle.border}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {lead.heatTier}
                  </span>
                )}
              </>
            ) : (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  whiteSpace: 'nowrap',
                }}
              >
                {getSalesDisplayStatus(lead)}
              </span>
            )}
          </div>
        </div>

        {/* Category / Last Remark */}
        <div
          style={{
            fontSize: 11,
            color: '#475569',
            background: '#f8fafc',
            borderRadius: 6,
            padding: '6px 9px',
            border: '1px solid #f1f5f9',
          }}
        >
          <div style={{ fontWeight: 700, color: '#334155' }}>
            {lead.selectedCategoryLabel || lead.subStatus || 'Follow-Up Scheduled'}
          </div>
          {latestNote && (
            <div style={{ color: '#64748b', marginTop: 2, wordBreak: 'break-word' }}>
              {latestNote.length > 130 ? `${latestNote.slice(0, 130)}...` : latestNote}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {!isAdmin && (
            <>
              <a
                href={`tel:${lead.phone}`}
                onClick={() => onQuickDial && onQuickDial(lead)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <PhoneCall size={13} />
                <span>Call</span>
              </a>
              <a
                href={`https://wa.me/${cleanPhone}?text=${waMsg}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: '#25D366',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <MessageCircle size={13} />
                <span>WhatsApp</span>
              </a>
            </>
          )}
          {onOpenStep && (
            <button
              type="button"
              onClick={() => onOpenStep(lead)}
              className="btn-pulse"
              style={{
                fontSize: 11,
                padding: '6px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={13} />
              <span>{isAdmin ? 'Steps & History' : 'Log Step'}</span>
            </button>
          )}
          {onOpenProfile && (
            <button
              type="button"
              onClick={() => onOpenProfile(lead)}
              className="btn-pulse-secondary"
              style={{
                fontSize: 11,
                padding: '6px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <User size={13} />
              <span>Profile</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderBucketSection = (title, subtitle, list, bucketType, emptyMessage) => {
    const badgeBg =
      bucketType === 'overdue'
        ? '#fee2e2'
        : bucketType === 'next'
          ? '#ede9fe'
          : '#e0f2fe'
    const badgeColor =
      bucketType === 'overdue'
        ? '#b91c1c'
        : bucketType === 'next'
          ? '#6d28d9'
          : '#0369a1'

    return (
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{title}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{subtitle}</div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 12,
              background: badgeBg,
              color: badgeColor,
            }}
          >
            {list.length} {list.length === 1 ? 'Lead' : 'Leads'}
          </span>
        </div>

        {list.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: 8,
              padding: '20px 14px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: 12,
            }}
          >
            <CheckCircle2 size={20} color="#10b981" style={{ marginBottom: 6 }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>{emptyMessage}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(lead => renderLeadCard(lead, bucketType))}
          </div>
        )}
      </div>
    )
  }

  const activeCounselorRows = (data.byCounselor || []).filter(c => c.totalCount > 0)
  const selectedRepObj = salesReps.find(r => String(r.id || r._id) === String(selectedRepId))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Admin Report Top Bar */}
      {isAdmin && onBack && (
        <div
          className="pool-action-bar"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-pulse-secondary"
              onClick={onBack}
              style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <ArrowLeft size={14} />
              <span>All Reports</span>
            </button>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                Sales Team Follow-Up &amp; Next Contact Schedule
              </h3>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Track who needs to contact whom across Today, Next Day, any selected date, and Overdue callbacks
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-pulse-secondary"
              onClick={loadSchedule}
              style={{ fontSize: 12, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn-pulse"
              onClick={handleExportCsv}
              style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Card Wrapper */}
      <div className="template-card" style={{ marginBottom: 0 }}>
        <div
          className="template-card-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            cursor: collapsible ? 'pointer' : 'default',
          }}
          onClick={() => collapsible && setCollapsed(c => !c)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} />
            <h3 style={{ margin: 0 }}>
              {isAdmin ? 'All Counselors Contact Schedule' : 'My Next Contact Schedule'}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="header-badge">
              {selectedDate === todayStr ? 'Today' : selectedDate}: {data.counts.selectedDay}
            </span>
            <span className="header-badge" style={{ background: 'rgba(139, 92, 246, 0.28)' }}>
              Next Day: {data.counts.nextDay}
            </span>
            {data.counts.overdue > 0 && (
              <span className="header-badge" style={{ background: '#dc2626', color: '#ffffff' }}>
                Overdue: {data.counts.overdue}
              </span>
            )}
            {collapsible && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setCollapsed(c => !c)
                }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: 6,
                  padding: '3px 7px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title={collapsed ? 'Expand Schedule' : 'Collapse Schedule'}
              >
                {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </button>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="template-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Controls Bar: Date Selector + Quick Presets + Rep Filter + Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                padding: '10px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            >
              {/* Date navigation & picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedDate === todayStr ? '#1b2b6b' : '#e2e8f0',
                    color: selectedDate === todayStr ? '#ffffff' : '#334155',
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(tomorrowStr)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedDate === tomorrowStr ? '#1b2b6b' : '#e2e8f0',
                    color: selectedDate === tomorrowStr ? '#ffffff' : '#334155',
                  }}
                >
                  Tomorrow
                </button>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(prev => shiftDateStr(prev, -1))}
                    style={{
                      padding: '6px 7px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                    title="Previous Day"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => e.target.value && setSelectedDate(e.target.value)}
                    aria-label="Select schedule date"
                    style={{
                      padding: '5px 9px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#ffffff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(prev => shiftDateStr(prev, 1))}
                    style={{
                      padding: '6px 7px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                    title="Next Day"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Admin Counselor Filter + Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: '1 1 240px', justifyContent: 'flex-end' }}>
                {isAdmin && (
                  <select
                    value={selectedRepId}
                    onChange={e => setSelectedRepId(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#1e293b',
                      background: '#ffffff',
                      minWidth: 160,
                    }}
                  >
                    <option value="All">All Sales Counselors</option>
                    {salesReps.map(rep => (
                      <option key={rep.id || rep._id} value={rep.id || rep._id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '5px 9px',
                    flex: '1 1 180px',
                    maxWidth: 260,
                  }}
                >
                  <Search size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Filter by name, phone, course..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      minWidth: 0,
                      fontSize: 12,
                    }}
                  />
                  {searchText && (
                    <button
                      type="button"
                      onClick={() => setSearchText('')}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'inline-flex', padding: 0 }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {!isAdmin && (
                  <button
                    type="button"
                    onClick={loadSchedule}
                    className="btn-pulse-secondary"
                    style={{ fontSize: 12, padding: '6px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title="Refresh Schedule"
                  >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  </button>
                )}
              </div>
            </div>

            {/* Summary KPI Cards + Bucket Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[
                {
                  id: 'both',
                  label: 'Day & Next Day',
                  count: data.counts.selectedDay + data.counts.nextDay,
                  activeBg: '#1b2b6b',
                },
                {
                  id: 'selected',
                  label: selectedDate === todayStr ? 'Today Only' : `${selectedDate}`,
                  count: data.counts.selectedDay,
                  activeBg: '#0284c7',
                },
                {
                  id: 'next',
                  label: data.nextDate === tomorrowStr ? 'Tomorrow Only' : `Next Day (${data.nextDate})`,
                  count: data.counts.nextDay,
                  activeBg: '#7c3aed',
                },
                {
                  id: 'overdue',
                  label: 'Overdue Callbacks',
                  count: data.counts.overdue,
                  activeBg: '#dc2626',
                  warn: data.counts.overdue > 0,
                },
              ].map(tab => {
                const isActive = viewMode === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewMode(tab.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      border: tab.warn && !isActive ? '1px solid #fca5a5' : '1px solid transparent',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isActive ? tab.activeBg : tab.warn ? '#fef2f2' : '#f1f5f9',
                      color: isActive ? '#ffffff' : tab.warn ? '#b91c1c' : '#334155',
                    }}
                  >
                    {tab.id === 'overdue' && <AlertTriangle size={13} />}
                    <span>{tab.label}</span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '1px 7px',
                        borderRadius: 10,
                        background: isActive ? 'rgba(255,255,255,0.22)' : '#ffffff',
                        color: isActive ? '#ffffff' : tab.warn ? '#b91c1c' : '#0f172a',
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}

              {data.counts.later > 0 && (
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto', fontWeight: 600 }}>
                  +{data.counts.later} scheduled on later dates
                </span>
              )}
            </div>

            {/* Active Admin Rep Filter Pill */}
            {isAdmin && selectedRepId !== 'All' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1b2b6b' }}>
                <span>
                  Filtered by counselor: <strong>{selectedRepObj?.name || 'Selected Rep'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRepId('All')}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    color: '#1b2b6b',
                    cursor: 'pointer',
                  }}
                >
                  Show All Counselors
                </button>
              </div>
            )}

            {/* Admin Per-Counselor Summary Matrix */}
            {isAdmin && selectedRepId === 'All' && activeCounselorRows.length > 0 && (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    background: '#f1f5f9',
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} color="#1b2b6b" />
                    <span>Schedule Breakdown by Sales Counselor (Click row to filter)</span>
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    {activeCounselorRows.length} Counselor(s) with scheduled calls
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="reps-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Sales Counselor</th>
                        <th>{selectedDate === todayStr ? 'Today' : selectedDate}</th>
                        <th>{data.nextDate === tomorrowStr ? 'Tomorrow' : data.nextDate}</th>
                        <th>Overdue</th>
                        <th>Total Active Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCounselorRows.map(row => (
                        <tr
                          key={row.repId}
                          onClick={() => row.repId !== 'unassigned' && setSelectedRepId(row.repId)}
                          style={{ cursor: row.repId !== 'unassigned' ? 'pointer' : 'default' }}
                          title="Click to inspect this counselor's contacts"
                        >
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.repName}</td>
                          <td>
                            <span style={{ fontWeight: 800, color: '#0284c7' }}>{row.selectedDayCount}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, color: '#7c3aed' }}>{row.nextDayCount}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, color: row.overdueCount > 0 ? '#dc2626' : '#94a3b8' }}>
                              {row.overdueCount}
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, color: '#1b2b6b' }}>{row.totalCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Schedule Content Area */}
            {loading ? (
              <div className="data-loader-container" style={{ padding: '28px 16px' }}>
                <div className="data-loader-spinner" />
                <div className="data-loader-text">Loading follow-up schedule...</div>
              </div>
            ) : (
              <>
                {viewMode === 'both' && (
                  <div className="grid-2-col" style={{ gap: 14, alignItems: 'start' }}>
                    {renderBucketSection(
                      formatReadableDate(data.selectedDate),
                      'Scheduled contacts for the selected day',
                      data.selectedDayLeads,
                      'selected',
                      `No contacts scheduled for ${data.selectedDate}.`
                    )}
                    {renderBucketSection(
                      formatReadableDate(data.nextDate),
                      'Scheduled contacts for the next day',
                      data.nextDayLeads,
                      'next',
                      `No contacts scheduled for ${data.nextDate}.`
                    )}
                  </div>
                )}

                {viewMode === 'selected' &&
                  renderBucketSection(
                    formatReadableDate(data.selectedDate),
                    'Scheduled contacts for the selected day',
                    data.selectedDayLeads,
                    'selected',
                    `No contacts scheduled for ${data.selectedDate}.`
                  )}

                {viewMode === 'next' &&
                  renderBucketSection(
                    formatReadableDate(data.nextDate),
                    'Scheduled contacts for the next day',
                    data.nextDayLeads,
                    'next',
                    `No contacts scheduled for ${data.nextDate}.`
                  )}

                {viewMode === 'overdue' &&
                  renderBucketSection(
                    'Overdue Follow-Ups',
                    `Callbacks scheduled before ${data.selectedDate} still pending`,
                    data.overdueLeads,
                    'overdue',
                    'No overdue callbacks pending.'
                  )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
