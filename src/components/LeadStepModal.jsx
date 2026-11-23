import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Clock,
  IndianRupee,
  GraduationCap,
  History,
  Lock,
  Layers,
} from 'lucide-react'
import { api } from '../api'
import {
  isBusinessStatus,
  formatINR,
  getStatusBadgeStyle,
  getHeatBadgeStyle,
  getSalesDisplayStatus,
  INQUIRY_INTENT_STATUSES,
  FRD_LOST_REASONS,
  PAYMENT_MODES,
} from '../constants/leadLifecycle'

export default function LeadStepModal({
  lead,
  currentUser,
  crmMeta,
  onClose,
  onUpdated,
  showNotify,
}) {
  if (!lead) return null

  const isAdmin = currentUser?.role === 'admin'
  const categories = crmMeta?.outcomeCategories || []
  const programs = crmMeta?.programs || []
  const lostReasons = crmMeta?.lostReasons?.length ? crmMeta.lostReasons : FRD_LOST_REASONS
  const inquiryIntentOptions = crmMeta?.inquiryIntentStatuses?.length
    ? crmMeta.inquiryIntentStatuses
    : INQUIRY_INTENT_STATUSES
  const policy = crmMeta?.policy || {
    maxLostCycles: 3,
    lostRecycleMode: 'manual',
    requireBusinessFields: true,
    allowAdminBusinessFieldException: true,
    allowSalesFinancialEdit: true,
  }

  const [saving, setSaving] = useState(false)
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(lead.selectedCategory || '')
  const [inquiryIntent, setInquiryIntent] = useState(lead.inquiryIntent || '')
  const [lostReason, setLostReason] = useState(lead.lostReason || '')
  const [customLostNote, setCustomLostNote] = useState('')
  const [businessProgramId, setBusinessProgramId] = useState(lead.businessProgramId || '')
  const [businessProgramVariant, setBusinessProgramVariant] = useState(lead.businessProgramVariant || '')
  const [courseFees, setCourseFees] = useState(
    lead.courseFees !== null && lead.courseFees !== undefined ? String(lead.courseFees) : ''
  )
  const [paidAmount, setPaidAmount] = useState(
    lead.paidAmount !== null && lead.paidAmount !== undefined ? String(lead.paidAmount) : ''
  )
  // Itemized Payment Receipt (Installments) state
  const [localReceipts, setLocalReceipts] = useState(Array.isArray(lead.paymentReceipts) ? lead.paymentReceipts : [])
  const [receiptAmount, setReceiptAmount] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10))
  const [receiptMode, setReceiptMode] = useState('UPI')
  const [receiptRef, setReceiptRef] = useState('')
  const [receiptNote, setReceiptNote] = useState('')
  const [adminException, setAdminException] = useState(false)
  const [showAllForAdmin, setShowAllForAdmin] = useState(false)
  const [note, setNote] = useState('')
  const [callbackAt, setCallbackAt] = useState('')
  const [activeSection, setActiveSection] = useState('step') // 'step' | 'timeline'

  // Reset form only when opening a different lead (NOT when receipt update refreshes the same lead)
  const leadKey = lead?.id || lead?._id
  useEffect(() => {
    if (!lead) return
    setSelectedCategoryKey(lead.selectedCategory || '')
    setInquiryIntent(lead.inquiryIntent || '')
    setLostReason(lead.lostReason || '')
    setCustomLostNote('')
    setBusinessProgramId(lead.businessProgramId || '')
    setBusinessProgramVariant(lead.businessProgramVariant || '')
    setCourseFees(lead.courseFees !== null && lead.courseFees !== undefined ? String(lead.courseFees) : '')
    setPaidAmount(lead.paidAmount !== null && lead.paidAmount !== undefined ? String(lead.paidAmount) : '')
    setLocalReceipts(Array.isArray(lead.paymentReceipts) ? lead.paymentReceipts : [])
    setReceiptAmount('')
    setReceiptDate(new Date().toISOString().slice(0, 10))
    setReceiptMode('UPI')
    setReceiptRef('')
    setReceiptNote('')
    setAdminException(false)
    setShowAllForAdmin(false)
    setNote('')
    setCallbackAt('')
  }, [leadKey])

  // Count prior interactions logged in the current cycle (excludes system/admin recycle entries)
  const currentCycleInteractions = useMemo(() => {
    const curCycle = lead.cycleNumber || 1
    const allSteps = Array.isArray(lead.steps) ? lead.steps : []
    const cycleSteps = allSteps.filter(
      s =>
        (s.cycleNumber || 1) === curCycle &&
        s.selectedCategory !== 'admin_recycled' &&
        s.selectedCategory !== 'auto_recycled'
    )
    if (cycleSteps.length > 0) return cycleSteps.length
    if (curCycle === 1 && (lead.callAttempts || 0) > 0) return lead.callAttempts
    return 0
  }, [lead])

  const requiresFirstInteractionStatuses = ['LOST', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS']
  const irreversibleStatusesForSales = ['LOST', 'NON PROSPECT', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS']
  const currentLeadStatus = lead.leadStatus || 'NEW LEAD'

  // Stage-aware Decision Tree: filter dropdown to only relevant next options for the current status
  const allowedStatusesForStage = useMemo(() => {
    if (isAdmin && showAllForAdmin) return null
    switch (currentLeadStatus) {
      case 'NEW LEAD':
        return isAdmin
          ? ['HOT', 'WARM', 'COLD', 'NON-CONNECT', 'NON PROSPECT', 'QUALIFIED BUSINESS', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS', 'LOST']
          : ['HOT', 'WARM', 'COLD', 'NON-CONNECT', 'NON PROSPECT', 'QUALIFIED BUSINESS']
      case 'NON-CONNECT':
        return isAdmin || currentCycleInteractions > 0
          ? ['NON-CONNECT', 'HOT', 'WARM', 'COLD', 'NON PROSPECT', 'LOST', 'QUALIFIED BUSINESS']
          : ['NON-CONNECT', 'HOT', 'WARM', 'COLD', 'NON PROSPECT', 'QUALIFIED BUSINESS']
      case 'HOT':
      case 'WARM':
      case 'COLD':
        return isAdmin || currentCycleInteractions > 0
          ? ['HOT', 'WARM', 'COLD', 'NON-CONNECT', 'NON PROSPECT', 'LOST', 'QUALIFIED BUSINESS', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS']
          : ['HOT', 'WARM', 'COLD', 'NON-CONNECT', 'NON PROSPECT', 'QUALIFIED BUSINESS']
      case 'QUALIFIED BUSINESS':
        return ['QUALIFIED BUSINESS', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS', 'LOST']
      case 'CONVERTED BUSINESS':
        return isAdmin
          ? ['CONVERTED BUSINESS', 'ONBOARDED BUSINESS', 'LOST']
          : ['CONVERTED BUSINESS', 'ONBOARDED BUSINESS']
      case 'ONBOARDED BUSINESS':
        return isAdmin ? ['ONBOARDED BUSINESS'] : []
      case 'LOST':
      case 'NON PROSPECT':
        return isAdmin ? null : []
      default:
        return null
    }
  }, [currentLeadStatus, currentCycleInteractions, isAdmin, showAllForAdmin])

  const groupedCategories = useMemo(() => {
    const groups = {}
    for (const cat of categories) {
      if (allowedStatusesForStage && !allowedStatusesForStage.includes(cat.leadStatus)) {
        continue
      }
      let g = cat.group || 'General'
      if (!isAdmin) {
        g = g.replace(/\s*\((End of Cycle|Recyclable)\)/gi, '').trim()
      }
      if (!groups[g]) groups[g] = []
      groups[g].push(cat)
    }
    return groups
  }, [categories, isAdmin, allowedStatusesForStage])

  const selectedCatObj = useMemo(
    () => categories.find(c => c.key === selectedCategoryKey) || null,
    [categories, selectedCategoryKey]
  )

  const targetStatus = selectedCatObj?.leadStatus || lead.leadStatus || 'NEW LEAD'
  const showInquiryIntentField = ['HOT', 'WARM', 'COLD'].includes(targetStatus)
  const showLostFields = targetStatus === 'LOST'
  const showBusinessFields = isBusinessStatus(targetStatus)

  const selectedProgramObj = useMemo(
    () => programs.find(p => String(p._id || p.id) === String(businessProgramId)) || null,
    [programs, businessProgramId]
  )

  const hasPreviousFinancial =
    Boolean(lead.businessProgramName) ||
    (lead.courseFees !== null && lead.courseFees !== undefined) ||
    (lead.paidAmount !== null && lead.paidAmount !== undefined)

  const isFinancialLockedForSales =
    !isAdmin && hasPreviousFinancial && policy.allowSalesFinancialEdit === false

  const isCategoryLockedForSales = cat => {
    if (isAdmin) return false
    // Onboarded Business can strictly only be selected if lead is already in Converted Business
    if (cat.leadStatus === 'ONBOARDED BUSINESS' && currentLeadStatus !== 'CONVERTED BUSINESS') {
      return true
    }
    // Once Converted Business, only staying on Converted (installment/note) or progressing to Onboarded is allowed
    if (currentLeadStatus === 'CONVERTED BUSINESS') {
      return !['CONVERTED BUSINESS', 'ONBOARDED BUSINESS'].includes(cat.leadStatus)
    }
    // Once Lost, Non Prospect, or Onboarded Business -> fully irreversible by Sales
    if (['LOST', 'NON PROSPECT', 'ONBOARDED BUSINESS'].includes(currentLeadStatus) || lead.isCycleEnded) {
      return true
    }
    // Unlock LOST, CONVERTED BUSINESS, ONBOARDED BUSINESS only after 1st interaction
    if (requiresFirstInteractionStatuses.includes(cat.leadStatus) && currentCycleInteractions === 0) {
      return true
    }
    return false
  }

  const isCycleLockedForSales =
    !isAdmin &&
    (Boolean(lead.isCycleEnded) || irreversibleStatusesForSales.includes(currentLeadStatus)) &&
    !(currentLeadStatus === 'CONVERTED BUSINESS' && ['CONVERTED BUSINESS', 'ONBOARDED BUSINESS'].includes(targetStatus))

  const handleProgramChange = newId => {
    setBusinessProgramId(newId)
    const prog = programs.find(p => String(p._id || p.id) === String(newId))
    if (!prog || !Array.isArray(prog.variants) || !prog.variants.includes(businessProgramVariant)) {
      setBusinessProgramVariant('')
    }
    if (prog && prog.defaultFee > 0) {
      setCourseFees(String(prog.defaultFee))
    }
  }

  const handleVariantChange = newVariant => {
    setBusinessProgramVariant(newVariant)
    if (selectedProgramObj) {
      const vFee = selectedProgramObj.variantFees?.[newVariant]
      if (vFee !== undefined && vFee !== null && Number(vFee) > 0) {
        setCourseFees(String(vFee))
      } else if (selectedProgramObj.defaultFee > 0) {
        setCourseFees(String(selectedProgramObj.defaultFee))
      }
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!selectedCategoryKey) {
      showNotify?.('error', 'Please select an interaction / outcome category.')
      return
    }
    if (!isAdmin && selectedCatObj && isCategoryLockedForSales(selectedCatObj)) {
      showNotify?.(
        'error',
        `${selectedCatObj.leadStatus} is locked until after the 1st interaction is logged.`
      )
      return
    }
    if (showLostFields && !lostReason.trim()) {
      showNotify?.('error', 'Lost Reason is mandatory when marking a lead as LOST.')
      return
    }
    if (showBusinessFields) {
      if (courseFees !== '' && Number(courseFees) < 0) {
        showNotify?.('error', 'Course Fees cannot be negative.')
        return
      }
      if (paidAmount !== '' && Number(paidAmount) < 0) {
        showNotify?.('error', 'Paid Amount cannot be negative.')
        return
      }
      if (receiptAmount !== '' && Number(receiptAmount) < 0) {
        showNotify?.('error', 'Receipt amount cannot be negative.')
        return
      }
    }
    if (showBusinessFields && policy.requireBusinessFields && !(isAdmin && adminException)) {
      if (!businessProgramId) {
        showNotify?.('error', 'Please select an approved Course Program.')
        return
      }
      if (!courseFees || Number(courseFees) <= 0) {
        showNotify?.('error', 'Please enter applicable Course Fees (> 0).')
        return
      }
    }

    // Business Threshold Validation: Qualified (< 10000) vs Converted (>= 10000)
    const effectivePaid =
      receiptAmount !== '' && Number(receiptAmount) > 0
        ? (Number(lead.paidAmount) || 0) + Number(receiptAmount)
        : paidAmount !== ''
        ? Number(paidAmount)
        : Number(lead.paidAmount) || 0

    if (targetStatus === 'CONVERTED BUSINESS' && !(isAdmin && adminException)) {
      if (effectivePaid < 10000) {
        showNotify?.('error', 'Converted Business requires a minimum payment of ₹10,000. For advance/token payments below ₹10,000, please mark as Qualified.')
        return
      }
    }

    if (targetStatus === 'ONBOARDED BUSINESS' && !(isAdmin && adminException)) {
      if (currentLeadStatus !== 'CONVERTED BUSINESS' && !lead.milestoneHistory?.convertedAt) {
        showNotify?.('error', 'A lead must first be in Converted Business state (with at least ₹10,000 paid) before it can be Onboarded.')
        return
      }
      if (effectivePaid < 10000) {
        showNotify?.('error', 'Onboarded Business requires at least ₹10,000 collected.')
        return
      }
    }

    // Sales Rep explicit confirmation prompts for irreversible actions
    if (!isAdmin && targetStatus === 'LOST') {
      const ok = window.confirm(
        `Are you sure you want to mark "${lead.fullName}" as LOST?\n\nThis action cannot be reversed and the lead will be removed from your active queue.`
      )
      if (!ok) return
    } else if (!isAdmin && ['CONVERTED BUSINESS', 'ONBOARDED BUSINESS', 'NON PROSPECT'].includes(targetStatus)) {
      const ok = window.confirm(
        `Confirm marking "${lead.fullName}" as ${targetStatus}?\n\nThis cannot be reversed once saved.`
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      const payload = {
        categoryKey: selectedCategoryKey,
        note: note.trim(),
        callbackAt: callbackAt ? new Date(callbackAt).toISOString() : null,
        incrementCallAttempt: true,
        author: currentUser?.name || 'Staff',
      }

      if (showInquiryIntentField) {
        payload.inquiryIntent = inquiryIntent
      }

      if (showLostFields) {
        payload.lostReason =
          lostReason === 'Other' && customLostNote.trim()
            ? `Other: ${customLostNote.trim()}`
            : lostReason
      }

      if (showBusinessFields) {
        if (businessProgramId) {
          payload.businessProgramId = businessProgramId
          payload.businessProgramName = selectedProgramObj?.name || lead.businessProgramName || ''
        }
        payload.businessProgramVariant = businessProgramVariant
        if (courseFees !== '') payload.courseFees = Number(courseFees)
        if (receiptAmount !== '' && Number(receiptAmount) > 0) {
          payload.newReceipt = {
            amount: Number(receiptAmount),
            receiptDate,
            paymentMode: receiptMode,
            referenceNo: receiptRef.trim(),
            note: receiptNote.trim(),
          }
        } else {
          payload.paidAmount = paidAmount !== '' ? Number(paidAmount) : 0
        }
        if (isAdmin && adminException) payload.adminException = true
      }

      const res = await api.addLeadStep(lead.id || lead._id, payload)
      showNotify?.('success', res.message || `Step logged for ${lead.fullName}`)
      onUpdated?.(res.lead)
      onClose?.()
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to save step')
    } finally {
      setSaving(false)
    }
  }

  const steps = Array.isArray(lead.steps) ? [...lead.steps].reverse() : []
  const currentStatusBadge = getStatusBadgeStyle(lead.leadStatus || 'NEW LEAD')
  const currentHeatBadge = isAdmin && lead.heatTier && lead.heatTier !== lead.leadStatus ? getHeatBadgeStyle(lead.heatTier) : null
  const feesNum = Number(courseFees) || 0
  const pendingReceiptNum = Number(receiptAmount) > 0 ? Number(receiptAmount) : 0
  const paidNum = (Number(paidAmount) || 0) + pendingReceiptNum
  const pendingNum = Math.max(0, feesNum - paidNum)

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !saving && onClose?.()}>
      <div
        className="modal-card"
        style={{ maxWidth: 680, width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: '#0f172a', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PhoneCall size={18} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                Lead Progression: {lead.fullName}
              </h3>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                {lead.phone} {lead.email ? `• ${lead.email}` : ''}
                {isAdmin ? ` • Cycle #${lead.cycleNumber || 1}` : ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Summary Bar */}
        <div
          style={{
            padding: '10px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 12,
                background: currentStatusBadge.bg,
                color: currentStatusBadge.color,
                border: `1px solid ${currentStatusBadge.border}`,
              }}
            >
              {isAdmin ? (lead.leadStatus || 'NEW LEAD') : getSalesDisplayStatus(lead)}
            </span>
            {isAdmin && currentHeatBadge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 12,
                  background: currentHeatBadge.bg,
                  color: currentHeatBadge.color,
                  border: `1px solid ${currentHeatBadge.border}`,
                }}
              >
                {currentHeatBadge.label}
              </span>
            )}
            {isAdmin && lead.isCycleEnded && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: '#1e293b',
                  color: '#fff',
                }}
              >
                End of Cycle
              </span>
            )}
            {isAdmin && lead.lostCycleCount > 0 && (
              <span style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>
                Lost Count: {lead.lostCycleCount}/{policy.maxLostCycles}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setActiveSection('step')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                background: activeSection === 'step' ? '#1b2b6b' : '#fff',
                color: activeSection === 'step' ? '#fff' : '#334155',
              }}
            >
              + Add Step
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('timeline')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                background: activeSection === 'timeline' ? '#1b2b6b' : '#fff',
                color: activeSection === 'timeline' ? '#fff' : '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <History size={12} />
              <span>Timeline ({steps.length})</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {activeSection === 'step' ? (
            <form id="lead-step-form" onSubmit={handleSubmit}>
              {lead.isCycleEnded && !isAdmin && lead.leadStatus !== 'CONVERTED BUSINESS' && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Lock size={15} />
                  <span>
                    This lead is currently closed. Contact an Administrator if further updates are needed.
                  </span>
                </div>
              )}

              {/* Outcome Category Selector */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                  SELECT INTERACTION / OUTCOME CATEGORY *
                </label>
                <select
                  value={selectedCategoryKey}
                  onChange={e => setSelectedCategoryKey(e.target.value)}
                  required
                  disabled={isCycleLockedForSales}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <option value="">-- Choose outcome category --</option>
                  {Object.entries(groupedCategories).map(([groupName, items]) => (
                    <optgroup key={groupName} label={groupName}>
                      {items.map(cat => {
                        const locked = isCategoryLockedForSales(cat)
                        const needsFirst =
                          !isAdmin &&
                          requiresFirstInteractionStatuses.includes(cat.leadStatus) &&
                          currentCycleInteractions === 0
                        return (
                          <option key={cat.key} value={cat.key} disabled={locked}>
                            {cat.label}
                            {needsFirst ? ' (Unlocked after 1st interaction)' : ''}
                            {isAdmin && cat.heatTier ? ` [${cat.leadStatus} • ${cat.heatTier}]` : ''}
                          </option>
                        )
                      })}
                    </optgroup>
                  ))}
                </select>
                {!isAdmin && currentCycleInteractions === 0 && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Showing valid 1st-interaction options. Lost, Converted, and Onboarded unlock after Step #1.
                  </div>
                )}
                {isAdmin && allowedStatusesForStage && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: '#475569', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showAllForAdmin}
                      onChange={e => setShowAllForAdmin(e.target.checked)}
                    />
                    <span>Show all statuses (Admin override for backward transition)</span>
                  </label>
                )}
                {selectedCatObj && (
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>
                    {isAdmin ? (
                      <>
                        Maps to System Status: <strong>{selectedCatObj.leadStatus}</strong> • Heat Classification:{' '}
                        <strong>{selectedCatObj.heatTier || 'UNCLASSIFIED'}</strong>
                      </>
                    ) : (
                      <>
                        Recorded Category: <strong>{selectedCatObj.label}</strong>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* FRD Section 4: Conditional Inquiry Intent Status (Active ONLY for HOT / WARM / COLD) */}
              {showInquiryIntentField ? (
                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 14,
                  }}
                >
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>
                    INQUIRY INTENT STATUS (DECISION STAGE)
                  </label>
                  <select
                    value={inquiryIntent}
                    onChange={e => setInquiryIntent(e.target.value)}
                    disabled={isCycleLockedForSales}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #7dd3fc',
                      fontSize: 13,
                      background: '#fff',
                    }}
                  >
                    <option value="">-- Select Inquiry Intent Status --</option>
                    {inquiryIntentOptions.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                lead.lastInquiryIntent && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '7px 11px',
                      marginBottom: 14,
                      fontSize: 11,
                      color: '#475569',
                    }}
                  >
                    Last Recorded Inquiry Intent (archived in history): <strong>{lead.lastInquiryIntent}</strong>
                  </div>
                )
              )}

              {/* Conditional LOST Reason */}
              {showLostFields && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#991b1b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} /> Mandatory Lost Reason
                  </div>
                  <select
                    value={lostReason}
                    onChange={e => setLostReason(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #fca5a5',
                      fontSize: 13,
                      background: '#fff',
                    }}
                  >
                    <option value="">-- Select Lost Reason --</option>
                    {lostReasons.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {lostReason === 'Other' && (
                    <input
                      type="text"
                      value={customLostNote}
                      onChange={e => setCustomLostNote(e.target.value)}
                      placeholder="Specify reason..."
                      style={{
                        width: '100%',
                        marginTop: 8,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #fca5a5',
                        fontSize: 13,
                      }}
                    />
                  )}
                  {isAdmin && (
                    <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 6 }}>
                      {(lead.lostCycleCount || 0) + (lead.leadStatus === 'LOST' ? 0 : 1) >= policy.maxLostCycles
                        ? `This reaches the max Lost cycle limit (${policy.maxLostCycles}/${policy.maxLostCycles}) and will close this lead.`
                        : policy.lostRecycleMode === 'auto_pool'
                        ? `Lost cycle ${(lead.lostCycleCount || 0) + 1}/${policy.maxLostCycles}: Lead will automatically return to System Pool for the next cycle.`
                        : `Lost cycle ${(lead.lostCycleCount || 0) + 1}/${policy.maxLostCycles}: Lead stays recyclable by Admin until ${policy.maxLostCycles} cycles are reached.`}
                    </div>
                  )}
                </div>
              )}

              {/* Conditional BUSINESS Fields (QUALIFIED / CONVERTED / ONBOARDED) */}
              {showBusinessFields && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#166534', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GraduationCap size={16} /> Business &amp; Financial Details ({targetStatus})
                  </div>

                  {isFinancialLockedForSales && (
                    <div style={{ fontSize: 11, color: '#991b1b', marginBottom: 8 }}>
                      Financial fields are locked for Sales after initial entry. Contact Admin to update.
                    </div>
                  )}

                  <div className="responsive-grid-2" style={{ marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#14532d', marginBottom: 4 }}>
                        COURSE PROGRAM (APPROVED MASTER) *
                      </label>
                      <select
                        value={businessProgramId}
                        onChange={e => handleProgramChange(e.target.value)}
                        disabled={isFinancialLockedForSales}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #86efac',
                          fontSize: 13,
                          background: '#fff',
                        }}
                      >
                        <option value="">-- Select Program --</option>
                        {programs.map(p => (
                          <option key={p._id || p.id} value={p._id || p.id}>
                            {p.name}
                            {p.code ? ` (${p.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedProgramObj?.variants?.length > 0 ? (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#14532d', marginBottom: 4 }}>
                          PROGRAM VARIANT
                        </label>
                        <select
                          value={businessProgramVariant}
                          onChange={e => handleVariantChange(e.target.value)}
                          disabled={isFinancialLockedForSales}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: '1px solid #86efac',
                            fontSize: 13,
                            background: '#fff',
                          }}
                        >
                          <option value="">-- Select Variant --</option>
                          {selectedProgramObj.variants.map(v => {
                            const vFee = selectedProgramObj.variantFees?.[v]
                            return (
                              <option key={v} value={v}>
                                {v}{vFee > 0 ? ` (₹${Number(vFee).toLocaleString('en-IN')})` : ''}
                              </option>
                            )
                          })}
                        </select>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: 11, color: '#166534', paddingBottom: 8 }}>
                        Program linked to central Program Master
                      </div>
                    )}
                  </div>

                  <div className="responsive-grid-2">
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#14532d', marginBottom: 4 }}>
                        COURSE FEES (₹ BUSINESS VALUE) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={courseFees}
                        onChange={e => setCourseFees(e.target.value)}
                        disabled={isFinancialLockedForSales}
                        placeholder="e.g. 65000"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #86efac',
                          fontSize: 13,
                          background: '#fff',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#14532d', marginBottom: 4 }}>
                        TOTAL PAID AMOUNT (AUTO-SUM FROM RECEIPTS)
                      </label>
                      <div
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #bbf7d0',
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#059669',
                          background: '#f8fafc',
                          boxSizing: 'border-box',
                        }}
                      >
                        {formatINR(paidNum)}
                      </div>
                      <div style={{ fontSize: 10, color: '#047857', marginTop: 3 }}>
                        {localReceipts.length > 0
                          ? `Summed from ${localReceipts.length} recorded receipt(s)`
                          : 'Enter any payment below (leave blank for ₹0)'}
                      </div>
                    </div>
                  </div>

                  {/* Single Payment / Installment Receipt Entry (FRD Section 8 & 9) */}
                  <div
                    style={{
                      marginTop: 12,
                      padding: 10,
                      background: '#ffffff',
                      borderRadius: 6,
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#14532d', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>RECORD PAYMENT / INSTALLMENT RECEIPT ({localReceipts.length})</span>
                      {feesNum > 0 && paidNum > feesNum && (
                        <span style={{ color: '#b91c1c', background: '#fee2e2', padding: '2px 7px', borderRadius: 10, fontSize: 10 }}>
                          Flagged: Paid exceeds Course Fees
                        </span>
                      )}
                    </div>

                    {localReceipts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10, maxHeight: 130, overflowY: 'auto' }}>
                        {localReceipts.map((rec, idx) => (
                          <div
                            key={rec._id || idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: 11,
                              padding: '5px 8px',
                              background: '#f8fafc',
                              borderRadius: 5,
                              border: '1px solid #e2e8f0',
                              gap: 8,
                            }}
                          >
                            <div>
                              <strong style={{ color: '#059669' }}>{formatINR(rec.amount)}</strong>
                              <span style={{ color: '#475569', marginLeft: 6 }}>{rec.paymentMode}</span>
                              {rec.referenceNo && (
                                <span style={{ color: '#64748b', marginLeft: 6, fontFamily: 'monospace' }}>Ref: {rec.referenceNo}</span>
                              )}
                              {rec.note && <span style={{ color: '#64748b', marginLeft: 6 }}>— {rec.note}</span>}
                            </div>
                            <div style={{ color: '#64748b', fontSize: 10, whiteSpace: 'nowrap' }}>
                              {rec.receiptDate ? new Date(rec.receiptDate).toLocaleDateString() : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isFinancialLockedForSales && (
                      <div className="responsive-grid-3">
                        <input
                          type="number"
                          min="0"
                          placeholder="Payment Amt ₹ (0 if unpaid)"
                          value={receiptAmount}
                          onChange={e => setReceiptAmount(e.target.value)}
                          style={{ padding: '6px 8px', borderRadius: 5, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                        <input
                          type="date"
                          value={receiptDate}
                          onChange={e => setReceiptDate(e.target.value)}
                          style={{ padding: '6px 8px', borderRadius: 5, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                        <select
                          value={receiptMode}
                          onChange={e => setReceiptMode(e.target.value)}
                          style={{ padding: '6px 8px', borderRadius: 5, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                        >
                          {PAYMENT_MODES.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="UTR / Reference No."
                          value={receiptRef}
                          onChange={e => setReceiptRef(e.target.value)}
                          style={{ padding: '6px 8px', borderRadius: 5, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                        <input
                          type="text"
                          className="receipt-note-span"
                          placeholder="Receipt note (optional)"
                          value={receiptNote}
                          onChange={e => setReceiptNote(e.target.value)}
                          style={{ padding: '6px 8px', borderRadius: 5, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                      </div>
                    )}
                  </div>

                  {(feesNum > 0 || paidNum > 0) && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '8px 10px',
                        background: feesNum > 0 && paidNum > feesNum ? '#fef2f2' : '#ffffff',
                        borderRadius: 6,
                        border: feesNum > 0 && paidNum > feesNum ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <span>Business Value: <strong>{formatINR(feesNum)}</strong></span>
                      <span>Collected: <strong style={{ color: '#059669' }}>{formatINR(paidNum)}</strong></span>
                      <span>Balance: <strong style={{ color: '#d97706' }}>{formatINR(pendingNum)}</strong></span>
                    </div>
                  )}

                  {isAdmin && policy.allowAdminBusinessFieldException && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: '#14532d', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={adminException}
                        onChange={e => setAdminException(e.target.checked)}
                      />
                      <span>Admin Exception: Allow saving without filling all 3 business fields</span>
                    </label>
                  )}
                </div>
              )}

              {/* Preserved Business Data notice on backward transitions */}
              {!showBusinessFields && hasPreviousFinancial && (
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 14,
                    fontSize: 12,
                    color: '#1e40af',
                  }}
                >
                  <strong>Retained Business Record:</strong> {lead.businessProgramName || 'Program'} • Fees:{' '}
                  {formatINR(lead.courseFees)} • Paid: {formatINR(lead.paidAmount)} *(preserved in history — will not be deleted)*
                </div>
              )}

              {/* Callback & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    STEP REMARKS / CONVERSATION NOTE
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    disabled={isCycleLockedForSales}
                    placeholder="Record call summary, candidate questions, or next action..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      resize: 'vertical',
                    }}
                  />
                </div>
                {!showLostFields && targetStatus !== 'NON PROSPECT' && targetStatus !== 'ONBOARDED BUSINESS' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      NEXT FOLLOW-UP / CALLBACK (OPTIONAL)
                    </label>
                    <input
                      type="datetime-local"
                      value={callbackAt}
                      onChange={e => setCallbackAt(e.target.value)}
                      disabled={isCycleLockedForSales}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                      }}
                    />
                  </div>
                )}
              </div>
            </form>
          ) : (
            /* Step-by-Step Audit Timeline */
            <div>
              {steps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: 13 }}>
                  No lifecycle steps logged yet for this lead.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {steps.map((st, idx) => {
                    const stBadge = getStatusBadgeStyle(st.newStatus)
                    const hBadge =
                      isAdmin && st.heatTier && st.heatTier !== st.newStatus
                        ? getHeatBadgeStyle(st.heatTier)
                        : null
                    return (
                      <div
                        key={idx}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: 12,
                          background: '#ffffff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>
                              Step #{st.stepNumber}
                            </span>
                            {isAdmin && (
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                                Cycle #{st.cycleNumber || 1}
                              </span>
                            )}
                            {isAdmin ? (
                              <>
                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                  {st.previousStatus} →
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                    background: stBadge.bg,
                                    color: stBadge.color,
                                  }}
                                >
                                  {st.newStatus}
                                </span>
                                {hBadge && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      padding: '2px 7px',
                                      borderRadius: 10,
                                      background: hBadge.bg,
                                      color: hBadge.color,
                                    }}
                                  >
                                    {hBadge.label}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>
                                {st.selectedCategoryLabel || st.newStatus}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {st.timestamp ? new Date(st.timestamp).toLocaleString() : ''}
                          </span>
                        </div>
                        {st.selectedCategoryLabel && isAdmin && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginTop: 4 }}>
                            Category: {st.selectedCategoryLabel}
                          </div>
                        )}
                        {st.note && (
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{st.note}</div>
                        )}
                        {st.lostReason && (
                          <div style={{ fontSize: 11, color: '#991b1b', marginTop: 4, fontWeight: 600 }}>
                            Lost Reason: {st.lostReason}
                          </div>
                        )}
                        {st.businessSnapshot?.businessProgramName && (
                          <div style={{ fontSize: 11, color: '#047857', marginTop: 4, fontWeight: 600 }}>
                            Business: {st.businessSnapshot.businessProgramName}
                            {st.businessSnapshot.businessProgramVariant ? ` (${st.businessSnapshot.businessProgramVariant})` : ''} • Fees:{' '}
                            {formatINR(st.businessSnapshot.courseFees)} • Paid: {formatINR(st.businessSnapshot.paidAmount)}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
                          By: {st.updatedBy?.name || 'System'} ({st.updatedBy?.role || 'system'})
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-pulse-secondary" onClick={onClose} disabled={saving}>
            Close
          </button>
          {activeSection === 'step' && (
            <button
              type="submit"
              form="lead-step-form"
              className="btn-pulse"
              disabled={saving || isCycleLockedForSales}
              style={{ opacity: saving || isCycleLockedForSales ? 0.5 : 1 }}
            >
              <CheckCircle2 size={14} />
              <span>
                {saving
                  ? showBusinessFields && Number(receiptAmount) > 0
                    ? 'Saving Step & Receipt...'
                    : 'Saving Step...'
                  : showBusinessFields && Number(receiptAmount) > 0
                  ? 'Save Step & Add Receipt'
                  : 'Save Step & Update Lead'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
