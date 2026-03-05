"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "IN" | "OUT";

function format24hTime(d: Date) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}

function formatDisplayTime(d: Date) {
    const hours = d.getHours();
    const hh = hours % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hh}:${mm} ${ampm}`;
}

function formatDurationHMS(totalSeconds: number) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}

function getCookie(name: string) {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(new RegExp(`${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}

type StatusResponse = {
    ok: boolean;
    store?: { code: string; isOpen: boolean };
    lastPunch?: { type: string; at: string } | null;
    workedTodaySeconds?: number;
    message?: string;
};

type HoursResponse = {
    ok: boolean;
    store?: { code: string; isOpen: boolean };
    hours?: { thisWeek: number; lastWeek: number; biWeekly: number };
    daily?: Array<{ day: string; date: string; hours: number }>;
    message?: string;
};

export default function EmployeeDashboardPage() {
    const router = useRouter();

    const [employeeId, setEmployeeId] = useState<string>("—");
    const [storeCode, setStoreCode] = useState<string>("—");

    const [storeIsOpen, setStoreIsOpen] = useState<boolean>(true);

    const [status, setStatus] = useState<Status>("OUT");
    const [lastAction, setLastAction] = useState<string | null>(null);

    // hours from DB
    const [thisWeekHours, setThisWeekHours] = useState<number>(0);
    const [lastWeekHours, setLastWeekHours] = useState<number>(0);
    const [biWeeklyHours, setBiWeeklyHours] = useState<number>(0);
    const [dailyHours, setDailyHours] = useState<Array<{ day: string; date: string; hours: number }>>([]);

    // live "today worked"
    const [workedTodaySecondsBase, setWorkedTodaySecondsBase] = useState<number>(0);
    const [workedTodayAsOfMs, setWorkedTodayAsOfMs] = useState<number>(0);

    const [hoursOpen, setHoursOpen] = useState(false);

    // Payment notifications
    type PaymentEntry = {
        id: string;
        employeeName: string;
        employeeId: string;
        hoursWorked: number;
        hourlyRate: number;
        totalPaid: number;
        periodStart: string;
        periodEnd: string;
        paidAt: string;
    };
    const [newPayments, setNewPayments] = useState<PaymentEntry[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    // Load dismissed IDs from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = localStorage.getItem("dismissedPayments");
            if (raw) setDismissedIds(new Set(JSON.parse(raw)));
        } catch { /* ignore */ }
    }, []);

    function dismissPayment(id: string) {
        setDismissedIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            try { localStorage.setItem("dismissedPayments", JSON.stringify([...next])); } catch { /* ignore */ }
            return next;
        });
    }

    async function loadPayments() {
        try {
            const res = await fetch("/api/employee/payments", { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.ok && Array.isArray(data.payments)) {
                setNewPayments(data.payments);
            }
        } catch { /* silent — notifications are non-critical */ }
    }

    // Hydration-safe clock
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const [loadingPunch, setLoadingPunch] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    // Close modal on ESC
    useEffect(() => {
        if (!hoursOpen) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setHoursOpen(false);
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [hoursOpen]);

    async function loadStatus() {
        const res = await fetch("/api/employee/status", { cache: "no-store" });
        const data: StatusResponse = await res.json().catch(() => ({ ok: false }));

        if (!res.ok || !data?.ok) {
            setPageError(data?.message ?? "Failed to load status. Please login again.");
            return;
        }

        setStoreIsOpen(Boolean(data.store?.isOpen));

        // Baseline "worked today" from server
        setWorkedTodaySecondsBase(Number(data.workedTodaySeconds ?? 0));
        setWorkedTodayAsOfMs(Date.now());

        const last = data.lastPunch ?? null;
        if (!last) {
            setStatus("OUT");
            setLastAction("—");
            return;
        }

        const atDate = new Date(last.at);
        const label = last.type === "IN" ? "Clocked in" : "Clocked out";
        setStatus(last.type === "IN" ? "IN" : "OUT");
        setLastAction(`${label} at ${formatDisplayTime(atDate)}`);
    }

    async function loadHours() {
        const res = await fetch("/api/employee/hours", { cache: "no-store" });
        const data: HoursResponse = await res.json().catch(() => ({ ok: false }));

        if (!res.ok || !data?.ok) return;

        if (typeof data.store?.isOpen === "boolean") setStoreIsOpen(Boolean(data.store.isOpen));

        setThisWeekHours(data.hours?.thisWeek ?? 0);
        setLastWeekHours(data.hours?.lastWeek ?? 0);
        setBiWeeklyHours(data.hours?.biWeekly ?? 0);
        setDailyHours(Array.isArray(data.daily) ? data.daily : []);
    }

    // Initial load + polling
    useEffect(() => {
        const eid = getCookie("employeeId");
        const sc = getCookie("storeCode");
        if (eid) setEmployeeId(eid);
        if (sc) setStoreCode(sc);

        let mounted = true;

        async function loadAll() {
            if (!mounted) return;
            setPageError(null);
            try {
                await Promise.all([loadStatus(), loadHours(), loadPayments()]);
            } catch {
                setPageError("Network error loading dashboard.");
            }
        }

        loadAll();
        const t = setInterval(loadAll, 10_000);
        return () => {
            mounted = false;
            clearInterval(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function punch(type: "IN" | "OUT") {
        setPageError(null);
        setLoadingPunch(true);

        try {
            const res = await fetch("/api/punch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setPageError(data?.message ?? "Punch failed.");
                return;
            }

            // Refresh both status + hours after punch (keeps today timer & totals correct)
            await Promise.all([loadStatus(), loadHours()]);
        } catch {
            setPageError("Network error. Please try again.");
        } finally {
            setLoadingPunch(false);
        }
    }

    const statusUi = useMemo(() => {
        if (status === "IN") {
            return {
                pillBg: "bg-[color:var(--subway-yellow)]",
                pillText: "text-[color:var(--subway-green)]",
                label: "CLOCKED IN",
                title: "You are currently clocked in.",
                detail: lastAction ?? "Working now.",
            };
        }
        return {
            pillBg: "bg-gray-100",
            pillText: "text-gray-700",
            label: "CLOCKED OUT",
            title: "You are currently off shift.",
            detail: lastAction ?? "—",
        };
    }, [status, lastAction]);

    const nowLabel = now ? format24hTime(now) : "--:--:--";

    const liveWorkedTodaySeconds = useMemo(() => {
        if (!now) return workedTodaySecondsBase;
        if (status !== "IN") return workedTodaySecondsBase;

        const delta = Math.floor((now.getTime() - workedTodayAsOfMs) / 1000);
        return workedTodaySecondsBase + Math.max(0, delta);
    }, [now, status, workedTodaySecondsBase, workedTodayAsOfMs]);

    const clockInDisabled = loadingPunch || status === "IN" || !storeIsOpen;
    const clockOutDisabled = loadingPunch || status === "OUT";

    return (
        <main className="min-h-screen px-5 py-10">
            <div className="mx-auto w-full max-w-md">
                {/* Top row */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-wide">Employee Dashboard</h1>
                        <p className="mt-1 text-sm text-white/75">
                            Employee ID: <span className="text-white font-semibold">{employeeId}</span>
                        </p>
                    </div>

                    <button
                        onClick={async () => {
                            await fetch("/api/logout", { method: "POST" }).catch(() => null);
                            router.push("/login");
                        }}
                        className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 transition active:scale-[0.99]"
                    >
                        Log out
                    </button>
                </div>

                {/* Main card */}
                <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.3)]">
                    {/* Header */}
                    <div className="relative bg-[color:var(--subway-green)] px-6 pt-7 pb-6 overflow-hidden">
                        <div
                            className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                            style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                        />

                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="relative z-10 text-xl font-black tracking-widest text-[color:var(--subway-yellow)] uppercase">
                                    Subway Clock
                                </h2>
                                <p className="mt-2 text-xs font-bold tracking-widest text-white/85 uppercase">
                                    Quick actions • Store #{storeCode}
                                </p>
                            </div>

                            <div className="text-right">
                                <div className="text-[11px] font-extrabold tracking-widest text-white/70 uppercase">Local time</div>
                                <div className="mt-1 font-black tracking-[0.2em] text-white" suppressHydrationWarning>
                                    {nowLabel}
                                </div>
                            </div>
                        </div>

                        <div
                            className="absolute inset-x-0 bottom-0 h-1.5"
                            style={{
                                background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                            }}
                        />
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6 space-y-4">
                        {/* Payment notifications */}
                        {newPayments.filter((p) => !dismissedIds.has(p.id)).map((p) => (
                            <div key={p.id} className="overflow-hidden rounded-2xl border border-[color:var(--subway-green)] bg-[color:var(--subway-green)]/5 px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">✅</span>
                                        <div>
                                            <div className="text-[11px] font-extrabold tracking-widest text-[color:var(--subway-green)] uppercase">Payment Received</div>
                                            <div className="mt-0.5 text-base font-black text-gray-900">${p.totalPaid.toFixed(2)} paid</div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => dismissPayment(p.id)}
                                        className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-gray-500 hover:bg-gray-200 transition uppercase">
                                        Got it ✕
                                    </button>
                                </div>
                                <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                                    <div>{p.hoursWorked.toFixed(2)} hrs @ ${p.hourlyRate.toFixed(2)}/hr</div>
                                    <div className="text-gray-400">
                                        Period: {new Date(p.periodStart).toLocaleDateString([], { month: "short", day: "numeric" })}
                                        {" – "}
                                        {new Date(p.periodEnd).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!storeIsOpen && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                                Store is currently <span className="font-black">CLOSED</span>. Ask your manager to open the store.
                            </div>
                        )}

                        {pageError && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                {pageError}
                            </div>
                        )}

                        {/* Current Status + Controls */}
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-extrabold tracking-widest text-gray-500 uppercase">Current status</div>
                                    <div className="mt-1 text-sm font-extrabold text-gray-900">{statusUi.title}</div>
                                    <div className="mt-1 text-sm font-semibold text-gray-700">{statusUi.detail}</div>

                                    {/* ✅ Live Today Worked */}
                                    <div className="mt-2 text-[11px] font-extrabold tracking-widest text-gray-500 uppercase">
                                        Today worked
                                    </div>
                                    <div className="mt-1 text-sm font-black text-gray-900" suppressHydrationWarning>
                                        {formatDurationHMS(liveWorkedTodaySeconds)}
                                    </div>
                                </div>

                                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-widest ${statusUi.pillBg} ${statusUi.pillText}`}>
                                    {statusUi.label}
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => punch("IN")}
                                    disabled={clockInDisabled}
                                    className="rounded-2xl bg-[color:var(--subway-green)] py-3.5 font-extrabold tracking-widest text-white text-sm uppercase
                    shadow-[0_10px_26px_rgba(0,140,21,0.18)] hover:brightness-110 active:scale-[0.99] transition
                    disabled:opacity-45 disabled:shadow-none disabled:hover:brightness-100"
                                    title={!storeIsOpen ? "Store is closed" : "Clock in"}
                                >
                                    {loadingPunch ? "..." : "Clock In"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => punch("OUT")}
                                    disabled={clockOutDisabled}
                                    className="rounded-2xl bg-white py-3.5 font-extrabold tracking-widest uppercase text-sm
                    border-2 border-[color:var(--subway-green)] text-[color:var(--subway-green)]
                    hover:bg-[color:var(--subway-green)] hover:text-white active:scale-[0.99] transition
                    disabled:opacity-45 disabled:hover:bg-white disabled:hover:text-[color:var(--subway-green)]"
                                >
                                    {loadingPunch ? "..." : "Clock Out"}
                                </button>
                            </div>

                            <p className="mt-3 text-[11px] text-gray-400">Tip: clock status is saved in the database.</p>
                        </div>

                        {/* Mini info cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3">
                                <div className="text-[10px] font-extrabold tracking-widest text-gray-500 uppercase">Store</div>
                                <div className="mt-1 text-sm font-black text-gray-900">#{storeCode}</div>
                                <div className="mt-0.5 text-[10px] text-gray-400">{storeIsOpen ? "Open" : "Closed"}</div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setHoursOpen(true)}
                                className="text-left rounded-2xl border border-gray-200 bg-white px-3 py-3 hover:border-[color:var(--subway-green)] hover:shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition active:scale-[0.99]"
                                aria-haspopup="dialog"
                                aria-expanded={hoursOpen}
                            >
                                <div className="text-[10px] font-extrabold tracking-widest text-gray-500 uppercase">Total hours</div>
                                <div className="mt-1 text-sm font-black text-gray-900">{thisWeekHours.toFixed(1)} hrs</div>
                                <div className="mt-0.5 flex items-center justify-between text-[10px] text-gray-400">
                                    <span>This week</span>
                                    <span className="font-black text-gray-500">→</span>
                                </div>
                            </button>

                            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3">
                                <div className="text-[10px] font-extrabold tracking-widest text-gray-500 uppercase">Today</div>
                                <div className="mt-1 text-sm font-black text-gray-900" suppressHydrationWarning>
                                    {now ? `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}` : "--/--"}
                                </div>
                                <div className="mt-0.5 text-[10px] text-gray-400">MM/DD</div>
                            </div>
                        </div>

                        <p className="text-center text-[11px] text-gray-400">Subway Employee Portal • Dashboard v1</p>
                    </div>

                    {/* Bottom stripe */}
                    <div
                        className="h-2 w-full"
                        style={{
                            background: "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 50%, var(--subway-yellow) 50%, var(--subway-yellow) 100%)",
                        }}
                    />
                </div>
            </div>

            {/* Hours modal */}
            {hoursOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-label="Weekly hours details">
                    <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setHoursOpen(false)} aria-label="Close hours" />

                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />

                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">Hours breakdown</div>
                                    <div className="mt-1 text-xl font-black tracking-widest text-[color:var(--subway-yellow)] uppercase">This week</div>
                                    <div className="mt-2 text-sm font-semibold text-white/90">
                                        Total: <span className="text-white font-black">{thisWeekHours.toFixed(1)} hrs</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setHoursOpen(false)}
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
                            <div className="rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3">
                                    <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">Daily hours</div>
                                </div>

                                <div className="divide-y divide-gray-100">
                                    {dailyHours.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-gray-500">No hours yet.</div>
                                    ) : (
                                        dailyHours.map((row) => (
                                            <div key={`${row.day}-${row.date}`} className="flex items-center justify-between px-4 py-3">
                                                <div className="flex items-baseline gap-3">
                                                    <div className="w-10 text-sm font-extrabold text-gray-900">{row.day}</div>
                                                    <div className="text-[11px] font-bold tracking-widest text-gray-400">{row.date}</div>
                                                </div>

                                                <div className="text-sm font-black text-gray-900">{row.hours.toFixed(1)} hrs</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                                <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">Bi-Weekly Summary</div>

                                <div className="mt-2 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-gray-50 p-3">
                                        <div className="text-[10px] font-extrabold tracking-widest text-gray-500 uppercase">Last Week Hours</div>
                                        <div className="mt-1 text-sm font-black text-gray-900">{lastWeekHours.toFixed(1)} hrs</div>
                                    </div>

                                    <div className="rounded-xl bg-gray-50 p-3">
                                        <div className="text-[10px] font-extrabold tracking-widest text-gray-500 uppercase">Total Hours</div>
                                        <div className="mt-1 text-sm font-black text-gray-900">{biWeeklyHours.toFixed(1)} hrs</div>
                                        <div className="mt-0.5 text-[10px] text-gray-400">Current bi-weekly cycle</div>
                                    </div>
                                </div>
                            </div>
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