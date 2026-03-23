'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

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
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <header
        className="shrink-0 bg-white h-16 px-6 flex items-center justify-between z-10"
        style={{ boxShadow: '0 1px 0 #E2E8F0' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 7v5l3 3" />
            </svg>
          </div>
          <span className="font-[family-name:var(--font-playfair)] text-xl font-bold text-slate-900 italic tracking-tight">
            Shiftly
          </span>
        </div>
        <Link
          href="/admin/login"
          className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
        >
          Admin access
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left panel: store list */}
        <aside className="w-72 shrink-0 bg-white flex flex-col" style={{ borderRight: '1px solid #E2E8F0' }}>
          <div className="px-5 pt-6 pb-4 shrink-0">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
              Locations
            </p>
            <h2 className="text-base font-bold text-slate-900 mb-4">Select your store</h2>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
              </svg>
              <Input
                placeholder="Search stores…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {filtered.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm text-slate-400">No stores found</p>
              </div>
            )}
            {filtered.map(store => {
              const isSelected = selectedStore?.id === store.id
              return (
                <button
                  key={store.id}
                  onClick={() => { setSelectedStore(store); setError('') }}
                  className={`w-full text-left px-4 py-3.5 rounded-xl mb-1 transition-all duration-100 cursor-pointer group ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold leading-snug ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {store.name}
                    </p>
                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-[11px] font-[family-name:var(--font-jetbrains)] mt-0.5 ${
                    isSelected ? 'text-slate-400' : 'text-slate-400'
                  }`}>
                    #{store.storeNumber}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              {stores.length} location{stores.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </aside>

        {/* Right panel: login form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-slate-100">
          <div className="w-full max-w-sm animate-fade-up">
            {/* Store selection state */}
            {!selectedStore ? (
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-5" style={{ boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}>
                  <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72" />
                  </svg>
                </div>
                <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-slate-900 italic mb-2">
                  Choose a location
                </h2>
                <p className="text-sm text-slate-500">
                  Select your store from the sidebar to sign in
                </p>
              </div>
            ) : (
              <div className="mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700">Location selected</span>
                </div>
                <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-slate-900 italic leading-tight mb-1">
                  {selectedStore.name}
                </h2>
                <p className="text-sm font-[family-name:var(--font-jetbrains)] text-slate-400">
                  #{selectedStore.storeNumber}
                </p>
              </div>
            )}

            {/* Login Card */}
            <div
              className="bg-white rounded-2xl p-7"
              style={{ boxShadow: '0 4px 32px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04)' }}
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="employeeId" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                    Employee ID
                  </label>
                  <Input
                    id="employeeId"
                    placeholder="e.g. EMP001"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value.toUpperCase())}
                    disabled={!selectedStore}
                    autoComplete="off"
                    className="font-[family-name:var(--font-jetbrains)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pin" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                    PIN
                  </label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    disabled={!selectedStore}
                    className="text-xl tracking-[0.5em] placeholder:tracking-normal"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedStore || loading}
                  className="w-full h-12 rounded-xl font-bold text-[15px] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]"
                  style={selectedStore && !loading ? { boxShadow: '0 4px 16px rgba(15,23,42,0.2)' } : {}}
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
                    'Sign in'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
