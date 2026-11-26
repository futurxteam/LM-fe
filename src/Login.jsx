import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { api } from './api'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await api.login(email, password)
      if (res && res.success && res.user) {
        localStorage.setItem('leadpulse_token', res.token)
        localStorage.setItem('leadpulse_user', JSON.stringify(res.user))
        onLoginSuccess(res.user)
      } else {
        setError(res?.message || 'Authentication failed. Please verify credentials.')
      }
    } catch (err) {
      setError(err.message || 'Login error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Header */}
        <div className="login-card-header" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', marginBottom: 12 }}>
            <img src="/logo-brand-white.png" alt="Futureace Academy Logo" style={{ maxHeight: 46, width: 'auto' }} />
          </div>
          <h2>CRM</h2>
        </div>

        {/* Body */}
        <div className="login-card-body">
          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '8px 12px',
                borderRadius: 4,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {/* Single Login Form — redirects automatically based on verified role */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@futureaceacademy.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

