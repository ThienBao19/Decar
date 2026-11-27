import { describe, it, expect, vi, beforeEach } from 'vitest'

const getServerSession = vi.fn()
const getRaw = vi.fn()
vi.mock('next-auth', () => ({ getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/api-client', () => ({ apiClient: { getRaw } }))

const { GET } = await import('./route')
const call = (slug: string) => GET(new Request('http://localhost/x'), { params: { slug } })

describe('GET /api/vehicles/[slug]/spec-sheet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without a session and never calls the API', async () => {
    getServerSession.mockResolvedValue(null)
    const res = await call('v1')
    expect(res.status).toBe(401)
    expect(getRaw).not.toHaveBeenCalled()
  })

  it('returns the spec sheet HTML for a Pro user', async () => {
    const session = { user: { id: 'u1', tier: 'PRO' } }
    getServerSession.mockResolvedValue(session)
    getRaw.mockResolvedValue(new Response('<h1>Sheet</h1>', { status: 200 }))
    const res = await call('v 1')
    expect(getRaw).toHaveBeenCalledWith('/vehicles/v%201/export/pdf', { session })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(await res.text()).toBe('<h1>Sheet</h1>')
  })

  it('passes through 403 for a Free user', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1', tier: 'FREE' } })
    getRaw.mockResolvedValue(new Response('{}', { status: 403 }))
    const res = await call('v1')
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Pro plan required' })
  })

  it('maps other API failures to 502 without leaking the body', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1', tier: 'PRO' } })
    getRaw.mockResolvedValue(new Response('stack trace', { status: 500 }))
    const res = await call('v1')
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'Spec sheet unavailable' })
  })
})
