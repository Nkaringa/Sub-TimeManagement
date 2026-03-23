'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

  if (!store) {
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

  const clockedIn = store.employees.filter(e => e.clockedIn).length

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
          href="/admin/dashboard"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Stores
        </Link>
      </header>

      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full space-y-5">

        {/* Store identity card */}
        <div
          className="bg-white rounded-2xl p-5 animate-fade-up"
          style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
        >
          {!editing ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{store.name}</h2>
                  <p className="text-xs text-slate-400 font-[family-name:var(--font-jetbrains)] mt-0.5">
                    #{store.storeNumber}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit name
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Edit store name</p>
              <div className="flex gap-2">
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveName}>Save</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setEditing(false); setEditName(store.name) }}
                >
                  Cancel
                </Button>
              </div>
              {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            </div>
          )}
        </div>

        {/* Quick stats */}
        {store.employees.length > 0 && (
          <div className="grid grid-cols-2 gap-3 animate-fade-up delay-1">
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Employees</p>
              <p className="text-3xl font-bold text-slate-900 font-[family-name:var(--font-jetbrains)]">
                {store.employees.length}
              </p>
            </div>
            <div
              className={`rounded-2xl p-4 ${clockedIn > 0 ? 'bg-emerald-600' : 'bg-white'}`}
              style={{ boxShadow: clockedIn > 0 ? '0 4px 16px rgba(5,150,105,0.2)' : '0 1px 3px rgba(15,23,42,0.06)' }}
            >
              <p className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${clockedIn > 0 ? 'text-emerald-200' : 'text-slate-400'}`}>
                On shift
              </p>
              <p className={`text-3xl font-bold font-[family-name:var(--font-jetbrains)] ${clockedIn > 0 ? 'text-white' : 'text-slate-400'}`}>
                {clockedIn}
              </p>
            </div>
          </div>
        )}

        {/* Employee list */}
        <div className="animate-fade-up delay-2">
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3 px-1">
            Employees
          </p>

          {store.employees.length === 0 ? (
            <div
              className="bg-white rounded-2xl p-8 text-center"
              style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
            >
              <p className="text-sm text-slate-400">No employees in this store yet</p>
            </div>
          ) : (
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
            >
              {store.employees.map((emp, idx) => (
                <div
                  key={emp.id}
                  className={`flex items-center gap-4 px-5 py-4 ${
                    idx < store.employees.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    emp.clockedIn
                      ? 'bg-emerald-500 animate-pulse-dot'
                      : 'bg-slate-200'
                  }`} />

                  {/* Name + ID */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{emp.name}</p>
                      {emp.role === 'MANAGER' && (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-[10px] font-bold text-amber-700 border border-amber-100 uppercase tracking-wide">
                          MGR
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-[family-name:var(--font-jetbrains)]">{emp.employeeId}</p>
                  </div>

                  {/* Status + reset PIN */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      emp.clockedIn
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}>
                      {emp.clockedIn ? 'In' : 'Out'}
                    </span>

                    {pinResetStatus[emp.id] === 'done' ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Reset
                      </span>
                    ) : (
                      <button
                        className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                        onClick={() => handleResetPin(emp.id)}
                      >
                        {pinResetStatus[emp.id] === 'error' && (
                          <span className="text-red-400">✗</span>
                        )}
                        Reset PIN
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="animate-fade-up delay-3">
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
                  <p className="text-sm font-semibold text-slate-900 mb-0.5">Delete store</p>
                  <p className="text-xs text-slate-400">Permanently remove this location</p>
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
                    This will permanently delete <strong>{store.name}</strong> and all its data. This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" className="flex-1" onClick={handleDeleteStore}>
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
