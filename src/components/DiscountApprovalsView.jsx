import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Tag,
  X,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { api } from '../api'
import { formatINR } from '../constants/leadLifecycle'

export default function DiscountApprovalsView({ onCountsChanged, showNotify }) {
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState('PENDING') // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [requests, setRequests] = useState([])
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 })

  // Review Modal state
  const [selectedReq, setSelectedReq] = useState(null)
  const [editedAgreedAmount, setEditedAgreedAmount] = useState('')
  const [adminRemarks, setAdminRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadApprovals = async (targetPage = page) => {
    setLoading(true)
    try {
      const res = await api.getDiscountApprovals({
        status: statusTab,
        search: search.trim() || undefined,
        page: targetPage,
        limit: 30,
      })
      if (res?.success) {
        setRequests(res.requests || [])
        setCounts(res.counts || { pending: 0, approved: 0, rejected: 0 })
        setPagination(res.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 })
        onCountsChanged?.(res.counts?.pending ?? 0)
      }
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to load discount approvals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    loadApprovals(1)
  }, [statusTab])

  const openReviewModal = req => {
    setSelectedReq(req)
    setEditedAgreedAmount(String(req.finalAgreedAmount ?? req.requestedAgreedAmount ?? ''))
    setAdminRemarks(req.adminRemarks || '')
  }

  const handleApprove = async () => {
    if (!selectedReq) return
    const agreedNum = Number(editedAgreedAmount)
    if (Number.isNaN(agreedNum) || agreedNum < 0) {
      showNotify?.('error', 'Please enter a valid Agreed Amount')
      return
    }
    if (agreedNum > Number(selectedReq.standardCourseFee || 0)) {
      showNotify?.('error', 'Approved Agreed Amount cannot exceed Standard Course Fee')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.approveDiscountRequest(selectedReq.id, {
        finalAgreedAmount: agreedNum,
        adminRemarks: adminRemarks.trim(),
      })
      showNotify?.('success', res.message || 'Discount approved!')
      setSelectedReq(null)
      loadApprovals(page)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to approve discount')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!selectedReq) return
    if (!window.confirm(`Reject discount request for "${selectedReq.leadName}"? The lead will be unlocked at its previous status.`)) {
      return
    }
    setSubmitting(true)
    try {
      const res = await api.rejectDiscountRequest(selectedReq.id, {
        adminRemarks: adminRemarks.trim(),
      })
      showNotify?.('success', res.message || 'Discount rejected')
      setSelectedReq(null)
      loadApprovals(page)
    } catch (err) {
      showNotify?.('error', err.message || 'Failed to reject discount')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header & Controls */}
      <div className="pool-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, width: '100%' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={18} color="#be185d" />
              <span>Discount Approvals Queue</span>
              {counts.pending > 0 && (
                <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12, background: '#fee2e2', color: '#b91c1c' }}>
                  {counts.pending} Pending
                </span>
              )}
            </h3>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Review discount requests submitted by Sales Reps before lead status changes take effect or enter Discount Reports.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <form
              onSubmit={e => {
                e.preventDefault()
                setPage(1)
                loadApprovals(1)
              }}
              style={{ position: 'relative' }}
            >
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student, rep, reason..."
                style={{ padding: '7px 12px 7px 30px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: 220 }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
            </form>
            <button
              type="button"
              onClick={() => loadApprovals(page)}
              className="btn-pulse-secondary"
              style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'PENDING', label: `Pending (${counts.pending})`, color: '#b45309', bg: '#fef3c7' },
            { id: 'APPROVED', label: `Approved (${counts.approved})`, color: '#047857', bg: '#dcfce7' },
            { id: 'REJECTED', label: `Rejected (${counts.rejected})`, color: '#b91c1c', bg: '#fee2e2' },
            { id: 'ALL', label: 'All Requests', color: '#334155', bg: '#f1f5f9' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatusTab(t.id)}
              style={{
                padding: '6px 13px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: statusTab === t.id ? `1.5px solid ${t.color}` : '1px solid #e2e8f0',
                background: statusTab === t.id ? t.bg : '#fff',
                color: statusTab === t.id ? t.color : '#475569',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Paginated Table (30 per page) */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
        <table className="master-table" style={{ width: '100%', fontSize: 12 }}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Program & Target Status</th>
              <th>Initial Fee</th>
              <th>Requested Agreed</th>
              <th>Discount</th>
              <th>Reason</th>
              <th>Requested By</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                  Loading discount approval requests...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                  No {statusTab === 'ALL' ? '' : statusTab.toLowerCase()} discount requests found.
                </td>
              </tr>
            ) : (
              requests.map(r => {
                const effAgreed = r.status === 'APPROVED' && r.finalAgreedAmount !== null ? r.finalAgreedAmount : r.requestedAgreedAmount
                const effDisc = r.status === 'APPROVED' && r.finalDiscountAmount !== null ? r.finalDiscountAmount : r.requestedDiscountAmount
                const pct = r.standardCourseFee > 0 ? Math.round((effDisc / r.standardCourseFee) * 1000) / 10 : 0
                return (
                  <tr
                    key={r.id}
                    onClick={() => openReviewModal(r)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.leadName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{r.leadPhone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.programName || 'Program'}</div>
                      <div style={{ fontSize: 10, color: '#0369a1', fontWeight: 700 }}>{r.targetStatus}</div>
                    </td>
                    <td>{formatINR(r.standardCourseFee)}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(effAgreed)}</td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#be123c' }}>-{formatINR(effDisc)}</div>
                      <div style={{ fontSize: 10, color: '#9f1239' }}>({pct}%)</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.discountReason}</div>
                      {r.discountReasonDescription && (
                        <div style={{ fontSize: 10, color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.discountReasonDescription}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.requestedBy?.name || 'Staff'}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: r.status === 'PENDING' ? '#fef3c7' : r.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                          color: r.status === 'PENDING' ? '#92400e' : r.status === 'APPROVED' ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          openReviewModal(r)
                        }}
                        className={r.status === 'PENDING' ? 'btn-pulse' : 'btn-pulse-secondary'}
                        style={{ fontSize: 11, padding: '5px 10px' }}
                      >
                        {r.status === 'PENDING' ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer (30 per page) */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#64748b',
          }}
        >
          <span>
            Showing {requests.length} of {pagination.total} request(s) (30 per page)
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => {
                const next = pagination.page - 1
                setPage(next)
                loadApprovals(next)
              }}
              className="btn-pulse-secondary"
              style={{ padding: '4px 10px', fontSize: 12, opacity: pagination.page <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                const next = pagination.page + 1
                setPage(next)
                loadApprovals(next)
              }}
              className="btn-pulse-secondary"
              style={{ padding: '4px 10px', fontSize: 12, opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Review & Decision Modal */}
      {selectedReq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !submitting && setSelectedReq(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 540,
              overflow: 'hidden',
              boxShadow: '0 24px 54px rgba(0,0,0,0.28)',
            }}
          >
            <div style={{ background: '#0f172a', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  Discount Approval: {selectedReq.leadName}
                </div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>
                  {selectedReq.leadPhone} • Requested by {selectedReq.requestedBy?.name} • Target: {selectedReq.targetStatus}
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setSelectedReq(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Financial Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>INITIAL COURSE FEE</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {formatINR(selectedReq.standardCourseFee)}
                  </div>
                </div>
                <div style={{ background: '#fff1f2', padding: 10, borderRadius: 8, border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9f1239' }}>REQUESTED AGREED</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#be123c', marginTop: 2 }}>
                    {formatINR(selectedReq.requestedAgreedAmount)}
                  </div>
                </div>
                <div style={{ background: '#fef3c7', padding: 10, borderRadius: 8, border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e' }}>REQUESTED DISCOUNT</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#b45309', marginTop: 2 }}>
                    -{formatINR(selectedReq.requestedDiscountAmount)}
                  </div>
                </div>
              </div>

              {/* Reason Box */}
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>DISCOUNT REASON</div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedReq.discountReason}</div>
                {selectedReq.discountReasonDescription && (
                  <div style={{ color: '#475569', marginTop: 4 }}>{selectedReq.discountReasonDescription}</div>
                )}
                {selectedReq.pendingPayload?.newReceipt?.amount > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', color: '#047857', fontWeight: 600 }}>
                    Pending Payment Receipt: {formatINR(selectedReq.pendingPayload.newReceipt.amount)} ({selectedReq.pendingPayload.newReceipt.paymentMode || 'UPI'})
                  </div>
                )}
              </div>

              {selectedReq.status === 'PENDING' ? (
                <>
                  {/* Admin Editable Final Agreed Amount */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                      APPROVED AGREED AMOUNT (₹) — Admin can adjust before approving
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedReq.standardCourseFee}
                      value={editedAgreedAmount}
                      onChange={e => setEditedAgreedAmount(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1.5px solid #0284c7', fontSize: 14, fontWeight: 700 }}
                    />
                    {editedAgreedAmount !== '' && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#be123c', marginTop: 4 }}>
                        Final Discount to Apply: {formatINR(Math.max(0, Number(selectedReq.standardCourseFee || 0) - Number(editedAgreedAmount || 0)))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                      ADMIN REMARKS / NOTE (Optional — visible to Sales Rep)
                    </label>
                    <textarea
                      rows={2}
                      value={adminRemarks}
                      onChange={e => setAdminRemarks(e.target.value)}
                      placeholder="Add approval note or rejection reason..."
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleReject}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1px solid #fca5a5',
                        background: '#fee2e2',
                        color: '#b91c1c',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <XCircle size={15} />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleApprove}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#059669',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>{submitting ? 'Processing...' : 'Approve & Update Lead'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
                  <div>
                    <strong>Decision:</strong> {selectedReq.status} by {selectedReq.decidedBy?.name || 'Admin'}
                  </div>
                  {selectedReq.status === 'APPROVED' && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Final Agreed:</strong> {formatINR(selectedReq.finalAgreedAmount)} (Discount: {formatINR(selectedReq.finalDiscountAmount)})
                    </div>
                  )}
                  {selectedReq.adminRemarks && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Admin Remarks:</strong> {selectedReq.adminRemarks}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

