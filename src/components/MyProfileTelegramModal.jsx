import React, { useState, useEffect } from 'react'
import {
  X,
  User,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Bell,
  RefreshCw,
} from 'lucide-react'
import { api } from '../api'

export default function MyProfileTelegramModal({
  isOpen,
  user,
  onClose,
  onProfileUpdated,
  showNotify,
}) {
  const isAdmin = user?.role === 'admin'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [botStatus, setBotStatus] = useState({ configured: false, botUsername: '', botName: '' })
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [prefs, setPrefs] = useState({
    newLead: true,
    leadAssigned: true,
    discountRequested: true,
    discountDecision: true,
    businessMilestone: true,
  })
  const [feedback, setFeedback] = useState(null)
  const [fetchingChats, setFetchingChats] = useState(false)
  const [detectedChats, setDetectedChats] = useState([])

  useEffect(() => {
    if (!isOpen) return
    setFeedback(null)
    setLoading(true)
    api
      .getMyProfile()
      .then(res => {
        const u = res?.user || user || {}
        setTelegramChatId(u.telegramChatId || '')
        setTelegramEnabled(Boolean(u.telegramNotificationsEnabled))
        setPrefs({
          newLead: u.telegramPreferences?.newLead !== false,
          leadAssigned: u.telegramPreferences?.leadAssigned !== false,
          discountRequested: u.telegramPreferences?.discountRequested !== false,
          discountDecision: u.telegramPreferences?.discountDecision !== false,
          businessMilestone: u.telegramPreferences?.businessMilestone !== false,
        })
        if (res?.telegramBotStatus) {
          setBotStatus(res.telegramBotStatus)
        }
      })
      .catch(err => {
        setFeedback({ type: 'error', message: err.message || 'Failed to load profile settings.' })
      })
      .finally(() => setLoading(false))
  }, [isOpen])

  if (!isOpen) return null

  const cleanBotHandle = (botStatus.botUsername || '').replace(/^@/, '')

  const handleFetchChats = async () => {
    setFetchingChats(true)
    setFeedback(null)
    try {
      const res = await api.getTelegramChats()
      const chats = Array.isArray(res?.chats) ? res.chats : []
      setDetectedChats(chats)
      if (chats.length === 0) {
        setFeedback({
          type: 'error',
          message: `No recent chats found yet. Open ${botStatus.botUsername || 'your bot'} and press Start (/start), then click Fetch Chat IDs again.`,
        })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch recent Telegram chats.' })
    } finally {
      setFetchingChats(false)
    }
  }

  const handleSendTest = async () => {
    const cleanId = String(telegramChatId || '').trim()
    if (!cleanId) {
      setFeedback({ type: 'error', message: 'Please enter your Telegram Chat ID first.' })
      return
    }
    setTesting(true)
    setFeedback(null)
    try {
      const res = await api.testMyTelegram({ chatId: cleanId })
      const msg = res.message || 'Test message delivered to your Telegram!'
      setFeedback({ type: 'success', message: msg })
      showNotify?.('success', msg)
    } catch (err) {
      const msg = err.message || 'Failed to send test Telegram alert.'
      setFeedback({ type: 'error', message: msg })
      showNotify?.('error', msg)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async e => {
    e.preventDefault()
    const cleanId = String(telegramChatId || '').trim()
    if (isAdmin && telegramEnabled && !cleanId) {
      setFeedback({
        type: 'error',
        message: 'Please enter your Telegram Chat ID before enabling notifications.',
      })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const payload = isAdmin
        ? {
            telegramChatId: cleanId,
            telegramNotificationsEnabled: telegramEnabled,
            telegramPreferences: prefs,
          }
        : {
            telegramChatId: cleanId,
          }
      const res = await api.updateMyProfile(payload)
      if (res?.user) {
        localStorage.setItem('leadpulse_user', JSON.stringify(res.user))
        onProfileUpdated?.(res.user)
      }
      const msg = res?.message || (isAdmin ? 'Profile & Telegram settings saved!' : 'Telegram Chat ID saved to your profile!')
      setFeedback({ type: 'success', message: msg })
      showNotify?.('success', msg)
    } catch (err) {
      const msg = err.message || 'Failed to save profile settings.'
      setFeedback({ type: 'error', message: msg })
      showNotify?.('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const roleEventOptions = isAdmin
    ? [
        {
          key: 'newLead',
          label: 'New Leads Captured',
          desc: 'Alert when a new lead arrives via Meta or manual entry',
        },
        {
          key: 'discountRequested',
          label: 'Discount Approval Requests',
          desc: 'Alert when a sales counselor submits a discount for your approval',
        },
        {
          key: 'businessMilestone',
          label: 'Business Milestones Reached',
          desc: 'Alert when a lead reaches Qualified, Converted, or Onboarded Business',
        },
      ]
    : [
        {
          key: 'leadAssigned',
          label: 'Leads Assigned to Me',
          desc: 'Only your own newly assigned, auto-assigned, Meta-routed, or recycled leads',
        },
        {
          key: 'discountDecision',
          label: 'My Discount Approvals & Rejections',
          desc: 'Instant alert when Admin approves or rejects your discount request',
        },
        {
          key: 'businessMilestone',
          label: 'My Lead Milestone Updates',
          desc: 'Alert when Admin updates one of your assigned leads to a Business milestone',
        },
      ]

  return (
    <div className="modal-overlay" style={{ zIndex: 1120 }} onClick={() => !saving && onClose?.()}>
      <div
        className="modal-card"
        style={{ maxWidth: 560, width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ background: '#1b2b6b', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={18} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#ffffff' }}>My Profile &amp; Telegram Alerts</h3>
              <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                {user?.name} • {user?.email}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                Loading your profile settings...
              </div>
            ) : (
              <>
                {/* Account Summary */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{user?.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {user?.title || (isAdmin ? 'Administrator' : 'Admissions Counselor')}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 12,
                      background: isAdmin ? '#ede9fe' : '#e0f2fe',
                      color: isAdmin ? '#6d28d9' : '#0369a1',
                    }}
                  >
                    {isAdmin ? 'Administrator' : 'Sales Counselor'}
                  </span>
                </div>

                {/* Bot Status & Quick Start Link */}
                <div
                  style={{
                    border: `1px solid ${botStatus.configured ? '#bae6fd' : '#fecaca'}`,
                    background: botStatus.configured ? '#f0f9ff' : '#fef2f2',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 12,
                    color: '#334155',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 700, color: botStatus.configured ? '#0369a1' : '#991b1b', marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Bell size={14} />
                      <span>
                        {botStatus.configured
                          ? `Bot Connected${botStatus.botUsername ? `: ${botStatus.botUsername}` : ''}`
                          : 'Telegram Bot Not Configured on Server'}
                      </span>
                    </span>
                    {cleanBotHandle && (
                      <a
                        href={`https://t.me/${cleanBotHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#0284c7',
                          textDecoration: 'none',
                          background: '#ffffff',
                          border: '1px solid #bae6fd',
                          padding: '2px 8px',
                          borderRadius: 6,
                        }}
                      >
                        <span>Open Bot &amp; Tap /start</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    Step 1: Open the bot above in Telegram and press <strong>Start (/start)</strong>. Step 2: Enter your personal numeric Chat ID below and click <strong>Send Test</strong>.
                  </div>
                </div>

                {/* Enable / Disable Switch (Admin editable; Sales read-only managed by Admin) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      Telegram Alert Status
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {isAdmin
                        ? 'Receive Admin alerts directly on your Telegram'
                        : 'Managed by Administrator — save your Chat ID below so Admin can enable your alerts'}
                    </div>
                  </div>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setTelegramEnabled(prev => !prev)}
                      style={{
                        background: telegramEnabled ? '#0284c7' : '#cbd5e1',
                        border: 'none',
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        padding: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: telegramEnabled ? 'flex-end' : 'flex-start',
                        transition: 'background 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 12,
                        background: telegramEnabled ? '#dcfce7' : '#e2e8f0',
                        color: telegramEnabled ? '#15803d' : '#475569',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {telegramEnabled ? 'Enabled by Admin' : 'Disabled (Admin Only)'}
                    </span>
                  )}
                </div>

                {/* Chat ID Input + Test Button */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    My Telegram Chat ID
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="e.g. 123456789"
                      value={telegramChatId}
                      onChange={e => {
                        setTelegramChatId(e.target.value)
                        if (feedback) setFeedback(null)
                      }}
                      style={{
                        flex: '1 1 200px',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                      }}
                    />
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-pulse-secondary"
                        onClick={handleFetchChats}
                        disabled={fetchingChats}
                        style={{
                          fontSize: 12,
                          padding: '8px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          color: '#0369a1',
                          borderColor: '#7dd3fc',
                        }}
                      >
                        <RefreshCw size={13} className={fetchingChats ? 'animate-spin' : ''} />
                        <span>{fetchingChats ? 'Fetching...' : 'Fetch Chat IDs'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-pulse-secondary"
                      onClick={handleSendTest}
                      disabled={testing || !String(telegramChatId || '').trim()}
                      style={{ fontSize: 12, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Send size={13} />
                      <span>{testing ? 'Sending...' : 'Send Test'}</span>
                    </button>
                  </div>
                  {isAdmin && detectedChats.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        border: '1px solid #bae6fd',
                        borderRadius: 6,
                        padding: '8px 10px',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                        maxHeight: 150,
                        overflowY: 'auto',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>
                        Click your chat to auto-fill Chat ID:
                      </div>
                      {detectedChats.map(c => (
                        <button
                          key={c.chatId}
                          type="button"
                          onClick={() => {
                            setTelegramChatId(c.chatId)
                            setFeedback({
                              type: 'success',
                              message: `Selected Chat ID ${c.chatId} (${c.displayName}). Click Send Test or Save Profile Settings.`,
                            })
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '6px 9px',
                            borderRadius: 6,
                            border: telegramChatId === c.chatId ? '1px solid #0284c7' : '1px solid #e2e8f0',
                            background: telegramChatId === c.chatId ? '#e0f2fe' : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                              {c.displayName} {c.username ? <span style={{ color: '#64748b', fontWeight: 500 }}>({c.username})</span> : null}
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                              ID: <strong>{c.chatId}</strong> • {c.type}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>Use</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline Feedback Banner */}
                {feedback && (
                  <div
                    role="alert"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                      background: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
                      color: feedback.type === 'error' ? '#991b1b' : '#166534',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {feedback.type === 'error' ? (
                        <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                      ) : (
                        <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                      )}
                      <span>{feedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedback(null)}
                      style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Role-Specific Personal Preferences (Editable by Admin only; Read-Only for Sales Reps) */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    {isAdmin
                      ? 'Choose Which Notifications You Receive'
                      : 'Active Notification Rules (Configured by Admin)'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {roleEventOptions.map(opt => {
                      const isChecked = prefs[opt.key] !== false
                      return (
                        <label
                          key={opt.key}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            background: isAdmin ? '#ffffff' : '#f8fafc',
                            cursor: isAdmin ? 'pointer' : 'default',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!isAdmin}
                            onChange={e =>
                              isAdmin && setPrefs(prev => ({ ...prev, [opt.key]: e.target.checked }))
                            }
                            style={{ marginTop: 3 }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{opt.label}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{opt.desc}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-pulse-secondary" onClick={onClose} disabled={saving}>
              Close
            </button>
            <button type="submit" className="btn-pulse" disabled={saving || loading}>
              <Save size={14} />
              <span>{saving ? 'Saving...' : isAdmin ? 'Save Profile Settings' : 'Save Chat ID'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
