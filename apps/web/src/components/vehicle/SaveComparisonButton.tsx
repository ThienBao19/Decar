"use client"
import { useState, useCallback, useEffect } from 'react'

const TRAY_KEY = 'decar:compare-tray'

interface TrayItem {
  id: string
  name: string
}

interface Props {
  vehicleId: string
  vehicleName: string
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

function readTray(): TrayItem | null {
  try {
    const raw = window.localStorage.getItem(TRAY_KEY)
    return raw ? (JSON.parse(raw) as TrayItem) : null
  } catch {
    return null
  }
}

function writeTray(item: TrayItem | null) {
  try {
    if (item) window.localStorage.setItem(TRAY_KEY, JSON.stringify(item))
    else window.localStorage.removeItem(TRAY_KEY)
  } catch {
    // storage unavailable (private mode) — tray just won't persist
  }
}

const BTN =
  'inline-flex items-center gap-1.5 rounded-[9999px] border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2 ' +
  'text-[13px] font-medium text-[#b4b4b4] transition-colors hover:border-[#3ecf8e]/40 ' +
  'hover:text-[#3ecf8e] disabled:opacity-50'

export function SaveComparisonButton({ vehicleId, vehicleName }: Props) {
  const [tray, setTray] = useState<TrayItem | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setTray(readTray())
  }, [])

  const handleAdd = useCallback(() => {
    const item = { id: vehicleId, name: vehicleName }
    writeTray(item)
    setTray(item)
  }, [vehicleId, vehicleName])

  const handleClear = useCallback(() => {
    writeTray(null)
    setTray(null)
  }, [])

  const handleCompare = useCallback(async () => {
    if (!tray) return
    setStatus('saving')
    try {
      const res = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleAId: tray.id, vehicleBId: vehicleId }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to save')
      }
      writeTray(null)
      setTray(null)
      setStatus('saved')
    } catch (err) {
      setErrorMsg((err as Error).message)
      setStatus('error')
    }
  }, [tray, vehicleId])

  if (status === 'saved') {
    return (
      <a href="/comparisons" className={`${BTN} border-[#3ecf8e]/40 bg-[#3ecf8e]/10 text-[#3ecf8e]`}>
        Saved — view comparisons →
      </a>
    )
  }

  if (!tray) {
    return (
      <button onClick={handleAdd} className={BTN}>
        + Add to compare
      </button>
    )
  }

  if (tray.id === vehicleId) {
    return (
      <div className="space-y-2">
        <p className="text-[12px] text-[#898989]">Added. Open another vehicle to compare against it.</p>
        <button onClick={handleClear} className={BTN}>Remove</button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button onClick={() => void handleCompare()} disabled={status === 'saving'} className={BTN}>
        {status === 'saving' ? 'Saving...' : `Compare with ${tray.name}`}
      </button>
      {status === 'error' && <p className="text-[12px] text-[#f87171]">{errorMsg}</p>}
      <button onClick={handleAdd} className="block text-[12px] text-[#4d4d4d] hover:text-[#898989]">
        Use this vehicle as the first one instead
      </button>
    </div>
  )
}
