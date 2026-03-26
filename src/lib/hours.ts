import { TimePunch } from '@prisma/client'

export interface HoursResult {
  weekly: number
  biweekly: number
  periodLabel: string
  prevBiweekly: number
  prevPeriodLabel: string
}

export function calculateHours(punches: TimePunch[], timezone: string): HoursResult {
  const now = new Date()

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
  const mo = parseInt(parts.find(p => p.type === 'month')!.value) - 1 // 0-indexed
  const dy = parseInt(parts.find(p => p.type === 'day')!.value)
  const localHour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const localMinute = parseInt(parts.find(p => p.type === 'minute')!.value)

  // Derive UTC offset (same pattern as punch/route.ts and close-punch/route.ts)
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const localMinutes = localHour * 60 + localMinute
  let offsetMinutes = localMinutes - utcMinutes
  if (offsetMinutes > 720) offsetMinutes -= 1440
  if (offsetMinutes < -720) offsetMinutes += 1440

  // Convert a local date (0-indexed month) to its UTC midnight timestamp
  function midnightUTC(year: number, month: number, day: number): Date {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return new Date(Date.parse(`${year}-${m}-${d}T00:00:00Z`) - offsetMinutes * 60_000)
  }

  // Weekly range: Monday 00:00 → now (store-local)
  const localDayOfWeek = new Date(Date.UTC(yr, mo, dy)).getDay() // 0=Sun, 1=Mon
  const daysToMonday = localDayOfWeek === 0 ? 6 : localDayOfWeek - 1
  const weekStart = new Date(midnightUTC(yr, mo, dy).getTime() - daysToMonday * 86_400_000)

  // Current biweekly range (calendar-based in store-local time: 1–14 or 15–end of month)
  let periodStart: Date
  let periodEnd: Date
  let periodLabel: string
  let prevPeriodStart: Date
  let prevPeriodEnd: Date
  let prevPeriodLabel: string

  if (dy <= 14) {
    periodStart = midnightUTC(yr, mo, 1)
    periodEnd = new Date(midnightUTC(yr, mo, 15).getTime() - 1)
    const monthName = new Date(Date.UTC(yr, mo, 15)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
    periodLabel = `${monthName} 1 – ${monthName} 14`

    const prevMo = mo === 0 ? 11 : mo - 1
    const prevYr = mo === 0 ? yr - 1 : yr
    const prevLastDay = new Date(Date.UTC(yr, mo, 0)).getUTCDate()
    prevPeriodStart = midnightUTC(prevYr, prevMo, 15)
    prevPeriodEnd = new Date(midnightUTC(yr, mo, 1).getTime() - 1)
    const prevMonthName = new Date(Date.UTC(prevYr, prevMo, 15)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
    prevPeriodLabel = `${prevMonthName} 15 – ${prevMonthName} ${prevLastDay}`
  } else {
    const lastDay = new Date(Date.UTC(yr, mo + 1, 0)).getUTCDate()
    const nextMo = mo === 11 ? 0 : mo + 1
    const nextYr = mo === 11 ? yr + 1 : yr
    periodStart = midnightUTC(yr, mo, 15)
    periodEnd = new Date(midnightUTC(nextYr, nextMo, 1).getTime() - 1)
    const monthName = new Date(Date.UTC(yr, mo, 15)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
    periodLabel = `${monthName} 15 – ${monthName} ${lastDay}`

    prevPeriodStart = midnightUTC(yr, mo, 1)
    prevPeriodEnd = new Date(midnightUTC(yr, mo, 15).getTime() - 1)
    prevPeriodLabel = `${monthName} 1 – ${monthName} 14`
  }

  let weekly = 0
  let biweekly = 0
  let prevBiweekly = 0

  // Max possible shift: 7:45 AM – 10:15 PM = 14h 30m
  // Cap open punches so a forgotten clock-in doesn't accumulate hours past one shift
  const MAX_SHIFT_MS = 14.5 * 60 * 60 * 1000

  for (const punch of punches) {
    const clockIn = new Date(punch.clockIn)
    const effectiveEnd = punch.clockOut
      ? new Date(punch.clockOut)
      : new Date(Math.min(now.getTime(), clockIn.getTime() + MAX_SHIFT_MS))
    const durationHours = (effectiveEnd.getTime() - clockIn.getTime()) / (1000 * 60 * 60)

    if (clockIn >= weekStart && clockIn <= now) weekly += durationHours
    if (clockIn >= periodStart && clockIn <= periodEnd) biweekly += durationHours
    if (clockIn >= prevPeriodStart && clockIn <= prevPeriodEnd) prevBiweekly += durationHours
  }

  return {
    weekly: Math.round(weekly * 100) / 100,
    biweekly: Math.round(biweekly * 100) / 100,
    periodLabel,
    prevBiweekly: Math.round(prevBiweekly * 100) / 100,
    prevPeriodLabel,
  }
}

export function formatHours(decimalHours: number): string {
  const h = Math.floor(decimalHours)
  const m = Math.round((decimalHours - h) * 60)
  return `${h}h ${m}m`
}
