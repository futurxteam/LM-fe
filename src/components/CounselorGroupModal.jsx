import React, { useState, useEffect } from 'react'
import { X, Users, Save, Shield } from 'lucide-react'
import { api } from '../api'

export default function CounselorGroupModal({
  isOpen,
  onClose,
  group = null,
  counselors = [],
  onSuccess,
  showNotify,
}) {
  if (!isOpen) return null

  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [managerId, setManagerId] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState([])
  const [active, setActive] = useState(true)

  useEffect(() => {
    if (group) {
      setName(group.name || '')
      setDescription(group.description || '')
      setManagerId(group.manager?._id || group.manager?.id || group.managerId || '')
      const memberIds = (group.members || []).map(m => m._id || m.id || m)
      setSelectedMemberIds(memberIds)
      setActive(group.active !== false)
    } else {
      setName('')
      setDescription('')
      setManagerId('')
      setSelectedMemberIds([])
      setActive(true)
    }
  }, [group])

  const toggleMember = id => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!name.trim()) {
      showNotify?.('error', 'Group name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        managerId: managerId || null,
        memberIds: selectedMemberIds,
        active,
      }

      let res
      if (group && (group.id || group._id)) {
        res = await api.updateGroup(group.id || group._id, payload)
        showNotify?.('success', res.message || `Updated group "${name}"`)
      } else {
        res = await api.createGroup(payload)
        showNotify?.('success', res.message || `Created group "${name}"`)
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to save counselor group')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-card" style={{ maxWidth: 560, width: '95%' }}>
        <div className="modal-header" style={{ background: '#0f172a', color: '#fff', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {group ? 'Edit Counselor Group' : '+ Create Counselor Group'}
              </h3>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>
                Organize Admissions Counselors into teams with designated Team Managers
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

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '18px 20px' }}>
            {/* Group Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                GROUP NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. Healthcare Admissions Alpha, Kerala Regional Team"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                DESCRIPTION
              </label>
              <input
                type="text"
                placeholder="Brief purpose / region / specialization"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* Group Manager */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                DESIGNATED GROUP MANAGER (COUNSELOR MANAGER)
              </label>
              <select
                value={managerId}
                onChange={e => {
                  const val = e.target.value
                  setManagerId(val)
                  if (val && !selectedMemberIds.includes(val)) {
                    setSelectedMemberIds(prev => [...prev, val])
                  }
                }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="">No Manager Selected</option>
                {counselors.map(c => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name} ({c.title || 'Admissions Counselor'})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                The Group Manager can oversee their team's pipeline and assigned leads.
              </div>
            </div>

            {/* Member Counselors Multi-select */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                SELECT MEMBER COUNSELORS ({selectedMemberIds.length} selected)
              </label>
              <div
                style={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '8px 10px',
                  background: '#f8fafc',
                }}
              >
                {counselors.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', padding: 8 }}>No active counselors found.</div>
                ) : (
                  counselors.map(c => {
                    const id = c.id || c._id
                    const isSelected = selectedMemberIds.includes(id)
                    const isManager = String(managerId) === String(id)
                    return (
                      <div
                        key={id}
                        onClick={() => toggleMember(id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 4,
                          background: isSelected ? '#eff6ff' : 'transparent',
                          cursor: 'pointer',
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: '#0f172a' }}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>({c.email})</span>
                        </div>
                        {isManager && (
                          <span style={{ fontSize: 10, background: '#ede9fe', color: '#6d28d9', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                            Manager
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

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
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                fontWeight: 700,
                fontSize: 13,
                padding: '9px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : group ? 'Update Group' : 'Create Group'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
