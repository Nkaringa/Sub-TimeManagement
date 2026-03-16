"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "EMPLOYEE" | "MANAGER";
type StoreOption = { code: string; name: string };

function onlyDigits(s: string) {
    return String(s ?? "").replace(/\D/g, "");
}

function formatPhone(digits: string) {
    const d = onlyDigits(digits).slice(0, 10);
    const a = d.slice(0, 3);
    const b = d.slice(3, 6);
    const c = d.slice(6, 10);
    if (d.length <= 3) return a;
    if (d.length <= 6) return `(${a}) ${b}`;
    return `(${a}) ${b}-${c}`;
}

function formatSSN(input: string) {
    const d = onlyDigits(input).slice(0, 9);
    const a = d.slice(0, 3);
    const b = d.slice(3, 5);
    const c = d.slice(5, 9);
    if (d.length <= 3) return a;
    if (d.length <= 5) return `${a}-${b}`;
    return `${a}-${b}-${c}`;
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function EyeIcon({ open }: { open: boolean }) {
    return open ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M3 12c1.7-2 5.3-6 9-6s7.3 4 9 6c-1.7 2-5.3 6-9 6s-7.3-4-9-6Z"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                stroke="currentColor"
                strokeWidth="1.6"
            />
        </svg>
    ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path
                d="M10.7 10.75A2.5 2.5 0 0 0 13.25 13.3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
            <path
                d="M7.4 7.5C5.2 9 3.8 11.2 3 12c1.7 1.8 5.3 6 9 6 1.2 0 2.4-.3 3.5-.8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
            <path
                d="M12 6c4 0 7.7 4.3 9 6-.5.6-1.4 1.8-2.7 3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function RegisterPage() {
    const router = useRouter();

    // stores dropdown
    const [stores, setStores] = useState<StoreOption[]>([]);
    const [storesLoading, setStoresLoading] = useState(true);
    const [storesError, setStoresError] = useState<string | null>(null);

    const [storeCode, setStoreCode] = useState(""); // picked from dropdown
    const [role, setRole] = useState<Role>("EMPLOYEE");

    const [fullName, setFullName] = useState("");
    const [employeeId, setEmployeeId] = useState("");

    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [ssn, setSsn] = useState("");

    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [showSsn, setShowSsn] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // load stores (same as login)
    useEffect(() => {
        let mounted = true;

        async function loadStores() {
            setStoresLoading(true);
            setStoresError(null);

            try {
                const res = await fetch("/api/stores", { cache: "no-store" });
                const data = await res.json().catch(() => null);

                if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Failed to load stores");
                if (!mounted) return;

                const list: StoreOption[] = Array.isArray(data.stores) ? data.stores : [];
                setStores(list);

                if (!storeCode && list.length > 0) setStoreCode(list[0].code);
            } catch (e: any) {
                if (!mounted) return;
                setStoresError(e?.message ?? "Failed to load stores");
            } finally {
                if (!mounted) return;
                setStoresLoading(false);
            }
        }

        loadStores();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function buildSuggestedId(sc: string) {
        const cleanStore = String(sc ?? "").trim() || "101";
        return `${cleanStore}-0001`;
    }

    const canSubmit = useMemo(() => {
        if (!fullName.trim()) return false;
        if (!storeCode.trim()) return false;
        if (!employeeId.trim()) return false;

        const phoneDigits = onlyDigits(phone);
        if (phoneDigits.length !== 10) return false;

        const ssnDigits = onlyDigits(ssn);
        if (ssnDigits.length !== 9) return false;

        if (email.trim().length > 0 && !isValidEmail(email.trim())) return false;

        if (!/^\d{4,6}$/.test(pin)) return false;
        if (pin !== confirmPin) return false;

        return !loading;
    }, [fullName, storeCode, employeeId, phone, ssn, email, pin, confirmPin, loading]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const sc = storeCode.trim();
        const empInput = employeeId.trim();
        const name = fullName.trim();
        const phoneDigits = onlyDigits(phone);
        const ssnDigits = onlyDigits(ssn);
        const emailVal = email.trim();

        if (!name) return setError("Full name is required.");
        if (!sc) return setError("Store is required.");
        if (!empInput) return setError("Employee ID is required.");
        if (phoneDigits.length !== 10) return setError("Contact number must be 10 digits.");
        if (ssnDigits.length !== 9) return setError("SSN must be 9 digits.");
        if (emailVal.length > 0 && !isValidEmail(emailVal)) return setError("Email format looks invalid.");
        if (!/^\d{4,6}$/.test(pin)) return setError("PIN must be 4–6 digits.");
        if (pin !== confirmPin) return setError("PINs do not match.");

        setLoading(true);
        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    storeId: sc,
                    role,
                    fullName: name,
                    employeeId: empInput,
                    phone: phoneDigits,
                    email: emailVal || null,
                    ssn: ssnDigits,
                    pin,
                }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setError(data?.message ?? "Registration failed.");
                return;
            }

            router.push(data.redirectTo ?? "/login");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="relative min-h-screen flex items-center justify-center px-5 py-10 overflow-hidden">
            <div className="relative z-10 w-full max-w-md">
                <div className="overflow-hidden rounded-3xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.3)]">
                    {/* Header */}
                    <div className="relative bg-[color:var(--subway-green)] px-6 pt-7 pb-6 text-center overflow-hidden">
                        <div
                            className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                            style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                        />
                        <div
                            className="absolute -left-6 -bottom-4 h-[200%] w-16 rotate-[20deg] opacity-10"
                            style={{ background: "linear-gradient(0deg, var(--subway-yellow), transparent)" }}
                        />

                        <h1 className="relative z-10 text-3xl font-black tracking-[0.14em] text-[color:var(--subway-yellow)] uppercase">
                            S-Ops
                        </h1>
                        <p className="mt-2 text-xs font-bold tracking-widest text-white/80 uppercase">
                            New Employee Registration
                        </p>

                        <div
                            className="absolute inset-x-0 bottom-0 h-1.5"
                            style={{
                                background:
                                    "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                            }}
                        />
                    </div>

                    {/* Form */}
                    <div className="px-6 pt-6 pb-6">
                        <form onSubmit={onSubmit} className="space-y-4">
                            {/* Store + Role */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Store
                                    </label>

                                    <select
                                        value={storeCode}
                                        onChange={(e) => setStoreCode(e.target.value)}
                                        disabled={storesLoading || stores.length === 0}
                                        className="mt-1.5 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                      disabled:opacity-60"
                                    >
                                        {storesLoading ? (
                                            <option value="">Loading...</option>
                                        ) : stores.length === 0 ? (
                                            <option value="">No stores found</option>
                                        ) : (
                                            stores.map((s) => (
                                                <option key={s.code} value={s.code}>
                                                    {s.code} • {s.name}
                                                </option>
                                            ))
                                        )}
                                    </select>

                                    {storesError && (
                                        <div className="mt-1 text-[11px] font-semibold text-red-600">{storesError}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Role
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as Role)}
                                        className="mt-1.5 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10"
                                    >
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="MANAGER">Manager</option>
                                    </select>
                                </div>
                            </div>

                            {/* Full name */}
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    Full Name
                                </label>
                                <input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g., Alex Johnson"
                                    className="mt-1.5 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all
                    focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                    placeholder:text-gray-400"
                                    autoComplete="name"
                                />
                            </div>

                            {/* Contact + Email */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Contact No
                                    </label>
                                    <input
                                        value={phone}
                                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                                        placeholder="(317) 555-0123"
                                        className="mt-1.5 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                      placeholder:text-gray-400"
                                        inputMode="tel"
                                        autoComplete="tel"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Email <span className="text-gray-400">(optional)</span>
                                    </label>
                                    <input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@email.com"
                                        className="mt-1.5 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                      placeholder:text-gray-400"
                                        inputMode="email"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Employee ID */}
                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Employee ID
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setEmployeeId(buildSuggestedId(storeCode))}
                                        className="text-[11px] font-extrabold tracking-widest uppercase text-[color:var(--subway-green)]
                      hover:text-[color:var(--subway-green)]/80 transition"
                                    >
                                        Suggest
                                    </button>
                                </div>

                                <input
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    placeholder='0007 or "jc01" (store prefix auto-added by API)'
                                    className="mt-1.5 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all
                    focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                    placeholder:text-gray-400"
                                    autoComplete="username"
                                />
                            </div>

                            {/* SSN */}
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    SSN
                                </label>

                                <div className="mt-1.5 relative">
                                    <input
                                        value={ssn}
                                        onChange={(e) => setSsn(formatSSN(e.target.value))}
                                        placeholder="123-45-6789"
                                        type={showSsn ? "text" : "password"}
                                        inputMode="numeric"
                                        className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-3 pr-12 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                      placeholder:text-gray-400"
                                        autoComplete="off"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowSsn((s) => !s)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400
                      hover:text-[color:var(--subway-green)] hover:bg-[color:var(--subway-green)]/5 active:scale-95 transition"
                                        aria-label={showSsn ? "Hide SSN" : "Show SSN"}
                                        title={showSsn ? "Hide SSN" : "Show SSN"}
                                        aria-pressed={showSsn}
                                    >
                                        <EyeIcon open={showSsn} />
                                    </button>
                                </div>

                                <p className="mt-1 text-[11px] text-gray-400">
                                    For production, we should avoid storing SSN or store only last 4 + encryption.
                                </p>
                            </div>

                            {/* PIN + confirm */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        PIN
                                    </label>
                                    <div className="mt-1.5 relative">
                                        <input
                                            value={pin}
                                            onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 6))}
                                            placeholder="4–6 digits"
                                            type={showPin ? "text" : "password"}
                                            inputMode="numeric"
                                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-3 pr-12 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all
                        focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                        placeholder:text-gray-400"
                                            autoComplete="new-password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPin((s) => !s)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400
                        hover:text-[color:var(--subway-green)] hover:bg-[color:var(--subway-green)]/5 active:scale-95 transition"
                                            aria-label={showPin ? "Hide PIN" : "Show PIN"}
                                            title={showPin ? "Hide PIN" : "Show PIN"}
                                            aria-pressed={showPin}
                                        >
                                            <EyeIcon open={showPin} />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Confirm
                                    </label>
                                    <input
                                        value={confirmPin}
                                        onChange={(e) => setConfirmPin(onlyDigits(e.target.value).slice(0, 6))}
                                        placeholder="repeat PIN"
                                        type={showPin ? "text" : "password"}
                                        inputMode="numeric"
                                        className="mt-1.5 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                      placeholder:text-gray-400"
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="w-full rounded-xl bg-[color:var(--subway-green)] py-3.5 font-extrabold tracking-widest text-white text-sm uppercase
                  shadow-[0_8px_24px_rgba(0,140,21,0.35)] transition-all
                  hover:shadow-[0_12px_32px_rgba(0,140,21,0.45)] hover:brightness-110
                  disabled:opacity-40 disabled:shadow-none
                  active:scale-[0.98]"
                            >
                                {loading ? "Creating..." : "Create Account"}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => router.push("/manager/dashboard")}
                                    className="text-xs font-bold uppercase tracking-wider text-[color:var(--subway-green)]
                    hover:text-[color:var(--subway-green)]/80 transition"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </form>

                        <p className="mt-4 text-center text-[11px] text-gray-400">
                            S-Ops Employee Portal • Registration
                        </p>
                    </div>

                    <div
                        className="h-2 w-full"
                        style={{
                            background:
                                "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 50%, var(--subway-yellow) 50%, var(--subway-yellow) 100%)",
                        }}
                    />
                </div>
            </div>
        </main>
    );
}