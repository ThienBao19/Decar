'use server'

import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { listStudioModels } from '@/lib/model-registry'

function requireField(form: FormData, key: string): string {
  const value = form.get(key)
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${key}`)
  return value
}

export async function setUserTier(form: FormData) {
  await requireAdmin()
  const userId = requireField(form, 'userId')
  const tier = requireField(form, 'tier')
  if (tier !== 'FREE' && tier !== 'PRO') throw new Error('Invalid tier')
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: `pending_${userId}`, tier, status: 'ACTIVE' },
    update: { tier, status: 'ACTIVE' },
  })
  revalidatePath('/admin/users')
}

export async function setUserAdmin(form: FormData) {
  const session = await requireAdmin()
  const userId = requireField(form, 'userId')
  if (userId === session.user.id) throw new Error('You cannot change your own admin role')
  await prisma.user.update({ where: { id: userId }, data: { isAdmin: form.get('isAdmin') === 'true' } })
  revalidatePath('/admin/users')
}

export async function setBuildPublic(form: FormData) {
  await requireAdmin()
  const buildId = requireField(form, 'buildId')
  await prisma.vehicleBuild.update({ where: { id: buildId }, data: { isPublic: form.get('isPublic') === 'true' } })
  revalidatePath('/admin/builds')
}

export async function deleteBuild(form: FormData) {
  await requireAdmin()
  await prisma.vehicleBuild.delete({ where: { id: requireField(form, 'buildId') } })
  revalidatePath('/admin/builds')
}

export async function deleteVehicle(form: FormData) {
  await requireAdmin()
  const vehicleId = requireField(form, 'vehicleId')
  // Comparisons reference vehicles without cascade, so clear them first
  await prisma.$transaction([
    prisma.vehicleComparison.deleteMany({ where: { OR: [{ vehicleAId: vehicleId }, { vehicleBId: vehicleId }] } }),
    prisma.vehicle.delete({ where: { id: vehicleId } }),
  ])
  revalidatePath('/admin/vehicles')
}

// choice: "auto" (drop the assignment, use alias + year matching), "none" (photos only),
// or the id of a studio model
export async function setVehicleModel(form: FormData) {
  const session = await requireAdmin()
  const vehicleId = requireField(form, 'vehicleId')
  const choice = requireField(form, 'choice')
  if (choice === 'auto') {
    await prisma.vehicleModel.deleteMany({ where: { vehicleId } })
  } else {
    const isStudioModel = listStudioModels().some((m) => m.id === choice)
    if (choice !== 'none' && !isStudioModel) throw new Error('Unknown studio model')
    const data = { assetId: choice === 'none' ? null : choice, updatedBy: session.user.id }
    await prisma.vehicleModel.upsert({ where: { vehicleId }, create: { vehicleId, ...data }, update: data })
  }
  revalidatePath('/admin/vehicles')
  revalidatePath('/admin/models')
}
