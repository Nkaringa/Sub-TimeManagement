import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      users: {
        include: { punches: { where: { clockOut: null }, take: 1 } },
      },
    },
  })

  if (!store) {
    return NextResponse.json({ error: 'Store not found.' }, { status: 404 })
  }

  const employees = store.users.map(u => ({
    id: u.id,
    employeeId: u.employeeId,
    name: u.name,
    role: u.role,
    clockedIn: u.punches.length > 0,
  }))

  return NextResponse.json({
    id: store.id,
    name: store.name,
    storeNumber: store.storeNumber,
    timezone: store.timezone,
    employees,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  const { name } = await request.json()

  await prisma.store.update({ where: { id }, data: { name } })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  await prisma.store.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
