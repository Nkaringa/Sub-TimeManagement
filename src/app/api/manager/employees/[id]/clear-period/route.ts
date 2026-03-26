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
    include: { store: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })
  }

  const now = new Date()
  const timezone = user.store?.timezone ?? 'UTC'

  // Get local date/time parts in the store's timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const yr = parseInt(parts.find(p => p.type === 'year')!.value)
  const mo = parseInt(parts.find(p => p.type === 'month')!.value) - 1
  const dy = parseInt(parts.find(p => p.type === 'day')!.value)
  const localHour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const localMinute = parseInt(parts.find(p => p.type === 'minute')!.value)

  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const localMinutes = localHour * 60 + localMinute
  let offsetMinutes = localMinutes - utcMinutes
  if (offsetMinutes > 720) offsetMinutes -= 1440
  if (offsetMinutes < -720) offsetMinutes += 1440

  function midnightUTC(year: number, month: number, day: number): Date {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return new Date(Date.parse(`${year}-${m}-${d}T00:00:00Z`) - offsetMinutes * 60_000)
  }

  let prevPeriodStart: Date
  let prevPeriodEnd: Date

  if (dy <= 14) {
    const prevMo = mo === 0 ? 11 : mo - 1
    const prevYr = mo === 0 ? yr - 1 : yr
    prevPeriodStart = midnightUTC(prevYr, prevMo, 15)
    prevPeriodEnd = new Date(midnightUTC(yr, mo, 1).getTime() - 1)
  } else {
    prevPeriodStart = midnightUTC(yr, mo, 1)
    prevPeriodEnd = new Date(midnightUTC(yr, mo, 15).getTime() - 1)
  }

  await prisma.timePunch.deleteMany({
    where: {
      userId: id,
      clockIn: { gte: prevPeriodStart, lte: prevPeriodEnd },
    },
  })

  return NextResponse.json({ success: true })
}
