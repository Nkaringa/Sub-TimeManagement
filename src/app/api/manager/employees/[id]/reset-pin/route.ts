import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  const user = await prisma.user.findFirst({
    where: { id, storeId: session.storeId },
  })

  if (!user) {
    return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })
  }

  const hashedPin = await bcrypt.hash('1234', 12)
  await prisma.user.update({
    where: { id },
    data: { pin: hashedPin, mustChangePin: true },
  })

  return NextResponse.json({ success: true })
}
