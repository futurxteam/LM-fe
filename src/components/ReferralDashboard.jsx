import React, { useState, useEffect, useMemo } from 'react'
import {
  Share2,
  Calendar,
  Filter,
  TrendingUp,
  Award,
  GraduationCap,
  Users,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  BookOpen,
  Phone,
  Mail,
  X,
} from 'lucide-react'
import { api } from '../api'

export default function ReferralDashboard({ onOpenLeadProfile, showNotify }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 })

  // Filters
  const [datePreset, setDatePreset] = useState('month') // 'today', 'week', 'month', 'last_month', 'year', 'custom'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterType, setFilterType] = useState('All') // 'All', 'student', 'alumni', 'lead'
  const [filterStatus, setFilterStatus] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentTeacherModal, setSelectedStudentTeacherModal] = useState(null)
  const [loadingTeacherDetails, setLoadingTeacherDetails] = useState(false)

  const handleOpenOngoingStudentTeacher = async studentObj => {
    setSelectedStudentTeacherModal({
      name: studentObj.name || studentObj.referrerName || 'Student',
      phone: studentObj.phone || studentObj.referrerPhone || '',
      email: studentObj.email || studentObj.referrerEmail || '',
      course: studentObj.course || studentObj.referrerCourse || '',
      batch: studentObj.batch || studentObj.referrerBatch || '',
      lmsUserId: studentObj.lmsUserId || studentObj.referrerLmsUserId || '',
      totalReferrals: studentObj.totalReferrals ?? studentObj.totalCount ?? null,
      convertedCount: studentObj.convertedCount ?? null,
      classTeachers: Array.isArray(studentObj.classTeachers) ? studentObj.classTeachers : [],
      classTeacherName: studentObj.classTeacher || studentObj.referrerClassTeacher || '',
    })

    setLoadingTeacherDetails(true)
    try {
      const res = await api.getStudentClassTeacher({
        lmsUserId: studentObj.lmsUserId || studentObj.referrerLmsUserId || '',
        phone: studentObj.phone || studentObj.referrerPhone || '',
        email: studentObj.email || studentObj.referrerEmail || '',
      })
      if (res?.success && res.data) {
        setSelectedStudentTeacherModal(prev =>
          prev
            ? {
                ...prev,
                course: res.data.courseName && res.data.courseName !== 'Not Assigned' ? res.data.courseName : prev.course,
                batch: res.data.batchName && res.data.batchName !== 'Not Assigned' ? res.data.batchName : prev.batch,
                batchType: res.data.batchType || '',
                classTeachers: Array.isArray(res.data.classTeachers) ? res.data.classTeachers : prev.classTeachers,
                classTeacherName: res.data.classTeacherName || prev.classTeacherName,
              }
            : null
        )
      }
    } catch (err) {
      console.warn('Failed to load class teacher details:', err)
    } finally {
      setLoadingTeacherDetails(false)
    }
  }

  // Calculate preset date ranges
  const computeDateRange = preset => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const d = now.getDate()

    if (preset === 'today') {
      const todayStr = new Date(y, m, d).toISOString().split('T')[0]
      return { start: todayStr, end: todayStr }
    }
    if (preset === 'week') {
      const dayOfWeek = now.getDay()
      const diffToMonday = (dayOfWeek + 6) % 7
      const monday = new Date(y, m, d - diffToMonday)
      return { start: monday.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
    }
    if (preset === 'month') {
      const first = new Date(y, m, 1)
      return { start: first.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
    }
    if (preset === 'last_month') {
      const first = new Date(y, m - 1, 1)
      const last = new Date(y, m, 0)
      return { start: first.toISOString().split('T')[0], end: last.toISOString().split('T')[0] }
    }
    if (preset === 'year') {
      const first = new Date(y, 0, 1)
      return { start: first.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
    }
    return { start: '', end: '' }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      let sDate = startDate
      let eDate = endDate
      if (datePreset !== 'custom') {
        const computed = computeDateRange(datePreset)
        sDate = computed.start
        eDate = computed.end
      }

      const params = {
        startDate: sDate,
        endDate: eDate,
        referralType: filterType !== 'All' ? filterType : undefined,
        status: filterStatus !== 'All' ? filterStatus : undefined,
        search: searchQuery.trim() || undefined,
        page: pagination.page,
        limit: pagination.limit,
      }

      const [statsRes, listRes] = await Promise.all([
        api.getReferralStats({
          dateFilter: datePreset,
          startDate: sDate,
          endDate: eDate,
        }),
        api.getReferrals(params),
      ])

      if (statsRes.success) {
        setStats(statsRes.stats)
      }
      if (listRes.success) {
        setReferrals(listRes.referrals || [])
        setPagination(listRes.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 })
      }
    } catch (err) {
      console.error('Failed to load referral report:', err)
      showNotify?.('error', err.message || 'Failed to load referral data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [datePreset, startDate, endDate, filterType, filterStatus, pagination.page])

  const handleSearchSubmit = e => {
    e.preventDefault()
    setPagination(p => ({ ...p, page: 1 }))
    loadData()
  }

  const kpis = {
    totalReferrals: stats?.kpis?.totalReferrals ?? stats?.totalCount ?? stats?.totalReferrals ?? 0,
    qualified: stats?.kpis?.qualified ?? stats?.qualifiedCount ?? 0,
    converted: stats?.kpis?.converted ?? stats?.convertedCount ?? 0,
    onboarded: stats?.kpis?.onboarded ?? stats?.onboardedCount ?? 0,
    conversionRate: stats?.kpis?.conversionRate ?? stats?.conversionRate ?? 0,
    totalRevenue: stats?.kpis?.totalRevenue ?? stats?.totalRevenue ?? 0,
  }

  const byType = {
    student: stats?.demographics?.byType?.student ?? stats?.byType?.student?.count ?? stats?.byType?.student ?? 0,
    alumni: stats?.demographics?.byType?.alumni ?? stats?.byType?.alumni?.count ?? stats?.byType?.alumni ?? 0,
    lead: stats?.demographics?.byType?.lead ?? stats?.byType?.lead?.count ?? stats?.byType?.lead ?? 0,
  }
  const totalByType = (byType.student || 0) + (byType.alumni || 0) + (byType.lead || 0) || 1

  const courseBreakdown = stats?.demographics?.byCourse || stats?.courseBreakdown || []
  const leaderboard = (stats?.leaderboard || []).map(r => ({
    ...r,
    totalCount: r.totalReferrals ?? r.totalReferred ?? 1,
    convertedCount: r.convertedCount ?? 0,
  }))
  const ongoingStudentReferrers = stats?.ongoingStudentReferrers || []
  const classTeacherLeaderboard = stats?.classTeacherLeaderboard || []

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              <Share2 size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                Referral Intelligence & Demographics
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Track student, alumni, and lead referral pipelines, conversion rates, and revenue
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: 3,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'year', label: 'This Year' },
              { id: 'custom', label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: datePreset === p.id ? 700 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: datePreset === p.id ? '#fff' : 'transparent',
                  color: datePreset === p.id ? '#0284c7' : '#64748b',
                  boxShadow: datePreset === p.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                }}
              />
              <span style={{ fontSize: 12, color: '#64748b' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={loadData}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Total Referrals */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>TOTAL REFERRALS</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
              }}
            >
              <Share2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 10 }}>
            {kpis.totalReferrals}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Candidate leads referred into CRM
          </div>
        </div>

        {/* Card 2: Converted Referrals */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>CONVERTED (≥ ₹10K)</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669', marginTop: 10 }}>
            {kpis.converted}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {kpis.onboarded} fully onboarded
          </div>
        </div>

        {/* Card 3: Conversion Rate */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>CONVERSION RATE</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 10 }}>
            {kpis.conversionRate}%
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Converted / Total referrals
          </div>
        </div>

        {/* Card 4: Revenue */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>REFERRAL REVENUE</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
              }}
            >
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#7c3aed', marginTop: 10 }}>
            ₹{Number(kpis.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Total fees collected from referred leads
          </div>
        </div>
      </div>

      {/* Demographics & Leaderboard Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Referrer Demographics Breakdown */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '20px 22px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Referrer Source Demographics
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Student */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GraduationCap size={15} color="#0284c7" />
                  <span>Verified LMS Students</span>
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {byType.student || 0} ({Math.round(((byType.student || 0) / totalByType) * 100)}%)
                </span>
              </div>
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${((byType.student || 0) / totalByType) * 100}%`,
                    background: '#0284c7',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>

            {/* Alumni */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={15} color="#059669" />
                  <span>Verified LMS Alumni (Graduated)</span>
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {byType.alumni || 0} ({Math.round(((byType.alumni || 0) / totalByType) * 100)}%)
                </span>
              </div>
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${((byType.alumni || 0) / totalByType) * 100}%`,
                    background: '#059669',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>

            {/* Existing Lead */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={15} color="#7c3aed" />
                  <span>Existing CRM Leads</span>
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {byType.lead || 0} ({Math.round(((byType.lead || 0) / totalByType) * 100)}%)
                </span>
              </div>
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${((byType.lead || 0) / totalByType) * 100}%`,
                    background: '#7c3aed',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Course Breakdown */}
          {courseBreakdown.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                POPULAR ENQUIRED COURSES
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {courseBreakdown.slice(0, 4).map((c, cIdx) => (
                  <div
                    key={c.course || c._id || cIdx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 16,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: 11,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{c.course || c._id || 'Healthcare Management'}</span>
                    <span
                      style={{
                        background: '#0284c7',
                        color: '#fff',
                        borderRadius: 10,
                        padding: '1px 6px',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {c.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Referrers Leaderboard */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '20px 22px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Top Referrers Leaderboard
          </h3>

          {leaderboard.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No referral activity in selected period
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaderboard.slice(0, 5).map((ref, idx) => (
                <div
                  key={`${ref.name}_${ref.phone}_${idx}`}
                  onClick={() => {
                    if (ref.type === 'student' && !ref.isAlumni) {
                      handleOpenOngoingStudentTeacher(ref)
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: idx === 0 ? '#eff6ff' : '#f8fafc',
                    border: idx === 0 ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                    cursor: ref.type === 'student' && !ref.isAlumni ? 'pointer' : 'default',
                  }}
                  title={ref.type === 'student' && !ref.isAlumni ? 'Click to view assigned Class Teacher' : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: idx === 0 ? '#0284c7' : '#94a3b8',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {ref.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {ref.phone}
                        {ref.batch ? ` • ${ref.batch}` : ''}
                      </div>
                      {ref.classTeacher && (
                        <div style={{ fontSize: 10, color: '#0369a1', fontWeight: 700, marginTop: 2 }}>
                          Class Teacher: {ref.classTeacher}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>
                      {ref.totalCount} {ref.totalCount === 1 ? 'lead' : 'leads'}
                    </div>
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                      {ref.convertedCount} converted
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Class Teacher Leaderboard & Referred Ongoing Students Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Class Teacher Referral Leaderboard */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} color="#0284c7" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                Class Teacher Referral Leaderboard
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 10 }}>
              {classTeacherLeaderboard.length} Teachers
            </span>
          </div>

          {classTeacherLeaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
              No ongoing student referrals with assigned class teachers in selected period
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {classTeacherLeaderboard.map((ct, idx) => (
                <div
                  key={`${ct.teacherId}_${ct.teacherName}_${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: idx === 0 ? '#f0fdf4' : '#f8fafc',
                    border: idx === 0 ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: idx === 0 ? '#059669' : '#64748b',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {ct.teacherName}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {ct.referringStudentsCount} referring {ct.referringStudentsCount === 1 ? 'student' : 'students'}
                        {ct.teacherPhone ? ` • ${ct.teacherPhone}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>
                      {ct.totalReferrals} {ct.totalReferrals === 1 ? 'referral' : 'referrals'}
                    </div>
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                      {ct.convertedCount} converted • ₹{Number(ct.totalRevenue || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clickable Referred Ongoing Students List -> View Class Teacher */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={18} color="#7c3aed" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                Referred Ongoing Students (Click for Class Teacher)
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', background: '#f5f3ff', padding: '2px 8px', borderRadius: 10 }}>
              {ongoingStudentReferrers.length} Students
            </span>
          </div>

          {ongoingStudentReferrers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
              No ongoing student referrers in selected period
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {ongoingStudentReferrers.map((stu, idx) => (
                <div
                  key={`${stu.name}_${stu.phone}_${idx}`}
                  onClick={() => handleOpenOngoingStudentTeacher(stu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      {stu.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {stu.phone}
                      {stu.batch ? ` • ${stu.batch}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, marginTop: 2 }}>
                      {stu.classTeacher ? `Class Teacher: ${stu.classTeacher}` : 'Click to check Class Teacher'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
                      {stu.totalReferrals} ref{stu.totalReferrals === 1 ? '' : 's'}
                    </div>
                    <div style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>
                      {stu.convertedCount} converted
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Referrals Master Table Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Table Filters Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search candidate or referrer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 12px 7px 32px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  width: 240,
                }}
              />
              <Search
                size={14}
                color="#94a3b8"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              />
            </form>

            {/* Filter by Referrer Type */}
            <select
              value={filterType}
              onChange={e => {
                setFilterType(e.target.value)
                setPagination(p => ({ ...p, page: 1 }))
              }}
              style={{
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                background: '#fff',
              }}
            >
              <option value="All">All Referrer Types</option>
              <option value="student">Verified LMS Students</option>
              <option value="alumni">Verified LMS Alumni</option>
              <option value="lead">Existing CRM Leads</option>
            </select>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value)
                setPagination(p => ({ ...p, page: 1 }))
              }}
              style={{
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                background: '#fff',
              }}
            >
              <option value="All">All Lead Statuses</option>
              <option value="QUALIFIED BUSINESS">Qualified (Paid &lt; ₹10k)</option>
              <option value="CONVERTED BUSINESS">Converted (Paid ≥ ₹10k)</option>
              <option value="ONBOARDED BUSINESS">Onboarded Business</option>
              <option value="LOST">Lost</option>
            </select>
          </div>

          <div style={{ fontSize: 12, color: '#64748b' }}>
            Showing {referrals.length} of {pagination.total} referrals
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Referred Candidate</th>
                <th style={{ padding: '12px 16px' }}>Referrer Source</th>
                <th style={{ padding: '12px 16px' }}>Enquired Program</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Lead Status</th>
                <th style={{ padding: '12px 16px' }}>Fee Collected</th>
                <th style={{ padding: '12px 16px' }}>Assigned Counselor</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    No referral records matching selected criteria.
                  </td>
                </tr>
              ) : (
                referrals.map(ref => {
                  const lead = ref.referredLeadId || {}
                  const status = lead.leadStatus || ref.leadStatus || 'NEW LEAD'
                  const paid = lead.paidAmount ?? ref.paidAmount ?? 0

                  return (
                    <tr
                      key={ref._id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      {/* Candidate */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {ref.referredCandidateName || lead.fullName || 'Candidate'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {ref.referredCandidatePhone || lead.phone || '-'}
                        </div>
                      </td>

                      {/* Referrer */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            onClick={() => {
                              if (ref.referralType === 'student' && !ref.isAlumni) {
                                handleOpenOngoingStudentTeacher(ref)
                              }
                            }}
                            style={{
                              fontWeight: 700,
                              color: ref.referralType === 'student' && !ref.isAlumni ? '#0284c7' : '#0f172a',
                              cursor: ref.referralType === 'student' && !ref.isAlumni ? 'pointer' : 'default',
                              textDecoration: ref.referralType === 'student' && !ref.isAlumni ? 'underline' : 'none',
                            }}
                            title={ref.referralType === 'student' && !ref.isAlumni ? 'Click to view assigned Class Teacher' : ''}
                          >
                            {ref.referrerName}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background:
                                ref.referralType === 'alumni'
                                  ? '#ecfdf5'
                                  : ref.referralType === 'student'
                                  ? '#eff6ff'
                                  : '#f5f3ff',
                              color:
                                ref.referralType === 'alumni'
                                  ? '#047857'
                                  : ref.referralType === 'student'
                                  ? '#1d4ed8'
                                  : '#6d28d9',
                            }}
                          >
                            {ref.referralType === 'alumni'
                              ? 'Verified Alumni'
                              : ref.referralType === 'student'
                              ? 'Verified Student'
                              : 'Lead'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {ref.referrerPhone}
                          {ref.referrerBatch ? ` • ${ref.referrerBatch}` : ''}
                        </div>
                      </td>

                      {/* Course */}
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {ref.referredCandidateCourse || lead.courseProgram || 'Healthcare Management'}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                        {new Date(ref.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background:
                              status === 'ONBOARDED BUSINESS'
                                ? '#dcfce7'
                                : status === 'CONVERTED BUSINESS'
                                ? '#dcfce7'
                                : status === 'QUALIFIED BUSINESS'
                                ? '#fef3c7'
                                : status === 'LOST'
                                ? '#fee2e2'
                                : '#f1f5f9',
                            color:
                              status === 'ONBOARDED BUSINESS'
                                ? '#15803d'
                                : status === 'CONVERTED BUSINESS'
                                ? '#166534'
                                : status === 'QUALIFIED BUSINESS'
                                ? '#92400e'
                                : status === 'LOST'
                                ? '#991b1b'
                                : '#475569',
                          }}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Paid Amount */}
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: paid >= 10000 ? '#059669' : '#0f172a' }}>
                        ₹{Number(paid || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Counselor */}
                      <td style={{ padding: '12px 16px', color: '#334155', fontSize: 12 }}>
                        {lead.assignedTo?.repName || ref.assignedCounselor?.repName || 'Unassigned'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (lead._id) {
                              onOpenLeadProfile?.(lead._id)
                            }
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#0284c7',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>Profile</span>
                          <ArrowUpRight size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: 12,
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page <= 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: 12,
                cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Ongoing Student Class Teacher Modal */}
      {selectedStudentTeacherModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedStudentTeacherModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  {selectedStudentTeacherModal.name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Ongoing Student Referrer • Class Teacher Details
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentTeacherModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>COURSE</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {selectedStudentTeacherModal.course || 'Not Assigned'}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>BATCH</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {selectedStudentTeacherModal.batch || 'Not Assigned'}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={14} />
                  <span>ASSIGNED CLASS TEACHER(S)</span>
                </div>
                {loadingTeacherDetails ? (
                  <div style={{ fontSize: 12, color: '#0369a1' }}>Fetching live class teacher details from LMS...</div>
                ) : selectedStudentTeacherModal.classTeachers && selectedStudentTeacherModal.classTeachers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedStudentTeacherModal.classTeachers.map((t, idx) => (
                      <div
                        key={t.id || idx}
                        style={{ background: '#fff', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0f2fe' }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{t.name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, fontSize: 11, color: '#475569' }}>
                          {t.phone && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Phone size={11} /> {t.phone}
                            </span>
                          )}
                          {t.email && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Mail size={11} /> {t.email}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedStudentTeacherModal.classTeacherName ? (
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {selectedStudentTeacherModal.classTeacherName}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    No class teacher assigned to this student&apos;s batch in LMS yet.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedStudentTeacherModal(null)}
                  className="btn-pulse-secondary"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

