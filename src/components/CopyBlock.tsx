'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics'

export default function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    track('share_clicked', { channel: 'copy', context: 'spread_kit' })
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h3 className="font-bebas text-xl text-liberty-red">{label}</h3>
        <button onClick={copy} className="btn-secondary px-4 py-1.5 text-xs shrink-0">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-white/70 text-sm whitespace-pre-line leading-relaxed">{text}</p>
    </div>
  )
}
