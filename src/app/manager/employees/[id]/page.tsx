'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatHours } from '@/lib/hours'

interface Punch {
  id: string
  clockIn: string
  clockOut: string | null
}

interface EmployeeDetail {
  id: string
  employeeId: string
  name: string
  phone: string | null
  email: string | null
  role: string
  clockedIn: boolean
  clockInTime: string | null
  weekly: number
  biweekly: number
  prevBiweekly: number
  periodLabel: string
  prevPeriodLabel: string
  punches: Punch[]
}

function fmtDuration(ms: number): string {
  const totalMins = Math.round(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [emp, setEmp] = useState<EmployeeDetail | null>(null)
  const [loadError, setLoadError] = useState('')

  const [pinResetDone, setPinResetDone] = useState(false)
  const [pinResetError, setPinResetError] = useState('')

  const [paidConfirming, setPaidConfirming] = useState(false)
  const [paidError, setPaidError] = useState('')

  const [deleteConfirming, setDeleteConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [showInfo, setShowInfo] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/manager/employees/${id}`)
      if (!res.ok) { setLoadError('Employee not found.'); return }
      setEmp(await res.json())
    } catch {
      setLoadError('Failed to load employee.')
    }
  }

  useEffect(() => { load() }, [id])

  async function handleResetPin() {
    setPinResetError('')
    const res = await fetch(`/api/manager/employees/${id}/reset-pin`, { method: 'PATCH' })
    if (res.ok) {
      setPinResetDone(true)
    } else {
      const d = await res.json()
      setPinResetError(d.error || 'Reset failed.')
    }
  }

  async function handlePaid() {
    setPaidError('')
    const res = await fetch(`/api/manager/employees/${id}/clear-period`, { method: 'DELETE' })
    if (res.ok) {
      setPaidConfirming(false)
      await load()
    } else {
      const d = await res.json()
      setPaidError(d.error || 'Failed to clear period.')
    }
  }

  async function handleDelete() {
    setDeleteError('')
    const res = await fetch(`/api/manager/employees/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/manager/dashboard')
    } else {
      const d = await res.json()
      setDeleteError(d.error || 'Delete failed.')
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="flex items-center gap-2.5 text-sm text-red-600 bg-white rounded-2xl px-5 py-4 border border-red-100" style={{ boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {loadError}
        </div>
      </div>
    )
  }

  if (!emp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2.5 text-sm text-slate-500">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      </div>
    )
  }

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
        </div>
        <Link
          href="/manager/dashboard"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Team
        </Link>
      </header>

      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full space-y-5">

        {/* Employee identity card */}
        <div
          className="bg-white rounded-2xl p-5 flex items-center gap-4 animate-fade-up"
          style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold ${
            emp.clockedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {emp.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold text-slate-900">{emp.name}</h2>
              {emp.role === 'MANAGER' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-[10px] font-bold text-amber-700 border border-amber-100 tracking-wide uppercase">
                  Mgr
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-[family-name:var(--font-jetbrains)]">{emp.employeeId}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            emp.clockedIn
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-slate-50 text-slate-400 border border-slate-100'
          }`}>
            {emp.clockedIn && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            )}
            {emp.clockedIn ? 'On shift' : 'Off shift'}
          </span>
        </div>

        {/* Hours */}
        <div className="animate-fade-up delay-1">
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3 px-1">
            Hours
          </p>
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <span className="text-sm text-slate-600 font-medium">This week</span>
              <span className="text-sm font-bold text-slate-900 font-[family-name:var(--font-jetbrains)]">
                {formatHours(emp.weekly)}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <span className="text-sm text-slate-600 font-medium">{emp.periodLabel}</span>
              <span className="text-sm font-bold text-slate-900 font-[family-name:var(--font-jetbrains)]">
                {formatHours(emp.biweekly)}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm text-slate-600 font-medium">{emp.prevPeriodLabel}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-[family-name:var(--font-jetbrains)]">
                  {formatHours(emp.prevBiweekly)}
                </p>
              </div>
              {!paidConfirming ? (
                <Button size="sm" variant="outline" onClick={() => setPaidConfirming(true)}>
                  Mark paid
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handlePaid}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPaidConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            {paidError && (
              <p className="text-xs text-red-500 px-5 pb-3">{paidError}</p>
            )}
          </div>
        </div>

        {/* Punch history */}
        {emp.punches && emp.punches.length > 0 && (
          <div className="animate-fade-up delay-2">
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3 px-1">
              Punch history
            </p>
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
            >
              {emp.punches.map((punch, idx) => {
                const clockIn = new Date(punch.clockIn)
                const clockOut = punch.clockOut ? new Date(punch.clockOut) : null
                const duration = clockOut
                  ? clockOut.getTime() - clockIn.getTime()
                  : Date.now() - clockIn.getTime()
                const isActive = !clockOut

                return (
                  <div
                    key={punch.id}
                    className={`flex items-center gap-4 px-5 py-4 ${
                      idx < emp.punches.length - 1 ? 'border-b border-slate-50' : ''
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-500 animate-pulse-dot'
                        : 'border-slate-200 bg-white'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">
                        {clockIn.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm font-semibold font-[family-name:var(--font-jetbrains)] text-slate-700">
                        {clockIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-slate-300 mx-2">→</span>
                        {clockOut
                          ? clockOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-emerald-600 font-[family-name:var(--font-manrope)]">Now</span>
                        }
                      </p>
                    </div>
                    <span className={`text-xs font-bold font-[family-name:var(--font-jetbrains)] px-2.5 py-1 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {fmtDuration(duration)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PIN reset */}
        <div className="animate-fade-up delay-3">
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3 px-1">
            Security
          </p>
          <div
            className="bg-white rounded-2xl p-5"
            style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-0.5">Employee PIN</p>
                <p className="text-xs text-slate-400">Reset to default PIN (1234)</p>
              </div>
              {!pinResetDone ? (
                <Button size="sm" variant="outline" onClick={handleResetPin}>
                  Reset PIN
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Reset done
                </div>
              )}
            </div>
            {pinResetError && <p className="text-xs text-red-500 mt-2">{pinResetError}</p>}
          </div>
        </div>

        {/* Info */}
        <div className="animate-fade-up delay-4">
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
          >
            <button
              onClick={() => setShowInfo(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="text-sm font-semibold text-slate-700">Employee info</span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showInfo ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showInfo && (
              <div className="border-t border-slate-50">
                {[
                  { label: 'Full name', value: emp.name },
                  { label: 'Phone', value: emp.phone || '—' },
                  { label: 'Email', value: emp.email || '—' },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}
                  >
                    <span className="text-xs font-medium text-slate-400">{row.label}</span>
                    <span className="text-sm text-slate-700 font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div className="animate-fade-up delay-5">
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3 px-1">
            Danger zone
          </p>
          <div
            className="bg-white rounded-2xl p-5"
            style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
          >
            {!deleteConfirming ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-0.5">Delete employee</p>
                  <p className="text-xs text-slate-400">Permanently remove this employee</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => setDeleteConfirming(true)}>
                  Delete
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p className="text-xs text-red-600 leading-relaxed">
                    This will permanently delete <strong>{emp.name}</strong> and all their punch records. This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                    Confirm delete
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => setDeleteConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {deleteError && <p className="text-xs text-red-500 mt-2">{deleteError}</p>}
          </div>
        </div>
      </main>
    </div>
  )
}
