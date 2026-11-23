'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { takePendingName } from '@/lib/pending-name'

export function ApplyPendingName({ hasName }: { hasName: boolean }) {
  const router = useRouter()

  useEffect(() => {
    const name = takePendingName()
    if (hasName || !name) return
    void fetch('/api/account/name', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then((res) => {
      if (res.ok) router.refresh()
    })
  }, [hasName, router])

  return null
}
