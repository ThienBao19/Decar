'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import type { Session } from 'next-auth'

interface Props {
  session: Session | null
}

export function NavbarClient({ session }: Props) {
  if (!session) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-[14px] font-medium text-[#898989] transition-colors hover:text-[#fafafa]"
        >
          Sign in
        </Link>
        <Link
          href="/pricing"
          className="rounded-[9999px] border border-[#fafafa] bg-[#0f0f0f] px-5 py-[7px] text-[14px] font-medium text-[#fafafa] transition-colors hover:bg-[#fafafa] hover:text-[#0f0f0f]"
        >
          Go Pro
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {session.user.tier === 'PRO' && (
        <span className="rounded-[9999px] border border-[#3ecf8e]/40 bg-[#3ecf8e]/10 px-2.5 py-0.5 text-[12px] font-medium text-[#3ecf8e]">
          Pro
        </span>
      )}
      <Link
        href="/dashboard"
        className="text-[14px] font-medium text-[#b4b4b4] transition-colors hover:text-[#fafafa]"
      >
        {session.user.name?.split(' ')[0] ?? 'Account'}
      </Link>
      <button
        onClick={() => void signOut({ callbackUrl: '/' })}
        className="text-[13px] text-[#4d4d4d] transition-colors hover:text-[#898989]"
      >
        Sign out
      </button>
    </div>
  )
}
