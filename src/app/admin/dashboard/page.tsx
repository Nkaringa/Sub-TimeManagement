'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

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
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#fefae0' }}>
      {/* Header */}
      <header className="px-8 h-16 flex items-center justify-between shrink-0">
        <span className="text-xl font-black tracking-widest uppercase" style={{ color: '#6B1C1C', letterSpacing: '0.15em' }}>
          SHIFTLY
        </span>

        <div className="flex items-center gap-12">
          <nav className="flex items-center gap-8">
            <span className="text-sm font-semibold cursor-default" style={{ color: '#6B1C1C' }}>
              Dashboard
            </span>
            <span className="text-sm font-medium text-stone-400 cursor-default">
              Timesheets
            </span>
          </nav>

          <button
          onClick={handleSignOut}
          className="text-sm font-semibold px-5 py-2 rounded-full border-2 transition-colors cursor-pointer"
          style={{ borderColor: '#6B1C1C', color: '#6B1C1C' }}
        >
          Sign Out
        </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col px-8 py-8 max-w-4xl mx-auto w-full gap-6">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black" style={{ color: '#6B1C1C' }}>
            Store Management
          </h1>
          <Link
            href="/admin/stores/create"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: '#6B1C1C' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add New Store
          </Link>
        </div>

        {/* Stats row */}
        {stores.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70" style={{ border: '1px solid rgba(107,28,28,0.12)' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6B1C1C', opacity: 0.5 }}>Locations</span>
              <span className="text-sm font-black" style={{ color: '#6B1C1C' }}>{stores.length}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70" style={{ border: '1px solid rgba(107,28,28,0.12)' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6B1C1C', opacity: 0.5 }}>Total Employees</span>
              <span className="text-sm font-black" style={{ color: '#6B1C1C' }}>{totalUsers}</span>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#6B1C1C', opacity: 0.35 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or store number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-5 py-3.5 rounded-full text-sm outline-none bg-white placeholder-stone-400"
            style={{ border: '1px solid rgba(107,28,28,0.1)', color: '#3D1010' }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 text-sm bg-white rounded-2xl px-4 py-3.5 shrink-0" style={{ color: '#6B1C1C', border: '1px solid rgba(107,28,28,0.15)' }}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        {/* Store list */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3">
          {filtered.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-bold mb-1" style={{ color: '#6B1C1C' }}>No stores found</p>
              <p className="text-sm text-stone-400">Try a different search or add a new store</p>
            </div>
          )}

          {filtered.map(store => (
            <Link key={store.id} href={`/admin/stores/${store.id}`}>
              <div
                className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-white hover:bg-stone-50 transition-colors cursor-pointer"
                style={{ boxShadow: '0 1px 4px rgba(107,28,28,0.06)' }}
              >
                {/* Store name */}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold truncate" style={{ color: '#2D0D0D' }}>{store.name}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#EEF2FF', color: '#4361C2' }}>
                    #{store.storeNumber}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#FDF4F4', color: '#6B1C1C' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    {store._count.users}
                  </span>
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#6B1C1C', opacity: 0.25 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
