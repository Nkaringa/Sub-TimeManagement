'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CreateEmployeePage() {
  const [employeeId, setEmployeeId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('EMPLOYEE')
  const [managersFull, setManagersFull] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/manager/employees')
      .then(r => r.json())
      .then(data => {
        if (data.employees) {
          const count = data.employees.filter((e: { role: string }) => e.role === 'MANAGER').length
          setManagersFull(count >= 2)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/manager/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId.trim().toUpperCase(),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          role,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create employee.')
      } else {
        window.location.href = '/manager/dashboard'
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F0F2F8' }}>
      {/* Top bar */}
      <div className="px-8 pt-6 flex items-center justify-between shrink-0">
        <span className="text-sm font-black tracking-widest uppercase" style={{ color: '#1C3060', letterSpacing: '0.15em' }}>
          SHIFTLY
        </span>
        <Link
          href="/manager/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer"
          style={{ color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-8">
        {/* Title */}
        <div className="text-center mb-6 w-full max-w-md">
          <h1 className="text-4xl font-black mb-2" style={{ color: '#1C3060' }}>
            Add New Employee
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Create a new profile for your workforce management.
          </p>
        </div>

        {/* Info box */}
        <div
          className="w-full max-w-md flex items-start gap-3 px-4 py-3.5 rounded-xl mb-5"
          style={{ backgroundColor: 'rgba(28,48,96,0.05)', border: '1px solid rgba(28,48,96,0.1)' }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: '#1C3060' }}>
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#1C3060' }}>
            Default PIN is <strong>1234</strong> — employee will set a new one on first login.
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(28,48,96,0.08)' }}>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Employee ID */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                EMPLOYEE ID <span style={{ color: '#1C3060' }}>*</span>
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                required
                placeholder="e.g. EMP001"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-stone-400"
                style={{ backgroundColor: '#F0F0F0', border: 'none', color: '#1F2937' }}
              />
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                FULL NAME <span style={{ color: '#1C3060' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Jane Smith"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-stone-400"
                style={{ backgroundColor: '#F0F0F0', border: 'none', color: '#1F2937' }}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                PHONE
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-stone-400"
                style={{ backgroundColor: '#F0F0F0', border: 'none', color: '#1F2937' }}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-stone-400"
                style={{ backgroundColor: '#F0F0F0', border: 'none', color: '#1F2937' }}
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                ROLE
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full appearance-none px-4 py-3 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ backgroundColor: '#F0F0F0', border: 'none', color: '#1F2937' }}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER" disabled={managersFull}>
                    Manager{managersFull ? ' (limit reached)' : ''}
                  </option>
                </select>
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ color: '#6B7280' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
              {managersFull && (
                <p className="text-xs mt-1" style={{ color: '#D97706' }}>This store already has 2 managers.</p>
              )}
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
              className="w-full py-3.5 rounded-xl font-bold text-base text-white transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1C3060', boxShadow: '0 4px 16px rgba(28,48,96,0.3)' }}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                  </svg>
                  Create employee
                </>
              )}
            </button>
          </form>

          {/* Card footer */}
          <div className="px-6 py-3 text-center" style={{ backgroundColor: '#F9F9F9', borderTop: '1px solid #F0F0F0' }}>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#9CA3AF' }}>
              NEW HIRE ONBOARDING SYSTEM
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
