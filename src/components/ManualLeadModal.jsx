import React, { useState } from 'react'
import { X, UserPlus, Sparkles, UserCheck, Layers } from 'lucide-react'
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
  // 'auto' = Capacity-Aware Round Robin directly to Counselor Queue (default as requested!)
  // 'pool' = Manual placement in System Pool (Unassigned)
  // 'repId' = Direct 100% assignment to specific counselor
  const [assignDestination, setAssignDestination] = useState('auto')

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

      if (assignDestination === 'pool') {
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

            {/* Field: Lead Routing / Destination */}
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

