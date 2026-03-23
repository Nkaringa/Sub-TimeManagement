'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

export default function AdminLoginPage() {
  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim().toUpperCase(), pin }),
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
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header
        className="bg-white h-16 px-6 flex items-center"
        style={{ boxShadow: '0 1px 0 #E2E8F0' }}
      >
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to store login
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Brand + heading */}
          <div className="mb-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-slate-900 italic">
                Shiftly
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 tracking-widest uppercase border border-slate-200">
                Admin
              </span>
            </div>
            <p className="text-sm text-slate-500">Sign in with your admin credentials</p>
          </div>

          {/* Form card */}
          <div
            className="bg-white rounded-2xl p-7"
            style={{ boxShadow: '0 4px 32px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="adminId" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                  Admin ID
                </label>
                <Input
                  id="adminId"
                  placeholder="e.g. ADMIN"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
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
                disabled={loading}
                className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-[15px] transition-all duration-150 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.15)' }}
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
  )
}
