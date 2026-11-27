import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'

// The API renders a print-ready HTML page that opens the print dialog (Save as PDF).
// Proxied here so the browser never holds an API token; the API enforces the Pro tier.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await apiClient.getRaw(`/vehicles/${encodeURIComponent(params.slug)}/export/pdf`, { session })
  if (!res.ok) {
    const status = res.status === 403 ? 403 : res.status === 404 ? 404 : 502
    return NextResponse.json({ error: status === 403 ? 'Pro plan required' : 'Spec sheet unavailable' }, { status })
  }
  return new NextResponse(await res.text(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
  })
}
