'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface NavLink {
  href: string
  label: string
}

export function MobileNav({ links }: { links: NavLink[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#b4b4b4] hover:bg-[#242424]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          {isOpen ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M2 5h14M2 9h14M2 13h14" />}
        </svg>
      </button>
      {isOpen && (
        <nav className="absolute inset-x-0 top-full border-b border-[#242424] bg-[#171717] px-6 py-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-3 text-[15px] font-medium text-[#b4b4b4] hover:text-[#fafafa]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
