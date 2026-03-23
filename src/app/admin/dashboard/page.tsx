'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

interface Store {
  id: string
  storeNumber: string
  name: string
  _count: { users: number }
}

export default function AdminDashboardPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/stores')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setStores(data)
        else setError('Failed to load stores.')
      })
      .catch(() => setError('Failed to load stores.'))
  }, [])

  const filtered = useMemo(
    () =>
      stores.filter(
        s =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.storeNumber.includes(search)
      ),
    [stores, search]
  )

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  const totalUsers = stores.reduce((sum, s) => sum + s._count.users, 0)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <header
        className="bg-white h-16 px-6 flex items-center justify-between shrink-0"
        style={{ boxShadow: '0 1px 0 #E2E8F0' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 7v5l3 3" />
            </svg>
          </div>
          <span className="font-[family-name:var(--font-playfair)] text-xl font-bold text-slate-900 italic">
            Shiftly
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-slate-900 text-[10px] font-bold text-white tracking-widest uppercase">
            S-Ops
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/stores/create"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.15)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New store
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col px-4 py-8 max-w-3xl mx-auto w-full gap-5">
        {/* Title + search + stats */}
        <div className="animate-fade-up">
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-slate-900 italic mb-4">
            Store management
          </h1>

          {stores.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Locations</p>
                <p className="text-3xl font-bold text-slate-900 font-[family-name:var(--font-jetbrains)]">
                  {stores.length}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Total employees</p>
                <p className="text-3xl font-bold text-slate-900 font-[family-name:var(--font-jetbrains)]">
                  {totalUsers}
                </p>
              </div>
            </div>
          )}

          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
            </svg>
            <Input
              placeholder="Search by name or store number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 text-sm text-red-600 bg-white rounded-xl px-4 py-3.5 border border-red-100 shrink-0 animate-fade-in">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        {/* Store list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up delay-1">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72" />
                </svg>
              </div>
              <p className="text-slate-600 font-semibold mb-1">No stores found</p>
              <p className="text-sm text-slate-400">Try a different search or create a new store</p>
            </div>
          )}

          <div
            className={`bg-white rounded-2xl overflow-hidden animate-fade-up delay-2 ${filtered.length === 0 ? 'hidden' : ''}`}
            style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
          >
            {filtered.map((store, idx) => (
              <Link key={store.id} href={`/admin/stores/${store.id}`}>
                <div
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    idx < filtered.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  {/* Store icon */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72" />
                    </svg>
                  </div>

                  {/* Name + number */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{store.name}</p>
                    <p className="text-xs text-slate-400 font-[family-name:var(--font-jetbrains)] mt-0.5">
                      #{store.storeNumber}
                    </p>
                  </div>

                  {/* Users badge + chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-500">
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      {store._count.users}
                    </span>
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
