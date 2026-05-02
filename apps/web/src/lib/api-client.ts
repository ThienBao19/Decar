import type { Session } from 'next-auth'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get<T>(path: string, options?: { session?: Session | null }): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (options?.session) {
      // Exchange NextAuth session for API JWT on server side
      const tokenRes = await fetch(`${this.baseUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.API_INTERNAL_SECRET,
          userId: (options.session.user as { id?: string }).id,
        }),
        next: { revalidate: 0 },
      })

      if (tokenRes.ok) {
        const { accessToken } = (await tokenRes.json()) as { accessToken: string }
        headers['Authorization'] = `Bearer ${accessToken}`
      }
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      headers,
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `API error ${res.status}`)
    }

    const json = (await res.json()) as { data: T }
    return json.data
  }

  async post<T>(path: string, body: unknown, options?: { session?: Session | null }): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (options?.session) {
      const tokenRes = await fetch(`${this.baseUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.API_INTERNAL_SECRET,
          userId: (options.session.user as { id?: string }).id,
        }),
      })

      if (tokenRes.ok) {
        const { accessToken } = (await tokenRes.json()) as { accessToken: string }
        headers['Authorization'] = `Bearer ${accessToken}`
      }
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(errBody.error ?? `API error ${res.status}`)
    }

    const json = (await res.json()) as { data: T }
    return json.data
  }
}

export const apiClient = new ApiClient(API_URL)
