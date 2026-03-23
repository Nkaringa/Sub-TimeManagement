import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { calculateHours } from '@/lib/hours'

export async function GET() {
  const session = await getSession()
  if (session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const punches = await prisma.timePunch.findMany({
    where: { userId: session.userId },
    orderBy: { clockIn: 'asc' },
  })

  const result = calculateHours(punches)
  return NextResponse.json(result)
}
