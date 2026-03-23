import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const stores = await prisma.store.findMany({
    orderBy: { storeNumber: 'asc' },
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(stores)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { storeNumber, name, timezone } = await request.json()

  if (!storeNumber || !name || !timezone) {
    return NextResponse.json({ error: 'storeNumber, name, and timezone are required.' }, { status: 400 })
  }

  const store = await prisma.store.create({
    data: { storeNumber: String(storeNumber).trim(), name: String(name).trim(), timezone },
  })

  const pin = await bcrypt.hash('1234', 12)
  await prisma.user.create({
    data: {
      employeeId: 'MGR1',
      name: 'Manager',
      pin,
      mustChangePin: true,
      role: 'MANAGER',
      storeId: store.id,
    },
  })

  return NextResponse.json({ id: store.id }, { status: 201 })
}
