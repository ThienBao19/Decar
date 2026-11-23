import type { Metadata } from 'next'

import credits from '@/data/model-credits.json'

export const metadata: Metadata = { title: '3D Model Credits' }

interface Credit {
  title: string | null
  author: string | null
  license: string
  source: string | null
}

const LICENSE_URLS: Record<string, string> = {
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
}

const ATTRIBUTED = Object.values(credits as Record<string, Credit>).filter((c) => c.license in LICENSE_URLS)

export default function CreditsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-[36px] font-normal text-[#fafafa]">3D Model Credits</h1>
      <p className="mt-3 text-[14px] text-[#898989]">
        Some vehicle models on Decar are created by third-party artists and used under Creative Commons licenses.
      </p>
      <ul className="mt-10 divide-y divide-[#242424] border-y border-[#242424]">
        {ATTRIBUTED.map((c) => (
          <li key={`${c.title}-${c.source}`} className="py-4 text-[14px]">
            <p className="text-[#fafafa]">
              {c.source?.startsWith('http') ? (
                <a href={c.source} className="hover:underline" target="_blank" rel="noopener noreferrer">{c.title}</a>
              ) : (
                c.title
              )}
            </p>
            <p className="mt-1 text-[#898989]">
              by {c.author} ·{' '}
              <a href={LICENSE_URLS[c.license]} className="hover:underline" target="_blank" rel="noopener noreferrer">
                {c.license}
              </a>
              {c.license === 'CC-BY-4.0' && ' · optimized for the web (geometry simplified, textures compressed)'}
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}