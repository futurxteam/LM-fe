import React, { useState, useEffect } from 'react'
import { X, Settings, Plus, Trash2, Save, RotateCcw, GraduationCap, Shield, Edit2, IndianRupee, Send, Bell, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { api } from '../api'

const FALLBACK_TELEGRAM_EVENTS = [
  { key: 'newLead', label: 'New Lead Captured', audience: 'Admins (Telegram-enabled)', placeholders: ['leadName', 'phone', 'course', 'source', 'assignedTo'] },
  { key: 'leadAssigned', label: 'Lead Assigned / Auto-Assigned', audience: 'Assigned Sales Counselor', placeholders: ['leadName', 'phone', 'course', 'assignedBy', 'count'] },
  { key: 'discountRequested', label: 'Discount Approval Requested', audience: 'Admins (Telegram-enabled)', placeholders: ['leadName', 'phone', 'course', 'standardFee', 'agreedAmount', 'discountAmount', 'reason', 'requestedBy'] },
  { key: 'discountApproved', label: 'Discount Approved by Admin', audience: 'Requesting Counselor', placeholders: ['leadName', 'phone', 'targetStatus', 'agreedAmount', 'discountAmount', 'decidedBy', 'remarks'] },
  { key: 'discountRejected', label: 'Discount Rejected by Admin', audience: 'Requesting Counselor', placeholders: ['leadName', 'phone', 'agreedAmount', 'decidedBy', 'remarks'] },
  { key: 'businessMilestone', label: 'Business Milestone Reached', audience: 'Admins (Telegram-enabled)', placeholders: ['status', 'leadName', 'phone', 'course', 'agreedAmount', 'paidAmount', 'assignedTo'] },
]

export default function AdminLifecycleSettingsModal({
  isOpen,
  initialTab = 'policy',
  onClose,
  onSaved,
  showNotify,
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState(initialTab) // 'policy' | 'programs' | 'categories'

  // Policy fields
  const [maxLostCycles, setMaxLostCycles] = useState(3)
  const [lostRecycleMode, setLostRecycleMode] = useState('manual')
  const [requireBusinessFields, setRequireBusinessFields] = useState(true)
  const [allowAdminBusinessFieldException, setAllowAdminBusinessFieldException] = useState(true)
  const [allowSalesFinancialEdit, setAllowSalesFinancialEdit] = useState(true)
  const [lostReasonsText, setLostReasonsText] = useState('')
  const [outcomeCategories, setOutcomeCategories] = useState([])

  // Telegram Notification Settings & Message Templates
  const [telegramBotStatus, setTelegramBotStatus] = useState({ configured: false, botUsername: '', botName: '' })
  const [defaultTelegramTemplates, setDefaultTelegramTemplates] = useState({})
  const [telegramEventMeta, setTelegramEventMeta] = useState(FALLBACK_TELEGRAM_EVENTS)
  const [telegramEnabled, setTelegramEnabled] = useState(true)
  const [telegramEvents, setTelegramEvents] = useState({
    newLead: true,
    leadAssigned: true,
    discountRequested: true,
    discountApproved: true,
    discountRejected: true,
    businessMilestone: true,
  })
  const [telegramTemplates, setTelegramTemplates] = useState({})
  const [testChatId, setTestChatId] = useState('')
  const [testingEventKey, setTestingEventKey] = useState('')
  const [telegramFeedback, setTelegramFeedback] = useState(null) // { type: 'error' | 'success', message: string }
  const [fetchingChats, setFetchingChats] = useState(false)
  const [detectedChats, setDetectedChats] = useState([])

  // Program & Fee Structure Master
  const [programs, setPrograms] = useState([])
  const [newProgName, setNewProgName] = useState('')
  const [newProgCode, setNewProgCode] = useState('')
  const [newProgVariants, setNewProgVariants] = useState('')
  const [newProgFee, setNewProgFee] = useState('')
  const [editingProgId, setEditingProgId] = useState(null)
  const [editProgForm, setEditProgForm] = useState({
    name: '',
    code: '',
    variantsText: '',
    defaultFee: '',
    variantFees: {},
  })

  // New Category
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatStatus, setNewCatStatus] = useState('HOT')
  const [newCatGroup, setNewCatGroup] = useState('Positive Interest')

  // Edit Existing Category
  const [editingCatKey, setEditingCatKey] = useState(null)
  const [editCatForm, setEditCatForm] = useState({
    label: '',
    group: '',
    leadStatus: 'HOT',
    heatTier: 'HOT',
  })

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab || 'policy')
      setEditingProgId(null)
      setTelegramFeedback(null)
      loadSettings()
    }
  }, [isOpen, initialTab])

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
      if (res.telegramBotStatus) {
        setTelegramBotStatus(res.telegramBotStatus)
      }
      if (res.defaultTelegramTemplates) {
        setDefaultTelegramTemplates(res.defaultTelegramTemplates)
      }
      if (Array.isArray(res.telegramEventMeta) && res.telegramEventMeta.length > 0) {
        setTelegramEventMeta(res.telegramEventMeta)
      }
      const tg = s.telegramSettings || {}
      setTelegramEnabled(tg.enabled !== false)
      setTelegramEvents({
        newLead: tg.events?.newLead !== false,
        leadAssigned: tg.events?.leadAssigned !== false,
        discountRequested: tg.events?.discountRequested !== false,
        discountApproved: tg.events?.discountApproved !== false,
        discountRejected: tg.events?.discountRejected !== false,
        businessMilestone: tg.events?.businessMilestone !== false,
      })
      setTelegramTemplates({
        ...(res.defaultTelegramTemplates || {}),
        ...(tg.templates || {}),
      })
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
        telegramSettings: {
          enabled: telegramEnabled,
          events: telegramEvents,
          templates: telegramTemplates,
        },
      })
      showNotify?.('success', tab === 'telegram' ? 'Telegram notification settings & templates saved!' : 'CRM Lifecycle & Recycle Policy saved!')
      if (tab === 'telegram') {
        setTelegramFeedback({ type: 'success', message: 'Telegram notification settings & templates saved.' })
      }
      onSaved?.()
    } catch (err) {
      const msg = err.message || 'Failed to save policy'
      showNotify?.('error', msg)
      if (tab === 'telegram') {
        setTelegramFeedback({ type: 'error', message: msg })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFetchTelegramChats = async () => {
    setFetchingChats(true)
    setTelegramFeedback(null)
    try {
      const res = await api.getTelegramChats()
      const chats = Array.isArray(res?.chats) ? res.chats : []
      setDetectedChats(chats)
      if (chats.length === 0) {
        setTelegramFeedback({
          type: 'error',
          message: `No recent chats found yet. Open ${telegramBotStatus.botUsername || 'the bot'} in Telegram and tap Start (/start), then click Fetch Chat IDs again.`,
        })
      }
    } catch (err) {
      setTelegramFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch recent Telegram chats.',
      })
    } finally {
      setFetchingChats(false)
    }
  }

  const handleSendTestTemplate = async eventKey => {
    if (!testChatId.trim()) {
      const msg = 'Enter a Telegram Chat ID in the test bar above first.'
      setTelegramFeedback({ type: 'error', message: msg })
      showNotify?.('error', msg)
      return
    }
    setTestingEventKey(eventKey)
    setTelegramFeedback(null)
    try {
      const res = await api.testCrmTelegram({
        chatId: testChatId.trim(),
        eventKey,
        customTemplate: telegramTemplates[eventKey] || defaultTelegramTemplates[eventKey] || '',
      })
      const okMsg = res.message || 'Test Telegram notification sent!'
      setTelegramFeedback({ type: 'success', message: okMsg })
      showNotify?.('success', okMsg)
    } catch (err) {
      const errMsg = err.message || 'Failed to send test Telegram alert'
      setTelegramFeedback({ type: 'error', message: errMsg })
      showNotify?.('error', errMsg)
    } finally {
      setTestingEventKey('')
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

  const startEditProgram = prog => {
    setEditingProgId(prog._id)
    setEditProgForm({
      name: prog.name || '',
      code: prog.code || '',
      variantsText: (prog.variants || []).join(', '),
      defaultFee: prog.defaultFee !== undefined && prog.defaultFee !== null ? String(prog.defaultFee) : '',
      variantFees: { ...(prog.variantFees || {}) },
    })
  }

  const handleSaveEditProgram = async progId => {
    if (!editProgForm.name.trim()) {
      showNotify?.('error', 'Program name is required')
      return
    }
    setSaving(true)
    try {
      const parsedVariants = editProgForm.variantsText
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
      const cleanedVariantFees = {}
      parsedVariants.forEach(v => {
        const raw = editProgForm.variantFees?.[v]
        if (raw !== '' && raw !== undefined && raw !== null && Number(raw) >= 0) {
          cleanedVariantFees[v] = Number(raw)
        }
      })
      await api.updateCourseProgram(progId, {
        name: editProgForm.name.trim(),
        code: editProgForm.code.trim(),
        variants: parsedVariants,
        defaultFee: Number(editProgForm.defaultFee) >= 0 ? Number(editProgForm.defaultFee) : 0,
        variantFees: cleanedVariantFees,
      })
      showNotify?.('success', 'Course & Fee structure updated!')
      setEditingProgId(null)
      await loadSettings()
      onSaved?.()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to update course & fee structure')
    } finally {
      setSaving(false)
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

  const startEditCategory = cat => {
    setEditingCatKey(cat.key)
    setEditCatForm({
      label: cat.label || '',
      group: cat.group || '',
      leadStatus: cat.leadStatus || 'HOT',
      heatTier: cat.heatTier || 'HOT',
    })
  }

  const handleSaveEditCategory = key => {
    if (!editCatForm.label.trim()) {
      showNotify?.('error', 'Category label is required.')
      return
    }
    const computedHeat = ['HOT', 'QUALIFIED BUSINESS', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS'].includes(editCatForm.leadStatus)
      ? 'HOT'
      : editCatForm.leadStatus === 'WARM'
      ? 'WARM'
      : 'COLD'

    setOutcomeCategories(prev =>
      prev.map(c =>
        c.key === key
          ? {
              ...c,
              label: editCatForm.label.trim(),
              group: editCatForm.group.trim() || 'General',
              leadStatus: editCatForm.leadStatus,
              heatTier: editCatForm.heatTier || computedHeat,
            }
          : c
      )
    )
    setEditingCatKey(null)
  }

  const handleDeleteCategory = cat => {
    const ok = window.confirm(`Delete outcome category "${cat.label}"?`)
    if (!ok) return
    setOutcomeCategories(prev => prev.filter(c => c.key !== cat.key))
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
        <div className="modal-subtabs-bar">
          {[
            { id: 'policy', label: 'Lost Cycles & Business Rules' },
            { id: 'programs', label: `Course & Fee Structure (${programs.length})` },
            { id: 'categories', label: `Outcome Categories (${outcomeCategories.length})` },
            { id: 'telegram', label: 'Telegram Alerts & Templates' },
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
                <div className="responsive-grid-2">
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
                className="program-add-form"
                style={{
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
                <button type="submit" className="btn-pulse" disabled={saving} style={{ fontSize: 12, padding: '7px 12px', whiteSpace: 'nowrap' }}>
                  <Plus size={14} /> Add
                </button>
              </form>

              <div className="leads-table-container">
              <table className="leads-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Code</th>
                    <th>Variants &amp; Variant Fees</th>
                    <th>Default Fee (₹)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map(p => {
                    const isEditingRow = editingProgId === p._id
                    const editVariantsList = isEditingRow
                      ? editProgForm.variantsText.split(',').map(v => v.trim()).filter(Boolean)
                      : []
                    return (
                      <React.Fragment key={p._id}>
                        <tr>
                          <td style={{ fontWeight: 700 }}>
                            {isEditingRow ? (
                              <input
                                type="text"
                                value={editProgForm.name}
                                onChange={e => setEditProgForm({ ...editProgForm, name: e.target.value })}
                                style={{ width: '100%', padding: '5px 8px', borderRadius: 5, border: '1px solid #94a3b8', fontSize: 12 }}
                              />
                            ) : (
                              p.name
                            )}
                          </td>
                          <td>
                            {isEditingRow ? (
                              <input
                                type="text"
                                value={editProgForm.code}
                                onChange={e => setEditProgForm({ ...editProgForm, code: e.target.value })}
                                style={{ width: 68, padding: '5px 6px', borderRadius: 5, border: '1px solid #94a3b8', fontSize: 12 }}
                              />
                            ) : (
                              p.code || '—'
                            )}
                          </td>
                          <td style={{ fontSize: 11, color: '#475569' }}>
                            {isEditingRow ? (
                              <input
                                type="text"
                                value={editProgForm.variantsText}
                                onChange={e => setEditProgForm({ ...editProgForm, variantsText: e.target.value })}
                                placeholder="Comma separated variants"
                                style={{ width: '100%', padding: '5px 8px', borderRadius: 5, border: '1px solid #94a3b8', fontSize: 12 }}
                              />
                            ) : p.variants?.length ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {p.variants.map(v => {
                                  const vFee = p.variantFees?.[v]
                                  return (
                                    <div key={v}>
                                      <span>{v}</span>
                                      {vFee !== undefined && vFee !== null && Number(vFee) > 0 && (
                                        <strong style={{ marginLeft: 6, color: '#047857' }}>
                                          (₹{Number(vFee).toLocaleString('en-IN')})
                                        </strong>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {isEditingRow ? (
                              <input
                                type="number"
                                min="0"
                                value={editProgForm.defaultFee}
                                onChange={e => setEditProgForm({ ...editProgForm, defaultFee: e.target.value })}
                                style={{ width: 92, padding: '5px 8px', borderRadius: 5, border: '1px solid #94a3b8', fontSize: 12 }}
                              />
                            ) : p.defaultFee ? (
                              <strong>₹{Number(p.defaultFee).toLocaleString('en-IN')}</strong>
                            ) : (
                              '—'
                            )}
                          </td>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              {isEditingRow ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditProgram(p._id)}
                                    disabled={saving}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      border: 'none',
                                      background: '#059669',
                                      color: '#fff',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 3,
                                    }}
                                  >
                                    <Save size={11} /> Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingProgId(null)}
                                    style={{
                                      padding: '4px 7px',
                                      borderRadius: 4,
                                      border: '1px solid #cbd5e1',
                                      background: '#fff',
                                      color: '#475569',
                                      fontSize: 11,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditProgram(p)}
                                    title="Edit Course & Fee Structure"
                                    style={{
                                      padding: '4px 7px',
                                      borderRadius: 4,
                                      border: '1px solid #bae6fd',
                                      background: '#f0f9ff',
                                      color: '#0369a1',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProgram(p)}
                                    title="Delete Program"
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
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isEditingRow && editVariantsList.length > 0 && (
                          <tr>
                            <td colSpan={6} style={{ background: '#f0f9ff', padding: '10px 14px' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <IndianRupee size={12} /> Variant-Specific Fee Structure (optional — overrides default fee when variant is selected):
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                                {editVariantsList.map(v => (
                                  <div key={v} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #bae6fd' }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{v}</span>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="Fee ₹"
                                      value={editProgForm.variantFees?.[v] ?? ''}
                                      onChange={e =>
                                        setEditProgForm({
                                          ...editProgForm,
                                          variantFees: {
                                            ...(editProgForm.variantFees || {}),
                                            [v]: e.target.value,
                                          },
                                        })
                                      }
                                      style={{ width: 90, padding: '4px 7px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12 }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          ) : tab === 'categories' ? (
            <div>
              <form
                onSubmit={handleAddCategory}
                className="category-add-form"
                style={{
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

              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                <table className="leads-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 160 }}>Category Label</th>
                      <th style={{ minWidth: 120 }}>Group</th>
                      <th style={{ minWidth: 130 }}>System Status</th>
                      <th style={{ minWidth: 90 }}>Heat (Admin)</th>
                      <th style={{ width: 60, textAlign: 'center' }}>Active</th>
                      <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcomeCategories.map(c => {
                      const isEditing = editingCatKey === c.key
                      return (
                        <tr key={c.key}>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editCatForm.label}
                                onChange={e => setEditCatForm({ ...editCatForm, label: e.target.value })}
                                style={{ width: '100%', padding: '5px 8px', borderRadius: 5, border: '1px solid #0284c7', fontSize: 12 }}
                              />
                            ) : (
                              c.label
                            )}
                          </td>
                          <td style={{ fontSize: 11, color: '#64748b' }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editCatForm.group}
                                onChange={e => setEditCatForm({ ...editCatForm, group: e.target.value })}
                                style={{ width: '100%', padding: '5px 8px', borderRadius: 5, border: '1px solid #0284c7', fontSize: 12 }}
                              />
                            ) : (
                              c.group
                            )}
                          </td>
                          <td style={{ fontSize: 11, fontWeight: 700 }}>
                            {isEditing ? (
                              <select
                                value={editCatForm.leadStatus}
                                onChange={e => {
                                  const nextSt = e.target.value
                                  const computedHeat = ['HOT', 'QUALIFIED BUSINESS', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS'].includes(nextSt)
                                    ? 'HOT'
                                    : nextSt === 'WARM'
                                    ? 'WARM'
                                    : 'COLD'
                                  setEditCatForm({ ...editCatForm, leadStatus: nextSt, heatTier: computedHeat })
                                }}
                                style={{ width: '100%', padding: '5px 6px', borderRadius: 5, border: '1px solid #0284c7', fontSize: 11 }}
                              >
                                <option value="HOT">HOT</option>
                                <option value="WARM">WARM</option>
                                <option value="COLD">COLD</option>
                                <option value="NON-CONNECT">NON-CONNECT</option>
                                <option value="NON PROSPECT">NON PROSPECT</option>
                                <option value="LOST">LOST</option>
                                <option value="QUALIFIED BUSINESS">QUALIFIED BUSINESS</option>
                                <option value="CONVERTED BUSINESS">CONVERTED BUSINESS</option>
                                <option value="ONBOARDED BUSINESS">ONBOARDED BUSINESS</option>
                              </select>
                            ) : (
                              c.leadStatus
                            )}
                          </td>
                          <td style={{ fontSize: 11, fontWeight: 800 }}>
                            {isEditing ? (
                              <select
                                value={editCatForm.heatTier}
                                onChange={e => setEditCatForm({ ...editCatForm, heatTier: e.target.value })}
                                style={{ width: '100%', padding: '5px 6px', borderRadius: 5, border: '1px solid #0284c7', fontSize: 11 }}
                              >
                                <option value="HOT">HOT</option>
                                <option value="WARM">WARM</option>
                                <option value="COLD">COLD</option>
                              </select>
                            ) : (
                              <span style={{ color: c.heatTier === 'HOT' ? '#dc2626' : c.heatTier === 'WARM' ? '#d97706' : '#2563eb' }}>
                                {c.heatTier || '—'}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={c.active !== false}
                              onChange={() => handleToggleCategory(c.key)}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditCategory(c.key)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      border: 'none',
                                      background: '#059669',
                                      color: '#fff',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 3,
                                    }}
                                  >
                                    <Save size={11} /> Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCatKey(null)}
                                    style={{
                                      padding: '4px 7px',
                                      borderRadius: 4,
                                      border: '1px solid #cbd5e1',
                                      background: '#fff',
                                      color: '#475569',
                                      fontSize: 11,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditCategory(c)}
                                    title="Edit CRM Outcome Category"
                                    style={{
                                      padding: '4px 7px',
                                      borderRadius: 4,
                                      border: '1px solid #bae6fd',
                                      background: '#f0f9ff',
                                      color: '#0369a1',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(c)}
                                    title="Delete Category"
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
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                Click <strong>Save Policy</strong> below to persist category edits.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Bot Status Banner */}
              <div
                style={{
                  border: `1px solid ${telegramBotStatus.configured ? '#bae6fd' : '#fecaca'}`,
                  background: telegramBotStatus.configured ? '#f0f9ff' : '#fef2f2',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {telegramBotStatus.configured ? (
                    <CheckCircle2 size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                  ) : (
                    <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: telegramBotStatus.configured ? '#0369a1' : '#991b1b' }}>
                      {telegramBotStatus.configured
                        ? `Telegram Bot Connected${telegramBotStatus.botUsername ? ` (${telegramBotStatus.botUsername})` : ''}`
                        : 'Telegram Bot Token Not Found in Server .env'}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2, lineHeight: 1.45 }}>
                      {telegramBotStatus.configured
                        ? 'Bot token is loaded securely from server .env. Have any staff member open the bot and press Start (/start), then click "Fetch Chat IDs" below or inside User Management to pick their numeric Chat ID in 1 click.'
                        : 'Add telegram=<bot_token> or TELEGRAM_BOT_TOKEN=<bot_token> in LM-be/.env and restart the server.'}
                    </div>
                    {telegramBotStatus.configured && telegramBotStatus.botUsername && (
                      <a
                        href={`https://t.me/${telegramBotStatus.botUsername.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          marginTop: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#0284c7',
                          background: '#ffffff',
                          border: '1px solid #bae6fd',
                          padding: '3px 9px',
                          borderRadius: 6,
                          textDecoration: 'none',
                        }}
                      >
                        <span>Open {telegramBotStatus.botUsername} in Telegram</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Master Global Switch */}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    color: telegramEnabled ? '#0f172a' : '#64748b',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={e => setTelegramEnabled(e.target.checked)}
                  />
                  <span>{telegramEnabled ? 'Master Alerts: ENABLED' : 'Master Alerts: DISABLED'}</span>
                </label>
              </div>

              {/* Test Delivery Bar */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={14} color="#0284c7" />
                  <span>Test Chat ID:</span>
                </div>
                <input
                  type="text"
                  placeholder="Enter Chat ID (e.g. 123456789) to preview alerts..."
                  value={testChatId}
                  onChange={e => setTestChatId(e.target.value)}
                  style={{
                    flex: '1 1 200px',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    background: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  className="btn-pulse-secondary"
                  disabled={fetchingChats}
                  onClick={handleFetchTelegramChats}
                  style={{
                    fontSize: 12,
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    color: '#0369a1',
                    borderColor: '#7dd3fc',
                    background: '#ffffff',
                  }}
                >
                  <RefreshCw size={13} className={fetchingChats ? 'animate-spin' : ''} />
                  <span>{fetchingChats ? 'Fetching...' : 'Fetch Chat IDs'}</span>
                </button>
                <button
                  type="button"
                  className="btn-pulse-secondary"
                  disabled={Boolean(testingEventKey) || !testChatId.trim()}
                  onClick={() => handleSendTestTemplate('newLead')}
                  style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <Send size={13} />
                  <span>{testingEventKey === 'newLead' ? 'Sending...' : 'Send Quick Test'}</span>
                </button>
              </div>

              {/* Detected Recent Bot Chats Picker */}
              {detectedChats.length > 0 && (
                <div
                  style={{
                    border: '1px solid #bae6fd',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: '#ffffff',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>
                    Detected Bot Chats ({detectedChats.length}) — Click any chat to fill Test Chat ID (or copy for User Management):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
                    {detectedChats.map(c => (
                      <button
                        key={c.chatId}
                        type="button"
                        onClick={() => {
                          setTestChatId(c.chatId)
                          setTelegramFeedback({
                            type: 'success',
                            message: `Selected Chat ID ${c.chatId} (${c.displayName}). Click Send Quick Test to verify.`,
                          })
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: testChatId === c.chatId ? '1px solid #0284c7' : '1px solid #e2e8f0',
                          background: testChatId === c.chatId ? '#e0f2fe' : '#f8fafc',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                            {c.displayName} {c.username ? <span style={{ color: '#64748b', fontWeight: 500 }}>({c.username})</span> : null}
                          </div>
                          <div style={{ fontSize: 11, color: '#475569' }}>
                            Chat ID: <strong>{c.chatId}</strong> • {c.type}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', flexShrink: 0 }}>Use</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Error / Success Feedback inside Modal */}
              {telegramFeedback && (
                <div
                  role="alert"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${telegramFeedback.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                    background: telegramFeedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    color: telegramFeedback.type === 'error' ? '#991b1b' : '#166534',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 10,
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {telegramFeedback.type === 'error' ? (
                      <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                    )}
                    <span>{telegramFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTelegramFeedback(null)}
                    aria-label="Dismiss alert"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'inline-flex',
                      flexShrink: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Event Toggles & Customizable Message Templates */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {telegramEventMeta.map(ev => {
                  const isOn = telegramEvents[ev.key] !== false
                  const currentTemplate = telegramTemplates[ev.key] ?? defaultTelegramTemplates[ev.key] ?? ''
                  return (
                    <div
                      key={ev.key}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: 12,
                        background: isOn ? '#ffffff' : '#f8fafc',
                        opacity: telegramEnabled ? 1 : 0.65,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{ev.label}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Recipients: {ev.audience}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() =>
                              setTelegramTemplates(prev => ({
                                ...prev,
                                [ev.key]: defaultTelegramTemplates[ev.key] || prev[ev.key] || '',
                              }))
                            }
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            Reset Default
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(testingEventKey) || !testChatId.trim()}
                            onClick={() => handleSendTestTemplate(ev.key)}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid #bae6fd',
                              background: '#f0f9ff',
                              color: '#0369a1',
                              cursor: testChatId.trim() ? 'pointer' : 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Send sample preview of this template to the Test Chat ID above"
                          >
                            <Send size={11} />
                            <span>{testingEventKey === ev.key ? 'Sending...' : 'Test'}</span>
                          </button>
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              color: isOn ? '#15803d' : '#64748b',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: 6,
                              background: isOn ? '#dcfce7' : '#e2e8f0',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isOn}
                              onChange={e =>
                                setTelegramEvents(prev => ({ ...prev, [ev.key]: e.target.checked }))
                              }
                            />
                            <span>{isOn ? 'Enabled' : 'Disabled'}</span>
                          </label>
                        </div>
                      </div>

                      <textarea
                        rows={4}
                        value={currentTemplate}
                        onChange={e =>
                          setTelegramTemplates(prev => ({ ...prev, [ev.key]: e.target.value }))
                        }
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          fontFamily: 'monospace',
                          lineHeight: 1.45,
                          boxSizing: 'border-box',
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          Click variable to insert:
                        </span>
                        {(ev.placeholders || []).map(ph => (
                          <button
                            key={ph}
                            type="button"
                            onClick={() =>
                              setTelegramTemplates(prev => ({
                                ...prev,
                                [ev.key]: `${prev[ev.key] ?? defaultTelegramTemplates[ev.key] ?? ''} {{${ph}}}`,
                              }))
                            }
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              background: '#f1f5f9',
                              color: '#1b2b6b',
                              cursor: 'pointer',
                            }}
                          >
                            {`{{${ph}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
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
              <span>
                {saving
                  ? 'Saving...'
                  : tab === 'telegram'
                    ? 'Save Telegram Settings'
                    : 'Save Policy & Categories'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
