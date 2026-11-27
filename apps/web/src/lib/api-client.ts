import type { Session } from 'next-auth'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function getAuthHeaders(baseUrl: string, session: Session | null | undefined): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!session) return headers
  const tokenRes = await fetch(`${baseUrl}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.API_INTERNAL_SECRET, userId: (session.user as { id?: string }).id }),
    next: { revalidate: 0 },
  })
  if (tokenRes.ok) {
    const json = (await tokenRes.json()) as { data: { accessToken: string } }
    headers['Authorization'] = `Bearer ${json.data.accessToken}`
  }
  return headers
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get<T>(path: string, options?: { session?: Session | null }): Promise<T> {
    const headers = await getAuthHeaders(this.baseUrl, options?.session)
    const res = await fetch(`${this.baseUrl}${path}`, { headers, next: { revalidate: 3600 } })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `API error ${res.status}`)
    }
    const json = (await res.json()) as { data: T }
    return json.data
  }

  // For non-JSON responses; the caller checks res.ok
  async getRaw(path: string, options?: { session?: Session | null }): Promise<Response> {
    const headers = await getAuthHeaders(this.baseUrl, options?.session)
    return fetch(`${this.baseUrl}${path}`, { headers, cache: 'no-store' })
  }

  async post<T>(path: string, body: unknown, options?: { session?: Session | null }): Promise<T> {
    const headers = await getAuthHeaders(this.baseUrl, options?.session)
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(errBody.error ?? `API error ${res.status}`)
    }
    const json = (await res.json()) as { data: T }
    return json.data
  }

  async patch<T>(path: string, body: unknown, options?: { session?: Session | null }): Promise<T> {
    const headers = await getAuthHeaders(this.baseUrl, options?.session)
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(errBody.error ?? `API error ${res.status}`)
    }
    const json = (await res.json()) as { data: T }
    return json.data
  }

  async del(path: string, options?: { session?: Session | null }): Promise<void> {
    const headers = await getAuthHeaders(this.baseUrl, options?.session)
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'DELETE', headers })
    if (!res.ok && res.status !== 204) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(errBody.error ?? `API error ${res.status}`)
    }
  }
}

export const apiClient = new ApiClient(API_URL)
