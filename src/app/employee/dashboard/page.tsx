'use client'

import { useEffect, useState, useMemo } from 'react'

interface HoursData {
  weekly: number
  biweekly: number
  prevBiweekly: number
  periodLabel: string
  prevPeriodLabel: string
  timezone?: string
}

interface Punch {
  id: string
  clockIn: string
  clockOut: string | null
}

export default function EmployeeDashboardPage() {
  const [clockedIn, setClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)
  const [hours, setHours] = useState<HoursData | null>(null)
  const [punches, setPunches] = useState<Punch[]>([])
  const [punchError, setPunchError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

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
      setStoreName(status.storeName ?? null)
      setHours(h)
      if (punchesRes.ok) setPunches(await punchesRes.json())
    } catch {
      setLoadError('Failed to load dashboard. Please refresh.')
    }
  }

  useEffect(() => { loadData() }, [])

  const monthlyHours = useMemo(() => {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return punches.reduce((sum, p) => {
      const ci = new Date(p.clockIn)
      if (ci < monthStart) return sum
      const co = p.clockOut ? new Date(p.clockOut) : now
      return sum + (co.getTime() - ci.getTime()) / 3600000
    }, 0)
  }, [punches, now])

  async function handlePunch() {
    setPunchError('')
    setProcessing(true)
    try {
      const res = await fetch('/api/punch', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) setPunchError(data.error || 'Punch failed.')
      else await loadData()
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

  const storeTimezone = hours?.timezone
  const clockParts = storeTimezone
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: storeTimezone,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).formatToParts(now)
    : null
  const h12 = clockParts
    ? parseInt(clockParts.find(p => p.type === 'hour')!.value)
    : (now.getHours() % 12 || 12)
  const mins = clockParts
    ? clockParts.find(p => p.type === 'minute')!.value
    : String(now.getMinutes()).padStart(2, '0')
  const secs = clockParts
    ? clockParts.find(p => p.type === 'second')!.value
    : String(now.getSeconds()).padStart(2, '0')
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: storeTimezone })
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: storeTimezone })
  const clockInLabel = clockInTime
    ? new Date(clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: storeTimezone })
    : null

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F2F8' }}>
        <div className="bg-white rounded-2xl px-6 py-4 text-sm font-medium" style={{ color: '#1C3060' }}>{loadError}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F2F8' }}>
      {/* Header */}
      <header className="px-8 pt-7 pb-2 flex items-start justify-between max-w-5xl mx-auto">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#1C3060' }}>SHIFTLY</p>
          <h1 className="text-3xl font-black" style={{ color: '#111827' }}>Punch Interface</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm font-semibold px-4 py-2 rounded-full border-2 mt-2 transition-opacity hover:opacity-70 cursor-pointer"
          style={{ borderColor: '#1C3060', color: '#1C3060' }}
        >
          Sign Out
        </button>
      </header>

      <main className="px-8 py-5 grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl mx-auto">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-4">

          {/* Current Time */}
          <div className="bg-white rounded-2xl p-6 text-center" style={{ boxShadow: '0 1px 4px rgba(28,48,96,0.07)' }}>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: '#9CA3AF' }}>CURRENT TIME</p>
            <div>
              <span className="text-7xl font-black tabular-nums leading-none" style={{ color: '#1C3060' }}>
                {h12}:{mins}
              </span>
              <span className="text-3xl font-bold" style={{ color: '#D1D5DB' }}>:{secs}</span>
            </div>
            <p className="text-sm font-medium mt-3" style={{ color: '#6B7280' }}>{dateLabel}</p>
            {clockedIn && clockInLabel && (
              <div className="flex justify-center mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#9CA3AF' }} />
                  Clocked In since {clockInLabel}
                </span>
              </div>
            )}
          </div>

          {/* Clock In / Clock Out */}
          {punchError && (
            <p className="text-xs text-center font-semibold" style={{ color: '#1C3060' }}>{punchError}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={!clockedIn ? handlePunch : undefined}
              disabled={clockedIn || processing}
              className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 transition-opacity cursor-pointer disabled:opacity-40"
              style={{ boxShadow: '0 1px 4px rgba(28,48,96,0.07)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#6B7280' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#1F2937' }}>Clock In</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Start your shift</p>
              </div>
            </button>

            <button
              onClick={clockedIn ? handlePunch : undefined}
              disabled={!clockedIn || processing}
              className="rounded-2xl p-6 flex flex-col items-center gap-3 transition-opacity cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: '#1C3060',
                boxShadow: clockedIn ? '0 4px 20px rgba(28,48,96,0.4)' : 'none',
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                {processing ? (
                  <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-white">Clock Out</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>End your shift</p>
              </div>
            </button>
          </div>

          {/* Current Shift */}
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(28,48,96,0.07)' }}>
            <p className="font-bold mb-4 text-sm" style={{ color: '#1F2937' }}>Current Shift</p>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#9CA3AF' }}>Work Location</span>
              <span className="text-sm font-bold" style={{ color: '#1F2937' }}>{storeName ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-4">

          {/* Biweekly + This Week */}
          {hours && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(28,48,96,0.07)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEF1F8' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#1C3060' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>Biweekly period</span>
                </div>
                <p className="text-4xl font-black tabular-nums leading-none" style={{ color: '#1F2937' }}>
                  {hours.biweekly.toFixed(1)}
                  <span className="text-sm font-bold ml-1" style={{ color: '#9CA3AF' }}>HRS</span>
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(28,48,96,0.07)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: '#9CA3AF' }}>This Week</p>
                <p className="text-4xl font-black tabular-nums leading-none" style={{ color: '#1C3060' }}>
                  {hours.weekly.toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {/* Monthly Summary */}
          <div className="rounded-2xl p-5 flex items-center justify-between" style={{ backgroundColor: '#E4E8F4', border: '1px solid rgba(28,48,96,0.1)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1C3060' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#111827' }}>Monthly Summary</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>{monthLabel}</p>
              </div>
            </div>
            <p className="text-xl font-black tabular-nums" style={{ color: '#1C3060' }}>{monthlyHours.toFixed(1)}h</p>
          </div>

          {/* Punch History */}
          <div className="bg-white rounded-2xl p-5 flex-1" style={{ boxShadow: '0 1px 4px rgba(28,48,96,0.07)' }}>
            <div className="flex items-center justify-between mb-5">
              <p className="font-black text-lg" style={{ color: '#1F2937' }}>Punch History</p>
              <button className="text-sm font-semibold" style={{ color: '#1C3060' }}>View All →</button>
            </div>

            {punches.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: '#9CA3AF' }}>No punches yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['DATE', 'CLOCK IN', 'CLOCK OUT', 'TOTAL'].map(col => (
                      <th key={col} className="text-left pb-3 text-[10px] font-bold tracking-widest" style={{ color: '#9CA3AF' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {punches.slice(0, 5).map((punch, idx) => {
                    const ci = new Date(punch.clockIn)
                    const co = punch.clockOut ? new Date(punch.clockOut) : null
                    const durationH = co ? ((co.getTime() - ci.getTime()) / 3600000).toFixed(1) : null
                    const dateStr = ci.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: storeTimezone })
                    const dayStr = ci.toLocaleDateString('en-US', { weekday: 'long', timeZone: storeTimezone }).toUpperCase()
                    const isLast = idx === Math.min(punches.length, 5) - 1

                    return (
                      <tr key={punch.id} className={!isLast ? 'border-b' : ''} style={{ borderColor: '#F3F4F6' }}>
                        <td className="py-3 pr-2">
                          <p className="font-bold text-xs" style={{ color: '#1F2937' }}>{dateStr}</p>
                          <p className="text-[10px] font-bold tracking-wider" style={{ color: '#1C3060' }}>{dayStr}</p>
                        </td>
                        <td className="py-3 pr-2 text-xs font-medium" style={{ color: '#4B5563' }}>
                          {ci.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: storeTimezone })}
                        </td>
                        <td className="py-3 pr-2 text-xs font-medium" style={{ color: '#4B5563' }}>
                          {co
                            ? co.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: storeTimezone })
                            : <span style={{ color: '#1C3060' }}>Active</span>
                          }
                        </td>
                        <td className="py-3">
                          {durationH ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                              {durationH}h
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
