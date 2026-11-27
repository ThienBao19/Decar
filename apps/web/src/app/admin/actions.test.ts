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
  vehicleModel: { upsert: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
}
vi.mock('@/lib/prisma', () => ({ prisma }))

const { setUserTier, setUserAdmin, deleteVehicle, setVehicleModel } = await import('./actions')

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

  it('assigns a studio model to a vehicle and records who did it', async () => {
    asAdmin()
    await setVehicleModel(form({ vehicleId: 'v_1', choice: 'bmw-m4-g82' }))
    const data = { assetId: 'bmw-m4-g82', updatedBy: 'admin_1' }
    expect(prisma.vehicleModel.upsert).toHaveBeenCalledWith({ where: { vehicleId: 'v_1' }, create: { vehicleId: 'v_1', ...data }, update: data })
  })

  it('stores photos-only as a null asset', async () => {
    asAdmin()
    await setVehicleModel(form({ vehicleId: 'v_1', choice: 'none' }))
    expect(prisma.vehicleModel.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { assetId: null, updatedBy: 'admin_1' } }))
  })

  it('deletes the assignment to return to automatic matching', async () => {
    asAdmin()
    await setVehicleModel(form({ vehicleId: 'v_1', choice: 'auto' }))
    expect(prisma.vehicleModel.deleteMany).toHaveBeenCalledWith({ where: { vehicleId: 'v_1' } })
    expect(prisma.vehicleModel.upsert).not.toHaveBeenCalled()
  })

  it('rejects a model that is not a studio model', async () => {
    asAdmin()
    await expect(setVehicleModel(form({ vehicleId: 'v_1', choice: 'toyota-camry' }))).rejects.toThrow('Unknown studio model')
    expect(prisma.vehicleModel.upsert).not.toHaveBeenCalled()
  })

  it('throws Forbidden for a non-admin assignment', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u_1', isAdmin: false } })
    await expect(setVehicleModel(form({ vehicleId: 'v_1', choice: 'none' }))).rejects.toThrow('Forbidden')
  })
})
