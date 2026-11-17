/**
 * Audio Chime and Browser Push Notification Utilities
 * for LeadPulse CRM / Futureace Academy
 */

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioCtx) {
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Play a high-clarity dual-tone chime (C5 -> E5) using Web Audio API
 */
export function playChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Tone 1: 523.25 Hz (C5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now)
    gain1.gain.setValueAtTime(0.18, now)
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Tone 2: 783.99 Hz (G5) chime
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(783.99, now + 0.12)
    gain2.gain.setValueAtTime(0.22, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.65)
  } catch (err) {
    console.warn('Audio chime playback failed:', err)
  }
}

/**
 * Request browser desktop notification permissions
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  try {
    const perm = await Notification.requestPermission()
    return perm
  } catch (err) {
    console.warn('Notification permission error:', err)
    return 'denied'
  }
}

/**
 * Trigger desktop push notification
 */
export function sendDesktopNotification(title, body, tag = 'crm-new-lead') {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }
  if (Notification.permission !== 'granted') {
    return null
  }

  try {
    const notif = new Notification(title, {
      body: body || 'New candidate submitted a form and is waiting in the CRM pool.',
      icon: '/favicon.ico',
      tag,
      renotify: true,
      requireInteraction: false,
    })

    notif.onclick = () => {
      window.focus()
      notif.close()
    }

    return notif
  } catch (err) {
    console.warn('Desktop notification error:', err)
    return null
  }
}
