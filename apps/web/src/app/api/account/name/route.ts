import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MAX_NAME_LENGTH } from '@/lib/pending-name'

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `Name must be 1-${MAX_NAME_LENGTH} characters` }, { status: 400 })
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { name } })
  return NextResponse.json({ data: { name } })
}
