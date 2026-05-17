"use client"
import { useState, useCallback } from 'react'

interface Props {
  vehicleAId: string
  vehicleBId: string
  label?: string
}

export function SaveComparisonButton({ vehicleAId, vehicleBId, label = 'Save comparison' }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleSave = useCallback(async () => {
    setStatus('saving')
    try {
      const res = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleAId, vehicleBId }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to save')
      }
      setStatus('saved')
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }, [vehicleAId, vehicleBId])

  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[9999px] border border-[#3ecf8e]/40 bg-[#3ecf8e]/10 px-4 py-2 text-[13px] text-[#3ecf8e]">
        Saved to comparisons
      </span>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={status === 'saving'}
      className="inline-flex items-center gap-1.5 rounded-[9999px] border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2 text-[13px] font-medium text-[#b4b4b4] transition-colors hover:border-[#3ecf8e]/40 hover:text-[#3ecf8e] disabled:opacity-50"
    >
      {status === 'saving' ? (
        <><span className="inline-block h-3 w-3 animate-spin rounded-full border border-[#3ecf8e]/40 border-t-[#3ecf8e]" /> Saving...</>
      ) : status === 'error' ? (
        'Error — try again'
      ) : (
        label
      )}
    </button>
  )
}
