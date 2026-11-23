'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

import { MAX_NAME_LENGTH, savePendingName } from '@/lib/pending-name'

import { OAuthButtons } from './OAuthButtons'

const INPUT =
  'w-full rounded-lg border border-[#2e2e2e] bg-[#171717] px-4 py-2.5 text-[14px] text-[#fafafa] ' +
  'placeholder:text-[#4d4d4d] outline-none transition-colors focus:border-[#3ecf8e]'

export function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [hasAccepted, setHasAccepted] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    savePendingName(name.trim())
    const res = await signIn('email', { email, callbackUrl: '/dashboard', redirect: false })
    setStatus(res?.error ? 'error' : 'sent')
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 p-4 text-center text-[14px] text-[#3ecf8e]">
        Check your email — click the link to finish creating your account.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <OAuthButtons dividerLabel="or sign up with email" />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <input
          type="text"
          required
          maxLength={MAX_NAME_LENGTH}
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT}
        />
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
        />
        <label className="flex items-start gap-2 text-[12px] text-[#898989]">
          <input
            type="checkbox"
            required
            checked={hasAccepted}
            onChange={(e) => setHasAccepted(e.target.checked)}
            className="mt-0.5 accent-[#3ecf8e]"
          />
          <span>
            I agree to the{' '}
            <a href="/terms" className="text-[#b4b4b4] underline hover:text-[#fafafa]">Terms</a> and{' '}
            <a href="/privacy" className="text-[#b4b4b4] underline hover:text-[#fafafa]">Privacy Policy</a>.
          </span>
        </label>
        {status === 'error' && (
          <p className="text-[12px] text-[#f87171]">Could not send the email. Please try again.</p>
        )}
        <button
          type="submit"
          disabled={status === 'sending' || !hasAccepted}
          className="w-full rounded-[9999px] bg-[#3ecf8e] px-4 py-2.5 text-[14px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
