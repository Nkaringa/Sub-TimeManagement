'use client'

import { useEffect, useState } from 'react'
import { formatHours } from '@/lib/hours'

interface HoursData {
  weekly: number
  biweekly: number
  prevBiweekly: number
  periodLabel: string
  prevPeriodLabel: string
}

interface Punch {
  id: string
  clockIn: string
  clockOut: string | null
}

function fmtDuration(ms: number): string {
  const totalMins = Math.round(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function fmtElapsed(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function EmployeeDashboardPage() {
  const [clockedIn, setClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [hours, setHours] = useState<HoursData | null>(null)
  const [punches, setPunches] = useState<Punch[]>([])
  const [punchError, setPunchError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  async function loadData() {
    try {
      const [statusRes, hoursRes, punchesRes] = await Promise.all([
        fetch('/api/employee/status'),
        fetch('/api/employee/hours'),
        fetch('/api/employee/punches'),
      ])
      if (!statusRes.ok || !hoursRes.ok) {
        setLoadError('Failed to load dashboard. Please refresh.')
        return
      }
      const status = await statusRes.json()
      const h = await hoursRes.json()
      setClockedIn(status.clockedIn)
      setClockInTime(status.clockInTime)
      setHours(h)
      if (punchesRes.ok) setPunches(await punchesRes.json())
    } catch {
      setLoadError('Failed to load dashboard. Please refresh.')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!clockedIn || !clockInTime) {
      setElapsed(0)
      return
    }
    const update = () => setElapsed(Date.now() - new Date(clockInTime).getTime())
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [clockedIn, clockInTime])

  async function handlePunch() {
    setPunchError('')
    setProcessing(true)
    try {
      const res = await fetch('/api/punch', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setPunchError(data.error || 'Punch failed.')
      } else {
        await loadData()
      }
    } catch {
      setPunchError('Network error. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
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

        <div className="flex items-center gap-4">
          {clockedIn && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              <span className="text-xs font-semibold text-emerald-700">On the clock</span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full space-y-5">

        {/* Live timer card — shown when clocked in */}
        {clockedIn && clockInTime && (
          <div
            className="bg-slate-900 rounded-2xl p-6 animate-fade-up"
            style={{ boxShadow: '0 8px 40px rgba(15,23,42,0.18)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">
                  On the clock
                </span>
              </div>
              <span className="text-xs font-[family-name:var(--font-jetbrains)] text-slate-400">
                Since{' '}
                {new Date(clockInTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="font-[family-name:var(--font-playfair)] text-6xl font-bold text-white tabular-nums tracking-tight leading-none">
              {fmtElapsed(elapsed)}
            </p>
          </div>
        )}

        {/* Punch error */}
        {punchError && (
          <div className="flex items-center gap-2.5 text-sm text-red-600 bg-white rounded-xl px-4 py-3.5 border border-red-100 animate-fade-in">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {punchError}
          </div>
        )}

        {/* Clock in/out button */}
        <button
          onClick={handlePunch}
          disabled={processing}
          className={`w-full h-20 rounded-2xl text-xl font-bold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none animate-fade-up delay-1 ${
            clockedIn
              ? 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]'
          }`}
          style={!clockedIn ? { boxShadow: '0 8px 32px rgba(15,23,42,0.2)' } : { boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
        >
          {processing ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </span>
          ) : clockedIn ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
              </svg>
              Clock out
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              Clock in
            </span>
          )}
        </button>

        {/* Hours section */}
        {hours && (
          <div className="animate-fade-up delay-2">
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3 px-1">
              Hours summary
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'This week', value: formatHours(hours.weekly), highlight: false },
                { label: hours.periodLabel || 'Current period', value: formatHours(hours.biweekly), highlight: true },
                { label: hours.prevPeriodLabel || 'Prior period', value: formatHours(hours.prevBiweekly), highlight: false, muted: true },
              ].map((stat, i) => (
                <div
                  key={i}
                  className={`rounded-2xl p-4 ${stat.highlight ? 'bg-slate-900' : 'bg-white'}`}
                  style={{ boxShadow: stat.highlight ? '0 4px 20px rgba(15,23,42,0.15)' : '0 1px 3px rgba(15,23,42,0.06)' }}
                >
                  <p className={`text-[10px] font-bold tracking-wide uppercase mb-2.5 ${
                    stat.highlight ? 'text-slate-400' : 'text-slate-400'
                  }`}>
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold font-[family-name:var(--font-jetbrains)] tabular-nums ${
                    stat.highlight ? 'text-white' : stat.muted ? 'text-slate-400' : 'text-slate-900'
                  }`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Punch history */}
        {punches.length > 0 && (
          <div className="animate-fade-up delay-3">
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3 px-1">
              Punch history
            </p>
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
            >
              {punches.map((punch, idx) => {
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
                      idx < punches.length - 1 ? 'border-b border-slate-50' : ''
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-500 animate-pulse-dot'
                          : 'border-slate-300 bg-white'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 font-medium mb-0.5">
                        {clockIn.toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm font-semibold font-[family-name:var(--font-jetbrains)] text-slate-700">
                        {clockIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-slate-300 mx-2">→</span>
                        {clockOut ? (
                          clockOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-emerald-600 font-[family-name:var(--font-manrope)]">Now</span>
                        )}
                      </p>
                    </div>

                    <div className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold font-[family-name:var(--font-jetbrains)] ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {fmtDuration(duration)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
