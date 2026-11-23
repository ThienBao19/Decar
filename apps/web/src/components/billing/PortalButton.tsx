'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function PortalButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handlePortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/portal', { method: 'POST' })
      if (!res.ok) {
        router.push('/login')
        return
      }
      const data = (await res.json()) as { url?: string }
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={() => void handlePortal()}
      disabled={loading}
      className="rounded-[9999px] border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2 text-[13px] font-medium text-[#b4b4b4] transition-colors hover:border-[#363636] hover:text-[#fafafa] disabled:opacity-50"
    >
      {loading ? 'Opening…' : 'Manage subscription'}
    </button>
  )
}
