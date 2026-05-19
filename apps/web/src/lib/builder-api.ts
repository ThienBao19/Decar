import type { BuildConfig, CreateBuildRequest, UpdateBuildRequest, VehicleBuildDTO } from '@decar/shared'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string }
    throw new Error(err.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  const json = (await res.json()) as { data: T }
  return json.data
}

export const builderApi = {
  list:   ()                                   => request<VehicleBuildDTO[]>('/api/builds'),
  get:    (id: string)                         => request<VehicleBuildDTO>('/api/builds/' + id),
  create: (p: CreateBuildRequest)              => request<VehicleBuildDTO>('/api/builds', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: UpdateBuildRequest)  => request<VehicleBuildDTO>('/api/builds/' + id, { method: 'PATCH', body: JSON.stringify(p) }),
  remove: (id: string)                         => request<void>('/api/builds/' + id, { method: 'DELETE' }),

  defaultConfig: (name = 'My Build'): CreateBuildRequest => ({
    name,
    config: {
      name,
      baseBodyCategory: 'sports',
      parts: {},
      paint: { bodyColor: 0xc0c0c8, finish: 'metallic', windowTint: 20 },
    } satisfies BuildConfig,
  }),
}