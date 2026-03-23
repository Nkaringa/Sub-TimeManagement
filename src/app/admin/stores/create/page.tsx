'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

export default function CreateStorePage() {
  const [storeNumber, setStoreNumber] = useState('')
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeNumber, name, timezone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create store.')
      } else {
        window.location.href = '/admin/dashboard'
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
          href="/admin/dashboard"
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
            <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-slate-900 italic mb-1">
              Create store
            </h1>
            <p className="text-sm text-slate-500">Add a new location to the system.</p>
          </div>

          {/* Form card */}
          <div
            className="bg-white rounded-2xl p-6"
            style={{ boxShadow: '0 4px 24px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="storeNumber" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                  Store number <span className="text-slate-300 font-normal normal-case tracking-normal">required</span>
                </label>
                <Input
                  id="storeNumber"
                  value={storeNumber}
                  onChange={e => setStoreNumber(e.target.value)}
                  required
                  placeholder="e.g. 4821"
                  className="font-[family-name:var(--font-jetbrains)]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                  Store name <span className="text-slate-300 font-normal normal-case tracking-normal">required</span>
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="e.g. Subway Downtown"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="timezone" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                  Timezone <span className="text-slate-300 font-normal normal-case tracking-normal">required</span>
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 cursor-pointer"
                >
                  <option value="America/New_York">Eastern Time (America/New_York)</option>
                  <option value="America/Chicago">Central Time (America/Chicago)</option>
                  <option value="America/Denver">Mountain Time (America/Denver)</option>
                  <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
                </select>
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
                  'Create store'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
