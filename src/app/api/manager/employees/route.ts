import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const now = new Date()

  // Start of current week (Monday 00:00:00)
  const weekStart = new Date(now)
  const day = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
  weekStart.setHours(0, 0, 0, 0)

  // Start of today
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const users = await prisma.user.findMany({
    where: {
      storeId: session.storeId,
      role: { in: ['EMPLOYEE', 'MANAGER'] },
    },
    orderBy: { name: 'asc' },
    include: {
      punches: {
        orderBy: { clockIn: 'desc' },
        take: 100,
      },
    },
  })

  let totalHoursToday = 0

  const employees = users.map(u => {
    const openPunch = u.punches.find(p => p.clockOut === null)
    const clockedIn = !!openPunch

    // Last punch time: clock-in time for active, last clock-out for inactive
    let lastPunchTime: string | null = null
    if (clockedIn && openPunch) {
      lastPunchTime = openPunch.clockIn.toISOString()
    } else {
      const lastCompleted = u.punches.find(p => p.clockOut !== null)
      lastPunchTime = lastCompleted?.clockOut?.toISOString() ?? null
    }

    // Weekly hours
    const weeklyHours = u.punches
      .filter(p => p.clockIn >= weekStart)
      .reduce((sum, p) => {
        const end = p.clockOut ? p.clockOut.getTime() : now.getTime()
        return sum + (end - p.clockIn.getTime()) / 3600000
      }, 0)

    // Today hours
    const todayHours = u.punches
      .filter(p => p.clockIn >= todayStart)
      .reduce((sum, p) => {
        const end = p.clockOut ? p.clockOut.getTime() : now.getTime()
        return sum + (end - p.clockIn.getTime()) / 3600000
      }, 0)
    totalHoursToday += todayHours

    return {
      id: u.id,
      employeeId: u.employeeId,
      name: u.name,
      role: u.role,
      clockedIn,
      lastPunchTime,
      weeklyHours: Math.round(weeklyHours * 10) / 10,
    }
  })

  const clockedInCount = employees.filter(e => e.clockedIn).length

  return NextResponse.json({
    employees,
    stats: {
      clockedIn: clockedInCount,
      absent: employees.length - clockedInCount,
      totalHoursToday: Math.round(totalHoursToday * 10) / 10,
    },
  })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { employeeId, name, phone, email, role } = await request.json()

  if (!employeeId || !name || !role) {
    return NextResponse.json({ error: 'employeeId, name, and role are required.' }, { status: 400 })
  }
  if (role !== 'EMPLOYEE' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Role must be EMPLOYEE or MANAGER.' }, { status: 400 })
  }

  if (role === 'MANAGER') {
    const managerCount = await prisma.user.count({
      where: { storeId: session.storeId, role: 'MANAGER' },
    })
    if (managerCount >= 2) {
      return NextResponse.json({ error: 'This store already has 2 managers.' }, { status: 409 })
    }
  }

  const upperId = String(employeeId).trim().toUpperCase()

  const existing = await prisma.user.findFirst({
    where: { employeeId: upperId, storeId: session.storeId },
  })
  if (existing) {
    return NextResponse.json({ error: 'Employee ID already exists in this store.' }, { status: 409 })
  }

  const pin = await bcrypt.hash('1234', 12)

  const user = await prisma.user.create({
    data: {
      employeeId: upperId,
      name: String(name).trim(),
      phone: phone ? String(phone).trim() || null : null,
      email: email ? String(email).trim().toLowerCase() || null : null,
      pin,
      mustChangePin: true,
      role,
      storeId: session.storeId,
    },
  })

  return NextResponse.json({ id: user.id }, { status: 201 })
}
