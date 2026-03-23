import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(request: Request) {
  const { employeeId, pin, storeId } = await request.json()

  const upperId = String(employeeId).trim().toUpperCase()

  let user
  if (storeId) {
    user = await prisma.user.findFirst({
      where: {
        employeeId: upperId,
        storeId,
        role: { in: ['EMPLOYEE', 'MANAGER'] },
      },
    })
  } else {
    user = await prisma.user.findFirst({
      where: {
        employeeId: upperId,
        role: 'SUPER_ADMIN',
        storeId: null,
      },
    })
  }

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const valid = await bcrypt.compare(pin, user.pin)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const session = await getSession()
  session.userId = user.id
  session.role = user.role as 'SUPER_ADMIN' | 'MANAGER' | 'EMPLOYEE'
  session.storeId = user.storeId
  session.mustChangePin = user.mustChangePin
  await session.save()

  let redirect: string
  if (user.mustChangePin) {
    redirect = '/change-pin'
  } else if (user.role === 'SUPER_ADMIN') {
    redirect = '/admin/dashboard'
  } else if (user.role === 'MANAGER') {
    redirect = '/manager/dashboard'
  } else {
    redirect = '/employee/dashboard'
  }

  return NextResponse.json({ redirect })
}
