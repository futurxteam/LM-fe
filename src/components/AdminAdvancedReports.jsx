import React, { useState, useEffect } from 'react'
import {
  Flame,
  Sun,
  Snowflake,
  RotateCcw,
  Download,
  RefreshCw,
  Search,
  Settings,
  TrendingUp,
  IndianRupee,
  Users,
  Layers,
  History,
} from 'lucide-react'
import { api } from '../api'
import { formatINR, getStatusBadgeStyle, getHeatBadgeStyle } from '../constants/leadLifecycle'

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

export default function AdminAdvancedReports({
  salesReps = [],
  onOpenSettings,
  onInspectLeadById,
  onRefreshParent,
  showNotify,
}) {
  const [subTab, setSubTab] = useState('heat') // 'heat' | 'lifecycle' | 'recycle' | 'finance' | 'counselors'
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)

  // Filters & Backend Pagination
  const [heatFilter, setHeatFilter] = useState('All')
  const [repFilter, setRepFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const [heatPage, setHeatPage] = useState(1)
  const [heatLimit, setHeatLimit] = useState(30)
  const [recyclePage, setRecyclePage] = useState(1)
  const [recycleLimit, setRecycleLimit] = useState(30)

  // Lost Recycle state
  const [selectedRecycleIds, setSelectedRecycleIds] = useState([])
  const [recycleTargetRepId, setRecycleTargetRepId] = useState('')
  const [recycling, setRecycling] = useState(false)

  const loadReport = async () => {
    setLoading(true)
    try {
      const res = await api.getAdvancedReports({
        heatTier: heatFilter,
        repId: repFilter,
        fromDate,
        toDate,
        search,
        page: heatPage,
        limit: heatLimit,
        recyclePage,
        recycleLimit,
      })
      setReport(res)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to load advanced reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [heatFilter, repFilter, fromDate, toDate, search, heatPage, heatLimit, recyclePage, recycleLimit])

  const handleRecycleSingle = async lead => {
    const destName =
      recycleTargetRepId
        ? salesReps.find(r => String(r.id) === String(recycleTargetRepId))?.name || 'selected counselor'
        : 'System Pool'
    if (!window.confirm(`Recycle LOST lead "${lead.fullName}" (Cycle #${(lead.cycleNumber || 1) + 1}) into ${destName}?`)) {
      return
    }
    setRecycling(true)
    try {
      const res = await api.recycleLead(lead.id, { targetRepId: recycleTargetRepId || undefined })
      showNotify?.('success', res.message || 'Lead recycled!')
      setSelectedRecycleIds(prev => prev.filter(id => id !== lead.id))
      await loadReport()
      onRefreshParent?.()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to recycle lead')
    } finally {
      setRecycling(false)
    }
  }

  const handleBulkRecycle = async () => {
    if (selectedRecycleIds.length === 0) return
    if (!window.confirm(`Recycle ${selectedRecycleIds.length} selected LOST lead(s)?`)) return
    setRecycling(true)
    try {
      const res = await api.bulkRecycleLeads({
        leadIds: selectedRecycleIds,
        targetRepId: recycleTargetRepId || undefined,
      })
      showNotify?.('success', res.message || `Recycled ${res.recycledCount} lead(s)`)
      setSelectedRecycleIds([])
      await loadReport()
      onRefreshParent?.()
    } catch (err) {
      showNotify?.('error', err.message || 'Bulk recycle failed')
    } finally {
      setRecycling(false)
    }
  }

  const totals = report?.totals || { totalLeads: 0, classifiedTotal: 0, hotCount: 0, warmCount: 0, coldCount: 0, unclassifiedCount: 0 }
  const heatSummary = report?.heatSummary || []
  const heatRows = report?.heatTableRows || []
  const heatPagination = report?.heatPagination || { page: 1, limit: heatLimit, total: heatRows.length, totalPages: 1 }
  const recyclePagination = report?.lostCycleReport?.pagination || { page: 1, limit: recycleLimit, total: 0, totalPages: 1 }

  // Donut chart percentages (SVG stroke-dasharray on radius 54 -> circumference ~339.29)
  const C = 2 * Math.PI * 54
  const classified = Math.max(1, totals.hotCount + totals.warmCount + totals.coldCount)
  const hotLen = ((totals.hotCount / classified) * C)
  const warmLen = ((totals.warmCount / classified) * C)
  const coldLen = ((totals.coldCount / classified) * C)

  return (
    <div>
      {/* Top Toolbar */}
      <div
        className="pool-action-bar"
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'heat', label: '🔥 Hot / Warm / Cold (Admin Only)' },
            { id: 'groups', label: `🏢 Group-Wise Report (${(report?.groupReport || []).length})` },
            { id: 'lifecycle', label: '📊 10-Status Lifecycle Funnel' },
            { id: 'recycle', label: `♻️ Lost Recycle Queue (${report?.lostCycleReport?.recyclableCount || 0})` },
            { id: 'finance', label: '💰 Business Value vs Collected' },
            { id: 'counselors', label: '👥 Counselor Matrix' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: subTab === t.id ? '1px solid #1b2b6b' : '1px solid #cbd5e1',
                background: subTab === t.id ? '#1b2b6b' : '#ffffff',
                color: subTab === t.id ? '#ffffff' : '#334155',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={repFilter}
            onChange={e => setRepFilter(e.target.value)}
            style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
          >
            <option value="All">All Counselors</option>
            {salesReps.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            title="From Date"
            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            title="To Date"
            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
          <button type="button" className="btn-pulse-secondary" onClick={loadReport} style={{ fontSize: 12, padding: '5px 10px' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          {onOpenSettings && (
            <button type="button" className="btn-pulse" onClick={onOpenSettings} style={{ fontSize: 12, padding: '5px 10px' }}>
              <Settings size={13} /> Lifecycle &amp; Program Settings
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="data-loader-container">
          <div className="data-loader-spinner" />
          <div className="data-loader-text">Generating Admin Advanced Reports...</div>
        </div>
      ) : !report ? (
        <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>No report data available.</div>
      ) : subTab === 'heat' ? (
        /* =====================================================
           SUB-TAB 1: ADMIN-ONLY HOT / WARM / COLD (VISUAL + TABLE)
           ===================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Visual Row: KPI Cards + SVG Donut & Category Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#b91c1c' }}>HOT LEADS</span>
                <Flame size={18} color="#dc2626" />
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#991b1b', marginTop: 6 }}>{totals.hotCount}</div>
              <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 2 }}>
                Positive interest &amp; Business milestones ({totals.classifiedTotal > 0 ? Math.round((totals.hotCount / totals.classifiedTotal) * 100) : 0}% of classified)
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#b45309' }}>WARM LEADS</span>
                <Sun size={18} color="#d97706" />
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#92400e', marginTop: 6 }}>{totals.warmCount}</div>
              <div style={{ fontSize: 11, color: '#78350f', marginTop: 2 }}>
                Moderate / follow-up &amp; decision support ({totals.classifiedTotal > 0 ? Math.round((totals.warmCount / totals.classifiedTotal) * 100) : 0}% of classified)
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8' }}>COLD LEADS</span>
                <Snowflake size={18} color="#2563eb" />
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#1e40af', marginTop: 6 }}>{totals.coldCount}</div>
              <div style={{ fontSize: 11, color: '#1e3a8a', marginTop: 2 }}>
                Low/delayed, Non-Connect, Non-Prospect &amp; Lost ({totals.classifiedTotal > 0 ? Math.round((totals.coldCount / totals.classifiedTotal) * 100) : 0}% of classified)
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>UNCLASSIFIED (NEW)</span>
                <Layers size={18} color="#64748b" />
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#334155', marginTop: 6 }}>{totals.unclassifiedCount}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Awaiting first category selection ({totals.totalLeads} total leads)
              </div>
            </div>
          </div>

          {/* Visual Donut + Category Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }} className="template-card-grid">
            <div className="template-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>
                Hot / Warm / Cold Share
              </div>
              <svg width="150" height="150" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="54" fill="none" stroke="#e2e8f0" strokeWidth="18" />
                {totals.classifiedTotal > 0 && (
                  <>
                    <circle
                      cx="70" cy="70" r="54" fill="none" stroke="#ef4444" strokeWidth="18"
                      strokeDasharray={`${hotLen} ${C - hotLen}`}
                      strokeDashoffset={C * 0.25}
                    />
                    <circle
                      cx="70" cy="70" r="54" fill="none" stroke="#f59e0b" strokeWidth="18"
                      strokeDasharray={`${warmLen} ${C - warmLen}`}
                      strokeDashoffset={C * 0.25 - hotLen}
                    />
                    <circle
                      cx="70" cy="70" r="54" fill="none" stroke="#3b82f6" strokeWidth="18"
                      strokeDasharray={`${coldLen} ${C - coldLen}`}
                      strokeDashoffset={C * 0.25 - hotLen - warmLen}
                    />
                  </>
                )}
                <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f172a">
                  {totals.classifiedTotal}
                </text>
                <text x="70" y="83" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">
                  Classified
                </text>
              </svg>
              <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11, fontWeight: 700 }}>
                <span style={{ color: '#dc2626' }}>● HOT ({totals.hotCount})</span>
                <span style={{ color: '#d97706' }}>● WARM ({totals.warmCount})</span>
                <span style={{ color: '#2563eb' }}>● COLD ({totals.coldCount})</span>
              </div>
            </div>

            <div className="template-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>
                Category-Level Breakdown inside Hot / Warm / Cold
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {heatSummary.filter(h => h.tier !== 'UNCLASSIFIED').map(h => (
                  <div key={h.tier}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      <span style={{ color: h.color }}>{h.label}</span>
                      <span>{h.count} ({h.percentageOfClassified}%)</span>
                    </div>
                    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ width: `${h.percentageOfClassified}%`, height: '100%', background: h.color, borderRadius: 6 }} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {h.categoryBreakdown.length === 0 ? (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>No leads yet</span>
                      ) : (
                        h.categoryBreakdown.slice(0, 6).map(cb => (
                          <span
                            key={cb.category}
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: h.bg,
                              color: h.color,
                              fontWeight: 600,
                            }}
                          >
                            {cb.category}: {cb.count}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hot / Warm / Cold Filterable Table */}
          <div className="template-card">
            <div className="template-card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
              <h3>Hot / Warm / Cold Leads Table (Admin-Only View)</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {['All', 'HOT', 'WARM', 'COLD', 'UNCLASSIFIED'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setHeatFilter(t)
                      setHeatPage(1)
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 16,
                      fontSize: 11,
                      fontWeight: 700,
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      background: heatFilter === t ? '#1b2b6b' : '#fff',
                      color: heatFilter === t ? '#fff' : '#334155',
                    }}
                  >
                    {t}
                  </button>
                ))}
                <input
                  type="text"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value)
                    setHeatPage(1)
                  }}
                  placeholder="Search lead / category..."
                  style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
                <button
                  type="button"
                  className="btn-pulse-secondary"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  onClick={() =>
                    downloadCsv(
                      `hot-warm-cold-report-${new Date().toISOString().slice(0, 10)}.csv`,
                      ['Candidate', 'Phone', 'Heat Tier', 'Lead Status', 'Selected Category', 'Counselor', 'Cycle', 'Steps', 'Program', 'Course Fees', 'Paid Amount'],
                      heatRows.map(r => [
                        r.fullName, r.phone, r.heatTier, r.leadStatus, r.selectedCategoryLabel,
                        r.assignedRepName, r.cycleNumber, r.stepsCount, r.businessProgramName,
                        r.courseFees ?? '', r.paidAmount ?? '',
                      ])
                    )
                  }
                >
                  <Download size={12} /> Export CSV
                </button>
              </div>
            </div>
            <div className="template-card-body" style={{ padding: 0 }}>
              <div className="leads-table-container">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Heat Tier</th>
                      <th>System Status</th>
                      <th>Selected Category</th>
                      <th>Counselor</th>
                      <th>Cycle / Steps</th>
                      <th>Business Value / Paid</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                          No leads match this Hot/Warm/Cold filter.
                        </td>
                      </tr>
                    ) : (
                      heatRows.map(row => {
                        const hb = getHeatBadgeStyle(row.heatTier)
                        const sb = getStatusBadgeStyle(row.leadStatus)
                        return (
                          <tr key={row.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.fullName}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{row.phone}</div>
                            </td>
                            <td>
                              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 12, background: hb.bg, color: hb.color, border: `1px solid ${hb.border}` }}>
                                {hb.label}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>
                                {row.leadStatus}
                              </span>
                              {row.isCycleEnded && (
                                <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, marginTop: 2 }}>End of Cycle</div>
                              )}
                            </td>
                            <td style={{ fontSize: 12, color: '#334155' }}>
                              {row.selectedCategoryLabel}
                              {row.lostReason && <div style={{ fontSize: 11, color: '#991b1b' }}>Reason: {row.lostReason}</div>}
                            </td>
                            <td style={{ fontSize: 12, fontWeight: 600 }}>{row.assignedRepName}</td>
                            <td style={{ fontSize: 12 }}>
                              <div>Cycle #{row.cycleNumber}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{row.stepsCount} step(s)</div>
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {row.businessProgramName ? (
                                <>
                                  <div style={{ fontWeight: 600 }}>{row.businessProgramName}</div>
                                  <div style={{ fontSize: 11, color: '#047857' }}>
                                    Fees: {formatINR(row.courseFees)} • Paid: {formatINR(row.paidAmount)}
                                  </div>
                                </>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-action-sm"
                                onClick={() => onInspectLeadById?.(row.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <History size={12} /> Steps
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pagination-container">
                <div>
                  Showing{' '}
                  <strong>
                    {heatPagination.total === 0 ? 0 : (heatPagination.page - 1) * heatPagination.limit + 1} -{' '}
                    {Math.min(heatPagination.page * heatPagination.limit, heatPagination.total)}
                  </strong>{' '}
                  of <strong>{heatPagination.total}</strong> leads (Page {heatPagination.page} of {heatPagination.totalPages})
                </div>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn-pagination"
                    disabled={heatPagination.page <= 1 || loading}
                    onClick={() => setHeatPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-pagination"
                    disabled={heatPagination.page >= heatPagination.totalPages || loading}
                    onClick={() => setHeatPage(p => Math.min(heatPagination.totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : subTab === 'groups' ? (
        /* =====================================================
           SUB-TAB 1B: GROUP-WISE REPORT (COUNSELOR GROUPS)
           ===================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {(report.groupReport || []).map(g => (
              <div key={g.id} className="template-card" style={{ padding: 16, borderTop: `3px solid ${g.isSystemBucket ? '#64748b' : '#1b2b6b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{g.groupName}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#eff6ff', color: '#1d4ed8' }}>
                    {g.totalLeads} Leads
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Manager: <strong>{g.managerName}</strong> {!g.isSystemBucket && `• ${g.memberCount} Member(s)`}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11, fontWeight: 700 }}>
                  <span style={{ color: '#dc2626' }}>HOT: {g.hot}</span>
                  <span style={{ color: '#d97706' }}>WARM: {g.warm}</span>
                  <span style={{ color: '#2563eb' }}>COLD: {g.cold}</span>
                </div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fees: <strong>{formatINR(g.businessValue)}</strong></span>
                  <span style={{ color: '#059669' }}>Paid: <strong>{formatINR(g.paidCollection)}</strong></span>
                </div>
              </div>
            ))}
          </div>

          <div className="template-card">
            <div className="template-card-header">
              <h3>Group-Wise Performance, Heat Split &amp; Revenue Table</h3>
              <button
                type="button"
                className="btn-pulse-secondary"
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() =>
                  downloadCsv(
                    `group-wise-report-${new Date().toISOString().slice(0, 10)}.csv`,
                    ['Group', 'Manager', 'Members', 'Total Leads', 'HOT', 'WARM', 'COLD', 'Non-Connect', 'Non-Prospect', 'Lost', 'Qualified', 'Converted', 'Onboarded', 'Steps', 'Course Fees', 'Paid Collection', 'Pending Balance', 'Conversion %'],
                    (report.groupReport || []).map(g => [
                      g.groupName, g.managerName, g.memberCount, g.totalLeads,
                      g.hot, g.warm, g.cold, g.nonConnect, g.nonProspect, g.lost,
                      g.qualified, g.converted, g.onboarded, g.totalSteps,
                      g.businessValue, g.paidCollection, g.pendingBalance, `${g.conversionRate}%`,
                    ])
                  )
                }
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
            <div className="template-card-body" style={{ padding: 0 }}>
              <div className="leads-table-container">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Group Name</th>
                      <th>Manager / Size</th>
                      <th>Leads</th>
                      <th style={{ color: '#dc2626' }}>HOT</th>
                      <th style={{ color: '#d97706' }}>WARM</th>
                      <th style={{ color: '#2563eb' }}>COLD</th>
                      <th>Non-Conn / Non-Pros / Lost</th>
                      <th>Qual / Conv / Onb</th>
                      <th>Steps</th>
                      <th>Course Fees / Paid</th>
                      <th>Conv %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.groupReport || []).length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>
                          No counselor groups or leads found for this period.
                        </td>
                      </tr>
                    ) : (
                      report.groupReport.map(g => (
                        <tr key={g.id}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{g.groupName}</td>
                          <td style={{ fontSize: 12 }}>
                            <div>{g.managerName}</div>
                            {!g.isSystemBucket && <div style={{ fontSize: 11, color: '#64748b' }}>{g.memberCount} counselor(s)</div>}
                          </td>
                          <td style={{ fontWeight: 700 }}>{g.totalLeads}</td>
                          <td style={{ fontWeight: 700, color: '#dc2626' }}>{g.hot}</td>
                          <td style={{ fontWeight: 700, color: '#d97706' }}>{g.warm}</td>
                          <td style={{ fontWeight: 700, color: '#2563eb' }}>{g.cold}</td>
                          <td style={{ fontSize: 12 }}>
                            {g.nonConnect} / {g.nonProspect} / {g.lost}
                          </td>
                          <td style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>
                            {g.qualified} / {g.converted} / {g.onboarded}
                          </td>
                          <td>{g.totalSteps}</td>
                          <td style={{ fontSize: 12 }}>
                            <div><strong>{formatINR(g.businessValue)}</strong></div>
                            <div style={{ fontSize: 11, color: '#059669' }}>Paid: {formatINR(g.paidCollection)}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#1b2b6b' }}>{g.conversionRate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : subTab === 'lifecycle' ? (
        /* =====================================================
           SUB-TAB 2: 10-STATUS LIFECYCLE FUNNEL
           ===================================================== */
        <div className="template-card">
          <div className="template-card-header">
            <h3>10-Status Lead Lifecycle Funnel</h3>
            <span className="header-badge">
              Active: {totals.activeCycleCount} • End of Cycle: {totals.cycleEndedCount}
            </span>
          </div>
          <div className="template-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(report.lifecycleFunnel || []).map(item => {
                const sb = getStatusBadgeStyle(item.status)
                const isEnd = ['NON PROSPECT', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS'].includes(item.status)
                return (
                  <div key={item.status} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 110px', alignItems: 'center', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12, background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>
                        {item.status}
                      </span>
                      {isEnd && <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>(End)</span>}
                    </div>
                    <div style={{ height: 14, background: '#f1f5f9', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ width: `${item.percentage}%`, height: '100%', background: sb.color, borderRadius: 7 }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700 }}>
                      {item.count} ({item.percentage}%)
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : subTab === 'recycle' ? (
        /* =====================================================
           SUB-TAB 3: LOST RECYCLE QUEUE & ANALYTICS
           ===================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="template-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>RECYCLABLE LOST LEADS</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
                {report.lostCycleReport?.recyclableCount || 0}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Under max limit ({report.lostCycleReport?.maxLostCycles} cycles) • Mode: <strong>{report.policy?.lostRecycleMode === 'auto_pool' ? 'Auto Pool' : 'Manual Admin'}</strong>
              </div>
            </div>
            <div className="template-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b' }}>PERMANENTLY CLOSED (MAX LOST)</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                {report.lostCycleReport?.permanentlyLostCount || 0}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Reached max Lost cycles (End of Cycle)</div>
            </div>
            <div className="template-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>RECOVERED AFTER RECYCLE</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                {report.lostCycleReport?.recoveredFromLostCount || 0}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Previously LOST, now active/converted</div>
            </div>
          </div>

          {/* Lost Reasons */}
          {report.lostCycleReport?.lostReasons?.length > 0 && (
            <div className="template-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Lost Reason Breakdown</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {report.lostCycleReport.lostReasons.map(lr => (
                  <span key={lr.reason} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 14, background: '#fef2f2', color: '#991b1b', fontWeight: 600 }}>
                    {lr.reason}: {lr.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recyclable Leads Queue */}
          <div className="template-card">
            <div className="template-card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <h3>Recyclable Lost Leads Queue</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={recycleTargetRepId}
                  onChange={e => setRecycleTargetRepId(e.target.value)}
                  style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="">Recycle to: System Pool (Unassigned)</option>
                  {salesReps.map(r => (
                    <option key={r.id} value={r.id}>Recycle to: {r.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-pulse"
                  disabled={selectedRecycleIds.length === 0 || recycling}
                  onClick={handleBulkRecycle}
                  style={{ fontSize: 12, padding: '5px 12px', opacity: selectedRecycleIds.length === 0 ? 0.5 : 1 }}
                >
                  <RotateCcw size={13} /> Recycle Selected ({selectedRecycleIds.length})
                </button>
              </div>
            </div>
            <div className="template-card-body" style={{ padding: 0 }}>
              <div className="leads-table-container">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th style={{ width: 38 }}>
                        <input
                          type="checkbox"
                          checked={
                            (report.lostCycleReport?.recyclableLeads?.length || 0) > 0 &&
                            report.lostCycleReport.recyclableLeads.every(l => selectedRecycleIds.includes(l.id))
                          }
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedRecycleIds(report.lostCycleReport.recyclableLeads.map(l => l.id))
                            } else {
                              setSelectedRecycleIds([])
                            }
                          }}
                        />
                      </th>
                      <th>Candidate</th>
                      <th>Lost Reason</th>
                      <th>Lost Cycle</th>
                      <th>Previous Counselor</th>
                      <th>Steps</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.lostCycleReport?.recyclableLeads || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>
                          No recyclable LOST leads waiting in queue.
                        </td>
                      </tr>
                    ) : (
                      report.lostCycleReport.recyclableLeads.map(l => (
                        <tr key={l.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedRecycleIds.includes(l.id)}
                              onChange={() =>
                                setSelectedRecycleIds(prev =>
                                  prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id]
                                )
                              }
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{l.fullName}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{l.phone}</div>
                          </td>
                          <td style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>{l.lostReason}</td>
                          <td style={{ fontSize: 12, fontWeight: 700 }}>
                            {l.lostCycleCount} / {l.maxLostCycles}
                          </td>
                          <td style={{ fontSize: 12 }}>{l.assignedTo?.repName || 'Unassigned'}</td>
                          <td style={{ fontSize: 12 }}>{l.stepsCount}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-pulse"
                              disabled={recycling}
                              onClick={() => handleRecycleSingle(l)}
                              style={{ fontSize: 11, padding: '4px 10px' }}
                            >
                              <RotateCcw size={12} /> Recycle
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pagination-container">
                <div>
                  Showing{' '}
                  <strong>
                    {recyclePagination.total === 0 ? 0 : (recyclePagination.page - 1) * recyclePagination.limit + 1} -{' '}
                    {Math.min(recyclePagination.page * recyclePagination.limit, recyclePagination.total)}
                  </strong>{' '}
                  of <strong>{recyclePagination.total}</strong> recyclable leads (Page {recyclePagination.page} of {recyclePagination.totalPages})
                </div>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn-pagination"
                    disabled={recyclePagination.page <= 1 || loading}
                    onClick={() => setRecyclePage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-pagination"
                    disabled={recyclePagination.page >= recyclePagination.totalPages || loading}
                    onClick={() => setRecyclePage(p => Math.min(recyclePagination.totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : subTab === 'finance' ? (
        /* =====================================================
           SUB-TAB 4: BUSINESS VALUE (COURSE FEES) VS PAID COLLECTION
           ===================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
            <div className="template-card" style={{ padding: 16, borderTop: '3px solid #0284c7' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>TOTAL BUSINESS VALUE (COURSE FEES)</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
                {formatINR(report.financialReport?.totalBusinessValue || 0)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Potential turnover across Business statuses</div>
            </div>
            <div className="template-card" style={{ padding: 16, borderTop: '3px solid #10b981' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>ACTUAL COLLECTED (PAID AMOUNT)</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#059669', marginTop: 6 }}>
                {formatINR(report.financialReport?.totalPaidAmount || 0)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Collection Rate: <strong>{report.financialReport?.collectionRate || 0}%</strong>
              </div>
            </div>
            <div className="template-card" style={{ padding: 16, borderTop: '3px solid #f59e0b' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>PENDING BALANCE RECEIVABLE</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#d97706', marginTop: 6 }}>
                {formatINR(report.financialReport?.totalPendingBalance || 0)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Course Fees minus Paid Amount</div>
            </div>
          </div>

          {/* By Milestone */}
          <div className="template-card">
            <div className="template-card-header">
              <h3>Revenue by Business Milestone</h3>
            </div>
            <div className="template-card-body" style={{ padding: 0 }}>
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>Leads</th>
                    <th>Course Fees (Business Value)</th>
                    <th>Paid Amount (Collected)</th>
                    <th>Pending Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.financialReport?.byMilestone || []).map(m => (
                    <tr key={m.status}>
                      <td style={{ fontWeight: 700 }}>{m.status}</td>
                      <td>{m.count}</td>
                      <td style={{ fontWeight: 700 }}>{formatINR(m.businessValue)}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{formatINR(m.paidAmount)}</td>
                      <td style={{ color: '#d97706', fontWeight: 600 }}>{formatINR(m.pendingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* By Program Master */}
          <div className="template-card">
            <div className="template-card-header">
              <h3>Revenue by Approved Course Program</h3>
            </div>
            <div className="template-card-body" style={{ padding: 0 }}>
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Course Program</th>
                    <th>Business Leads</th>
                    <th>Course Fees (Business Value)</th>
                    <th>Paid Amount (Collected)</th>
                    <th>Pending Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.financialReport?.byProgram || []).length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No business records yet.</td></tr>
                  ) : (
                    report.financialReport.byProgram.map(p => (
                      <tr key={p.program}>
                        <td style={{ fontWeight: 700 }}>{p.program}</td>
                        <td>{p.count}</td>
                        <td style={{ fontWeight: 700 }}>{formatINR(p.businessValue)}</td>
                        <td style={{ fontWeight: 700, color: '#059669' }}>{formatINR(p.paidAmount)}</td>
                        <td style={{ color: '#d97706', fontWeight: 600 }}>{formatINR(p.pendingBalance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================
           SUB-TAB 5: COUNSELOR PERFORMANCE MATRIX
           ===================================================== */
        <div className="template-card">
          <div className="template-card-header">
            <h3>Counselor Performance, Heat Split &amp; Revenue Matrix</h3>
            <button
              type="button"
              className="btn-pulse-secondary"
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() =>
                downloadCsv(
                  `counselor-matrix-${new Date().toISOString().slice(0, 10)}.csv`,
                  ['Counselor', 'Assigned', 'HOT', 'WARM', 'COLD', 'Non-Connect', 'Non-Prospect', 'Lost', 'Qualified', 'Converted', 'Onboarded', 'Steps Logged', 'Course Fees', 'Paid Collected', 'Conversion %'],
                  (report.counselorMatrix || []).map(c => [
                    c.name, c.totalAssigned, c.hot, c.warm, c.cold, c.nonConnect, c.nonProspect,
                    c.lost, c.qualified, c.converted, c.onboarded, c.totalSteps,
                    c.businessValue, c.paidCollection, `${c.conversionRate}%`,
                  ])
                )
              }
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
          <div className="template-card-body" style={{ padding: 0 }}>
            <div className="leads-table-container">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Counselor</th>
                    <th>Assigned</th>
                    <th style={{ color: '#dc2626' }}>HOT</th>
                    <th style={{ color: '#d97706' }}>WARM</th>
                    <th style={{ color: '#2563eb' }}>COLD</th>
                    <th>Non-Connect</th>
                    <th>Non-Prospect</th>
                    <th>Lost</th>
                    <th>Qual / Conv / Onb</th>
                    <th>Steps</th>
                    <th>Course Fees / Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.counselorMatrix || []).map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{c.title}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{c.totalAssigned}</td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>{c.hot}</td>
                      <td style={{ fontWeight: 700, color: '#d97706' }}>{c.warm}</td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{c.cold}</td>
                      <td>{c.nonConnect}</td>
                      <td>{c.nonProspect}</td>
                      <td>{c.lost}</td>
                      <td style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>
                        {c.qualified} / {c.converted} / {c.onboarded}
                      </td>
                      <td>{c.totalSteps}</td>
                      <td style={{ fontSize: 12 }}>
                        <div><strong>{formatINR(c.businessValue)}</strong></div>
                        <div style={{ fontSize: 11, color: '#059669' }}>Paid: {formatINR(c.paidCollection)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
