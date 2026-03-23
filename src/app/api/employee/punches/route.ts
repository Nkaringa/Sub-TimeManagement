import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const punches = await prisma.timePunch.findMany({
    where: { userId: session.userId },
    orderBy: { clockIn: 'desc' },
    take: 50,
  })

  return NextResponse.json(
    punches.map(p => ({ id: p.id, clockIn: p.clockIn, clockOut: p.clockOut }))
  )
}
