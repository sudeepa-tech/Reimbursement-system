import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  const token = localStorage.getItem('reimbursepro_token')
  const cachedUser = localStorage.getItem('reimbursepro_user')

  if (token && cachedUser) {
    try {
      const parsedUser = JSON.parse(cachedUser)

      if (!parsedUser || typeof parsedUser !== 'object') {
        throw new Error('Invalid cached user data')
      }

      setUser(parsedUser)

      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user)
          localStorage.setItem(
            'reimbursepro_user',
            JSON.stringify(res.data.user)
          )
        })
        .catch(() => {
          localStorage.removeItem('reimbursepro_token')
          localStorage.removeItem('reimbursepro_user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } catch (error) {
      console.error('Invalid cached user data:', error)

      localStorage.removeItem('reimbursepro_token')
      localStorage.removeItem('reimbursepro_user')
      setUser(null)
      setLoading(false)
    }
  } else {
    setLoading(false)
  }
}, [])

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('reimbursepro_token', res.data.token)
    localStorage.setItem('reimbursepro_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }

  function logout() {
    localStorage.removeItem('reimbursepro_token')
    localStorage.removeItem('reimbursepro_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
