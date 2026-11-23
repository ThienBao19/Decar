import type { Metadata } from 'next'

import { listCredits } from '@/lib/model-registry'

export const metadata: Metadata = { title: '3D Model Credits' }

const LICENSE_URLS: Record<string, string> = {
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
}

const ATTRIBUTED = listCredits().filter((c) => c.credit.license in LICENSE_URLS)

export default function CreditsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-[36px] font-normal text-[#fafafa]">3D Model Credits</h1>
      <p className="mt-3 text-[14px] text-[#898989]">
        Some 3D assets on Decar are created by third-party artists and used under Creative Commons licenses.
      </p>
      <ul className="mt-10 divide-y divide-[#242424] border-y border-[#242424]">
        {ATTRIBUTED.map(({ title, credit }) => (
          <li key={title} className="py-4 text-[14px]">
            <p className="text-[#fafafa]">
              {credit.source?.startsWith('http') ? (
                <a href={credit.source} className="hover:underline" target="_blank" rel="noopener noreferrer">{title}</a>
              ) : (
                title
              )}
            </p>
            <p className="mt-1 text-[#898989]">
              by {credit.author} ·{' '}
              <a href={LICENSE_URLS[credit.license]} className="hover:underline" target="_blank" rel="noopener noreferrer">
                {credit.license}
              </a>
              {credit.license === 'CC-BY-4.0' && ' · optimized for the web (textures compressed)'}
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}