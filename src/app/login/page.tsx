import { prisma } from '@/lib/prisma'
import { LoginClient } from './LoginClient'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const stores = await prisma.store.findMany({
    orderBy: { storeNumber: 'asc' },
    select: { id: true, name: true, storeNumber: true },
  })
  return <LoginClient stores={stores} />
}
