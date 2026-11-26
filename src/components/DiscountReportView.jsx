import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Calendar,
  Download,
  RefreshCw,
  Tag,
  IndianRupee,
  Users,
  Building2,
  UserCheck,
  TrendingDown,
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

export default function DiscountReportView({ isManagerScoped = false, onBack, showNotify }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('leads') // 'leads' | 'reps' | 'groups' | 'authors' | 'monthly'

  // Filters
  const [period, setPeriod] = useState('till_date') // 'current_month' | 'last_month' | 'till_date' | 'custom'
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState('All')
  const [repId, setRepId] = useState('All')
  const [groupId, setGroupId] = useState('All')
  const [programName, setProgramName] = useState('All')

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.getDiscountReport({
        period,
        fromDate: period === 'custom' ? fromDate : undefined,
        toDate: period === 'custom' ? toDate : undefined,
        status,
        repId,
        groupId,
        programName,
      })
      setData(res)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to load discount report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period, fromDate, toDate, status, repId, groupId, programName])

  const kpi = data?.kpiTotals || {}
  const filters = data?.filterOptions || { counselors: [], teams: [], programs: [] }
  const leads = data?.leads || []
  const bySalesRep = data?.bySalesRep || []
  const byGroup = data?.byGroup || []
  const byDiscountAuthor = data?.byDiscountAuthor || []
  const monthlyTrend = data?.monthlyTrend || []

  const handleExportCsv = () => {
    if (activeTab === 'monthly') {
      downloadCsv(
        `discount-report-monthly-${period}.csv`,
        ['Month', 'Discounted Leads', 'Qualified', 'Converted', 'Onboarded', 'Standard Fees', 'Agreed Amount', 'Total Discount', 'Avg Discount %'],
        monthlyTrend.map(m => [
          m.month,
          m.leadsCount,
          m.qualifiedCount,
          m.convertedCount,
          m.onboardedCount,
          m.totalStandardFees,
          m.totalAgreedAmount,
          m.totalDiscountGiven,
          `${m.avgDiscountPercent}%`,
        ])
      )
      return
    }
    if (activeTab === 'reps') {
      downloadCsv(
        `discount-report-by-rep-${period}.csv`,
        ['Sales Rep', 'Group', 'Group Manager', 'Discounted Leads', 'Qualified', 'Converted', 'Onboarded', 'Standard Fees', 'Agreed Amount', 'Total Discount', 'Avg Discount %'],
        bySalesRep.map(r => [
          r.repName,
          r.groupName,
          r.managerName,
          r.leadsCount,
          r.qualifiedCount,
          r.convertedCount,
          r.onboardedCount,
          r.totalStandardFees,
          r.totalAgreedAmount,
          r.totalDiscountGiven,
          `${r.avgDiscountPercent}%`,
        ])
      )
      return
    }
    if (activeTab === 'groups') {
      downloadCsv(
        `discount-report-by-group-${period}.csv`,
        ['Group Name', 'Group Manager', 'Discounted Leads', 'Qualified', 'Converted', 'Onboarded', 'Standard Fees', 'Agreed Amount', 'Total Discount', 'Avg Discount %'],
        byGroup.map(g => [
          g.groupName,
          g.managerName,
          g.leadsCount,
          g.qualifiedCount,
          g.convertedCount,
          g.onboardedCount,
          g.totalStandardFees,
          g.totalAgreedAmount,
          g.totalDiscountGiven,
          `${g.avgDiscountPercent}%`,
        ])
      )
      return
    }
    if (activeTab === 'authors') {
      downloadCsv(
        `discount-report-by-author-${period}.csv`,
        ['Discount Given By', 'Role', 'Leads Discounted', 'Standard Fees', 'Agreed Amount', 'Total Discount Given', 'Avg Discount %'],
        byDiscountAuthor.map(a => [
          a.name,
          a.role,
          a.leadsCount,
          a.totalStandardFees,
          a.totalAgreedAmount,
          a.totalDiscountGiven,
          `${a.avgDiscountPercent}%`,
        ])
      )
      return
    }
    downloadCsv(
      `discount-report-leads-${period}.csv`,
      ['Student Name', 'Phone', 'Program', 'Status', 'Standard Fee', 'Agreed Amount', 'Discount Given', 'Discount %', 'Paid Amount', 'Balance', 'Assigned Counselor', 'Group', 'Discount Given By', 'Date'],
      leads.map(l => [
        l.fullName,
        l.phone,
        l.programName,
        l.leadStatus,
        l.courseFees,
        l.agreedAmount,
        l.discountAmount,
        `${l.discountPercent}%`,
        l.paidAmount,
        l.balanceAmount,
        l.assignedRepName,
        l.groupName,
        `${l.discountSetBy?.name || 'Staff'} (${l.discountSetBy?.role || 'sales'})`,
        l.date ? new Date(l.date).toLocaleDateString('en-IN') : '',
      ])
    )
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
                <Tag size={16} color="#be185d" />
                <span>Discount Report — Agreed Fee vs Standard Course Fee</span>
              </h3>
              {isManagerScoped && (
                <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
                  Showing group-scoped discounts for your team
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'current_month', label: 'Current Month' },
              { id: 'last_month', label: 'Last Month' },
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
                  border: period === p.id ? '1px solid #be185d' : '1px solid #cbd5e1',
                  background: period === p.id ? '#be185d' : '#ffffff',
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

            <button
              type="button"
              onClick={loadData}
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

        {/* Filter Row */}
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
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All">All Business Statuses</option>
            <option value="QUALIFIED BUSINESS">Qualified Business</option>
            <option value="CONVERTED BUSINESS">Converted Business</option>
            <option value="ONBOARDED BUSINESS">Onboarded Business</option>
          </select>

          <select
            value={repId}
            onChange={e => setRepId(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All">All Sales Reps</option>
            {filters.counselors.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All">All Groups / Teams</option>
            {filters.teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={programName}
            onChange={e => setProgramName(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All">All Programs</option>
            {filters.programs.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9f1239' }}>TOTAL DISCOUNT GIVEN</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#be123c', marginTop: 4 }}>
            {formatINR(kpi.totalDiscountGiven || 0)}
          </div>
          <div style={{ fontSize: 11, color: '#881337', marginTop: 4 }}>
            Avg {kpi.avgDiscountPercent || 0}% across {kpi.totalDiscountedLeads || 0} leads
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>STANDARD COURSE FEES</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {formatINR(kpi.totalStandardFees || 0)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Agreed: {formatINR(kpi.totalAgreedAmount || 0)}
          </div>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>QUALIFIED DISCOUNTS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#b45309', marginTop: 4 }}>
            {formatINR(kpi.qualifiedDiscount || 0)}
          </div>
          <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>
            {kpi.qualifiedCount || 0} Qualified leads
          </div>
        </div>

        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46' }}>CONVERTED & ONBOARDED</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#047857', marginTop: 4 }}>
            {formatINR((kpi.convertedDiscount || 0) + (kpi.onboardedDiscount || 0))}
          </div>
          <div style={{ fontSize: 11, color: '#065f46', marginTop: 4 }}>
            {kpi.convertedCount || 0} Converted • {kpi.onboardedCount || 0} Onboarded
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
        {[
          { id: 'leads', label: `Discounted Leads (${leads.length})`, Icon: Tag },
          { id: 'monthly', label: `Monthly Breakdown (${monthlyTrend.length})`, Icon: TrendingDown },
          { id: 'reps', label: `By Sales Rep (${bySalesRep.length})`, Icon: Users },
          { id: 'groups', label: `By Group & Manager (${byGroup.length})`, Icon: Building2 },
          { id: 'authors', label: `Who Gave Discount (${byDiscountAuthor.length})`, Icon: UserCheck },
        ].map(t => {
          const TabIcon = t.Icon
          const isAct = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: isAct ? '1px solid #be185d' : '1px solid #e2e8f0',
                background: isAct ? '#fdf2f8' : '#fff',
                color: isAct ? '#be185d' : '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <TabIcon size={14} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Table Body */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Loading discount report...
          </div>
        ) : activeTab === 'monthly' ? (
          <table className="master-table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Month</th>
                <th>Discounted Leads</th>
                <th>Qualified</th>
                <th>Converted</th>
                <th>Onboarded</th>
                <th>Standard Fees</th>
                <th>Agreed Amount</th>
                <th>Total Discount</th>
                <th>Avg %</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTrend.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No discount data found.</td></tr>
              ) : (
                monthlyTrend.map(m => (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 700 }}>{m.month}</td>
                    <td>{m.leadsCount}</td>
                    <td>{m.qualifiedCount}</td>
                    <td>{m.convertedCount}</td>
                    <td>{m.onboardedCount}</td>
                    <td>{formatINR(m.totalStandardFees)}</td>
                    <td style={{ fontWeight: 600 }}>{formatINR(m.totalAgreedAmount)}</td>
                    <td style={{ fontWeight: 800, color: '#be123c' }}>{formatINR(m.totalDiscountGiven)}</td>
                    <td>{m.avgDiscountPercent}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : activeTab === 'reps' ? (
          <table className="master-table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Sales Rep</th>
                <th>Group / Manager</th>
                <th>Leads</th>
                <th>Qualified</th>
                <th>Converted</th>
                <th>Onboarded</th>
                <th>Standard Fees</th>
                <th>Agreed Amount</th>
                <th>Total Discount</th>
                <th>Avg %</th>
              </tr>
            </thead>
            <tbody>
              {bySalesRep.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No discount data found.</td></tr>
              ) : (
                bySalesRep.map(r => (
                  <tr key={r.repId}>
                    <td style={{ fontWeight: 700 }}>{r.repName}</td>
                    <td>
                      <div>{r.groupName}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Mgr: {r.managerName}</div>
                    </td>
                    <td>{r.leadsCount}</td>
                    <td>{r.qualifiedCount}</td>
                    <td>{r.convertedCount}</td>
                    <td>{r.onboardedCount}</td>
                    <td>{formatINR(r.totalStandardFees)}</td>
                    <td>{formatINR(r.totalAgreedAmount)}</td>
                    <td style={{ fontWeight: 800, color: '#be123c' }}>{formatINR(r.totalDiscountGiven)}</td>
                    <td>{r.avgDiscountPercent}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : activeTab === 'groups' ? (
          <table className="master-table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Group Manager</th>
                <th>Discounted Leads</th>
                <th>Qualified</th>
                <th>Converted</th>
                <th>Onboarded</th>
                <th>Standard Fees</th>
                <th>Agreed Amount</th>
                <th>Total Discount</th>
                <th>Avg %</th>
              </tr>
            </thead>
            <tbody>
              {byGroup.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No group discount data found.</td></tr>
              ) : (
                byGroup.map(g => (
                  <tr key={g.groupId}>
                    <td style={{ fontWeight: 700 }}>{g.groupName}</td>
                    <td>{g.managerName}</td>
                    <td>{g.leadsCount}</td>
                    <td>{g.qualifiedCount}</td>
                    <td>{g.convertedCount}</td>
                    <td>{g.onboardedCount}</td>
                    <td>{formatINR(g.totalStandardFees)}</td>
                    <td>{formatINR(g.totalAgreedAmount)}</td>
                    <td style={{ fontWeight: 800, color: '#be123c' }}>{formatINR(g.totalDiscountGiven)}</td>
                    <td>{g.avgDiscountPercent}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : activeTab === 'authors' ? (
          <table className="master-table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Discount Given By</th>
                <th>Role</th>
                <th>Leads Discounted</th>
                <th>Standard Fees</th>
                <th>Agreed Amount</th>
                <th>Total Discount Given</th>
                <th>Avg %</th>
              </tr>
            </thead>
            <tbody>
              {byDiscountAuthor.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No discount author data found.</td></tr>
              ) : (
                byDiscountAuthor.map(a => (
                  <tr key={`${a.userId}_${a.name}`}>
                    <td style={{ fontWeight: 700 }}>{a.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{a.role}</td>
                    <td>{a.leadsCount}</td>
                    <td>{formatINR(a.totalStandardFees)}</td>
                    <td>{formatINR(a.totalAgreedAmount)}</td>
                    <td style={{ fontWeight: 800, color: '#be123c' }}>{formatINR(a.totalDiscountGiven)}</td>
                    <td>{a.avgDiscountPercent}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="master-table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Program</th>
                <th>Status</th>
                <th>Standard Fee</th>
                <th>Agreed Amt</th>
                <th>Discount</th>
                <th>Paid / Balance</th>
                <th>Counselor / Group</th>
                <th>Discount Given By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No discounted leads found for the selected filters.</td></tr>
              ) : (
                leads.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{l.fullName}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{l.phone}</div>
                    </td>
                    <td>
                      <div>{l.programName}</div>
                      {l.programVariant && <div style={{ fontSize: 10, color: '#64748b' }}>{l.programVariant}</div>}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                        background: l.leadStatus === 'ONBOARDED BUSINESS' ? '#dcfce7' : l.leadStatus === 'CONVERTED BUSINESS' ? '#d1fae5' : '#fef3c7',
                        color: l.leadStatus === 'ONBOARDED BUSINESS' ? '#15803d' : l.leadStatus === 'CONVERTED BUSINESS' ? '#047857' : '#92400e',
                      }}>
                        {l.leadStatus}
                      </span>
                    </td>
                    <td>{formatINR(l.courseFees)}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(l.agreedAmount)}</td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#be123c' }}>-{formatINR(l.discountAmount)}</div>
                      <div style={{ fontSize: 10, color: '#9f1239' }}>({l.discountPercent}%)</div>
                    </td>
                    <td>
                      <div style={{ color: '#047857', fontWeight: 600 }}>Paid: {formatINR(l.paidAmount)}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Bal: {formatINR(l.balanceAmount)}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{l.assignedRepName}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{l.groupName}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1d4ed8' }}>{l.discountSetBy?.name || 'Staff'}</div>
                      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'capitalize' }}>{l.discountSetBy?.role || 'sales'}</div>
                    </td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>
                      {l.date ? new Date(l.date).toLocaleDateString('en-IN') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

