'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F0F2F8' }}>
      {/* Back link */}
      <div className="px-8 pt-6 shrink-0 flex justify-end">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#1C3060' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Store Login
        </Link>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-8">
        <div
          className="bg-white rounded-3xl p-8 w-full max-w-sm"
          style={{ boxShadow: '0 4px 32px rgba(28,48,96,0.08), 0 1px 4px rgba(28,48,96,0.04)' }}
        >
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#1C3060' }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-widest uppercase mb-2" style={{ color: '#1F2937', letterSpacing: '0.12em' }}>
              SHIFTLY
            </h1>
            <span
              className="px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
              style={{ backgroundColor: '#EEF1F8', color: '#1C3060', border: '1px solid rgba(28,48,96,0.12)' }}
            >
              ADMIN PORTAL
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Admin ID */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#9CA3AF' }}>
                ADMIN ID
              </label>
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ color: '#9CA3AF' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                <input
                  type="text"
                  placeholder="Enter your ID"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none placeholder-stone-400"
                  style={{ backgroundColor: '#F5F5F5', border: '1px solid #EBEBEB', color: '#1F2937' }}
                />
              </div>
            </div>

            {/* Access PIN */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#9CA3AF' }}>
                ACCESS PIN
              </label>
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ color: '#9CA3AF' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="• • • •"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: '#F5F5F5', border: '1px solid #EBEBEB', color: '#1F2937' }}
                />
              </div>
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
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-base text-white transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              style={{ backgroundColor: '#1C3060', boxShadow: '0 4px 16px rgba(28,48,96,0.3)' }}
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

          {/* Disclaimer */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid #E4E8F4' }}>
            <p className="text-xs text-center leading-relaxed mb-3" style={{ color: '#9CA3AF' }}>
              This is a restricted workforce management portal. Unauthorized access attempts are logged and monitored.
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#9CA3AF' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Encrypted</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: '#9CA3AF' }}>
          PRECISION MANAGEMENT ECOSYSTEM
        </p>
      </div>
    </div>
  )
}
