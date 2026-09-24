import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Settings2, Plus, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import api from '../api/client'
import { formatCurrency, CATEGORY_META } from '../utils/format'

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Reporting Manager' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'admin', label: 'Finance Director / Admin' }
]

const emptyForm = { name: '', minAmount: 0, maxAmount: 100000, category: 'ANY', steps: [{ approverRole: 'manager', label: 'Reporting Manager' }] }

export default function ApprovalConfig() {
  const [chains, setChains] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    api.get('/config/approval-chains').then(res => setChains(res.data.chains)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function toggleActive(chain) {
    try {
      await api.put(`/config/approval-chains/${chain.id}`, { active: !chain.active })
      toast.success(`Chain ${chain.active ? 'deactivated' : 'activated'}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update chain.')
    }
  }

  async function deleteChain(id) {
    if (!confirm('Delete this approval chain? This cannot be undone.')) return
    try {
      await api.delete(`/config/approval-chains/${id}`)
      toast.success('Chain deleted')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete chain.')
    }
  }

  function addStep() {
    setForm({ ...form, steps: [...form.steps, { approverRole: 'finance_manager', label: 'Finance Manager' }] })
  }
  function removeStep(idx) {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) })
  }
  function updateStep(idx, role) {
    const label = ROLE_OPTIONS.find(r => r.value === role)?.label || role
    const steps = [...form.steps]
    steps[idx] = { approverRole: role, label }
    setForm({ ...form, steps })
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/config/approval-chains', form)
      toast.success('Approval chain created')
      setShowModal(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create chain.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Approval Rules</h1>
          <p className="text-ink-500 text-sm mt-1">Configure multi-level approval chains by amount range and category.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
        >
          <Plus size={15} /> New Rule
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-ink-400">Loading rules…</div>
      ) : (
        <div className="space-y-4">
          {chains.map(chain => (
            <div key={chain.id} className="bg-white rounded-2xl border border-ink-100 shadow-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink-800">{chain.name}</h3>
                    {chain.isDefault && <span className="text-[10px] font-bold uppercase bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded">System</span>}
                  </div>
                  <p className="text-xs text-ink-500 mt-1">
                    {formatCurrency(chain.minAmount)} – {chain.maxAmount > 10000000 ? '∞' : formatCurrency(chain.maxAmount)} ·{' '}
                    {chain.category === 'ANY' ? 'All categories' : CATEGORY_META[chain.category]?.label || chain.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(chain)} className="text-ink-400 hover:text-brand-600">
                    {chain.active ? <ToggleRight size={26} className="text-emerald-500" /> : <ToggleLeft size={26} />}
                  </button>
                  {!chain.isDefault && (
                    <button onClick={() => deleteChain(chain.id)} className="text-ink-300 hover:text-rose-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ink-100 flex-wrap">
                {chain.steps.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex items-center gap-2 bg-ink-50 rounded-lg px-3 py-1.5">
                      <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                      <span className="text-xs font-medium text-ink-700">{step.label}</span>
                    </div>
                    {idx < chain.steps.length - 1 && <span className="text-ink-300">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-ink-950/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-ink-900 flex items-center gap-2"><Settings2 size={17} /> New Approval Rule</h3>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-ink-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1.5">Rule Name</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. High-Value Travel Claims"
                  className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1.5">Min Amount (₹)</label>
                  <input required type="number" min="0" value={form.minAmount} onChange={e => setForm({ ...form, minAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1.5">Max Amount (₹)</label>
                  <input required type="number" min="0" value={form.maxAmount} onChange={e => setForm({ ...form, maxAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring">
                  <option value="ANY">All Categories</option>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-ink-600">Approval Steps (in order)</label>
                  <button type="button" onClick={addStep} className="text-xs font-semibold text-brand-600 flex items-center gap-1">
                    <Plus size={12} /> Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {form.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-ink-100 text-ink-500 text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                      <select value={step.approverRole} onChange={e => updateStep(idx, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring">
                        {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      {form.steps.length > 1 && (
                        <button type="button" onClick={() => removeStep(idx)} className="text-ink-300 hover:text-rose-500">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-ink-900 hover:bg-ink-800 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60">
                {saving ? 'Creating…' : 'Create Approval Rule'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
