'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface StoreEmployee {
  id: string
  employeeId: string
  name: string
  role: string
  clockedIn: boolean
}

interface StoreDetail {
  id: string
  name: string
  storeNumber: string
  timezone: string
  employees: StoreEmployee[]
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = ['#4F6BAD', '#4A6FA5', '#6B7A9F', '#7B6B9F', '#9F6B6B']
function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function AdminStoreDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [store, setStore] = useState<StoreDetail | null>(null)
  const [loadError, setLoadError] = useState('')

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [saveError, setSaveError] = useState('')

  const [deleteConfirming, setDeleteConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [pinResetStatus, setPinResetStatus] = useState<Record<string, 'done' | 'error' | null>>({})

  useEffect(() => {
    fetch(`/api/admin/stores/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          setStore(data)
          setEditName(data.name)
        } else {
          setLoadError('Store not found.')
        }
      })
      .catch(() => setLoadError('Failed to load store.'))
  }, [id])

  async function handleSaveName() {
    setSaveError('')
    const res = await fetch(`/api/admin/stores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    if (res.ok) {
      setStore(s => s ? { ...s, name: editName } : s)
      setEditing(false)
    } else {
      const d = await res.json()
      setSaveError(d.error || 'Save failed.')
    }
  }

  async function handleResetPin(empId: string) {
    setPinResetStatus(s => ({ ...s, [empId]: null }))
    const res = await fetch(`/api/admin/employees/${empId}/reset-pin`, { method: 'PATCH' })
    setPinResetStatus(s => ({ ...s, [empId]: res.ok ? 'done' : 'error' }))
  }

  async function handleDeleteStore() {
    setDeleteError('')
    const res = await fetch(`/api/admin/stores/${id}`, { method: 'DELETE' })
    if (res.ok) {
      window.location.href = '/admin/dashboard'
    } else {
      const d = await res.json()
      setDeleteError(d.error || 'Delete failed.')
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F2F8' }}>
        <div className="text-sm font-medium px-5 py-4 rounded-2xl bg-white" style={{ color: '#DC2626' }}>
          {loadError}
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F2F8' }}>
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: '#1C3060' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  const clockedInCount = store.employees.filter(e => e.clockedIn).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F2F8' }}>
      {/* Top bar */}
      <div className="px-8 pt-6 pb-6 flex items-center justify-between">
        <span className="text-sm font-black tracking-widest uppercase" style={{ color: '#1C3060', letterSpacing: '0.15em' }}>
          SHIFTLY
        </span>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#1C3060' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to stores
        </Link>
      </div>

      <main className="px-8 pb-10 space-y-4 max-w-3xl mx-auto">

        {/* Top row: store info + stat cards */}
        <div className="flex gap-4">
          {/* Store identity */}
          <div className="flex-1 bg-white rounded-2xl p-5 flex items-center justify-between" style={{ boxShadow: '0 1px 6px rgba(28,48,96,0.07)' }}>
            {!editing ? (
              <>
                <div>
                  <h2 className="text-2xl font-black mb-1" style={{ color: '#1F2937' }}>{store.name}</h2>
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#9CA3AF' }}>
                    STORE ID: #{store.storeNumber}
                  </p>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70 cursor-pointer shrink-0"
                  style={{ color: '#4A6FA5' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                  </svg>
                  Edit name
                </button>
              </>
            ) : (
              <div className="w-full space-y-3">
                <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#9CA3AF' }}>Edit store name</p>
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    autoFocus
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: '#F0F0F0', border: 'none', color: '#1F2937' }}
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer"
                    style={{ backgroundColor: '#1C3060' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditName(store.name) }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                    style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}
                  >
                    Cancel
                  </button>
                </div>
                {saveError && <p className="text-xs" style={{ color: '#DC2626' }}>{saveError}</p>}
              </div>
            )}
          </div>

          {/* Employees count */}
          <div className="bg-white rounded-2xl px-8 py-5 flex flex-col justify-between" style={{ minWidth: '140px', boxShadow: '0 1px 6px rgba(28,48,96,0.07)' }}>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: '#9CA3AF' }}>EMPLOYEES</p>
            <span className="text-5xl font-black" style={{ color: '#1F2937' }}>{store.employees.length}</span>
          </div>

          {/* On shift */}
          <div
            className="rounded-2xl px-8 py-5 flex flex-col justify-between"
            style={{
              minWidth: '140px',
              backgroundColor: clockedInCount > 0 ? '#4CAF80' : '#F3F4F6',
              boxShadow: '0 1px 6px rgba(28,48,96,0.07)',
            }}
          >
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: clockedInCount > 0 ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}>
              ON SHIFT
            </p>
            <span className="text-5xl font-black" style={{ color: clockedInCount > 0 ? 'white' : '#9CA3AF' }}>
              {clockedInCount}
            </span>
          </div>
        </div>

        {/* Employees list */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(28,48,96,0.07)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #E4E8F4' }}>
            <h3 className="text-sm font-black tracking-widest uppercase" style={{ color: '#1F2937' }}>EMPLOYEES</h3>
          </div>

          {store.employees.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No employees in this store yet</p>
            </div>
          ) : (
            store.employees.map((emp, idx) => (
              <div
                key={emp.id}
                className="flex items-center gap-4 px-6 py-4"
                style={{ borderBottom: idx < store.employees.length - 1 ? '1px solid #E4E8F4' : 'none' }}
              >
                {/* Status dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: emp.clockedIn ? '#22C55E' : '#D1D5DB' }}
                />

                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                  style={{ backgroundColor: avatarColor(emp.name) }}
                >
                  {getInitials(emp.name)}
                </div>

                {/* Name + ID */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{emp.name}</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>{emp.employeeId}</p>
                </div>

                {/* Status pill */}
                <span
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: emp.clockedIn ? '#4CAF80' : '#1C3060' }}
                >
                  {emp.clockedIn ? 'IN' : 'OUT'}
                </span>

                {/* Reset PIN */}
                <div className="shrink-0 w-24 text-right">
                  {pinResetStatus[emp.id] === 'done' ? (
                    <span className="text-xs font-semibold" style={{ color: '#16A34A' }}>✓ Reset</span>
                  ) : (
                    <button
                      onClick={() => handleResetPin(emp.id)}
                      className="text-sm font-semibold cursor-pointer transition-opacity hover:opacity-70"
                      style={{ color: pinResetStatus[emp.id] === 'error' ? '#DC2626' : '#6B7280' }}
                    >
                      Reset PIN
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Danger zone */}
        <div>
          <p className="text-center text-sm font-black tracking-widest uppercase py-3" style={{ color: '#1C3060' }}>
            DANGER ZONE
          </p>
          <div className="bg-white rounded-2xl p-6 flex items-center justify-between gap-6" style={{ boxShadow: '0 1px 6px rgba(28,48,96,0.07)' }}>
            <div>
              <p className="text-base font-bold mb-1" style={{ color: '#1C3060' }}>Delete this store</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                Once you delete a store, there is no going back. All employee data and history for {store.name} will be permanently removed.
              </p>
              {deleteError && <p className="text-xs mt-2" style={{ color: '#DC2626' }}>{deleteError}</p>}
            </div>
            {!deleteConfirming ? (
              <button
                onClick={() => setDeleteConfirming(true)}
                className="shrink-0 px-6 py-3 rounded-2xl text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1C3060' }}
              >
                Delete
              </button>
            ) : (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleDeleteStore}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setDeleteConfirming(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                  style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
