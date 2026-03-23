import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export default async function RootPage() {
  const session = await getSession()
  if (!session.userId) redirect('/login')
  if (session.role === 'SUPER_ADMIN') redirect('/admin/dashboard')
  if (session.role === 'MANAGER') redirect('/manager/dashboard')
  redirect('/employee/dashboard')
}
