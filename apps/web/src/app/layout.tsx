import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Decar',
    default: 'Decar — Vehicle Intelligence Platform',
  },
  description:
    'Detailed technical information about vehicles — engine specs, paint colors, 3D models, and more.',
  metadataBase: new URL((process.env.NEXTAUTH_URL ?? 'https://decar.io').replace(/^﻿/, '').trim()),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#171717] text-[#fafafa] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
