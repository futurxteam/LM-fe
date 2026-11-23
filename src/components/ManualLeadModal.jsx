import React, { useState, useEffect, useRef } from 'react'
import { X, UserPlus, Sparkles, UserCheck, Layers, Share2, Search, CheckCircle2, GraduationCap, Award, User, AlertCircle } from 'lucide-react'
import { api } from '../api'
import {
  KERALA_DISTRICTS,
  QUALIFICATIONS,
  COURSE_PROGRAMS,
  HEALTHCARE_VARIANTS,
  CUSTOMER_CATEGORIES,
} from './StudentProfileModal'

export default function ManualLeadModal({
  isOpen,
  onClose,
  counselors = [],
  groups = [],
  currentUser,
  onSuccess,
  showNotify,
}) {
  if (!isOpen) return null

  const isAdmin = currentUser?.role === 'admin'
  const isManager = currentUser?.role === 'manager' || Boolean(currentUser?.isGroupManager)
  const isRegularSales = !isAdmin && !isManager

  const [saving, setSaving] = useState(false)

  // Reference Table Form Fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [qualification, setQualification] = useState('')
  const [age, setAge] = useState('')
  const [state, setState] = useState('')
  const [otherState, setOtherState] = useState('')
  const [district, setDistrict] = useState('')
  const [courseProgram, setCourseProgram] = useState('Healthcare Management')
  const [courseVariant, setCourseVariant] = useState('Advanced Diploma HM & HA')
  const [customerCategory, setCustomerCategory] = useState('Ongoing Student')

  // Assignment options:
  // - Sales rep: strictly self-assigned
  // - Manager: self or team member
  // - Admin: 'auto' (round-robin), 'pool', or specific counselor
  const defaultDestination = isRegularSales || isManager
    ? (currentUser?.id || currentUser?._id || '')
    : 'auto'
  const [assignDestination, setAssignDestination] = useState(defaultDestination)

  const teamCounselors = React.useMemo(() => {
    if (!isManager) return counselors
    if (currentUser?.groupId) {
      const filtered = counselors.filter(c => String(c.groupId || '') === String(currentUser.groupId))
      if (filtered.length > 0) return filtered
    }
    return counselors
  }, [counselors, currentUser, isManager])

  useEffect(() => {
    if (isRegularSales || isManager) {
      setAssignDestination(currentUser?.id || currentUser?._id || '')
    } else {
      setAssignDestination('auto')
    }
  }, [currentUser, isRegularSales, isManager])

  // Referral Attachment State
  const [hasReferral, setHasReferral] = useState(false)
  const [referrerType, setReferrerType] = useState('student') // 'lead' | 'student' | 'alumni'
  const [referrerSearch, setReferrerSearch] = useState('')
  const [referrerResults, setReferrerResults] = useState([])
  const [isSearchingReferrer, setIsSearchingReferrer] = useState(false)
  const [selectedReferrer, setSelectedReferrer] = useState(null)
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    if (!hasReferral || selectedReferrer) {
      setReferrerResults([])
      return
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    const query = referrerSearch.trim()
    if (!query) {
      setReferrerResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingReferrer(true)
      try {
        if (referrerType === 'lead') {
          const res = await api.getLeads({ search: query, limit: 10 })
          const leads = res.leads || []
          setReferrerResults(
            leads.map(l => ({
              leadId: l.id || l._id,
              name: l.fullName || l.name,
              phone: l.phone,
              course: l.courseProgram || '',
              batch: '',
              isAlumni: false,
              isVerifiedLms: false,
              type: 'lead',
              status: l.leadStatus || l.status,
            }))
          )
        } else {
          // 'student' or 'alumni' -> Queries fa-backend LMS HTTP API directly
          const res = await api.searchLmsStudents({ query, type: referrerType, limit: 10 })
          const students = res.data || []
          setReferrerResults(
            students.map(s => ({
              id: s.id,
              lmsUserId: s.lmsUserId,
              name: s.name,
              phone: s.phone,
              course: s.course || s.courseName || '',
              batch: s.batch || s.batchName || '',
              rollNo: s.rollNo || '',
              isAlumni: s.isAlumni,
              isVerifiedLms: true,
              type: referrerType,
              status: s.status,
            }))
          )
        }
      } catch (err) {
        console.error('Error searching referrers:', err)
        setReferrerResults([])
      } finally {
        setIsSearchingReferrer(false)
      }
    }, 350)

    return () => clearTimeout(searchTimeoutRef.current)
  }, [referrerSearch, referrerType, hasReferral, selectedReferrer])

  const handleProgramChange = newProg => {
    setCourseProgram(newProg)
    if (newProg !== 'Healthcare Management') {
      setCourseVariant('')
    } else {
      setCourseVariant('Advanced Diploma HM & HA')
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (!fullName.trim()) {
      showNotify?.('error', 'Student name is required')
      return
    }

    if (hasReferral && !selectedReferrer) {
      showNotify?.('error', 'Please search and select a referrer, or untick Referral Attachment.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        qualification,
        age: age ? Number(age) : null,
        state,
        otherState: state === 'Other' ? otherState.trim() : '',
        district: state === 'Kerala' ? district : state === 'Other' ? district.trim() : '',
        courseProgram,
        courseVariant: courseProgram === 'Healthcare Management' ? courseVariant : '',
        customerCategory,
        author: currentUser?.name || 'Staff',
      }

      if (hasReferral && selectedReferrer) {
        payload.referralData = {
          hasReferral: true,
          referralType: referrerType,
          referrerType: referrerType,
          referrerLeadId: selectedReferrer.leadId || null,
          referrerStudentId: selectedReferrer.id || null,
          lmsUserId: selectedReferrer.lmsUserId || '',
          referrerName: selectedReferrer.name,
          referrerPhone: selectedReferrer.phone,
          referrerCourse: selectedReferrer.course || '',
          referrerBatch: selectedReferrer.batch || '',
          referrerRollNo: selectedReferrer.rollNo || '',
          isVerifiedLms: Boolean(selectedReferrer.isVerifiedLms),
        }
      }

      if (isRegularSales) {
        // Sales reps strictly create their own leads
        payload.assignMode = 'direct'
        payload.assignedTo = {
          repId: currentUser?.id || currentUser?._id,
          repName: currentUser?.name || 'Admissions Counselor',
          repRole: currentUser?.title || 'Admissions Counselor',
        }
      } else if (isManager) {
        // Manager can assign to themselves or a member of their team
        payload.assignMode = 'direct'
        if (assignDestination && assignDestination !== (currentUser?.id || currentUser?._id)) {
          const counselor = teamCounselors.find(c => String(c.id || c._id) === String(assignDestination))
          if (counselor) {
            payload.assignedTo = {
              repId: counselor.id || counselor._id,
              repName: counselor.name,
              repRole: counselor.title || 'Admissions Counselor',
            }
          } else {
            payload.assignedTo = {
              repId: currentUser?.id || currentUser?._id,
              repName: currentUser?.name,
              repRole: currentUser?.title || 'Team Manager',
            }
          }
        } else {
          payload.assignedTo = {
            repId: currentUser?.id || currentUser?._id,
            repName: currentUser?.name,
            repRole: currentUser?.title || 'Team Manager',
          }
        }
      } else if (assignDestination === 'pool') {
        payload.assignMode = 'pool'
      } else if (assignDestination === 'auto') {
        payload.assignMode = 'auto' // Triggers capacity-aware round robin!
      } else {
        const counselor = counselors.find(c => String(c.id || c._id) === String(assignDestination))
        if (counselor) {
          payload.assignedTo = {
            repId: counselor.id || counselor._id,
            repName: counselor.name,
            repRole: counselor.title || 'Admissions Counselor',
          }
        }
      }

      const res = await api.createLead(payload)
      showNotify?.('success', res.message || `Student lead for "${fullName}" created successfully!`)
      onSuccess?.(res.lead)
      onClose()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to create student lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-card" style={{ maxWidth: 680, width: '95%', maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="modal-header" style={{ background: '#0f172a', color: '#fff', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>+ Add Student Lead (Manual Typing)</h3>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>
                Capture student inquiry details matching Futureace Academy standard schema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '18px 20px' }}>
            {/* Field: Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                FULL NAME * <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>(Required)</span>
              </label>
              <input
                type="text"
                placeholder="Candidate student full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* Field: Phone & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  PHONE NUMBER
                </label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            {/* Field: Qualification & Age */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  QUALIFICATION
                </label>
                <select
                  value={qualification}
                  onChange={e => setQualification(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="">-- Select Qualification --</option>
                  {QUALIFICATIONS.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  AGE (NUMERIC)
                </label>
                <input
                  type="number"
                  placeholder="Age in years"
                  min="14"
                  max="70"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            {/* Field: State & District */}
            <div style={{ display: 'grid', gridTemplateColumns: state === 'Other' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  STATE
                </label>
                <select
                  value={state}
                  onChange={e => {
                    const nextState = e.target.value
                    setState(nextState)
                    if (!nextState) {
                      setDistrict('')
                      setOtherState('')
                    } else if (nextState !== 'Kerala' && KERALA_DISTRICTS.includes(district)) {
                      setDistrict('')
                    }
                  }}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="">-- Select State --</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {state === 'Other' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    STATE NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Enter state name"
                    value={otherState}
                    onChange={e => setOtherState(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  DISTRICT {state === 'Kerala' ? '(14 Kerala Districts)' : ''}
                </label>
                {state === 'Kerala' ? (
                  <select
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="">-- Select District --</option>
                    {KERALA_DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder={state === 'Other' ? 'District / City name' : 'Select a State first'}
                    disabled={!state}
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: !state ? '#f8fafc' : '#fff' }}
                  />
                )}
              </div>
            </div>

            {/* Field: Inquired Course Program & Conditional Course Variant */}
            <div style={{ display: 'grid', gridTemplateColumns: courseProgram === 'Healthcare Management' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  INQUIRED COURSE PROGRAM
                </label>
                <select
                  value={courseProgram}
                  onChange={e => handleProgramChange(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  {COURSE_PROGRAMS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Conditional Course Variant: Only shown for Healthcare Management */}
              {courseProgram === 'Healthcare Management' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>
                    COURSE VARIANT (CONDITIONAL)
                  </label>
                  <select
                    value={courseVariant}
                    onChange={e => setCourseVariant(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #38bdf8', background: '#f0f9ff' }}
                  >
                    {HEALTHCARE_VARIANTS.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Field: Customer Category */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                CUSTOMER CATEGORY
              </label>
              <select
                value={customerCategory}
                onChange={e => setCustomerCategory(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
              >
                {CUSTOMER_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Referral Attachment Section */}
            <div
              style={{
                marginBottom: 16,
                padding: '14px',
                borderRadius: 8,
                background: hasReferral ? '#f8fafc' : '#ffffff',
                border: hasReferral ? '1.5px solid #0284c7' : '1px dashed #cbd5e1',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hasReferral}
                    onChange={e => {
                      setHasReferral(e.target.checked)
                      if (!e.target.checked) {
                        setSelectedReferrer(null)
                        setReferrerSearch('')
                        setReferrerResults([])
                      }
                    }}
                    style={{ width: 16, height: 16, accentColor: '#0284c7', cursor: 'pointer' }}
                  />
                  <Share2 size={16} color={hasReferral ? '#0284c7' : '#64748b'} />
                  <span>Attach Referral Source (Referred by Student, Alumni, or Lead)</span>
                </label>
                {hasReferral && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: '#e0f2fe',
                      color: '#0369a1',
                    }}
                  >
                    Referral Enabled
                  </span>
                )}
              </div>

              {hasReferral && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  {/* Referrer Type Selector (3 options as requested) */}
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      REFERRER CLASSIFICATION
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setReferrerType('student')
                          setSelectedReferrer(null)
                          setReferrerSearch('')
                        }}
                        style={{
                          padding: '8px 6px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          border: referrerType === 'student' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          background: referrerType === 'student' ? '#eff6ff' : '#fff',
                          color: referrerType === 'student' ? '#1d4ed8' : '#475569',
                        }}
                      >
                        <GraduationCap size={14} />
                        <span>Verified Student</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReferrerType('alumni')
                          setSelectedReferrer(null)
                          setReferrerSearch('')
                        }}
                        style={{
                          padding: '8px 6px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          border: referrerType === 'alumni' ? '1.5px solid #059669' : '1px solid #cbd5e1',
                          background: referrerType === 'alumni' ? '#ecfdf5' : '#fff',
                          color: referrerType === 'alumni' ? '#047857' : '#475569',
                        }}
                      >
                        <Award size={14} />
                        <span>Verified Alumni</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReferrerType('lead')
                          setSelectedReferrer(null)
                          setReferrerSearch('')
                        }}
                        style={{
                          padding: '8px 6px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          border: referrerType === 'lead' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                          background: referrerType === 'lead' ? '#f5f3ff' : '#fff',
                          color: referrerType === 'lead' ? '#6d28d9' : '#475569',
                        }}
                      >
                        <User size={14} />
                        <span>Existing Lead</span>
                      </button>
                    </div>
                  </div>

                  {/* Selected Referrer Card Preview */}
                  {selectedReferrer ? (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: '#fff',
                        border: '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background:
                              selectedReferrer.type === 'alumni'
                                ? '#dcfce7'
                                : selectedReferrer.type === 'student'
                                ? '#dbeafe'
                                : '#f3e8ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color:
                              selectedReferrer.type === 'alumni'
                                ? '#15803d'
                                : selectedReferrer.type === 'student'
                                ? '#1d4ed8'
                                : '#7e22ce',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {selectedReferrer.name}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background:
                                  selectedReferrer.type === 'alumni'
                                    ? '#ecfdf5'
                                    : selectedReferrer.type === 'student'
                                    ? '#eff6ff'
                                    : '#f5f3ff',
                                color:
                                  selectedReferrer.type === 'alumni'
                                    ? '#047857'
                                    : selectedReferrer.type === 'student'
                                    ? '#1d4ed8'
                                    : '#6d28d9',
                              }}
                            >
                              {selectedReferrer.type === 'alumni'
                                ? 'Verified LMS Alumni (Graduated)'
                                : selectedReferrer.type === 'student'
                                ? 'Verified LMS Student'
                                : 'Existing Lead'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {selectedReferrer.phone}
                            {selectedReferrer.course ? ` • ${selectedReferrer.course}` : ''}
                            {selectedReferrer.batch ? ` (${selectedReferrer.batch})` : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReferrer(null)
                          setReferrerSearch('')
                        }}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    /* Search input with live dropdown */
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          placeholder={
                            referrerType === 'alumni'
                              ? 'Search graduated alumni by name, phone, or batch...'
                              : referrerType === 'student'
                              ? 'Search LMS active student by name, phone, or roll no...'
                              : 'Search CRM leads by name or phone...'
                          }
                          value={referrerSearch}
                          onChange={e => setReferrerSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px 8px 34px',
                            fontSize: 12,
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                          }}
                        />
                        <Search
                          size={15}
                          color="#94a3b8"
                          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                        />
                        {isSearchingReferrer && (
                          <span
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: 10,
                              color: '#0284c7',
                              fontWeight: 600,
                            }}
                          >
                            Searching LMS API...
                          </span>
                        )}
                      </div>

                      {/* Dropdown Results */}
                      {referrerResults.length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: 4,
                            background: '#fff',
                            borderRadius: 8,
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                            border: '1px solid #cbd5e1',
                            maxHeight: 220,
                            overflowY: 'auto',
                            zIndex: 20,
                          }}
                        >
                          {referrerResults.map((item, idx) => (
                            <div
                              key={item.id || item.leadId || idx}
                              onClick={() => {
                                setSelectedReferrer(item)
                                setReferrerResults([])
                              }}
                              style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                                  {item.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background:
                                      item.type === 'alumni'
                                        ? '#dcfce7'
                                        : item.type === 'student'
                                        ? '#dbeafe'
                                        : '#f3e8ff',
                                    color:
                                      item.type === 'alumni'
                                        ? '#15803d'
                                        : item.type === 'student'
                                        ? '#1d4ed8'
                                        : '#6d28d9',
                                  }}
                                >
                                  {item.type === 'alumni'
                                    ? 'Verified Alumni'
                                    : item.type === 'student'
                                    ? 'Verified Student'
                                    : 'Lead'}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                {item.phone}
                                {item.course ? ` • ${item.course}` : ''}
                                {item.batch ? ` (${item.batch})` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {referrerSearch.trim() && !isSearchingReferrer && referrerResults.length === 0 && (
                        <div
                          style={{
                            marginTop: 4,
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderRadius: 6,
                            fontSize: 11,
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <AlertCircle size={14} color="#94a3b8" />
                          <span>No {referrerType} matching &quot;{referrerSearch}&quot; found via LMS API.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Field: Lead Routing / Destination */}
            {isRegularSales ? (
              <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: 8, border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserCheck size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                    Assigned To: You ({currentUser?.name || 'Sales Advisor'})
                  </div>
                  <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                    This lead will be directly added to your personal admissions outreach queue.
                  </div>
                </div>
              </div>
            ) : isManager ? (
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  TEAM LEAD ALLOCATION (MANAGER)
                </label>
                <select
                  value={assignDestination}
                  onChange={e => setAssignDestination(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value={currentUser?.id || currentUser?._id || ''}>
                    Assign to Me ({currentUser?.name || 'Manager'})
                  </option>
                  {teamCounselors.filter(c => String(c.id || c._id) !== String(currentUser?.id || currentUser?._id)).length > 0 && (
                    <optgroup label="Assign to Team Member">
                      {teamCounselors
                        .filter(c => String(c.id || c._id) !== String(currentUser?.id || currentUser?._id))
                        .map(c => (
                          <option key={c.id || c._id} value={c.id || c._id}>
                            {c.name} ({c.title || 'Admissions Counselor'})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  As Manager, you can assign this lead to yourself or any counselor in your team.
                </div>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  LEAD ALLOCATION DESTINATION
                </label>
                <select
                  value={assignDestination}
                  onChange={e => setAssignDestination(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="auto">
                    (Recommended) Auto Round-Robin to Counselor Queue (Capacity-Aware)
                  </option>
                  <optgroup label="Direct Counselor Queue (100% Routing)">
                    {counselors.map(c => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name} ({c.title || 'Admissions Counselor'})
                      </option>
                    ))}
                  </optgroup>
                  <option value="pool">
                    System Pool (Unassigned) - Requires manual allocation later
                  </option>
                </select>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Default: Assigns directly to the admissions counselor with the lowest active backlog.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn-pulse-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-pulse"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                fontWeight: 700,
                fontSize: 13,
                padding: '9px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={14} />
              <span>{saving ? 'Creating Lead...' : 'Create Student Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

