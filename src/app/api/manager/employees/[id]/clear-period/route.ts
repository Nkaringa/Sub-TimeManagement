import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  const user = await prisma.user.findFirst({
    where: { id, storeId: session.storeId },
  })

  if (!user) {
    return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })
  }

  const now = new Date()
  const day = now.getDate()
  let prevPeriodStart: Date
  let prevPeriodEnd: Date

  if (day <= 14) {
    const prevLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 15, 0, 0, 0, 0)
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, prevLastDay, 23, 59, 59, 999)
  } else {
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 14, 23, 59, 59, 999)
  }

  await prisma.timePunch.deleteMany({
    where: {
      userId: id,
      clockIn: { gte: prevPeriodStart, lte: prevPeriodEnd },
    },
  })

  return NextResponse.json({ success: true })
}
