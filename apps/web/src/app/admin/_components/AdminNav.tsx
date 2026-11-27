'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/vehicles', label: 'Vehicles' },
  { href: '/admin/models', label: '3D models' },
  { href: '/admin/builds', label: 'Builds' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => {
        const isActive = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
