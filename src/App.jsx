import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Login from './Login'
import AdminDashboard from './admin/AdminDashboard'
import SalesDashboard from './sales/SalesDashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [initialCheck, setInitialCheck] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Check persisted session
    const savedUser = localStorage.getItem('leadpulse_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (err) {
        console.error('Failed to parse saved user', err)
      }
    }
    setInitialCheck(false)
  }, [])

  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser)
    if (authenticatedUser.role === 'admin') {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/queue', { replace: true })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('leadpulse_token')
    localStorage.removeItem('leadpulse_user')
    setUser(null)
    navigate('/login', { replace: true })
  }

  if (initialCheck) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0b1120' }}>
        <div className="data-loader-spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (user.role === 'admin') {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/pool" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/leads" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/all-leads" element={<Navigate to="/leads" replace />} />
        <Route path="/reports" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/users" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/team" element={<Navigate to="/users" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    )
  }

  // Counselor / Sales Rep Routes
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/queue" replace />} />
      <Route path="/login" element={<Navigate to="/queue" replace />} />
      <Route path="/queue" element={<SalesDashboard user={user} onLogout={handleLogout} />} />
      <Route path="/team" element={<SalesDashboard user={user} onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/queue" replace />} />
    </Routes>
  )
}
