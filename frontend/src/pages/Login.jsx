import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, ArrowRight, ShieldCheck, Sparkles, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoAccounts, setDemoAccounts] = useState([])

  useEffect(() => {
    if (user) navigate('/')
    api.get('/auth/demo-accounts').then(res => setDemoAccounts(res.data.accounts)).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  function quickFill(acc) {
    setEmail(acc.email)
    setPassword('Password123!')
  }

  return (
    <div className="min-h-screen flex bg-ink-950">
      {/* Left: brand / value prop panel */}
      <div className="hidden lg:flex w-[46%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-brand-950">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px'
        }} />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/50">
            <Wallet size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">ReimbursePro</span>
        </div>

        <div className="relative space-y-8">
          <h1 className="text-4xl font-bold text-white leading-[1.15] tracking-tight">
            Expense reimbursement,<br />read by AI, approved in minutes.
          </h1>
          <p className="text-white/50 text-[15px] leading-relaxed max-w-md">
            Upload any receipt, screenshot, PDF, or invoice — ReimbursePro's OCR engine
            extracts every field automatically and routes it through your organization's
            configured approval chain.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <ScanLine size={15} className="text-brand-300" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">AI-powered data extraction</p>
                <p className="text-white/40 text-[13px]">Images, PDFs, Word & Excel — parsed and explained step-by-step</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={15} className="text-brand-300" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Configurable multi-level approvals</p>
                <p className="text-white/40 text-[13px]">Route by amount, category and department automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={15} className="text-brand-300" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Built for scale</p>
                <p className="text-white/40 text-[13px]">Designed for 5,000+ employee organizations</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative text-white/30 text-xs">© 2026 ReimbursePro. Enterprise Financial Systems.</p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f6f7f9]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-ink-900">ReimbursePro</span>
          </div>

          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Sign in to your account</h2>
          <p className="text-ink-500 text-sm mt-1.5 mb-8">Enter your credentials to access the reimbursement portal.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Work email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@reimbursepro.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-sm focus-ring focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-sm focus-ring focus:border-brand-500 transition-colors"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-ink-900 hover:bg-ink-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {demoAccounts.length > 0 && (
            <div className="mt-8 pt-6 border-t border-ink-200">
              <p className="text-xs font-semibold text-ink-400 mb-3">Demo accounts (password: Password123!)</p>
              <div className="space-y-1.5">
                {demoAccounts.map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => quickFill(acc)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-ink-800">{acc.name}</p>
                      <p className="text-[11px] text-ink-400">{acc.email}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-brand-600 bg-brand-100 px-2 py-1 rounded">
                      {acc.role.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
