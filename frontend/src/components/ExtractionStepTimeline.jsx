import React from 'react'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ExtractionStepTimeline({ steps, visibleCount }) {
  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const isVisible = idx < visibleCount
        const isLast = idx === steps.length - 1
        const confidenceGood = step.confidence >= 0.7
        const confidenceMed = step.confidence >= 0.4 && step.confidence < 0.7

        return (
          <div
            key={step.step}
            className={`flex gap-3.5 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden'}`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white ${
                  confidenceGood ? 'bg-emerald-500' : confidenceMed ? 'bg-amber-500' : 'bg-rose-400'
                }`}
              >
                {isVisible ? <CheckCircle2 size={15} /> : <Loader2 size={15} className="animate-spin" />}
              </div>
              {!isLast && <div className="w-px flex-1 bg-ink-200 my-1 min-h-[24px]" />}
            </div>
            <div className="pb-6 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-800">{step.name}</p>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    confidenceGood ? 'bg-emerald-50 text-emerald-700' : confidenceMed ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {Math.round(step.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-xs text-ink-500 mt-1 leading-relaxed">{step.description}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-ink-50 border border-ink-100 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] text-ink-400 font-medium">Result:</span>
                <span className="text-xs font-mono text-ink-800">{step.result}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
