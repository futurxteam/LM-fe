import React, { useState, useEffect } from 'react'
import {
  X,
  User,
  Phone,
  Mail,
  GraduationCap,
  MapPin,
  Clock,
  Briefcase,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  RotateCcw,
  UserCheck,
  Layers,
  Sparkles,
} from 'lucide-react'
import { api } from '../api'
import { formatArrivalTime } from '../utils/alertUtils'

export const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
]

export const QUALIFICATIONS = [
  'SSLC',
  'Plus Two',
  'Degree',
  'Masters',
  'Diploma',
  'ITI',
]

export const COURSE_PROGRAMS = [
  'Healthcare Management',
  'GDA',
  'Geriatric Caregiver',
]

export const HEALTHCARE_VARIANTS = [
  'Advanced Diploma HM & HA',
  'PG Diploma in HM & AI',
  'PG Diploma in SHM & AI',
]

export const CUSTOMER_CATEGORIES = [
  'Ongoing Student',
  'Fresh Pass out',
  'Ongoing Working Professional',
  'Career Gap / Unemployed Job Seeker',
  'Housewife/House Maker',
  'Existing Healthcare Professionals',
]

export default function StudentProfileModal({
  lead,
  counselors = [],
  currentUser,
  onClose,
  onUpdated,
  showNotify,
}) {
  if (!lead) return null

  // User requirement: Profile edit section starts OPEN, and collapses after first save
  const [isEditing, setIsEditing] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form states initialized with lead data
  const [fullName, setFullName] = useState(lead.fullName || '')
  const [phone, setPhone] = useState(lead.phone || '')
  const [email, setEmail] = useState(lead.email || '')
  const [qualification, setQualification] = useState(lead.qualification || '')
  const [age, setAge] = useState(lead.age || '')
  const [state, setState] = useState(lead.state || '')
  const [otherState, setOtherState] = useState(lead.otherState || '')
  const [district, setDistrict] = useState(lead.district || '')
  const [courseProgram, setCourseProgram] = useState(lead.courseProgram || 'Healthcare Management')
  const [courseVariant, setCourseVariant] = useState(lead.courseVariant || '')
  const [customerCategory, setCustomerCategory] = useState(lead.customerCategory || 'Ongoing Student')
  const [status, setStatus] = useState(lead.status || 'Not Contacted')
  const [subStatus, setSubStatus] = useState(lead.subStatus || 'Assigned to Counselor')
  const [assignedRepId, setAssignedRepId] = useState(lead.assignedTo?.repId || '')
  const [droppedReason, setDroppedReason] = useState(lead.droppedReason || '')

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      setIsEditing(true) // Starts open as requested
      setFullName(lead.fullName || '')
      setPhone(lead.phone || '')
      setEmail(lead.email || '')
      setQualification(lead.qualification || '')
      setAge(lead.age || '')
      setState(lead.state || '')
      setOtherState(lead.otherState || '')
      setDistrict(lead.district || '')
      setCourseProgram(lead.courseProgram || 'Healthcare Management')
      setCourseVariant(lead.courseVariant || '')
      setCustomerCategory(lead.customerCategory || 'Ongoing Student')
      setStatus(lead.status || 'Not Contacted')
      setSubStatus(lead.subStatus || 'Assigned to Counselor')
      setAssignedRepId(lead.assignedTo?.repId || '')
      setDroppedReason(lead.droppedReason || '')
    }
  }, [lead])

  // Handle program change to clear variant if not Healthcare Management
  const handleProgramChange = newProg => {
    setCourseProgram(newProg)
    if (newProg !== 'Healthcare Management') {
      setCourseVariant('')
    }
  }

  // Handle save profile
  const handleSaveProfile = async e => {
    if (e && e.preventDefault) e.preventDefault()
    if (!fullName.trim()) {
      showNotify?.('error', 'Full name is required')
      return
    }

    setSaving(true)
    try {
      const selectedCounselor = counselors.find(c => String(c.id || c._id) === String(assignedRepId))

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
        status,
        subStatus,
        droppedReason: droppedReason.trim(),
        author: currentUser?.name || 'Staff',
      }

      // Assignment handling
      if (assignedRepId === 'unassigned') {
        payload.assignmentStatus = 'UNASSIGNED'
      } else if (selectedCounselor) {
        payload.assignmentStatus = 'ASSIGNED'
        payload.assignedTo = {
          repId: selectedCounselor.id || selectedCounselor._id,
          repName: selectedCounselor.name,
          repRole: selectedCounselor.title || 'Admissions Counselor',
        }
      }

      const res = await api.updateLeadProfile(lead.id, payload)
      showNotify?.('success', res.message || 'Student profile updated!')

      // User requirement: after first save, close/collapse the edit profile section
      setIsEditing(false)
      onUpdated?.(res.lead)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // Quick Action: Mark Completed (Transferred as Student - frees pool capacity!)
  const handleMarkCompleted = async () => {
    setSaving(true)
    try {
      const res = await api.updateLeadProfile(lead.id, {
        isCompleted: true,
        isDropped: false,
        status: 'Contacted',
        subStatus: 'Student Enrolled (Completed)',
        author: currentUser?.name || 'Counselor',
      })
      showNotify?.('success', `${lead.fullName} marked as Completed & Transferred as Student! Pool space freed.`)
      setIsEditing(false)
      onUpdated?.(res.lead)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to mark completed')
    } finally {
      setSaving(false)
    }
  }

  // Quick Action: Mark Dropped (Lead Lost / Not interested - frees pool capacity!)
  const handleMarkDropped = async () => {
    const reason = prompt('Please enter reason for dropping lead (optional):', 'Not interested / unreachable')
    if (reason === null) return // cancelled

    setSaving(true)
    try {
      const res = await api.updateLeadProfile(lead.id, {
        isDropped: true,
        isCompleted: false,
        droppedReason: reason || 'Lead Lost / Dropped',
        status: 'Contacted',
        subStatus: 'Dropped (Lead Lost)',
        author: currentUser?.name || 'Counselor',
      })
      showNotify?.('success', `${lead.fullName} marked as Dropped. Pool space freed.`)
      setIsEditing(false)
      onUpdated?.(res.lead)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to drop lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-card" style={{ maxWidth: 760, width: '95%', maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="modal-header" style={{ background: '#0f172a', color: '#fff', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {fullName ? fullName.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{fullName}</h3>
                {lead.isCompleted && (
                  <span style={{ fontSize: 11, background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} /> Transferred as Student
                  </span>
                )}
                {lead.isDropped && (
                  <span style={{ fontSize: 11, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <XCircle size={12} /> Dropped (Lead Lost)
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                ID: {lead.metaLeadId || lead.id} • {lead.formName || lead.campaignName || 'Meta Ads'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-pulse-secondary"
              style={{
                fontSize: 12,
                padding: '4px 10px',
                background: isEditing ? '#eff6ff' : 'rgba(255,255,255,0.1)',
                color: isEditing ? '#1d4ed8' : '#fff',
                borderColor: 'rgba(255,255,255,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Edit2 size={13} />
              <span>{isEditing ? 'Hide Edit Form' : 'Edit Profile'}</span>
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
              title="Close Modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Action Lifecycle Bar */}
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <span>Assigned Counselor: </span>
              <strong style={{ color: '#0369a1' }}>
                {lead.assignedTo?.repName || 'Unassigned (In Pool)'}
              </strong>
            </div>
            {lead.initialAdvisor?.repName && (
              <div style={{ paddingLeft: 10, borderLeft: '1px solid #cbd5e1' }}>
                <span>Initial Advisor: </span>
                <strong style={{ color: '#334155' }}>
                  {lead.initialAdvisor.repName}
                </strong>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!lead.isCompleted && (
              <button
                type="button"
                onClick={handleMarkCompleted}
                disabled={saving}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '5px 11px',
                  borderRadius: 6,
                  border: '1px solid #86efac',
                  background: '#dcfce7',
                  color: '#15803d',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
                title="Mark this lead as officially transferred and enrolled as a student. This frees up counselor pool space!"
              >
                <CheckCircle size={13} />
                <span>Mark Completed (Student Enrolled)</span>
              </button>
            )}
            {!lead.isDropped && (
              <button
                type="button"
                onClick={handleMarkDropped}
                disabled={saving}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '5px 11px',
                  borderRadius: 6,
                  border: '1px solid #fca5a5',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
                title="Mark this lead as lost/dropped. This frees up counselor pool space!"
              >
                <XCircle size={13} />
                <span>Mark Dropped (Lead Lost)</span>
              </button>
            )}
          </div>
        </div>

        <div className="modal-body" style={{ padding: '18px 20px' }}>
          {/* ========================================================
              SECTION 1: EDIT PROFILE SECTION (OPEN INITIALLY)
              ======================================================== */}
          {isEditing && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '16px 18px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0f172a', fontWeight: 700, fontSize: 14 }}>
                  <Edit2 size={15} color="#0284c7" />
                  <span>Student Profile Details (Editable)</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Autocloses into student list view after first save
                </span>
              </div>

              <form onSubmit={handleSaveProfile}>
                {/* Row 1: Name, Phone, Email */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      FULL NAME *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      PHONE NUMBER
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      EMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                {/* Row 2: Qualification & Age */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      QUALIFICATION
                    </label>
                    <select
                      value={qualification}
                      onChange={e => setQualification(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                    >
                      <option value="">-- Select Qualification --</option>
                      {qualification && !QUALIFICATIONS.includes(qualification) && (
                        <option value={qualification}>{qualification}</option>
                      )}
                      {QUALIFICATIONS.map(q => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      AGE (IN YEARS)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="75"
                      placeholder="e.g. 24"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                {/* Row 3: State & District */}
                <div style={{ display: 'grid', gridTemplateColumns: state === 'Other' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      STATE
                    </label>
                    <select
                      value={state}
                      onChange={e => {
                        const nextState = e.target.value
                        setState(nextState)
                        if (nextState !== 'Kerala' && KERALA_DISTRICTS.includes(district)) {
                          setDistrict('')
                        }
                        if (!nextState) {
                          setDistrict('')
                          setOtherState('')
                        }
                      }}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                    >
                      <option value="">-- Select State --</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {state === 'Other' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        OTHER STATE NAME
                      </label>
                      <input
                        type="text"
                        placeholder="Enter state name"
                        value={otherState}
                        onChange={e => setOtherState(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
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
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                      >
                        <option value="">-- Select District --</option>
                        {KERALA_DISTRICTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={state === 'Other' ? 'Enter District / City' : 'Select a State first'}
                        disabled={!state}
                        value={district}
                        onChange={e => setDistrict(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: !state ? '#f8fafc' : '#fff' }}
                      />
                    )}
                  </div>
                </div>

                {/* Row 4: Inquired Course Program & Conditional Course Variant */}
                <div style={{ display: 'grid', gridTemplateColumns: courseProgram === 'Healthcare Management' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      INQUIRED COURSE PROGRAM
                    </label>
                    <select
                      value={courseProgram}
                      onChange={e => handleProgramChange(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                    >
                      {COURSE_PROGRAMS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Course Variant: ONLY shown for Healthcare Management */}
                  {courseProgram === 'Healthcare Management' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>
                        COURSE VARIANT (HEALTHCARE MANAGEMENT)
                      </label>
                      <select
                        value={courseVariant}
                        onChange={e => setCourseVariant(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #38bdf8', background: '#f0f9ff' }}
                      >
                        <option value="">Select Course Variant...</option>
                        {HEALTHCARE_VARIANTS.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Row 5: Customer Category */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    CUSTOMER CATEGORY
                  </label>
                  <select
                    value={customerCategory}
                    onChange={e => setCustomerCategory(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    {CUSTOMER_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Row 6: Reassign Counselor & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      ASSIGNED COUNSELOR / POOL
                    </label>
                    <select
                      value={assignedRepId || 'unassigned'}
                      onChange={e => setAssignedRepId(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                    >
                      <option value="unassigned">System Pool (Unassigned)</option>
                      {counselors.map(c => (
                        <option key={c.id || c._id} value={c.id || c._id}>
                          {c.name} ({c.title || 'Counselor'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      CONTACT STATUS
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                    >
                      <option value="Not Contacted">Not Contacted</option>
                      <option value="Contacted">Contacted</option>
                    </select>
                  </div>
                </div>

                {/* Save button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn-pulse-secondary"
                    style={{ fontSize: 12, padding: '7px 14px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-pulse"
                    style={{
                      fontSize: 12,
                      padding: '7px 18px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                    }}
                  >
                    <Save size={14} />
                    <span>{saving ? 'Saving...' : 'Save Student Profile'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              SECTION 2: SUMMARY VIEW OF STUDENT PROFILE
              ======================================================== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>CONTACT & PHONE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{phone || 'N/A'}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{email || 'No email provided'}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>QUALIFICATION & AGE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {qualification} {age ? `(${age} yrs)` : ''}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} color="#64748b" />
                <span>{district || 'Not Specified'}{state ? `, ${state === 'Other' ? otherState : state}` : ''}</span>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>INQUIRED PROGRAM</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#14532d' }}>
                {courseProgram}
              </div>
              {courseVariant && (
                <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                  Variant: {courseVariant}
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>CUSTOMER CATEGORY</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {customerCategory}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Arrival: {formatArrivalTime(lead.createdTime || lead.createdAt)}
              </div>
            </div>
          </div>

          {/* Audit Trail & Notes */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              ACTIVITY & COUNSELING AUDIT TRAIL ({lead.notes?.length || 0})
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, background: '#fff' }}>
              {lead.notes && lead.notes.length > 0 ? (
                lead.notes.map((note, i) => (
                  <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 11, marginBottom: 2 }}>
                      <strong>{note.author}</strong>
                      <span>{new Date(note.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={{ color: '#1e293b' }}>{note.text}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 10 }}>No activity recorded yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Status: <strong>{lead.status}</strong> • Sub-status: <strong>{lead.subStatus}</strong>
          </div>
          <button className="btn-pulse-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

