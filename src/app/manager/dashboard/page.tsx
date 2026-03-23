'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Employee {
  id: string
  employeeId: string
  name: string
  role: string
  clockedIn: boolean
}

export default function ManagerDashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/manager/employees')
      .then(r => r.json())
      .then(data => {
        if (data.employees) setEmployees(data.employees)
        else setError('Failed to load employees.')
      })
      .catch(() => setError('Failed to load employees.'))
  }, [])

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const clockedInCount = employees.filter(e => e.clockedIn).length
  const clockedOutCount = employees.filter(e => !e.clockedIn).length

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <header
        className="bg-white h-16 px-6 flex items-center justify-between shrink-0 sticky top-0 z-10"
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
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-600 tracking-widest uppercase border border-blue-100">
            Manager
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/manager/create"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.15)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add employee
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

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        {/* Page title + stats */}
        <div className="mb-6 animate-fade-up">
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-slate-900 italic mb-4">
            Team overview
          </h1>

          {employees.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Total</p>
                <p className="text-3xl font-bold text-slate-900 font-[family-name:var(--font-jetbrains)]">
                  {employees.length}
                </p>
              </div>
              <div
                className="bg-emerald-600 rounded-2xl p-4"
                style={{ boxShadow: '0 4px 16px rgba(5,150,105,0.2)' }}
              >
                <p className="text-[10px] font-bold text-emerald-200 tracking-widest uppercase mb-2">On shift</p>
                <p className="text-3xl font-bold text-white font-[family-name:var(--font-jetbrains)]">
                  {clockedInCount}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Off shift</p>
                <p className="text-3xl font-bold text-slate-400 font-[family-name:var(--font-jetbrains)]">
                  {clockedOutCount}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 text-sm text-red-600 bg-white rounded-xl px-4 py-3.5 border border-red-100 mb-4 animate-fade-in">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        {/* Filter tabs */}
        {employees.length > 0 && (
          <div className="flex items-center gap-2 mb-4 animate-fade-up delay-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold cursor-default">
              All employees
              <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10px]">{employees.length}</span>
            </span>
            {clockedInCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                On shift · {clockedInCount}
              </span>
            )}
          </div>
        )}

        {/* Empty state */}
        {employees.length === 0 && !error && (
          <div className="text-center py-24 animate-fade-up delay-1">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <p className="text-slate-600 font-semibold mb-1">No employees yet</p>
            <p className="text-sm text-slate-400 mb-5">Add your first team member to get started</p>
            <Link
              href="/manager/create"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add first employee
            </Link>
          </div>
        )}

        {/* Employee list */}
        {employees.length > 0 && (
          <div
            className="bg-white rounded-2xl overflow-hidden animate-fade-up delay-2"
            style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
          >
            {employees.map((emp, idx) => (
              <Link key={emp.id} href={`/manager/employees/${emp.id}`}>
                <div
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    idx < employees.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                    emp.clockedIn
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + ID */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{emp.name}</p>
                      {emp.role === 'MANAGER' && (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-[10px] font-bold text-amber-700 border border-amber-100 tracking-wide uppercase">
                          Mgr
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-[family-name:var(--font-jetbrains)] mt-0.5">
                      {emp.employeeId}
                    </p>
                  </div>

                  {/* Status + chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      emp.clockedIn
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}>
                      {emp.clockedIn && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                      )}
                      {emp.clockedIn ? 'In' : 'Out'}
                    </span>
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
