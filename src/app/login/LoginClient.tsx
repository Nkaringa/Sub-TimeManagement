'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Store {
  id: string
  name: string
  storeNumber: string
}

export function LoginClient({ stores }: { stores: Store[] }) {
  const [search, setSearch] = useState('')
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(
    () =>
      stores.filter(
        s =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.storeNumber.includes(search)
      ),
    [stores, search]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStore) return
    if (!employeeId.trim() || pin.length < 4) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId.trim().toUpperCase(),
          pin,
          storeId: selectedStore.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed.')
      } else {
        window.location.href = data.redirect
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#fefae0' }}>
      {/* Header */}
      <header className="shrink-0 px-8 h-14 flex items-center justify-between">
        <span className="text-xl font-black tracking-widest uppercase" style={{ color: '#6B1C1C', letterSpacing: '0.15em' }}>
          SHIFTLY
        </span>
        <Link
          href="/admin/login"
          className="text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-60"
          style={{ color: '#374151' }}
        >
          ADMIN ACCESS
        </Link>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 px-8 pb-8 gap-8">
        {/* Left panel: store selection */}
        <aside className="w-80 shrink-0 flex flex-col">
          <div className="mb-5 shrink-0">
            <h1 className="text-3xl font-black mb-1" style={{ color: '#6B1C1C' }}>
              Store Selection
            </h1>
            <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#5B8DB8' }}>
              WORKFORCE MANAGEMENT
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-4 shrink-0">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: '#9CA3AF' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
            </svg>
            <input
              type="text"
              placeholder="Search locations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none bg-white placeholder-stone-400"
              style={{ border: '1px solid rgba(107,28,28,0.06)', color: '#1F2937' }}
            />
          </div>

          {/* Store list (scrollable) */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {filtered.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm" style={{ color: '#9CA3AF' }}>No stores found</p>
              </div>
            )}
            {filtered.map(store => {
              const isSelected = selectedStore?.id === store.id
              return (
                <button
                  key={store.id}
                  onClick={() => { setSelectedStore(store); setError('') }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white transition-all cursor-pointer"
                  style={{
                    boxShadow: isSelected
                      ? '0 2px 10px rgba(107,28,28,0.14)'
                      : '0 1px 3px rgba(107,28,28,0.05)',
                    border: isSelected
                      ? '1.5px solid rgba(107,28,28,0.18)'
                      : '1.5px solid transparent',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isSelected ? '#FDF0F0' : '#F3F4F6' }}
                  >
                    {isSelected ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: '#6B1C1C' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#9CA3AF' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#1F2937' }}>{store.name}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>ID: #{store.storeNumber}</p>
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: '#6B1C1C' }}
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Right panel: Access Portal */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="bg-white rounded-3xl p-10 w-full max-w-md"
            style={{ boxShadow: '0 8px 40px rgba(107,28,28,0.1), 0 2px 8px rgba(107,28,28,0.05)' }}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black mb-2" style={{ color: '#1F2937' }}>
                Access Portal
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                Please enter your employee credentials<br />to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Employee ID */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#4B5563' }}>
                  EMPLOYEE ID
                </label>
                <input
                  type="text"
                  placeholder="Enter your ID"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value.toUpperCase())}
                  autoComplete="off"
                  className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                  style={{
                    backgroundColor: '#F5F5F5',
                    border: '1px solid #EBEBEB',
                    color: '#1F2937',
                  }}
                />
              </div>

              {/* Security PIN */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#4B5563' }}>
                  SECURITY PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                  style={{
                    backgroundColor: '#F5F5F5',
                    border: '1px solid #EBEBEB',
                    color: '#1F2937',
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  className="text-sm text-center font-medium px-4 py-3 rounded-xl"
                  style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedStore || loading}
                className="w-full py-4 rounded-xl font-bold text-base text-white transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                style={{ backgroundColor: '#6B1C1C', boxShadow: '0 4px 16px rgba(107,28,28,0.3)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  'Sign in →'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
