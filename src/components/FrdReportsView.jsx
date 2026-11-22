import React, { useState, useEffect } from 'react'
import {
  Download,
  RefreshCw,
  Calendar,
  IndianRupee,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react'
import { api } from '../api'
import { formatINR } from '../constants/leadLifecycle'

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

export default function FrdReportsView({
  reportType = 'business', // 'business' | 'conversion' | 'status'
  isAdmin = true,
  onBack,
  showNotify,
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  const [period, setPeriod] = useState('till_date') // 'current_month' | 'till_date' | 'custom'
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateBasis, setDateBasis] = useState('assignedAt') // 'assignedAt' | 'createdAt' | 'updatedAt'
  const [milestoneMode, setMilestoneMode] = useState('current') // 'current' | 'ever_reached'
  const [repId, setRepId] = useState('All')
  const [groupId, setGroupId] = useState('All')
  const [programName, setProgramName] = useState('All')
  const [source, setSource] = useState('All')

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.getFrdReports({
        period,
        fromDate: period === 'custom' ? fromDate : undefined,
        toDate: period === 'custom' ? toDate : undefined,
        dateBasis,
        milestoneMode,
        repId: isAdmin ? repId : undefined,
        groupId: isAdmin ? groupId : undefined,
        programName,
        source,
      })
      setData(res)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period, fromDate, toDate, dateBasis, milestoneMode, repId, groupId, programName, source])

  const kpi = data?.kpiTotals || {}
  const filters = data?.filterOptions || { counselors: [], teams: [], programs: [], sources: [] }
  const businessRows = data?.businessReport || []
  const conversionRows = data?.conversionReport || []
  const statusRows = data?.statusReport || []

  const titleMap = {
    business: 'Business Report — Turnover & Actual Sales Revenue',
    conversion: 'Lead Conversion Report — Milestone Cohort Ratios',
    status: 'Lead Status Report — Distribution & Reconciliation (Admin Only)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Bar with Back + Period Presets + Filters */}
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
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              {titleMap[reportType] || 'Management Report'}
            </h3>
          </div>

          {/* Period Presets: Current Month / Till Date / Custom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'current_month', label: 'Current Month' },
              { id: 'till_date', label: 'Till Date / Aggregate' },
              { id: 'custom', label: 'Custom Date Range' },
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
                  border: period === p.id ? '1px solid #1b2b6b' : '1px solid #cbd5e1',
                  background: period === p.id ? '#1b2b6b' : '#ffffff',
                  color: period === p.id ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Calendar size={12} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }}>
          {period === 'custom' && (
            <>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
              <span style={{ fontSize: 12, color: '#64748b' }}>to</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </>
          )}

          <select
            value={dateBasis}
            onChange={e => setDateBasis(e.target.value)}
            style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
            title="Date basis for period cohort"
          >
            <option value="assignedAt">Date Basis: Allocation Date</option>
            <option value="createdAt">Date Basis: Lead Arrival Date</option>
            <option value="updatedAt">Date Basis: Last Status Change</option>
          </select>

          {reportType !== 'status' && (
            <select
              value={milestoneMode}
              onChange={e => setMilestoneMode(e.target.value)}
              style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
              title="Count by current status or ever-reached milestone history"
            >
              <option value="current">Mode: Current Status</option>
              <option value="ever_reached">Mode: Ever Reached Milestone</option>
            </select>
          )}

          {isAdmin && (
            <>
              <select
                value={repId}
                onChange={e => setRepId(e.target.value)}
                style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="All">All Counselors</option>
                {filters.counselors.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.active === false ? ' (Disabled)' : ''}
                  </option>
                ))}
              </select>

              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="All">All Teams / Groups</option>
                {filters.teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </>
          )}

          <select
            value={programName}
            onChange={e => setProgramName(e.target.value)}
            style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All">All Course Programs</option>
            {filters.programs.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All">All Lead Sources</option>
            {filters.sources.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn-pulse-secondary"
            onClick={loadData}
            style={{ fontSize: 12, padding: '5px 10px', marginLeft: 'auto' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 12 }}>
        <div className="template-card" style={{ padding: 14, borderTop: '3px solid #1b2b6b' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>LEADS ALLOCATED</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{kpi.leadsAllocated || 0}</div>
        </div>
        <div className="template-card" style={{ padding: 14, borderTop: '3px solid #0284c7' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#0369a1' }}>AGGREGATE BUSINESS (UNIQUE)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
            {kpi.aggregateBusinessCount || 0}
            <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 6, color: '#64748b' }}>
              ({kpi.aggregateConversionRatio || 0}%)
            </span>
          </div>
        </div>
        <div className="template-card" style={{ padding: 14, borderTop: '3px solid #0e7490' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#0e7490' }}>QUAL / CONV / ONBOARDED</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
            {kpi.qualifiedCount || 0} / {kpi.convertedCount || 0} / {kpi.onboardedCount || 0}
          </div>
        </div>
        <div className="template-card" style={{ padding: 14, borderTop: '3px solid #4f46e5' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4338ca' }}>BUSINESS TURNOVER (FEES)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>{formatINR(kpi.aggregateTurnover || 0)}</div>
        </div>
        <div className="template-card" style={{ padding: 14, borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#047857' }}>SALES REVENUE (COLLECTED)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginTop: 6 }}>{formatINR(kpi.aggregateSalesRevenue || 0)}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>Pending: {formatINR(kpi.pendingBalance || 0)}</div>
        </div>
      </div>

      {kpi.overpaidCount > 0 && (
        <div style={{ padding: '8px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} />
          <span>
            <strong>{kpi.overpaidCount} business record(s)</strong> have Paid Amount exceeding Course Fees — review receipts in Master Leads.
          </span>
        </div>
      )}

      {/* Report Table Body */}
      {loading ? (
        <div className="template-card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="data-loader-spinner" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 13, color: '#64748b' }}>Computing report across cohort...</div>
        </div>
      ) : reportType === 'business' ? (
        <div className="template-card">
          <div className="template-card-header">
            <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IndianRupee size={15} />
              <span>7.1 Business Report (Unique Leads — Zero Double Counting)</span>
            </h3>
            <button
              type="button"
              className="btn-pulse-secondary"
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() =>
                downloadCsv(
                  `business-report-${new Date().toISOString().slice(0, 10)}.csv`,
                  [
                    'User Name', 'Leads Allocated',
                    'Aggregate Count', 'Aggregate Turnover', 'Aggregate Sales Revenue',
                    'Qualified Count', 'Qualified Turnover', 'Qualified Revenue',
                    'Converted Count', 'Converted Turnover', 'Converted Revenue',
                    'Onboarded Count', 'Onboarded Turnover', 'Onboarded Revenue',
                  ],
                  businessRows.map(r => [
                    r.userName, r.leadsAllocated,
                    r.aggregateCount, r.aggregateTurnover, r.aggregateSalesRevenue,
                    r.qualifiedCount, r.qualifiedTurnover, r.qualifiedSalesRevenue,
                    r.convertedCount, r.convertedTurnover, r.convertedSalesRevenue,
                    r.onboardedCount, r.onboardedTurnover, r.onboardedSalesRevenue,
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
                    <th>User Name</th>
                    <th>Leads Allocated</th>
                    <th>Aggregate Business (Unique)</th>
                    <th>Qualified Business</th>
                    <th>Converted Business</th>
                    <th>Onboarded Business</th>
                  </tr>
                </thead>
                <tbody>
                  {businessRows.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>No records match the selected period/filters.</td></tr>
                  ) : (
                    businessRows.map(r => (
                      <tr key={r.userId}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {r.userName}
                            {r.active === false && (
                              <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#fee2e2', color: '#991b1b' }}>Disabled</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{r.title}</div>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: 13 }}>{r.leadsAllocated}</td>
                        <td style={{ fontSize: 12 }}>
                          <div><strong>{r.aggregateCount}</strong> unique lead(s)</div>
                          <div>Turnover: <strong>{formatINR(r.aggregateTurnover)}</strong></div>
                          <div style={{ color: '#059669' }}>Revenue: <strong>{formatINR(r.aggregateSalesRevenue)}</strong></div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <div><strong>{r.qualifiedCount}</strong> lead(s)</div>
                          <div>Fees: {formatINR(r.qualifiedTurnover)}</div>
                          <div style={{ color: '#059669' }}>Paid: {formatINR(r.qualifiedSalesRevenue)}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <div><strong>{r.convertedCount}</strong> lead(s)</div>
                          <div>Fees: {formatINR(r.convertedTurnover)}</div>
                          <div style={{ color: '#059669' }}>Paid: {formatINR(r.convertedSalesRevenue)}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <div><strong>{r.onboardedCount}</strong> lead(s)</div>
                          <div>Fees: {formatINR(r.onboardedTurnover)}</div>
                          <div style={{ color: '#059669' }}>Paid: {formatINR(r.onboardedSalesRevenue)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : reportType === 'conversion' ? (
        <div className="template-card">
          <div className="template-card-header">
            <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={15} />
              <span>7.2 Lead Conversion Report (Consistent Assigned Cohort Denominator)</span>
            </h3>
            <button
              type="button"
              className="btn-pulse-secondary"
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() =>
                downloadCsv(
                  `lead-conversion-report-${new Date().toISOString().slice(0, 10)}.csv`,
                  ['User', 'Leads Allocated', 'Aggregate Count', 'Aggregate %', 'Qualified Count', 'Qualified %', 'Converted Count', 'Converted %', 'Onboarded Count', 'Onboarded %'],
                  conversionRows.map(r => [
                    r.userName, r.leadsAllocated,
                    r.aggregateCount, `${r.aggregateRatio}%`,
                    r.qualifiedCount, `${r.qualifiedRatio}%`,
                    r.convertedCount, `${r.convertedRatio}%`,
                    r.onboardedCount, `${r.onboardedRatio}%`,
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
                    <th>User</th>
                    <th>Leads Allocated (Cohort)</th>
                    <th>Aggregate Business (Count &amp; %)</th>
                    <th>Qualified (Count &amp; %)</th>
                    <th>Converted (Count &amp; %)</th>
                    <th>Onboarded (Count &amp; %)</th>
                  </tr>
                </thead>
                <tbody>
                  {conversionRows.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>No conversion records for this period.</td></tr>
                  ) : (
                    conversionRows.map(r => (
                      <tr key={r.userId}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {r.userName}
                            {r.active === false && (
                              <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#fee2e2', color: '#991b1b' }}>Disabled</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{r.title}</div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{r.leadsAllocated}</td>
                        <td>
                          <strong style={{ color: '#1b2b6b' }}>{r.aggregateCount}</strong>{' '}
                          <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 700 }}>({r.aggregateRatio}%)</span>
                        </td>
                        <td>
                          <strong>{r.qualifiedCount}</strong>{' '}
                          <span style={{ fontSize: 11, color: '#0e7490', fontWeight: 600 }}>({r.qualifiedRatio}%)</span>
                        </td>
                        <td>
                          <strong>{r.convertedCount}</strong>{' '}
                          <span style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>({r.convertedRatio}%)</span>
                        </td>
                        <td>
                          <strong>{r.onboardedCount}</strong>{' '}
                          <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>({r.onboardedRatio}%)</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* 7.3 Lead Status Report (Admin Only) */
        <div className="template-card">
          <div className="template-card-header">
            <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={15} />
              <span>7.3 Lead Status Report (Count &amp; % of Allocated Cohort — Reconciled to 100%)</span>
            </h3>
            <button
              type="button"
              className="btn-pulse-secondary"
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() =>
                downloadCsv(
                  `lead-status-report-${new Date().toISOString().slice(0, 10)}.csv`,
                  ['User', 'Leads Allocated', 'HOT', 'HOT %', 'WARM', 'WARM %', 'COLD', 'COLD %', 'LOST', 'LOST %', 'NON-CONNECT', 'NON-CONNECT %', 'NON PROSPECT', 'NON PROSPECT %', 'Other (New + Business)', 'Other %'],
                  statusRows.map(r => [
                    r.userName, r.leadsAllocated,
                    r.hotCount, `${r.hotPct}%`,
                    r.warmCount, `${r.warmPct}%`,
                    r.coldCount, `${r.coldPct}%`,
                    r.lostCount, `${r.lostPct}%`,
                    r.nonConnectCount, `${r.nonConnectPct}%`,
                    r.nonProspectCount, `${r.nonProspectPct}%`,
                    r.otherCount, `${r.otherPct}%`,
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
                    <th>User</th>
                    <th>Allocated</th>
                    <th style={{ color: '#dc2626' }}>HOT</th>
                    <th style={{ color: '#d97706' }}>WARM</th>
                    <th style={{ color: '#2563eb' }}>COLD</th>
                    <th style={{ color: '#991b1b' }}>LOST</th>
                    <th>NON-CONNECT</th>
                    <th>NON PROSPECT</th>
                    <th>Other (New &amp; Business)</th>
                  </tr>
                </thead>
                <tbody>
                  {statusRows.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>No status records for this period.</td></tr>
                  ) : (
                    statusRows.map(r => (
                      <tr key={r.userId}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {r.userName}
                            {r.active === false && (
                              <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#fee2e2', color: '#991b1b' }}>Disabled</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{r.leadsAllocated}</td>
                        <td style={{ color: '#dc2626', fontWeight: 700 }}>{r.hotCount} <span style={{ fontSize: 10, fontWeight: 500 }}>({r.hotPct}%)</span></td>
                        <td style={{ color: '#d97706', fontWeight: 700 }}>{r.warmCount} <span style={{ fontSize: 10, fontWeight: 500 }}>({r.warmPct}%)</span></td>
                        <td style={{ color: '#2563eb', fontWeight: 700 }}>{r.coldCount} <span style={{ fontSize: 10, fontWeight: 500 }}>({r.coldPct}%)</span></td>
                        <td style={{ color: '#991b1b', fontWeight: 700 }}>{r.lostCount} <span style={{ fontSize: 10, fontWeight: 500 }}>({r.lostPct}%)</span></td>
                        <td>{r.nonConnectCount} <span style={{ fontSize: 10, color: '#64748b' }}>({r.nonConnectPct}%)</span></td>
                        <td>{r.nonProspectCount} <span style={{ fontSize: 10, color: '#64748b' }}>({r.nonProspectPct}%)</span></td>
                        <td>{r.otherCount} <span style={{ fontSize: 10, color: '#64748b' }}>({r.otherPct}%)</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
