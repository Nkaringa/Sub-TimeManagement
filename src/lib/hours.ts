import { TimePunch } from '@prisma/client'

export interface HoursResult {
  weekly: number
  biweekly: number
  periodLabel: string
  prevBiweekly: number
  prevPeriodLabel: string
}

export function calculateHours(punches: TimePunch[]): HoursResult {
  const now = new Date()

  // Weekly range: Monday 00:00 → now
  const weekStart = new Date(now)
  const dayOfWeek = weekStart.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  weekStart.setDate(weekStart.getDate() - daysToMonday)
  weekStart.setHours(0, 0, 0, 0)

  // Current biweekly range (calendar-based: 1–14 or 15–end of month)
  const day = now.getDate()
  let periodStart: Date
  let periodEnd: Date
  let periodLabel: string
  let prevPeriodStart: Date
  let prevPeriodEnd: Date
  let prevPeriodLabel: string

  if (day <= 14) {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    periodEnd = new Date(now.getFullYear(), now.getMonth(), 14, 23, 59, 59, 999)
    const monthName = now.toLocaleString('en-US', { month: 'short' })
    periodLabel = `${monthName} 1 – ${monthName} 14`

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    prevPeriodStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15, 0, 0, 0, 0)
    prevPeriodEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevLastDay, 23, 59, 59, 999)
    const prevMonthName = prevMonth.toLocaleString('en-US', { month: 'short' })
    prevPeriodLabel = `${prevMonthName} 15 – ${prevMonthName} ${prevLastDay}`
  } else {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    periodStart = new Date(now.getFullYear(), now.getMonth(), 15, 0, 0, 0, 0)
    periodEnd = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59, 999)
    const monthName = now.toLocaleString('en-US', { month: 'short' })
    periodLabel = `${monthName} 15 – ${monthName} ${lastDay}`

    prevPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 14, 23, 59, 59, 999)
    prevPeriodLabel = `${monthName} 1 – ${monthName} 14`
  }

  let weekly = 0
  let biweekly = 0
  let prevBiweekly = 0

  for (const punch of punches) {
    const clockIn = new Date(punch.clockIn)
    const clockOut = punch.clockOut ? new Date(punch.clockOut) : now
    const durationHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)

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
