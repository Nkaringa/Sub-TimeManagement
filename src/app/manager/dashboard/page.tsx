'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

interface Employee {
  id: string
  employeeId: string
  name: string
  role: string
  clockedIn: boolean
  lastPunchTime: string | null
  weeklyHours: number
}

interface Stats {
  clockedIn: number
  absent: number
  totalHoursToday: number
}

type FilterTab = 'all' | 'in' | 'out'

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatLastPunch(isoTime: string | null, isActive: boolean): { primary: string; secondary: string; isToday: boolean } | null {
  if (!isoTime) return null
  const punch = new Date(isoTime)
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const timeStr = punch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (punch >= todayStart) {
    return { primary: timeStr, secondary: 'TODAY', isToday: true }
  } else if (punch >= yesterdayStart) {
    return isActive
      ? { primary: timeStr, secondary: 'Yesterday', isToday: false }
      : { primary: 'Yesterday', secondary: timeStr, isToday: false }
  } else {
    const dateLabel = punch.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { primary: dateLabel, secondary: timeStr, isToday: false }
  }
}

function getRoleDisplay(role: string): { title: string; dept: string } {
  if (role === 'MANAGER') return { title: 'Store Manager', dept: 'Management' }
  return { title: 'Team Member', dept: 'Store Operations' }
}

export default function ManagerDashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState<Stats>({ clockedIn: 0, absent: 0, totalHoursToday: 0 })
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/manager/employees')
      .then(r => r.json())
      .then(data => {
        if (data.employees) {
          setEmployees(data.employees)
          setStats(data.stats)
        } else {
          setError('Failed to load employees.')
        }
      })
      .catch(() => setError('Failed to load employees.'))
  }, [])

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const filtered = useMemo(() => {
    let list = employees
    if (filter === 'in') list = list.filter(e => e.clockedIn)
    if (filter === 'out') list = list.filter(e => !e.clockedIn)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
      )
    }
    return list
  }, [employees, filter, search])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fefae0' }}>
      {/* Header */}
      <header className="px-8 h-16 flex items-center justify-between shrink-0">
        <span className="text-xl font-black tracking-widest uppercase" style={{ color: '#6B1C1C', letterSpacing: '0.15em' }}>
          SHIFTLY
        </span>

        <div className="flex items-center gap-10">
          <nav className="flex items-center gap-8">
            <span
              className="text-sm font-semibold cursor-default pb-0.5"
              style={{ color: '#6B1C1C', borderBottom: '2px solid #6B1C1C' }}
            >
              Dashboard
            </span>
            <span className="text-sm font-medium cursor-default" style={{ color: '#9CA3AF' }}>
              Timesheets
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/manager/create"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: '#374151' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Employee
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm font-semibold px-5 py-2 rounded-xl border-2 transition-colors cursor-pointer"
              style={{ borderColor: '#6B1C1C', color: '#6B1C1C' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="px-8 py-6">
        {/* Title + Stats row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black mb-1" style={{ color: '#6B1C1C' }}>
              Operations Dashboard
            </h1>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              Real-time workforce monitoring and labor distribution.
            </p>
          </div>

          <div className="flex items-stretch gap-4">
            {/* Live Workforce */}
            <div className="rounded-2xl px-8 py-5" style={{ backgroundColor: '#6B1C1C', minWidth: '180px' }}>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
                LIVE WORKFORCE
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white leading-none">{stats.clockedIn}</span>
                <span className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>In</span>
              </div>
            </div>

            {/* Availability */}
            <div className="bg-white rounded-2xl px-8 py-5" style={{ minWidth: '160px', boxShadow: '0 1px 4px rgba(107,28,28,0.07)' }}>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: '#9CA3AF' }}>
                AVAILABILITY
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black leading-none" style={{ color: '#6B1C1C' }}>{stats.absent}</span>
                <span className="text-base font-medium" style={{ color: '#9CA3AF' }}>Absent</span>
              </div>
            </div>

            {/* Total Hours Today */}
            <div className="bg-white rounded-2xl px-8 py-5" style={{ minWidth: '200px', boxShadow: '0 1px 4px rgba(107,28,28,0.07)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F3F4F6' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#6B7280' }}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                  </svg>
                </div>
                <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#9CA3AF' }}>
                  TOTAL HOURS TODAY
                </p>
              </div>
              <span className="text-3xl font-black" style={{ color: '#1F2937' }}>
                {stats.totalHoursToday.toFixed(1)} hrs
              </span>
            </div>
          </div>
        </div>

        {/* Filter tabs + Search */}
        <div className="flex items-center justify-between mb-6">
          <div
            className="flex items-center gap-1 rounded-full p-1"
            style={{ backgroundColor: 'rgba(107,28,28,0.08)' }}
          >
            {(
              [
                { key: 'all', label: 'All Staff' },
                { key: 'in', label: 'Clocked In' },
                { key: 'out', label: 'Clocked Out' },
              ] as { key: FilterTab; label: string }[]
            ).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
                style={
                  filter === tab.key
                    ? { backgroundColor: 'white', color: '#1F2937', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    : { color: '#6B7280', backgroundColor: 'transparent' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
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
              placeholder="Search by name, ID or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-80 pl-11 pr-5 py-3 rounded-full text-sm outline-none bg-white placeholder-stone-400"
              style={{ border: '1px solid rgba(107,28,28,0.08)', color: '#1F2937' }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm bg-white rounded-2xl px-5 py-3 mb-4" style={{ color: '#6B1C1C' }}>
            {error}
          </div>
        )}

        {/* Employee Status table */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(107,28,28,0.07)' }}>
          <div className="px-8 py-5" style={{ borderBottom: '1px solid #F5F0E8' }}>
            <h2 className="text-lg font-bold" style={{ color: '#6B1C1C' }}>Employee Status</h2>
          </div>

          {/* Column headers */}
          <div
            className="px-8 py-3"
            style={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 1.2fr 1.8fr 1.4fr 1.2fr 1.4fr',
              borderBottom: '1px solid #F5F0E8',
            }}
          >
            {['EMPLOYEE', 'STATUS', 'ROLE', 'LAST PUNCH', 'WEEKLY TOTAL', 'ACTIONS'].map(col => (
              <span key={col} className="text-[10px] font-bold tracking-widest" style={{ color: '#9CA3AF' }}>
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium" style={{ color: '#9CA3AF' }}>No employees found</p>
            </div>
          ) : (
            filtered.map((emp, idx) => {
              const punch = formatLastPunch(emp.lastPunchTime, emp.clockedIn)
              const roleDisplay = getRoleDisplay(emp.role)
              const initials = getInitials(emp.name)
              const isLast = idx === filtered.length - 1

              return (
                <div
                  key={emp.id}
                  className="px-8 py-5 items-center"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1.2fr 1.8fr 1.4fr 1.2fr 1.4fr',
                    borderBottom: isLast ? 'none' : '1px solid #FAF7F2',
                  }}
                >
                  {/* Employee */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-white"
                      style={{ backgroundColor: '#6B7A9F' }}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{emp.name}</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>ID: #{emp.employeeId}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide"
                      style={
                        emp.clockedIn
                          ? { backgroundColor: '#F0F7F0', color: '#374151', border: '1px solid #C6E8C6' }
                          : { backgroundColor: '#F5F5F5', color: '#6B7280', border: '1px solid #E5E7EB' }
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: emp.clockedIn ? '#22C55E' : '#9CA3AF' }}
                      />
                      {emp.clockedIn ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  {/* Role */}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{roleDisplay.title}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>{roleDisplay.dept}</p>
                  </div>

                  {/* Last Punch */}
                  <div>
                    {punch ? (
                      <>
                        <p
                          className="text-sm font-bold"
                          style={{ color: emp.clockedIn && punch.isToday ? '#6B1C1C' : '#9CA3AF' }}
                        >
                          {punch.primary}
                        </p>
                        <p
                          className="text-xs"
                          style={{
                            color: '#9CA3AF',
                            fontStyle: !punch.isToday && punch.secondary !== punch.primary ? 'italic' : 'normal',
                          }}
                        >
                          {punch.secondary}
                        </p>
                      </>
                    ) : (
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>—</span>
                    )}
                  </div>

                  {/* Weekly Total */}
                  <div>
                    <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                      {emp.weeklyHours.toFixed(1)} hrs
                    </span>
                  </div>

                  {/* Actions */}
                  <div>
                    <Link
                      href={`/manager/employees/${emp.id}`}
                      className="text-xs font-bold tracking-wider uppercase transition-opacity hover:opacity-70 cursor-pointer"
                      style={{ color: '#5B7EA6' }}
                    >
                      FULL HISTORY →
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
