import React, { useState, useEffect } from 'react'
import Login from './Login'
import AdminDashboard from './admin/AdminDashboard'
import SalesDashboard from './sales/SalesDashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [initialCheck, setInitialCheck] = useState(true)

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
  }

  const handleLogout = () => {
    localStorage.removeItem('leadpulse_token')
    localStorage.removeItem('leadpulse_user')
    setUser(null)
  }

  if (initialCheck) {
    return null
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />
  }

  return <SalesDashboard user={user} onLogout={handleLogout} />
}

