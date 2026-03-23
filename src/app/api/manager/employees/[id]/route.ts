import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { calculateHours } from '@/lib/hours'

export async function GET(
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
    include: { punches: { orderBy: { clockIn: 'asc' } } },
  })

  if (!user) {
    return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })
  }

  const openPunch = user.punches.find(p => !p.clockOut)
  const { weekly, biweekly, prevBiweekly, periodLabel, prevPeriodLabel } = calculateHours(user.punches)

  const recentPunches = [...user.punches]
    .sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime())
    .slice(0, 50)
    .map(p => ({ id: p.id, clockIn: p.clockIn, clockOut: p.clockOut }))

  return NextResponse.json({
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    clockedIn: !!openPunch,
    clockInTime: openPunch?.clockIn ?? null,
    weekly,
    biweekly,
    prevBiweekly,
    periodLabel,
    prevPeriodLabel,
    punches: recentPunches,
  })
}

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

  if (user.id === session.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
