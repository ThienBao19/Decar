'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

import { OAuthButtons } from './OAuthButtons'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await signIn('email', { email, callbackUrl: '/dashboard', redirect: false })
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 p-4 text-center text-[14px] text-[#3ecf8e]">
        Check your email — a magic link is on its way.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <OAuthButtons dividerLabel="or continue with email" />

      {/* Magic link */}
      <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[#2e2e2e] bg-[#171717] px-4 py-2.5 text-[14px] text-[#fafafa] placeholder:text-[#4d4d4d] outline-none transition-colors focus:border-[#3ecf8e]"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[9999px] bg-[#3ecf8e] px-4 py-2.5 text-[14px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send magic link'}
        </button>
      </form>
    </div>
  )
}
