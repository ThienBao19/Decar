import { describe, it, expect, vi, beforeEach } from 'vitest'

const getServerSession = vi.fn()
vi.mock('next-auth', () => ({ getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const prisma = {
  subscription: { upsert: vi.fn() },
  user: { update: vi.fn() },
  vehicleBuild: { update: vi.fn(), delete: vi.fn() },
  vehicleComparison: { deleteMany: vi.fn(() => 'deleteComparisons') },
  vehicle: { delete: vi.fn(() => 'deleteVehicle') },
  $transaction: vi.fn(),
}
vi.mock('@/lib/prisma', () => ({ prisma }))

const { setUserTier, setUserAdmin, deleteVehicle } = await import('./actions')

function form(fields: Record<string, string>): FormData {
  const f = new FormData()
  Object.entries(fields).forEach(([k, v]) => f.append(k, v))
  return f
}

const asAdmin = () => getServerSession.mockResolvedValue({ user: { id: 'admin_1', isAdmin: true } })

describe('admin actions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws Forbidden for a signed-in non-admin', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u_1', isAdmin: false } })
    await expect(setUserTier(form({ userId: 'u_2', tier: 'PRO' }))).rejects.toThrow('Forbidden')
    expect(prisma.subscription.upsert).not.toHaveBeenCalled()
  })

  it('throws Forbidden when signed out', async () => {
    getServerSession.mockResolvedValue(null)
    await expect(deleteVehicle(form({ vehicleId: 'v_1' }))).rejects.toThrow('Forbidden')
  })

  it('rejects an unknown tier value', async () => {
    asAdmin()
    await expect(setUserTier(form({ userId: 'u_2', tier: 'ENTERPRISE' }))).rejects.toThrow('Invalid tier')
  })

  it('upserts the subscription when setting a tier', async () => {
    asAdmin()
    await setUserTier(form({ userId: 'u_2', tier: 'PRO' }))
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u_2' }, update: { tier: 'PRO', status: 'ACTIVE' } }),
    )
  })

  it('refuses to change the current admin own role', async () => {
    asAdmin()
    await expect(setUserAdmin(form({ userId: 'admin_1', isAdmin: 'false' }))).rejects.toThrow(/own admin role/)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('deletes comparisons before the vehicle in one transaction', async () => {
    asAdmin()
    await deleteVehicle(form({ vehicleId: 'v_1' }))
    expect(prisma.vehicleComparison.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ vehicleAId: 'v_1' }, { vehicleBId: 'v_1' }] },
    })
    expect(prisma.$transaction).toHaveBeenCalledWith(['deleteComparisons', 'deleteVehicle'])
  })
})