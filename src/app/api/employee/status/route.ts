import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const openPunch = await prisma.timePunch.findFirst({
    where: { userId: session.userId, clockOut: null },
  })

  const store = session.storeId
    ? await prisma.store.findUnique({ where: { id: session.storeId }, select: { name: true, storeNumber: true } })
    : null

  return NextResponse.json({
    clockedIn: !!openPunch,
    clockInTime: openPunch?.clockIn ?? null,
    storeName: store ? `${store.name} #${store.storeNumber}` : null,
  })
}
