import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { calculateHours } from '@/lib/hours'

export async function GET() {
  const session = await getSession()
  if (session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const [punches, store] = await Promise.all([
    prisma.timePunch.findMany({ where: { userId: session.userId }, orderBy: { clockIn: 'asc' } }),
    prisma.store.findFirst({ where: { id: session.storeId! } }),
  ])

  const timezone = store?.timezone ?? 'UTC'
  const result = calculateHours(punches, timezone)
  return NextResponse.json({ ...result, timezone })
}
