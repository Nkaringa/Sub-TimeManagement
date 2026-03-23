import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { currentPin, newPin, name, phone, email } = await request.json()

  if (!currentPin || !newPin) {
    return NextResponse.json({ error: 'Current PIN and new PIN are required.' }, { status: 400 })
  }
  if (newPin.length < 4) {
    return NextResponse.json({ error: 'New PIN must be at least 4 digits.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  const valid = await bcrypt.compare(currentPin, user.pin)
  if (!valid) {
    return NextResponse.json({ error: 'Current PIN is incorrect.' }, { status: 401 })
  }

  const hashedPin = await bcrypt.hash(newPin, 12)

  const updateData: Record<string, unknown> = { pin: hashedPin, mustChangePin: false }
  if (user.role === 'MANAGER') {
    if (name !== undefined) updateData.name = String(name).trim()
    if (phone !== undefined) updateData.phone = String(phone).trim() || null
    if (email !== undefined) updateData.email = String(email).trim().toLowerCase() || null
  }

  await prisma.user.update({ where: { id: user.id }, data: updateData })

  session.mustChangePin = false
  await session.save()

  let redirect: string
  if (user.role === 'SUPER_ADMIN') {
    redirect = '/admin/dashboard'
  } else if (user.role === 'MANAGER') {
    redirect = '/manager/dashboard'
  } else {
    redirect = '/employee/dashboard'
  }

  return NextResponse.json({ redirect })
}
