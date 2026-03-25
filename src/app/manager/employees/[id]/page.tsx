'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fefae0' }}>
        <div className="text-sm font-medium px-5 py-4 rounded-2xl bg-white" style={{ color: '#DC2626' }}>
          {loadError}
        </div>
      </div>
    )
  }

  if (!emp) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fefae0' }}>
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: '#6B1C1C' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  const initials = getInitials(emp.name)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fefae0' }}>
      {/* Top bar */}
      <div className="px-8 pt-6 pb-4 flex items-center justify-between">
        <span className="text-sm font-black tracking-widest uppercase" style={{ color: '#6B1C1C', letterSpacing: '0.15em' }}>
          SHIFTLY
        </span>
        <Link
          href="/manager/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer"
          style={{ color: '#6B1C1C', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #6B1C1C' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </Link>
      </div>

      <main className="px-8 pb-10 space-y-4 max-w-3xl mx-auto">
        {/* Employee identity card */}
        <div className="bg-white rounded-2xl p-5 flex items-center gap-4" style={{ boxShadow: '0 1px 6px rgba(107,28,28,0.07)' }}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black text-white"
            style={{ backgroundColor: '#6B1C1C' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>{emp.name}</h2>
              {emp.clockedIn ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
                  style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  ON SHIFT
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
                  style={{ backgroundColor: '#F5F5F5', color: '#6B7280', border: '1px solid #E5E7EB' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  OFF SHIFT
                </span>
              )}
            </div>
            <p className="text-sm font-semibold" style={{ color: '#6B1C1C' }}>ID: {emp.employeeId}</p>
          </div>
          <button
            onClick={() => setShowInfo(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer shrink-0"
            style={{ backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
            Edit Profile
          </button>
        </div>

        {/* Edit profile info (expanded) */}
        {showInfo && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(107,28,28,0.07)' }}>
            {[
              { label: 'Full Name', value: emp.name },
              { label: 'Phone', value: emp.phone || '—' },
              { label: 'Email', value: emp.email || '—' },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid #F5F0E8' : 'none' }}
              >
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#9CA3AF' }}>{row.label}</span>
                <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Hours cards row */}
        <div className="grid grid-cols-3 gap-4">
          {/* This week */}
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(107,28,28,0.07)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#F3F4F6' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#6B7280' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
              </svg>
            </div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#9CA3AF' }}>THIS WEEK</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black" style={{ color: '#1F2937' }}>{emp.weekly.toFixed(1)}</span>
              <span className="text-base font-semibold" style={{ color: '#6B7280' }}>hrs</span>
            </div>
          </div>

          {/* Current period */}
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(107,28,28,0.07)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#FDF0F0' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#6B1C1C' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#9CA3AF' }}>{emp.periodLabel}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black" style={{ color: '#1F2937' }}>{emp.biweekly.toFixed(1)}</span>
              <span className="text-base font-semibold" style={{ color: '#6B7280' }}>hrs</span>
            </div>
          </div>

          {/* Previous period */}
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(107,28,28,0.07)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#16A34A' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </div>
              {!paidConfirming ? (
                <button
                  onClick={() => setPaidConfirming(true)}
                  className="text-[11px] font-bold px-3 py-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
                  style={{ border: '1px solid #D1D5DB', color: '#374151', backgroundColor: 'white' }}
                >
                  Mark paid
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={handlePaid}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                    style={{ backgroundColor: '#DC2626', color: 'white' }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setPaidConfirming(false)}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                    style={{ border: '1px solid #D1D5DB', color: '#374151' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#9CA3AF' }}>{emp.prevPeriodLabel}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black" style={{ color: '#1F2937' }}>{emp.prevBiweekly.toFixed(1)}</span>
              <span className="text-base font-semibold" style={{ color: '#6B7280' }}>hrs</span>
            </div>
            {paidError && <p className="text-xs mt-2" style={{ color: '#DC2626' }}>{paidError}</p>}
          </div>
        </div>

        {/* Punch history */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(107,28,28,0.07)' }}>
          <div className="px-6 py-5" style={{ borderBottom: '1px solid #F5F0E8' }}>
            <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>Detailed Punch History</h3>
            <p className="text-sm mt-0.5" style={{ color: '#9CA3AF' }}>View and manage daily activity logs</p>
          </div>

          {emp.punches.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No punch records found</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div
                className="px-6 py-3 grid"
                style={{
                  gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 40px',
                  borderBottom: '1px solid #F5F0E8',
                }}
              >
                {['DATE', 'CLOCK IN', 'CLOCK OUT', 'TOTAL HOURS'].map(col => (
                  <span key={col} className="text-[10px] font-bold tracking-widest" style={{ color: '#9CA3AF' }}>{col}</span>
                ))}
                <span />
              </div>

              {/* Rows */}
              {emp.punches.map((punch, idx) => {
                const clockIn = new Date(punch.clockIn)
                const clockOut = punch.clockOut ? new Date(punch.clockOut) : null
                const isActive = !clockOut
                const durationHours = ((clockOut?.getTime() ?? Date.now()) - clockIn.getTime()) / 3600000
                const isLast = idx === emp.punches.length - 1

                return (
                  <div
                    key={punch.id}
                    className="px-6 py-4 grid items-center"
                    style={{
                      gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 40px',
                      borderBottom: isLast ? 'none' : '1px solid #FAF7F2',
                    }}
                  >
                    {/* Date */}
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded text-white shrink-0"
                          style={{ backgroundColor: '#6B1C1C' }}
                        >
                          NOW
                        </span>
                      )}
                      <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                        {clockIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Clock in */}
                    <span className="text-sm" style={{ color: '#374151' }}>
                      {clockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Clock out */}
                    <span className="text-sm" style={{ color: isActive ? '#9CA3AF' : '#374151' }}>
                      {isActive ? 'Active Shift' : clockOut!.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Total hours */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold" style={{ color: isActive ? '#6B1C1C' : '#1F2937' }}>
                        {durationHours.toFixed(1)}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold" style={{ color: '#9CA3AF' }}>EST.</span>
                      )}
                    </div>

                    {/* Menu */}
                    <button className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-colors hover:bg-gray-100">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#9CA3AF' }}>
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Bottom row: Security + Danger Zone */}
        <div className="grid grid-cols-2 gap-4">
          {/* Security Settings */}
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(107,28,28,0.07)' }}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#5B8DB8' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <h3 className="text-base font-bold" style={{ color: '#1F2937' }}>Security Settings</h3>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#6B7280' }}>
              Manage employee access credentials and PIN codes. Resetting will require the employee to choose a new PIN at next clock-in.
            </p>
            {pinResetError && <p className="text-xs mb-2" style={{ color: '#DC2626' }}>{pinResetError}</p>}
            {!pinResetDone ? (
              <button
                onClick={handleResetPin}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#5B8DB8' }}
              >
                Reset PIN
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#16A34A' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                PIN reset done
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#FDF5F5', border: '1px solid #FECACA', boxShadow: '0 1px 6px rgba(107,28,28,0.07)' }}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#DC2626' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <h3 className="text-base font-bold" style={{ color: '#DC2626' }}>Danger Zone</h3>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#6B7280' }}>
              Permanently remove {emp.name} from the workforce system. This action is irreversible and all historical data will be archived.
            </p>
            {deleteError && <p className="text-xs mb-2" style={{ color: '#DC2626' }}>{deleteError}</p>}
            {!deleteConfirming ? (
              <button
                onClick={() => setDeleteConfirming(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-opacity hover:opacity-80"
                style={{ border: '2px solid #DC2626', color: '#DC2626', backgroundColor: 'transparent' }}
              >
                Delete employee
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-white cursor-pointer"
                    style={{ backgroundColor: '#DC2626' }}
                  >
                    Confirm delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirming(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold cursor-pointer"
                    style={{ border: '1px solid #D1D5DB', color: '#374151' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
