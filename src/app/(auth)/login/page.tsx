"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StoreOption = { code: string; name: string };

function onlyDigits(s: string) {
    return String(s ?? "").replace(/\D/g, "");
}

export default function LoginPage() {
    const router = useRouter();

    // stores for dropdown
    const [stores, setStores] = useState<StoreOption[]>([]);
    const [storesLoading, setStoresLoading] = useState(true);
    const [storesError, setStoresError] = useState<string | null>(null);

    // employee login fields
    const [storeCode, setStoreCode] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [pin, setPin] = useState("");
    const [showPin, setShowPin] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // superadmin modal
    const [adminOpen, setAdminOpen] = useState(false);
    const [adminId, setAdminId] = useState(""); // e.g. "NK27"
    const [adminPin, setAdminPin] = useState(""); // 8 digits
    const [adminShowPin, setAdminShowPin] = useState(false);
    const [adminLoading, setAdminLoading] = useState(false);
    const [adminError, setAdminError] = useState<string | null>(null);

    // Load stores for dropdown
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

    // Build employee ID we send to /api/login
    const userIdToSend = useMemo(() => {
        const s = storeCode.trim();
        const e = employeeId.trim();

        if (e.includes("-")) return e;
        if (!s || !e) return "";
        return `${s}-${e}`;
    }, [storeCode, employeeId]);

    const selectedStoreName = useMemo(() => {
        const found = stores.find((x) => x.code === storeCode);
        return found?.name ?? "";
    }, [stores, storeCode]);

    const canSubmit = useMemo(() => {
        return userIdToSend.length > 0 && /^\d{4,6}$/.test(pin) && !loading;
    }, [userIdToSend, pin, loading]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!storeCode.trim()) return setError("Store is required.");
        if (!employeeId.trim()) return setError("Employee ID is required.");
        if (!/^\d{4,6}$/.test(pin)) return setError("PIN must be 4–6 digits.");

        setLoading(true);
        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: userIdToSend, pin }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setError(data?.message ?? "Login failed.");
                return;
            }

            router.push(data.redirectTo ?? "/");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function openAdminModal() {
        setAdminError(null);
        setAdminId("");
        setAdminPin("");
        setAdminShowPin(false);
        setAdminOpen(true);
    }

    function closeAdminModal() {
        setAdminOpen(false);
        setAdminLoading(false);
        setAdminError(null);
    }

    // Close admin modal on ESC
    useEffect(() => {
        if (!adminOpen) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") closeAdminModal();
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [adminOpen]);

    const adminCanSubmit = useMemo(() => {
        return adminId.trim().length > 0 && /^\d{8}$/.test(adminPin) && !adminLoading;
    }, [adminId, adminPin, adminLoading]);

    async function onAdminSubmit(e: React.FormEvent) {
        e.preventDefault();
        setAdminError(null);

        const id = adminId.trim();
        const p = adminPin.trim();

        if (!id) return setAdminError("Admin ID is required.");
        if (!/^\d{8}$/.test(p)) return setAdminError("PIN must be exactly 8 digits.");

        setAdminLoading(true);
        try {
            const res = await fetch("/api/superadmin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId: id, pin: p }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setAdminError(data?.message ?? "Admin login failed.");
                return;
            }

            closeAdminModal();
            router.push(data.redirectTo ?? "/superadmin/dashboard");
        } catch {
            setAdminError("Network error. Please try again.");
        } finally {
            setAdminLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-5 py-10">
            <div className="w-full max-w-sm">
                <div className="overflow-hidden rounded-3xl bg-white shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
                    {/* Header */}
                    <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 text-center overflow-hidden">
                        <div
                            className="absolute -right-8 -top-6 h-[220%] w-24 rotate-[18deg] opacity-15"
                            style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                        />
                        <div
                            className="absolute -left-10 -bottom-8 h-[220%] w-20 rotate-[18deg] opacity-10"
                            style={{ background: "linear-gradient(0deg, var(--subway-yellow), transparent)" }}
                        />

                        {/* secretive admin icon */}
                        <button
                            type="button"
                            onClick={openAdminModal}
                            className="absolute right-3 top-3 rounded-xl bg-white/10 p-2 text-white/85 hover:bg-white/15 hover:text-white transition active:scale-[0.98]"
                            aria-label="Admin"
                            title="Admin"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <circle cx="8.5" cy="8.5" r="4" stroke="currentColor" strokeWidth="1.6" />
                                <path d="M13 13l7.5 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                <path d="M17.5 17.5l-1.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                <path d="M19.5 19.5L18 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                        </button>

                        <h1 className="relative z-10 text-3xl font-black tracking-[0.14em] text-[color:var(--subway-yellow)] uppercase">
                            Subway
                        </h1>

                        <div
                            className="absolute inset-x-0 bottom-0 h-1.5"
                            style={{
                                background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                            }}
                        />
                    </div>

                    {/* Form */}
                    <div className="px-6 pt-5 pb-6">
                        <form onSubmit={onSubmit} className="space-y-3.5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Store</label>

                                    <select
                                        value={storeCode}
                                        onChange={(e) => setStoreCode(e.target.value)}
                                        disabled={storesLoading || stores.length === 0}
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
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

                                    {storesError && <div className="mt-1 text-[11px] font-semibold text-red-600">{storesError}</div>}
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Employee ID</label>
                                    <input
                                        value={employeeId}
                                        onChange={(e) => setEmployeeId(e.target.value)}
                                        placeholder='0007 or "jc01"'
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                    focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                    placeholder:text-gray-400"
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <div className="text-[11px] text-gray-400">
                                Signing in to{" "}
                                <span className="font-semibold text-gray-600">
                                    {storeCode ? `${storeCode}${selectedStoreName ? ` • ${selectedStoreName}` : ""}` : "—"}
                                </span>{" "}
                                as <span className="font-semibold text-gray-600">{userIdToSend || "—"}</span>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">PIN</label>

                                <div className="mt-1.5 relative">
                                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--subway-green)]/55">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <path
                                                d="M7 10V8.5A5 5 0 0 1 12 3.5a5 5 0 0 1 5 5V10"
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                                strokeLinecap="round"
                                            />
                                            <path
                                                d="M6.5 10h11A2.5 2.5 0 0 1 20 12.5v6A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-6A2.5 2.5 0 0 1 6.5 10Z"
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                            />
                                        </svg>
                                    </span>

                                    <input
                                        value={pin}
                                        onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 6))}
                                        placeholder="••••"
                                        type={showPin ? "text" : "password"}
                                        inputMode="numeric"
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-12 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all
                    focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                    placeholder:text-gray-400"
                                        autoComplete="current-password"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPin((s) => !s)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400
                    hover:text-[color:var(--subway-green)] hover:bg-[color:var(--subway-green)]/5
                    active:scale-95 transition-all"
                                        aria-label={showPin ? "Hide PIN" : "Show PIN"}
                                        title={showPin ? "Hide PIN" : "Show PIN"}
                                        aria-pressed={showPin}
                                    >
                                        {showPin ? (
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
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                <path
                                                    d="M3 12c1.7-2 5.3-6 9-6s7.3 4 9 6c-1.7 2-5.3 6-9 6s-7.3-4-9-6Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.6"
                                                />
                                                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" />
                                            </svg>
                                        )}
                                    </button>
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
                                className="w-full rounded-xl bg-[color:var(--subway-green)] py-3 font-extrabold tracking-widest text-white text-sm uppercase
                shadow-[0_8px_22px_rgba(0,140,21,0.30)] transition-all
                hover:shadow-[0_12px_30px_rgba(0,140,21,0.40)] hover:brightness-110
                disabled:opacity-40 disabled:shadow-none
                active:scale-[0.98]"
                            >
                                {loading ? "Signing In..." : "Sign In"}
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                onClick={() => router.push("/register")}
                                className="text-xs font-bold uppercase tracking-wider text-[color:var(--subway-green)]
                hover:text-[color:var(--subway-green-dark)] transition-colors"
                            >
                                New employee?
                            </button>
                        </div>

                        <p className="mt-3 text-center text-[11px] text-gray-400">Subway Employee Portal • v2.0</p>
                    </div>

                    <div
                        className="h-2 w-full"
                        style={{
                            background: "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 50%, var(--subway-yellow) 50%, var(--subway-yellow) 100%)",
                        }}
                    />
                </div>
            </div>

            {/* SUPERADMIN MODAL */}
            {adminOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-label="Admin login">
                    <button type="button" className="absolute inset-0 bg-black/50" onClick={closeAdminModal} aria-label="Close admin login" />

                    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-8 -top-6 h-[220%] w-24 rotate-[18deg] opacity-15"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />

                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">Admin Access</div>
                                    <div className="mt-1 text-xl font-black tracking-wide text-[color:var(--subway-yellow)] uppercase">SuperAdmin</div>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeAdminModal}
                                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold text-white hover:bg-white/15 transition active:scale-[0.99]"
                                >
                                    Close
                                </button>
                            </div>

                            <div
                                className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{
                                    background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                                }}
                            />
                        </div>

                        <div className="px-6 py-6">
                            <form onSubmit={onAdminSubmit} className="space-y-3.5">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Admin ID</label>
                                    <input
                                        value={adminId}
                                        onChange={(e) => setAdminId(e.target.value)}
                                        placeholder="Your Admin ID"
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                    focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                    placeholder:text-gray-400"
                                        autoComplete="username"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">PIN</label>
                                    <div className="mt-1.5 relative">
                                        <input
                                            value={adminPin}
                                            onChange={(e) => setAdminPin(onlyDigits(e.target.value).slice(0, 8))}
                                            placeholder="••••••••"
                                            type={adminShowPin ? "text" : "password"}
                                            inputMode="numeric"
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 pr-12 px-3 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                      placeholder:text-gray-400"
                                            autoComplete="current-password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setAdminShowPin((s) => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400
                      hover:text-[color:var(--subway-green)] hover:bg-[color:var(--subway-green)]/5
                      active:scale-95 transition-all"
                                            aria-label={adminShowPin ? "Hide PIN" : "Show PIN"}
                                            title={adminShowPin ? "Hide PIN" : "Show PIN"}
                                            aria-pressed={adminShowPin}
                                        >
                                            {adminShowPin ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                                    <path d="M10.7 10.75A2.5 2.5 0 0 0 13.25 13.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                                    <path
                                                        d="M7.4 7.5C5.2 9 3.8 11.2 3 12c1.7 1.8 5.3 6 9 6 1.2 0 2.4-.3 3.5-.8"
                                                        stroke="currentColor"
                                                        strokeWidth="1.6"
                                                        strokeLinecap="round"
                                                    />
                                                    <path d="M12 6c4 0 7.7 4.3 9 6-.5.6-1.4 1.8-2.7 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                                </svg>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                    <path
                                                        d="M3 12c1.7-2 5.3-6 9-6s7.3 4 9 6c-1.7 2-5.3 6-9 6s-7.3-4-9-6Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.6"
                                                    />
                                                    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {adminError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                                        {adminError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!adminCanSubmit}
                                    className="w-full rounded-xl bg-[color:var(--subway-green)] py-3 font-extrabold tracking-widest text-white text-sm uppercase
                  shadow-[0_8px_22px_rgba(0,140,21,0.30)] transition-all
                  hover:shadow-[0_12px_30px_rgba(0,140,21,0.40)] hover:brightness-110
                  disabled:opacity-40 disabled:shadow-none
                  active:scale-[0.98]"
                                >
                                    {adminLoading ? "Signing In..." : "Admin Sign In"}
                                </button>

                                <p className="text-center text-[11px] text-gray-400">Use your SuperAdmin credentials.</p>
                            </form>
                        </div>

                        <div
                            className="h-2 w-full"
                            style={{
                                background: "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 50%, var(--subway-yellow) 50%, var(--subway-yellow) 100%)",
                            }}
                        />
                    </div>
                </div>
            )}
        </main>
    );
}