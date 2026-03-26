'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function CreateStorePage() {
  const [storeNumber, setStoreNumber] = useState('')
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('')
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F0F2F8' }}>
      {/* Top bar */}
      <div className="px-8 pt-6 flex items-center justify-between shrink-0">
        <span className="text-sm font-black tracking-widest uppercase" style={{ color: '#1C3060', letterSpacing: '0.15em' }}>
          SHIFTLY
        </span>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer"
          style={{ color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-8">
        {/* Title */}
        <div className="text-center mb-6 w-full max-w-md">
          <h1 className="text-4xl font-black mb-2" style={{ color: '#1C3060' }}>
            Create store
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Add a new location to the system.
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(28,48,96,0.08)' }}>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Store Number */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                STORE NUMBER <span style={{ color: '#1C3060' }}>*</span>
              </label>
              <input
                type="text"
                value={storeNumber}
                onChange={e => setStoreNumber(e.target.value)}
                required
                placeholder="e.g. 8429"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-stone-400"
                style={{ backgroundColor: '#F0F0F0', border: 'none', color: '#1F2937' }}
              />
            </div>

            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                STORE NAME <span style={{ color: '#1C3060' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Downtown Metro Hub"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-stone-400"
                style={{ backgroundColor: '#F0F0F0', border: 'none', color: '#1F2937' }}
              />
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                TIMEZONE <span style={{ color: '#1C3060' }}>*</span>
              </label>
              <div className="relative">
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  required
                  className="w-full appearance-none px-4 py-3 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ backgroundColor: '#F0F0F0', border: 'none', color: timezone ? '#1F2937' : '#A8A29E' }}
                >
                  <option value="" disabled>Select a timezone</option>
                  <option value="America/New_York">Eastern Time (America/New_York)</option>
                  <option value="America/Chicago">Central Time (America/Chicago)</option>
                  <option value="America/Denver">Mountain Time (America/Denver)</option>
                  <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
                </select>
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ color: '#6B7280' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm text-center font-medium px-4 py-3 rounded-xl"
                style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-base text-white transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1C3060', boxShadow: '0 4px 16px rgba(28,48,96,0.3)' }}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating…
                </>
              ) : (
                'Create store'
              )}
            </button>
          </form>

          {/* Card footer */}
          <div className="px-6 py-3 flex items-center justify-center gap-1.5" style={{ backgroundColor: '#F9F9F9', borderTop: '1px solid #F0F0F0' }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#9CA3AF' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#9CA3AF' }}>
              SECURE ADMIN ENVIRONMENT
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
