'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

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
    <div className="min-h-screen flex flex-col bg-slate-100">
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
        </div>
        <Link
          href="/manager/dashboard"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </Link>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-slate-900 italic mb-2">
              Add employee
            </h1>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
              <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <p className="text-xs text-blue-700 font-medium">
                Default PIN is <span className="font-[family-name:var(--font-jetbrains)] font-bold">1234</span> — employee will set a new one on first login.
              </p>
            </div>
          </div>

          {/* Form card */}
          <div
            className="bg-white rounded-2xl p-6"
            style={{ boxShadow: '0 4px 24px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="employeeId" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                  Employee ID <span className="text-slate-300 font-normal normal-case tracking-normal">required</span>
                </label>
                <Input
                  id="employeeId"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  required
                  placeholder="e.g. EMP001"
                  className="font-[family-name:var(--font-jetbrains)]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                  Full name <span className="text-slate-300 font-normal normal-case tracking-normal">required</span>
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="e.g. Jane Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="role" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 cursor-pointer"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER" disabled={managersFull}>
                    Manager{managersFull ? ' (limit reached)' : ''}
                  </option>
                </select>
                {managersFull && (
                  <p className="text-xs text-amber-600 mt-1">This store already has 2 managers.</p>
                )}
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
                    Creating…
                  </span>
                ) : (
                  'Create employee'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
