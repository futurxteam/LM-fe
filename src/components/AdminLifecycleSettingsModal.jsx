import React, { useState, useEffect } from 'react'
import { X, Settings, Plus, Trash2, Save, RotateCcw, GraduationCap, Shield } from 'lucide-react'
import { api } from '../api'

export default function AdminLifecycleSettingsModal({ isOpen, onClose, onSaved, showNotify }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('policy') // 'policy' | 'programs' | 'categories'

  // Policy fields
  const [maxLostCycles, setMaxLostCycles] = useState(3)
  const [lostRecycleMode, setLostRecycleMode] = useState('manual')
  const [requireBusinessFields, setRequireBusinessFields] = useState(true)
  const [allowAdminBusinessFieldException, setAllowAdminBusinessFieldException] = useState(true)
  const [allowSalesFinancialEdit, setAllowSalesFinancialEdit] = useState(true)
  const [lostReasonsText, setLostReasonsText] = useState('')
  const [outcomeCategories, setOutcomeCategories] = useState([])

  // Program Master
  const [programs, setPrograms] = useState([])
  const [newProgName, setNewProgName] = useState('')
  const [newProgCode, setNewProgCode] = useState('')
  const [newProgVariants, setNewProgVariants] = useState('')
  const [newProgFee, setNewProgFee] = useState('')

  // New Category
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatStatus, setNewCatStatus] = useState('HOT')
  const [newCatGroup, setNewCatGroup] = useState('Positive Interest')

  useEffect(() => {
    if (isOpen) loadSettings()
  }, [isOpen])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await api.getCrmSettings()
      const s = res.settings || {}
      setMaxLostCycles(s.maxLostCycles || 3)
      setLostRecycleMode(s.lostRecycleMode || 'manual')
      setRequireBusinessFields(s.requireBusinessFields !== false)
      setAllowAdminBusinessFieldException(s.allowAdminBusinessFieldException !== false)
      setAllowSalesFinancialEdit(s.allowSalesFinancialEdit !== false)
      setLostReasonsText((s.lostReasons || []).join('\n'))
      setOutcomeCategories(s.outcomeCategories || [])
      setPrograms(res.programs || [])
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to load CRM settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePolicy = async () => {
    setSaving(true)
    try {
      const lostReasons = lostReasonsText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)

      await api.updateCrmSettings({
        maxLostCycles: Number(maxLostCycles),
        lostRecycleMode,
        requireBusinessFields,
        allowAdminBusinessFieldException,
        allowSalesFinancialEdit,
        lostReasons,
        outcomeCategories,
      })
      showNotify?.('success', 'CRM Lifecycle & Recycle Policy saved!')
      onSaved?.()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  const handleAddProgram = async e => {
    e.preventDefault()
    if (!newProgName.trim()) return
    setSaving(true)
    try {
      await api.createCourseProgram({
        name: newProgName.trim(),
        code: newProgCode.trim(),
        variants: newProgVariants,
        defaultFee: Number(newProgFee) || 0,
      })
      setNewProgName('')
      setNewProgCode('')
      setNewProgVariants('')
      setNewProgFee('')
      showNotify?.('success', 'Course program added to master!')
      await loadSettings()
      onSaved?.()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to add program')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleProgramActive = async prog => {
    try {
      await api.updateCourseProgram(prog._id, { active: !prog.active })
      await loadSettings()
      onSaved?.()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to update program')
    }
  }

  const handleDeleteProgram = async prog => {
    if (!window.confirm(`Delete "${prog.name}" from Course Program Master?`)) return
    try {
      await api.deleteCourseProgram(prog._id)
      await loadSettings()
      onSaved?.()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to delete program')
    }
  }

  const handleAddCategory = e => {
    e.preventDefault()
    if (!newCatLabel.trim()) return
    const key = newCatLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
    if (outcomeCategories.some(c => c.key === key)) {
      showNotify?.('error', 'A category with a similar name already exists.')
      return
    }
    const heatTier = ['HOT', 'QUALIFIED BUSINESS', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS'].includes(newCatStatus)
      ? 'HOT'
      : newCatStatus === 'WARM'
      ? 'WARM'
      : 'COLD'
    setOutcomeCategories(prev => [
      ...prev,
      {
        key,
        label: newCatLabel.trim(),
        leadStatus: newCatStatus,
        heatTier,
        group: newCatGroup,
        active: true,
      },
    ])
    setNewCatLabel('')
  }

  const handleToggleCategory = key => {
    setOutcomeCategories(prev =>
      prev.map(c => (c.key === key ? { ...c, active: c.active === false } : c))
    )
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !saving && onClose?.()}>
      <div
        className="modal-card"
        style={{ maxWidth: 780, width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ background: '#1b2b6b', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} />
            <h3 style={{ margin: 0, fontSize: 16 }}>CRM Lifecycle Policy, Lost Recycle &amp; Program Master</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {[
            { id: 'policy', label: 'Lost Cycles & Business Rules' },
            { id: 'programs', label: `Program Master (${programs.length})` },
            { id: 'categories', label: `Outcome Categories (${outcomeCategories.length})` },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: tab === t.id ? '#1b2b6b' : '#fff',
                color: tab === t.id ? '#fff' : '#334155',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading settings...</div>
          ) : tab === 'policy' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Lost Recycle Settings */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RotateCcw size={15} color="#0284c7" /> Lost Lead Recycling Configuration
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      MAX LOST CYCLES BEFORE PERMANENT CLOSE
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={maxLostCycles}
                      onChange={e => setMaxLostCycles(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      A lead marked LOST can be recycled up to {maxLostCycles} time(s) before End of Cycle.
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      RECYCLE MODE FOR ELIGIBLE LOST LEADS
                    </label>
                    <select
                      value={lostRecycleMode}
                      onChange={e => setLostRecycleMode(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="manual">Manual by Admin (Held in Lost Recycle Queue)</option>
                      <option value="auto_pool">Automatic Return to System Pool</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Business & Financial Rules */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={15} color="#059669" /> Business Fields &amp; Permission Controls
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={requireBusinessFields}
                      onChange={e => setRequireBusinessFields(e.target.checked)}
                    />
                    <span>Require Course Program, Course Fees &amp; Paid Amount for Business statuses</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowAdminBusinessFieldException}
                      onChange={e => setAllowAdminBusinessFieldException(e.target.checked)}
                    />
                    <span>Allow Admin explicit exception bypass when saving Business statuses</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowSalesFinancialEdit}
                      onChange={e => setAllowSalesFinancialEdit(e.target.checked)}
                    />
                    <span>Allow assigned Sales Counselors to update financial fields (uncheck to lock after initial entry)</span>
                  </label>
                </div>
              </div>

              {/* Lost Reasons */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  APPROVED LOST REASONS (ONE PER LINE)
                </label>
                <textarea
                  rows={5}
                  value={lostReasonsText}
                  onChange={e => setLostReasonsText(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
            </div>
          ) : tab === 'programs' ? (
            <div>
              <form
                onSubmit={handleAddProgram}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 0.7fr 1.5fr 0.8fr auto',
                  gap: 8,
                  marginBottom: 16,
                  padding: 12,
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                <input
                  type="text"
                  placeholder="Program Name *"
                  value={newProgName}
                  onChange={e => setNewProgName(e.target.value)}
                  required
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
                <input
                  type="text"
                  placeholder="Code"
                  value={newProgCode}
                  onChange={e => setNewProgCode(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
                <input
                  type="text"
                  placeholder="Variants (comma separated)"
                  value={newProgVariants}
                  onChange={e => setNewProgVariants(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Default Fee ₹"
                  value={newProgFee}
                  onChange={e => setNewProgFee(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
                <button type="submit" className="btn-pulse" disabled={saving} style={{ fontSize: 12, padding: '6px 12px' }}>
                  <Plus size={14} /> Add
                </button>
              </form>

              <table className="leads-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Code</th>
                    <th>Variants</th>
                    <th>Default Fee</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 700 }}>{p.name}</td>
                      <td>{p.code || '—'}</td>
                      <td style={{ fontSize: 11, color: '#475569' }}>
                        {p.variants?.length ? p.variants.join(', ') : '—'}
                      </td>
                      <td>{p.defaultFee ? `₹${Number(p.defaultFee).toLocaleString('en-IN')}` : '—'}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleProgramActive(p)}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            background: p.active ? '#dcfce7' : '#f1f5f9',
                            color: p.active ? '#15803d' : '#64748b',
                          }}
                        >
                          {p.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeleteProgram(p)}
                          style={{
                            padding: '4px 7px',
                            borderRadius: 4,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <form
                onSubmit={handleAddCategory}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.8fr 1.2fr 1.2fr auto',
                  gap: 8,
                  marginBottom: 14,
                  padding: 12,
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                <input
                  type="text"
                  placeholder="New outcome category label..."
                  value={newCatLabel}
                  onChange={e => setNewCatLabel(e.target.value)}
                  required
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
                <select
                  value={newCatStatus}
                  onChange={e => setNewCatStatus(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                >
                  <option value="HOT">HOT (Positive)</option>
                  <option value="WARM">WARM (Moderate)</option>
                  <option value="COLD">COLD (Low/Delayed)</option>
                  <option value="NON-CONNECT">NON-CONNECT (Cold)</option>
                  <option value="NON PROSPECT">NON PROSPECT (Cold • End)</option>
                  <option value="LOST">LOST (Cold • Recyclable)</option>
                  <option value="QUALIFIED BUSINESS">QUALIFIED BUSINESS (Hot)</option>
                  <option value="CONVERTED BUSINESS">CONVERTED BUSINESS (Hot • End)</option>
                  <option value="ONBOARDED BUSINESS">ONBOARDED BUSINESS (Hot • End)</option>
                </select>
                <input
                  type="text"
                  placeholder="Group label"
                  value={newCatGroup}
                  onChange={e => setNewCatGroup(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
                <button type="submit" className="btn-pulse" style={{ fontSize: 12, padding: '6px 12px' }}>
                  <Plus size={14} /> Add
                </button>
              </form>

              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                <table className="leads-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Category Label</th>
                      <th>Group</th>
                      <th>System Status</th>
                      <th>Heat (Admin-Only)</th>
                      <th>Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcomeCategories.map(c => (
                      <tr key={c.key}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{c.label}</td>
                        <td style={{ fontSize: 11, color: '#64748b' }}>{c.group}</td>
                        <td style={{ fontSize: 11, fontWeight: 700 }}>{c.leadStatus}</td>
                        <td style={{ fontSize: 11, fontWeight: 800, color: c.heatTier === 'HOT' ? '#dc2626' : c.heatTier === 'WARM' ? '#d97706' : '#2563eb' }}>
                          {c.heatTier || '—'}
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={c.active !== false}
                            onChange={() => handleToggleCategory(c.key)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                Click <strong>Save Policy</strong> below to persist category edits.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-pulse-secondary" onClick={onClose}>
            Close
          </button>
          {tab !== 'programs' && (
            <button type="button" className="btn-pulse" onClick={handleSavePolicy} disabled={saving}>
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Policy & Categories'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
