import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = { title: 'Create Account' }

export default async function RegisterPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <div className="w-full max-w-sm">
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3ecf8e]">
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L12 4V10L7 13L2 10V4L7 1Z" stroke="#0f0f0f" strokeWidth="1.5" fill="none" />
            <circle cx="7" cy="7" r="2" fill="#0f0f0f" />
          </svg>
        </span>
        <h1 className="text-[22px] font-semibold tracking-tight text-[#fafafa]">Create your account</h1>
        <p className="text-[14px] text-[#898989]">Start exploring vehicle intelligence for free</p>
      </div>

      <div className="rounded-xl border border-[#2e2e2e] bg-[#1c1c1c] p-8">
        <RegisterForm />
      </div>

      <p className="mt-6 text-center text-[13px] text-[#4d4d4d]">
        Already have an account?{' '}
        <Link href="/login" className="text-[#898989] hover:text-[#fafafa]">
          Sign in
        </Link>
      </p>
    </div>
  )
}
