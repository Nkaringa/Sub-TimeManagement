import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: {
      storeId: session.storeId,
      role: { in: ['EMPLOYEE', 'MANAGER'] },
    },
    orderBy: { name: 'asc' },
    include: {
      punches: { where: { clockOut: null }, take: 1 },
    },
  })

  const employees = users.map(u => ({
    id: u.id,
    employeeId: u.employeeId,
    name: u.name,
    role: u.role,
    clockedIn: u.punches.length > 0,
  }))

  return NextResponse.json({ employees })
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
