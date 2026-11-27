import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  Users,
  Sun,
  Moon,
  PauseCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { api } from '../api'

function formatDuration(mins) {
  if (mins === null || mins === undefined) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  const remH = h % 24
  return remH > 0 ? `${d}d ${remH}h` : `${d}d`
}

function downloadCsv(filename, headers, rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ResponseSlaReportView({ isManagerScoped = false, onBack, showNotify }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('reps') // 'reps' | 'leads'

  // Filters
  const [period, setPeriod] = useState('current_month') // 'today' | 'week' | 'current_month' | 'till_date' | 'custom'
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [priorityBucket, setPriorityBucket] = useState('All')
  const [contactStatus, setContactStatus] = useState('All')
  const [repId, setRepId] = useState('All')
  const [groupId, setGroupId] = useState('All')
  const [page, setPage] = useState(1)

  const loadData = async (targetPage = page) => {
    setLoading(true)
    try {
      const res = await api.getResponseSlaReport({
        period,
        fromDate: period === 'custom' ? fromDate : undefined,
        toDate: period === 'custom' ? toDate : undefined,
        priorityBucket,
        contactStatus,
        repId,
        groupId,
        page: targetPage,
        limit: 30,
      })
      setData(res)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to load response SLA report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    loadData(1)
  }, [period, fromDate, toDate, priorityBucket, contactStatus, repId, groupId])

  const kpi = data?.kpiTotals || {}
  const bySalesRep = data?.bySalesRep || []
  const leads = data?.leads || []
  const pagination = data?.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 }
  const filters = data?.filterOptions || { counselors: [], teams: [] }

  const handleExportCsv = () => {
    if (activeTab === 'reps') {
      downloadCsv(
        `round-robin-response-sla-by-rep-${period}.csv`,
        [
          'Sales Rep',
          'Group',
          'P1 (9-5) Leads',
          'P1 Avg Time',
          'P2 (5-8) Leads',
          'P2 Avg Time',
          'Sunday Holiday Leads (Relaxed)',
          'Sunday Avg Time',
          'Other Hours Leads',
          'Other Avg Time',
          'Paused Date Leads',
          'Contacted %',
          'Pending Uncontacted',
        ],
        bySalesRep.map(r => [
          r.repName,
          r.groupName,
          r.P1_9_TO_5?.total || 0,
          formatDuration(r.P1_9_TO_5?.avgResponseMins),
          r.P2_5_TO_8?.total || 0,
          formatDuration(r.P2_5_TO_8?.avgResponseMins),
          r.SUNDAY_HOLIDAY?.total || 0,
          formatDuration(r.SUNDAY_HOLIDAY?.avgResponseMins),
          r.OTHER_HOURS?.total || 0,
          formatDuration(r.OTHER_HOURS?.avgResponseMins),
          r.PAUSED?.total || 0,
          `${r.overall?.contactRate || 0}%`,
          r.overall?.pending || 0,
        ])
      )
      return
    }
    downloadCsv(
      `round-robin-response-sla-leads-${period}.csv`,
      ['Lead Name', 'Phone', 'Assigned Rep', 'Group', 'Priority Window', 'Assigned At', 'First Contacted At', 'Response Time', 'Status'],
      leads.map(l => [
        l.fullName,
        l.phone,
        l.assignedRepName,
        l.groupName,
        l.priorityLabel,
        l.assignedAt ? new Date(l.assignedAt).toLocaleString('en-IN') : '',
        l.firstContactAt ? new Date(l.firstContactAt).toLocaleString('en-IN') : 'Pending',
        l.isContacted ? formatDuration(l.responseMinutes) : `Waiting ${formatDuration(l.pendingMinutes)}`,
        l.leadStatus,
      ])
    )
  }

  const bucketBadgeStyle = bucket => {
    if (bucket === 'P1_9_TO_5') return { bg: '#dcfce7', color: '#15803d' }
    if (bucket === 'P2_5_TO_8') return { bg: '#e0f2fe', color: '#0369a1' }
    if (bucket === 'SUNDAY_HOLIDAY') return { bg: '#fef3c7', color: '#92400e' }
    if (bucket === 'PAUSED') return { bg: '#f3e8ff', color: '#6b21a8' }
    return { bg: '#f1f5f9', color: '#475569' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Bar */}
      <div className="pool-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onBack && (
              <button
                type="button"
                className="btn-pulse-secondary"
                onClick={onBack}
                style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <ArrowLeft size={14} />
                <span>All Reports</span>
              </button>
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} color="#0284c7" />
                <span>Round-Robin to First Contact SLA Report (IST)</span>
              </h3>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {isManagerScoped ? 'Group-scoped • ' : ''}
                Priority 1: Mon–Sat 9 AM–5 PM (non-paused) • Priority 2: 5 PM–8 PM • Sunday is Holiday (Relaxed SLA)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'current_month', label: 'This Month' },
              { id: 'till_date', label: 'Till Date' },
              { id: 'custom', label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  border: period === p.id ? '1px solid #0284c7' : '1px solid #cbd5e1',
                  background: period === p.id ? '#0284c7' : '#fff',
                  color: period === p.id ? '#fff' : '#334155',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => loadData(page)}
              className="btn-pulse-secondary"
              style={{ fontSize: 12, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="btn-pulse"
              style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }}>
          {period === 'custom' && (
            <>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>to</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }} />
            </>
          )}

          <select value={priorityBucket} onChange={e => setPriorityBucket(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}>
            <option value="All">All Time Windows</option>
            <option value="P1_9_TO_5">Priority 1: 9 AM – 5 PM (Mon–Sat)</option>
            <option value="P2_5_TO_8">Priority 2: 5 PM – 8 PM (Mon–Sat)</option>
            <option value="SUNDAY_HOLIDAY">Sunday • Holiday (Relaxed SLA)</option>
            <option value="OTHER_HOURS">Other Hours (8 PM – 9 AM)</option>
            <option value="PAUSED">Paused Dates</option>
          </select>

          <select value={contactStatus} onChange={e => setContactStatus(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}>
            <option value="All">All Contact States</option>
            <option value="contacted">Contacted</option>
            <option value="pending">Pending (Not Contacted)</option>
          </select>

          <select value={repId} onChange={e => setRepId(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}>
            <option value="All">All Sales Reps</option>
            {filters.counselors.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select value={groupId} onChange={e => setGroupId(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}>
            <option value="All">All Groups</option>
            {filters.teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Priority Window KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 12 }}>
        <div style={{ background: '#ecfdf5', border: '1px solid #86efac', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sun size={13} /> PRIORITY 1 (9 AM – 5 PM)
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#14532d', marginTop: 4 }}>
            {formatDuration(kpi.P1_9_TO_5?.avgResponseMins)}
          </div>
          <div style={{ fontSize: 11, color: '#166534', marginTop: 3 }}>
            {kpi.P1_9_TO_5?.total || 0} leads • {kpi.P1_9_TO_5?.contactRate || 0}% contacted ({kpi.P1_9_TO_5?.pending || 0} pending)
          </div>
        </div>

        <div style={{ background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={13} /> PRIORITY 2 (5 PM – 8 PM)
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0c4a6e', marginTop: 4 }}>
            {formatDuration(kpi.P2_5_TO_8?.avgResponseMins)}
          </div>
          <div style={{ fontSize: 11, color: '#0369a1', marginTop: 3 }}>
            {kpi.P2_5_TO_8?.total || 0} leads • {kpi.P2_5_TO_8?.contactRate || 0}% contacted ({kpi.P2_5_TO_8?.pending || 0} pending)
          </div>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={13} /> SUNDAY • HOLIDAY (RELAXED)
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#78350f', marginTop: 4 }}>
            {formatDuration(kpi.SUNDAY_HOLIDAY?.avgResponseMins)}
          </div>
          <div style={{ fontSize: 11, color: '#92400e', marginTop: 3 }}>
            {kpi.SUNDAY_HOLIDAY?.total || 0} leads • Relaxed SLA (Holiday)
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Moon size={13} /> OTHER HOURS (8 PM – 9 AM)
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
            {formatDuration(kpi.OTHER_HOURS?.avgResponseMins)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            {kpi.OTHER_HOURS?.total || 0} leads • {kpi.OTHER_HOURS?.contactRate || 0}% contacted
          </div>
        </div>

        <div style={{ background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 5 }}>
            <PauseCircle size={13} /> PAUSED DATES
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#581c87', marginTop: 4 }}>
            {kpi.PAUSED?.total || 0}
          </div>
          <div style={{ fontSize: 11, color: '#7e22ce', marginTop: 3 }}>
            Excluded from P1/P2 SLA
          </div>
        </div>
      </div>

      {/* Sunday Holiday Explicit Callout */}
      <div
        style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <AlertCircle size={15} />
        <span>
          <strong>Holiday Policy:</strong> Sundays are tracked in their own <strong>Sunday • Holiday (Relaxed)</strong> bucket and do not penalize Mon–Sat Priority 1 (9 AM–5 PM) or Priority 2 (5 PM–8 PM) SLA metrics. Counselor paused dates are likewise excluded from P1/P2.
        </span>
      </div>

      {/* View Switcher Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setActiveTab('reps')}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'reps' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
            background: activeTab === 'reps' ? '#eff6ff' : '#fff',
            color: activeTab === 'reps' ? '#0369a1' : '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Users size={14} />
          <span>By Sales Rep ({bySalesRep.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'leads' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
            background: activeTab === 'leads' ? '#eff6ff' : '#fff',
            color: activeTab === 'leads' ? '#0369a1' : '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Clock size={14} />
          <span>Lead-Level Response Log ({pagination.total})</span>
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Loading Round-Robin Response SLA report...
          </div>
        ) : activeTab === 'reps' ? (
          <table className="master-table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Sales Rep / Group</th>
                <th>P1 (9 AM–5 PM)</th>
                <th>P2 (5 PM–8 PM)</th>
                <th>Sunday (Holiday • Relaxed)</th>
                <th>Other Hours</th>
                <th>Paused</th>
                <th>Contacted %</th>
                <th>Pending</th>
              </tr>
            </thead>
            <tbody>
              {bySalesRep.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No sales rep data found.</td></tr>
              ) : (
                bySalesRep.map(r => (
                  <tr key={r.repId}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.repName}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{r.groupName}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#15803d' }}>{formatDuration(r.P1_9_TO_5?.avgResponseMins)}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{r.P1_9_TO_5?.total || 0} leads ({r.P1_9_TO_5?.contactRate || 0}%)</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0369a1' }}>{formatDuration(r.P2_5_TO_8?.avgResponseMins)}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{r.P2_5_TO_8?.total || 0} leads ({r.P2_5_TO_8?.contactRate || 0}%)</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#92400e' }}>{formatDuration(r.SUNDAY_HOLIDAY?.avgResponseMins)}</div>
                      <div style={{ fontSize: 10, color: '#b45309' }}>{r.SUNDAY_HOLIDAY?.total || 0} leads (Relaxed)</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#475569' }}>{formatDuration(r.OTHER_HOURS?.avgResponseMins)}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{r.OTHER_HOURS?.total || 0} leads</div>
                    </td>
                    <td>{r.PAUSED?.total || 0}</td>
                    <td style={{ fontWeight: 700, color: '#047857' }}>{r.overall?.contactRate || 0}%</td>
                    <td style={{ fontWeight: 700, color: (r.overall?.pending || 0) > 0 ? '#dc2626' : '#64748b' }}>
                      {r.overall?.pending || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <>
            <table className="master-table" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Assigned Rep</th>
                  <th>Priority Window</th>
                  <th>Assigned At (IST)</th>
                  <th>First Contacted At</th>
                  <th>Time Taken</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No leads match selected filters.</td></tr>
                ) : (
                  leads.map(l => {
                    const st = bucketBadgeStyle(l.priorityBucket)
                    return (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{l.fullName}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{l.phone}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.assignedRepName}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{l.groupName}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color }}>
                            {l.priorityLabel}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: '#475569' }}>
                          {l.assignedAt ? new Date(l.assignedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={{ fontSize: 11, color: l.isContacted ? '#047857' : '#dc2626', fontWeight: 600 }}>
                          {l.firstContactAt
                            ? new Date(l.firstContactAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Not Contacted Yet'}
                        </td>
                        <td style={{ fontWeight: 800, color: l.isContacted ? '#0f172a' : '#dc2626' }}>
                          {l.isContacted ? formatDuration(l.responseMinutes) : `Waiting ${formatDuration(l.pendingMinutes)}`}
                        </td>
                        <td style={{ fontSize: 11 }}>{l.leadStatus}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {pagination.totalPages > 1 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
                <span>Showing {leads.length} of {pagination.total} leads</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => { const p = pagination.page - 1; setPage(p); loadData(p) }}
                    className="btn-pulse-secondary"
                    style={{ padding: '4px 10px', opacity: pagination.page <= 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>Page {pagination.page} / {pagination.totalPages}</span>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => { const p = pagination.page + 1; setPage(p); loadData(p) }}
                    className="btn-pulse-secondary"
                    style={{ padding: '4px 10px', opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

