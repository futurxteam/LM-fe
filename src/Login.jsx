import React, { useState } from 'react'
import { Shield, User, Lock, Mail, ArrowRight } from 'lucide-react'
import { api } from './api'

export default function Login({ onLoginSuccess }) {
  const [role, setRole] = useState('sales') // 'sales' or 'admin'
  const [email, setEmail] = useState('sales@leadpulse.com')
  const [password, setPassword] = useState('sales123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRoleToggle = (selectedRole) => {
    setRole(selectedRole)
    setError('')
    if (selectedRole === 'admin') {
      setEmail('admin@leadpulse.com')
      setPassword('admin123')
    } else {
      setEmail('sales@leadpulse.com')
      setPassword('sales123')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await api.login(email, password, role)
      if (res && res.success) {
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

  const handleDemoLogin = async (demoRole) => {
    handleRoleToggle(demoRole)
    const demoEmail = demoRole === 'admin' ? 'admin@leadpulse.com' : 'jordan@leadpulse.com'
    setLoading(true)
    try {
      const res = await api.login(demoEmail, 'password123', demoRole)
      if (res && res.success && res.user) {
        localStorage.setItem('leadpulse_token', res.token)
        localStorage.setItem('leadpulse_user', JSON.stringify(res.user))
        onLoginSuccess(res.user)
        return
      }
    } catch (err) {
      console.warn('API login error, using safe fallback', err)
    } finally {
      setLoading(false)
    }

    const demoUser = {
      id: demoRole === 'admin' ? 'admin_01' : 'sales_01',
      name: demoRole === 'admin' ? 'Alex Sterling' : 'Jordan Chase',
      email: demoEmail,
      role: demoRole,
      title: demoRole === 'admin' ? 'System Administrator' : 'Senior Sales Executive',
    }
    localStorage.setItem('leadpulse_token', `demo_token_${demoRole}`)
    localStorage.setItem('leadpulse_user', JSON.stringify(demoUser))
    onLoginSuccess(demoUser)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Header */}
        <div className="login-card-header" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', marginBottom: 12 }}>
            <img src="/logo-brand-white.png" alt="Futureace Academy Logo" style={{ maxHeight: 46, width: 'auto' }} />
          </div>
          <h2>Futureace Academy CRM</h2>
          <p>Admissions & Counselor Portal</p>
        </div>

        {/* Body */}
        <div className="login-card-body">
          {/* Role Selector Tabs */}
          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab ${role === 'sales' ? 'active' : ''}`}
              onClick={() => handleRoleToggle('sales')}
            >
              <User size={14} style={{ display: 'inline', marginRight: 6 }} />
              Sales Rep
            </button>
            <button
              type="button"
              className={`role-tab ${role === 'admin' ? 'active' : ''}`}
              onClick={() => handleRoleToggle('admin')}
            >
              <Shield size={14} style={{ display: 'inline', marginRight: 6 }} />
              Administrator
            </button>
          </div>

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

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@leadpulse.com"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Authenticating...' : `Sign in as ${role === 'admin' ? 'Admin' : 'Sales'}`}
            </button>
          </form>

          {/* Demo 1-Click Buttons */}
          <div className="demo-credentials-box">
            <div className="demo-credentials-title">Quick 1-Click Demo Login</div>
            <div className="demo-btn-group">
              <button
                type="button"
                className="btn-demo"
                onClick={() => handleDemoLogin('sales')}
              >
                👤 Test as Sales
              </button>
              <button
                type="button"
                className="btn-demo"
                onClick={() => handleDemoLogin('admin')}
              >
                🛡️ Test as Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

