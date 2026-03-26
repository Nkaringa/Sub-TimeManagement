import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const { time } = body as { time?: string }

  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: 'Invalid time format. Expected HH:MM.' }, { status: 400 })
  }

  const [inputHour, inputMinute] = time.split(':').map(Number)
  const enteredMinutes = inputHour * 60 + inputMinute
  const windowEnd = 22 * 60 + 15 // 10:15 PM
  const clockOutMinutes = Math.min(enteredMinutes, windowEnd)

  const user = await prisma.user.findFirst({
    where: { id, storeId: session.storeId },
    include: { store: true },
  })

  if (!user?.store) {
    return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })
  }

  const openPunch = await prisma.timePunch.findFirst({
    where: { userId: id, clockOut: null },
  })

  if (!openPunch) {
    return NextResponse.json({ error: 'No open punch found.' }, { status: 400 })
  }

  // Anchor to the clock-in day in the store's timezone
  const store = user.store
  const clockIn = openPunch.clockIn

  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: store.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(clockIn)

  const yr = dateParts.find(p => p.type === 'year')!.value
  const mo = dateParts.find(p => p.type === 'month')!.value
  const dy = dateParts.find(p => p.type === 'day')!.value
  const localHour = parseInt(dateParts.find(p => p.type === 'hour')!.value)
  const localMinute = parseInt(dateParts.find(p => p.type === 'minute')!.value)
  const localTotalMinutes = localHour * 60 + localMinute

  // Derive UTC offset from the clock-in timestamp
  const utcMinutes = clockIn.getUTCHours() * 60 + clockIn.getUTCMinutes()
  let offsetMinutes = localTotalMinutes - utcMinutes
  if (offsetMinutes > 720) offsetMinutes -= 1440
  if (offsetMinutes < -720) offsetMinutes += 1440

  const localMidnightUTC = Date.parse(`${yr}-${mo}-${dy}T00:00:00Z`) - offsetMinutes * 60_000
  const clockOutTime = new Date(localMidnightUTC + clockOutMinutes * 60_000)

  if (clockOutTime.getTime() <= openPunch.clockIn.getTime()) {
    return NextResponse.json(
      { error: 'Clock-out time must be after clock-in time.' },
      { status: 400 }
    )
  }

  await prisma.timePunch.update({
    where: { id: openPunch.id },
    data: { clockOut: clockOutTime },
  })

  return NextResponse.json({ success: true })
}
