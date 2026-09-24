import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SubmitExpense from './pages/SubmitExpense'
import ExpenseList from './pages/ExpenseList'
import ExpenseDetail from './pages/ExpenseDetail'
import ApprovalQueue from './pages/ApprovalQueue'
import ApprovalConfig from './pages/ApprovalConfig'
import Team from './pages/Team'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="submit" element={<SubmitExpense />} />
        <Route path="my-expenses" element={<ExpenseList title="My Claims" subtitle="All reimbursement claims you've submitted" />} />
        <Route path="all-expenses" element={
          <PrivateRoute roles={['finance_manager', 'admin']}>
            <ExpenseList title="All Claims" subtitle="Organization-wide reimbursement claims" />
          </PrivateRoute>
        } />
        <Route path="claims/:id" element={<ExpenseDetail />} />
        <Route path="approvals" element={
          <PrivateRoute roles={['manager', 'finance_manager', 'admin']}><ApprovalQueue /></PrivateRoute>
        } />
        <Route path="config" element={
          <PrivateRoute roles={['finance_manager', 'admin']}><ApprovalConfig /></PrivateRoute>
        } />
        <Route path="team" element={
          <PrivateRoute roles={['manager', 'admin']}><Team /></PrivateRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px', borderRadius: '10px' } }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
