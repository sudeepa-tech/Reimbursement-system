import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  UploadCloud, FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon,
  Sparkles, ArrowRight, RotateCcw, CheckCircle2
} from 'lucide-react'
import api from '../api/client'
import ExtractionStepTimeline from '../components/ExtractionStepTimeline'
import { CATEGORY_META } from '../utils/format'

const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/bmp': ['.bmp'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv']
}

function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase()
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) return ImageIcon
  if (ext === 'pdf') return FileText
  if (['xlsx', 'xls', 'csv'].includes(ext)) return FileSpreadsheet
  return FileIcon
}

const STAGES = { IDLE: 'idle', UPLOADING: 'uploading', EXTRACTING: 'extracting', REVIEW: 'review', SUBMITTING: 'submitting', DONE: 'done' }

export default function SubmitExpense() {
  const navigate = useNavigate()
  const [stage, setStage] = useState(STAGES.IDLE)
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [visibleSteps, setVisibleSteps] = useState(0)
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)

  const onDrop = useCallback(async (acceptedFiles, rejections) => {
    if (rejections.length > 0) {
      toast.error(rejections[0].errors[0]?.message || 'File not accepted.')
      return
    }
    const f = acceptedFiles[0]
    if (!f) return
    setFile(f)
    setError(null)
    setStage(STAGES.UPLOADING)

    const formData = new FormData()
    formData.append('file', f)

    try {
      const res = await api.post('/ocr/extract', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
      setStage(STAGES.EXTRACTING)
      // Animate the reveal of each reasoning step
      const totalSteps = res.data.steps.length
      let i = 0
      const interval = setInterval(() => {
        i += 1
        setVisibleSteps(i)
        if (i >= totalSteps) {
          clearInterval(interval)
          setTimeout(() => {
            const ef = res.data.extractedFields
            setForm({
              category: ef.suggestedCategory || 'misc',
              merchant: ef.merchant || '',
              description: '',
              amount: ef.amount || '',
              currency: ef.currency || 'INR',
              taxAmount: ef.taxAmount || '',
              expenseDate: normalizeDate(ef.expenseDate),
              invoiceNumber: ef.invoiceNumber || ''
            })
            setStage(STAGES.REVIEW)
          }, 500)
        }
      }, 450)
    } catch (err) {
      setError(err.response?.data?.error || 'Extraction failed. Please try a different file or enter details manually.')
      setStage(STAGES.IDLE)
      toast.error('AI extraction failed.')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED, maxFiles: 1, maxSize: 15 * 1024 * 1024,
    disabled: stage !== STAGES.IDLE
  })

  function normalizeDate(d) {
    if (!d) return new Date().toISOString().split('T')[0]
    // try dd/mm/yyyy -> yyyy-mm-dd
    const m = d.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
    if (m) {
      let [, dd, mm, yyyy] = m
      if (yyyy.length === 2) yyyy = '20' + yyyy
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    }
    const parsed = new Date(d)
    if (!isNaN(parsed)) return parsed.toISOString().split('T')[0]
    return new Date().toISOString().split('T')[0]
  }

  async function handleSubmitClaim(e) {
    e.preventDefault()
    setStage(STAGES.SUBMITTING)
    try {
      await api.post('/expenses', {
        ...form,
        amount: Number(form.amount),
        taxAmount: form.taxAmount ? Number(form.taxAmount) : null,
        receiptFile: result?.file || null,
        ocrExtraction: result ? { confidence: result.overallConfidence, extractedFields: result.extractedFields, processedAt: new Date().toISOString() } : null
      })
      setStage(STAGES.DONE)
      toast.success('Reimbursement claim submitted!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit claim.')
      setStage(STAGES.REVIEW)
    }
  }

  function reset() {
    setStage(STAGES.IDLE); setFile(null); setResult(null); setVisibleSteps(0); setForm(null); setError(null)
  }

  const Icon = file ? fileIcon(file.name) : UploadCloud

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Submit a Reimbursement Claim</h1>
        <p className="text-ink-500 text-sm mt-1">Upload a receipt, invoice, screenshot, or bill — our AI extracts the details for you.</p>
      </div>

      {stage === STAGES.DONE ? (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-12 flex flex-col items-center text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-ink-900">Claim submitted successfully</h2>
          <p className="text-ink-500 text-sm mt-2 max-w-sm">
            Your claim for <strong>{CATEGORY_META[form.category]?.label}</strong> has been routed to your approval chain. You'll be notified as it progresses.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={reset} className="px-4 py-2 rounded-lg border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50">
              Submit Another
            </button>
            <button onClick={() => navigate('/my-expenses')} className="px-4 py-2 rounded-lg bg-ink-900 text-white text-sm font-medium hover:bg-ink-800">
              View My Claims
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Upload zone / file preview */}
          <div className="lg:col-span-2 space-y-4">
            {stage === STAGES.IDLE ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-80 ${
                  isDragActive ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-ink-50/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                  <UploadCloud size={26} className="text-brand-600" />
                </div>
                <p className="font-semibold text-ink-800 text-sm">Drop your receipt here, or click to browse</p>
                <p className="text-ink-400 text-xs mt-1.5">JPG, PNG, PDF, DOCX, XLSX, CSV · up to 15MB</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-5 h-80 flex flex-col">
                <div className="flex items-center gap-3 pb-4 border-b border-ink-100">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-800 truncate">{file?.name}</p>
                    <p className="text-xs text-ink-400">{(file?.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  {(stage === STAGES.UPLOADING || stage === STAGES.EXTRACTING) && (
                    <>
                      <div className="relative w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center overflow-hidden">
                        <Sparkles size={26} className="text-brand-600 relative z-10" />
                        <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-brand-300/40 to-transparent animate-scanline" />
                      </div>
                      <p className="text-sm font-medium text-ink-700">
                        {stage === STAGES.UPLOADING ? 'Uploading & running OCR…' : 'AI is reading your document…'}
                      </p>
                      <p className="text-xs text-ink-400 text-center max-w-[220px]">
                        Extracting merchant, amount, date, tax and category automatically
                      </p>
                    </>
                  )}
                  {stage === STAGES.REVIEW && result && (
                    <div className="w-full">
                      <div className="flex items-center gap-2 text-emerald-600 justify-center mb-2">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-semibold">Extraction complete</span>
                      </div>
                      <p className="text-xs text-ink-400 text-center">
                        {Math.round(result.overallConfidence * 100)}% overall confidence · {result.processingTimeMs}ms
                      </p>
                      <p className="text-xs text-ink-400 text-center mt-1">via {result.ocrEngine}</p>
                    </div>
                  )}
                </div>
                <button onClick={reset} className="flex items-center justify-center gap-1.5 text-xs text-ink-400 hover:text-ink-700 pt-3 border-t border-ink-100">
                  <RotateCcw size={12} /> Start over with a different file
                </button>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">{error}</div>
            )}

            <button
              onClick={() => { setStage(STAGES.REVIEW); setForm({ category: 'misc', merchant: '', description: '', amount: '', currency: 'INR', taxAmount: '', expenseDate: new Date().toISOString().split('T')[0], invoiceNumber: '' }) }}
              className="text-xs text-ink-400 hover:text-brand-600 underline underline-offset-2 w-full text-center"
              style={{ display: stage === STAGES.IDLE ? 'block' : 'none' }}
            >
              Skip AI extraction and enter details manually
            </button>
          </div>

          {/* Right: AI reasoning steps OR review form */}
          <div className="lg:col-span-3">
            {(stage === STAGES.EXTRACTING || (stage === STAGES.REVIEW && result)) && (
              <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6 mb-5">
                <h3 className="font-semibold text-ink-800 text-sm mb-1 flex items-center gap-2">
                  <Sparkles size={15} className="text-brand-600" /> AI Extraction — Step by Step
                </h3>
                <p className="text-ink-400 text-xs mb-5">Full reasoning trail for every field the AI pulled from your document</p>
                <ExtractionStepTimeline steps={result?.steps || []} visibleCount={stage === STAGES.REVIEW ? result.steps.length : visibleSteps} />
              </div>
            )}

            {stage === STAGES.REVIEW && form && (
              <form onSubmit={handleSubmitClaim} className="bg-white rounded-2xl border border-ink-100 shadow-card p-6 space-y-4 animate-slide-up">
                <h3 className="font-semibold text-ink-800 text-sm">Review & Confirm Claim Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1.5">Category</label>
                    <select
                      value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring"
                    >
                      {Object.entries(CATEGORY_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1.5">Merchant / Vendor</label>
                    <input required value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1.5">Amount</label>
                    <div className="flex">
                      <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                        className="px-2 py-2 rounded-l-lg border border-r-0 border-ink-200 text-sm bg-ink-50 focus-ring">
                        <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
                      </select>
                      <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                        className="w-full px-3 py-2 rounded-r-lg border border-ink-200 text-sm focus-ring" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1.5">Tax / GST Amount</label>
                    <input type="number" step="0.01" min="0" value={form.taxAmount} onChange={e => setForm({ ...form, taxAmount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1.5">Expense Date</label>
                    <input required type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1.5">Invoice / Reference No.</label>
                    <input value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1.5">Description (optional)</label>
                  <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Add any additional context for your approver…"
                    className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus-ring resize-none" />
                </div>
                <button
                  type="submit" disabled={stage === STAGES.SUBMITTING}
                  className="w-full bg-ink-900 hover:bg-ink-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {stage === STAGES.SUBMITTING ? 'Submitting…' : 'Submit for Approval'}
                  {stage !== STAGES.SUBMITTING && <ArrowRight size={16} />}
                </button>
              </form>
            )}

            {stage === STAGES.IDLE && (
              <div className="bg-white rounded-2xl border border-dashed border-ink-200 p-10 h-80 flex flex-col items-center justify-center text-center text-ink-400">
                <Sparkles size={24} className="mb-3 text-ink-300" />
                <p className="text-sm font-medium">Upload a document to see the AI's step-by-step extraction</p>
                <p className="text-xs mt-1 max-w-xs">Every field is traced back to exactly what it read, with a confidence score</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
