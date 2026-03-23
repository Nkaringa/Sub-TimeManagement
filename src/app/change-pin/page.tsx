'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface Me {
  role: string
  name: string
  phone: string | null
  email: string | null
}

export default function ChangePinPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((data: Me) => {
        setMe(data)
        setName(data.name || '')
        setPhone(data.phone || '')
        setEmail(data.email || '')
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (me?.role === 'MANAGER' && !name.trim()) {
      setError('Name is required.')
      return
    }
    if (newPin.length < 4) {
      setError('New PIN must be at least 4 digits.')
      return
    }
    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match.')
      return
    }
    if (newPin === currentPin) {
      setError('New PIN must be different from current PIN.')
      return
    }

    setLoading(true)
    try {
      const body: Record<string, string> = { currentPin, newPin }
      if (me?.role === 'MANAGER') {
        body.name = name
        body.phone = phone
        body.email = email
      }
      const res = await fetch('/api/auth/change-pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to change PIN.')
      } else {
        window.location.href = data.redirect
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!me) {
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

  const isManager = me.role === 'MANAGER'

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 7v5l3 3" />
            </svg>
          </div>
          <span className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-slate-900 italic">
            Shiftly
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-3 mb-1">
            {isManager ? 'Set up your account' : 'Change your PIN'}
          </h2>
          <p className="text-sm text-slate-500">
            {isManager
              ? 'Fill in your details and set a new PIN to continue.'
              : 'You must set a new PIN before continuing.'}
          </p>
        </div>

        {/* Form card */}
        <div
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: '0 4px 32px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {isManager && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                    Full name <span className="text-slate-300 font-normal normal-case tracking-normal">required</span>
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      Phone
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="border-t border-slate-100 my-1" />
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="currentPin" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                Current PIN
              </label>
              <Input
                id="currentPin"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value)}
                autoFocus={!isManager}
                placeholder="Current PIN"
                className="text-xl tracking-[0.5em] placeholder:tracking-normal placeholder:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="newPin" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                New PIN
              </label>
              <Input
                id="newPin"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="4–8 digits"
                className="text-xl tracking-[0.5em] placeholder:tracking-normal placeholder:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPin" className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                Confirm new PIN
              </label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                placeholder="Repeat new PIN"
                className="text-xl tracking-[0.5em] placeholder:tracking-normal placeholder:text-sm"
              />
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
                  Saving…
                </span>
              ) : (
                'Save & continue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
