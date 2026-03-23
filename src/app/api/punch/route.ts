import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (session.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { store: true },
  })

  if (!user?.store) {
    return NextResponse.json({ error: 'Store not found.' }, { status: 400 })
  }

  const store = user.store
  const now = new Date()

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: store.timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const hour = parseInt(timeParts.find(p => p.type === 'hour')!.value)
  const minute = parseInt(timeParts.find(p => p.type === 'minute')!.value)
  const totalMinutes = hour * 60 + minute
  const windowStart = 7 * 60 + 45   // 7:45 AM
  const windowEnd = 22 * 60 + 15    // 10:15 PM

  const openPunch = await prisma.timePunch.findFirst({
    where: { userId: session.userId, clockOut: null },
  })

  if (openPunch) {
    // Clocking out — allowed at any time, but cap recorded time at windowEnd
    let clockOutTime = now
    if (totalMinutes > windowEnd) {
      const dateParts = new Intl.DateTimeFormat('en-US', {
        timeZone: store.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(now)
      const yr = dateParts.find(p => p.type === 'year')!.value
      const mo = dateParts.find(p => p.type === 'month')!.value
      const dy = dateParts.find(p => p.type === 'day')!.value

      // Derive UTC offset (local − UTC, in minutes) and build cap timestamp
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
      let offsetMinutes = totalMinutes - utcMinutes
      if (offsetMinutes > 720) offsetMinutes -= 1440
      if (offsetMinutes < -720) offsetMinutes += 1440

      const localMidnightUTC = Date.parse(`${yr}-${mo}-${dy}T00:00:00Z`) - offsetMinutes * 60_000
      clockOutTime = new Date(localMidnightUTC + windowEnd * 60_000)
    }
    await prisma.timePunch.update({
      where: { id: openPunch.id },
      data: { clockOut: clockOutTime },
    })
  } else {
    // Clocking in — enforce time window
    if (totalMinutes < windowStart || totalMinutes > windowEnd) {
      return NextResponse.json(
        { error: 'Punches are only allowed between 7:45 AM and 10:15 PM.' },
        { status: 403 }
      )
    }
    await prisma.timePunch.create({
      data: { userId: session.userId, clockIn: now },
    })
  }

  return NextResponse.json({ success: true })
}
