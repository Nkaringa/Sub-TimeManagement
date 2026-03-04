"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Punch = { type: "IN" | "OUT"; at: string }; // ISO

type Row = {
    userId: string;
    employeeId: string;
    fullName: string | null;
    totalHours: number;
    missingOut: boolean;
    punches: Punch[];
};

type ApiResp = {
    ok: boolean;
    message?: string;
    store?: { code: string; name: string };
    range?: { days: number; start: string; end: string };
    summary?: {
        employees: number;
        totalPunches: number;
        totalHoursAll: number;
        missingOutCount: number;
    };
    rows?: Row[];
};

type Shift = {
    in: Punch;
    out: Punch | null;
    durationMinutes: number | null;
};

type DailySummary = {
    date: string;
    shifts: Shift[];
    totalDurationMinutes: number;
};

type Receipt = {
    employeeName: string;
    employeeId: string;
    hoursWorked: number;
    hourlyRate: number;
    totalPaid: number;
    periodStart: string;
    periodEnd: string;
};

type PayStep = "input" | "confirm" | "receipt";

function todayDate() {
    return new Date().toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
}

function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDay(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatDuration(minutes: number | null): string {
    if (minutes === null) return "—";
    if (minutes < 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return "0m";
}

function groupPunchesByDay(punches: Punch[]): Map<string, Punch[]> {
    const grouped = new Map<string, Punch[]>();
    for (const punch of punches) {
        const dayKey = fmtDay(punch.at);
        if (!grouped.has(dayKey)) grouped.set(dayKey, []);
        grouped.get(dayKey)!.push(punch);
    }
    return grouped;
}

function calculateShifts(dailyPunches: Punch[]): Shift[] {
    const shifts: Shift[] = [];
    let currentIn: Punch | null = null;
    const sorted = [...dailyPunches].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    for (const punch of sorted) {
        if (punch.type === "IN") {
            if (currentIn) shifts.push({ in: currentIn, out: null, durationMinutes: null });
            currentIn = punch;
        } else if (punch.type === "OUT" && currentIn) {
            const ms = new Date(punch.at).getTime() - new Date(currentIn.at).getTime();
            shifts.push({ in: currentIn, out: punch, durationMinutes: Math.round(ms / 60000) });
            currentIn = null;
        }
    }
    if (currentIn) shifts.push({ in: currentIn, out: null, durationMinutes: null });
    return shifts;
}

function buildDailySummaries(punches: Punch[]): DailySummary[] {
    const grouped = groupPunchesByDay(punches);
    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
        return new Date(grouped.get(a)![0].at).getTime() - new Date(grouped.get(b)![0].at).getTime();
    });
    return sortedKeys.map((key) => {
        const shifts = calculateShifts(grouped.get(key)!);
        const totalDurationMinutes = shifts.reduce((s, sh) => s + (sh.durationMinutes ?? 0), 0);
        return { date: key, shifts, totalDurationMinutes };
    });
}

export default function ManagerReportsPage() {
    const router = useRouter();

    const [days, setDays] = useState<7 | 14>(7);
    const [store, setStore] = useState<{ code: string; name: string } | null>(null);
    const [rows, setRows] = useState<Row[]>([]);
    const [summary, setSummary] = useState<ApiResp["summary"]>(undefined);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [openUserId, setOpenUserId] = useState<string | null>(null);

    // Pay modal state
    const [payUserId, setPayUserId] = useState<string | null>(null);
    const [payStep, setPayStep] = useState<PayStep>("input");
    const [payRate, setPayRate] = useState("");
    const [payLoading, setPayLoading] = useState(false);
    const [payErr, setPayErr] = useState<string | null>(null);
    const [payReceipt, setPayReceipt] = useState<Receipt | null>(null);

    function openPay(userId: string) {
        setPayUserId(userId);
        setPayStep("input");
        setPayRate("");
        setPayErr(null);
        setPayReceipt(null);
    }

    function closePay() {
        setPayUserId(null);
        setPayErr(null);
    }

    async function load() {
        setErr(null);
        try {
            const res = await fetch(`/api/manager/reports?days=${days}`, { cache: "no-store" });
            const data: ApiResp = await res.json().catch(() => ({ ok: false }));
            if (!res.ok || !data.ok) { setErr(data.message ?? "Failed to load reports."); return; }
            setStore(data.store ?? null);
            setSummary(data.summary);
            setRows(Array.isArray(data.rows) ? data.rows : []);
        } catch {
            setErr("Network error while loading reports.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setLoading(true);
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days]);

    const missingOut = useMemo(() => rows.filter((r) => r.missingOut), [rows]);

    async function confirmPay() {
        if (!payUserId) return;
        const rate = parseFloat(payRate);
        if (isNaN(rate) || rate <= 0) { setPayErr("Enter a valid hourly rate."); return; }
        setPayLoading(true);
        setPayErr(null);
        try {
            const res = await fetch("/api/manager/reports/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: payUserId, hourlyRate: rate, days }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) { setPayErr(data?.message ?? "Payment failed."); return; }
            setPayReceipt(data.receipt as Receipt);
            setPayStep("receipt");
            await load();
        } catch {
            setPayErr("Network error.");
        } finally {
            setPayLoading(false);
        }
    }

    const payRow = payUserId ? rows.find((r) => r.userId === payUserId) ?? null : null;
    const payCalculated: number | null = (() => {
        const rate = parseFloat(payRate);
        if (!payRow || isNaN(rate) || rate <= 0) return null;
        return Math.round(payRow.totalHours * rate * 100) / 100;
    })();

    return (
        <>
            <main className="min-h-screen px-5 py-8">
                <div className="mx-auto w-full max-w-5xl">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-extrabold text-white tracking-wide">Time Reports</h1>
                            <p className="mt-1 text-sm text-white/75">{todayDate()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => router.push("/manager/dashboard")}
                                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 active:scale-[0.99] transition">
                                Back
                            </button>
                            <button onClick={async () => { await fetch("/api/logout", { method: "POST" }).catch(() => null); router.push("/login"); }}
                                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 active:scale-[0.99] transition">
                                Log out
                            </button>
                        </div>
                    </div>

                    {/* Card */}
                    <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                        {/* Header */}
                        <div className="relative bg-[color:var(--subway-green)] px-6 py-4 overflow-hidden">
                            <div className="absolute -right-8 -top-6 h-[220%] w-24 rotate-[18deg] opacity-15"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }} />
                            <div className="relative z-10 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-bold tracking-widest text-white/80 uppercase">
                                        {store ? `STORE ${store.code} • ${store.name}` : "STORE —"}
                                    </div>
                                    <div className="mt-1 text-lg font-black tracking-wide text-white">
                                        Reports{" "}
                                        <span className="ml-2 text-[color:var(--subway-yellow)]">
                                            {days === 7 ? "LAST 7 DAYS" : "LAST 14 DAYS"}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {([7, 14] as const).map((d) => (
                                        <button key={d} type="button" onClick={() => setDays(d)}
                                            className={`rounded-full px-4 py-1.5 text-[11px] font-extrabold tracking-widest uppercase transition ${days === d ? "bg-[color:var(--subway-yellow)] text-[color:var(--subway-green)]" : "bg-white/10 text-white hover:bg-white/15"}`}>
                                            {d} days
                                        </button>
                                    ))}
                                    <button type="button" onClick={load}
                                        className="rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-extrabold tracking-widest uppercase text-white hover:bg-white/15 transition">
                                        Refresh
                                    </button>
                                </div>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-1"
                                style={{ background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))" }} />
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5">
                            {err && (
                                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">{err}</div>
                            )}

                            {/* Summary cards */}
                            <div className="grid gap-3 sm:grid-cols-4">
                                {[
                                    { label: "Employees", value: loading ? "—" : String(summary?.employees ?? 0), green: false },
                                    { label: "Total Hours", value: loading ? "—" : (summary?.totalHoursAll ?? 0).toFixed(2), green: true },
                                    { label: "Punches", value: loading ? "—" : String(summary?.totalPunches ?? 0), green: false },
                                    { label: "Missing OUT", value: loading ? "—" : String(summary?.missingOutCount ?? 0), green: false },
                                ].map(({ label, value, green }) => (
                                    <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                                        <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{label}</div>
                                        <div className={`mt-0.5 text-xl font-extrabold ${green ? "text-[color:var(--subway-green)]" : "text-gray-900"}`}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {!loading && missingOut.length > 0 && (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                                    Heads up: {missingOut.length} employee(s) have an <b>IN</b> with no matching <b>OUT</b> in this range.
                                </div>
                            )}

                            {/* Table */}
                            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                                <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">
                                    <div className="col-span-4">Employee</div>
                                    <div className="col-span-2">Total</div>
                                    <div className="col-span-3">Last Punch</div>
                                    <div className="col-span-3 text-right">Details</div>
                                </div>

                                {loading ? (
                                    <div className="px-4 py-4 text-sm text-gray-500">Loading…</div>
                                ) : rows.length === 0 ? (
                                    <div className="px-4 py-4 text-sm text-gray-500">No employees found.</div>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {rows.map((r) => {
                                            const last = r.punches.length ? r.punches[r.punches.length - 1] : null;
                                            const isOpen = openUserId === r.userId;
                                            const dayGroups = isOpen ? buildDailySummaries(r.punches) : [];

                                            return (
                                                <li key={r.userId} className="px-4 py-3">
                                                    <div className="grid grid-cols-12 items-center">
                                                        {/* Employee */}
                                                        <div className="col-span-4">
                                                            <div className="text-sm font-black text-gray-900">
                                                                {r.fullName?.trim() ? r.fullName : r.employeeId}
                                                            </div>
                                                            <div className="mt-0.5 text-xs text-gray-500">#{r.employeeId}</div>
                                                            {r.missingOut && (
                                                                <div className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-amber-900 uppercase">
                                                                    missing out
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Total */}
                                                        <div className="col-span-2 text-sm font-extrabold text-gray-900">
                                                            {r.totalHours.toFixed(2)} hrs
                                                        </div>

                                                        {/* Last punch */}
                                                        <div className="col-span-3 text-sm font-semibold text-gray-800">
                                                            {last ? (
                                                                <span className="inline-flex items-center gap-2">
                                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-widest uppercase ${last.type === "IN" ? "bg-[color:var(--subway-yellow)] text-[color:var(--subway-green)]" : "bg-gray-100 text-gray-700"}`}>
                                                                        {last.type}
                                                                    </span>
                                                                    <span className="text-gray-600">{fmtDay(last.at)} • {fmtTime(last.at)}</span>
                                                                </span>
                                                            ) : "—"}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="col-span-3 flex items-center justify-end gap-2">
                                                            <button type="button" onClick={() => openPay(r.userId)}
                                                                disabled={r.totalHours <= 0}
                                                                className="rounded-lg bg-[color:var(--subway-yellow)] px-3 py-2 text-xs font-extrabold tracking-widest uppercase text-[color:var(--subway-green)] hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed">
                                                                Pay
                                                            </button>
                                                            <button type="button" onClick={() => setOpenUserId(isOpen ? null : r.userId)}
                                                                className="rounded-lg bg-[color:var(--subway-green)]/10 px-3 py-2 text-xs font-extrabold tracking-widest uppercase text-[color:var(--subway-green)] hover:bg-[color:var(--subway-green)]/15 transition">
                                                                {isOpen ? "Hide" : "View"}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Expanded shift view */}
                                                    {isOpen && (
                                                        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                                                            <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                                                                <span className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">
                                                                    Shift Breakdown · Last {days} days
                                                                </span>
                                                                <span className="text-xs font-bold text-gray-500">
                                                                    {r.punches.length} punches · {r.totalHours.toFixed(2)} hrs total
                                                                </span>
                                                            </div>

                                                            {dayGroups.length === 0 ? (
                                                                <div className="px-4 py-3 text-sm text-gray-500">No punches in range.</div>
                                                            ) : (
                                                                <div className="divide-y divide-gray-100">
                                                                    {dayGroups.map((dg) => (
                                                                        <div key={dg.date}>
                                                                            <div className="flex items-center justify-between bg-gray-50/60 px-4 py-2">
                                                                                <span className="text-xs font-extrabold text-gray-700">{dg.date}</span>
                                                                                <span className="text-xs font-bold text-[color:var(--subway-green)]">
                                                                                    {formatDuration(dg.totalDurationMinutes)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="divide-y divide-gray-50">
                                                                                {dg.shifts.map((shift, si) => (
                                                                                    <div key={si} className="flex items-center justify-between px-5 py-2.5">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <span className="rounded-full bg-[color:var(--subway-yellow)] px-2 py-0.5 text-[10px] font-extrabold tracking-widest uppercase text-[color:var(--subway-green)]">IN</span>
                                                                                                <span className="text-sm font-semibold text-gray-800">{fmtTime(shift.in.at)}</span>
                                                                                            </div>
                                                                                            <span className="text-gray-300 font-bold">→</span>
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold tracking-widest uppercase text-gray-600">OUT</span>
                                                                                                <span className="text-sm font-semibold text-gray-800">
                                                                                                    {shift.out ? fmtTime(shift.out.at) : <span className="text-amber-500 font-bold">Missing</span>}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <span className={`text-xs font-extrabold ${shift.durationMinutes !== null && shift.durationMinutes < 1 ? "text-gray-300" : "text-gray-700"}`}>
                                                                                            {formatDuration(shift.durationMinutes)}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            <p className="mt-3 text-xs text-gray-400">
                                Tip: "Missing OUT" means the employee's last punch in this range is IN.
                            </p>
                        </div>

                        {/* Bottom stripe */}
                        <div className="h-2 w-full"
                            style={{ background: "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 55%, var(--subway-yellow) 55%, var(--subway-yellow) 100%)" }} />
                    </div>
                </div>
            </main>

            {/* PAY MODAL */}
            {payUserId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button className="absolute inset-0 bg-black/50" onClick={closePay} aria-label="Close" />

                    <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
                        {/* Modal header */}
                        <div className="bg-[color:var(--subway-green)] px-5 py-4">
                            <div className="text-[11px] font-extrabold tracking-widest text-white/70 uppercase">Simulated Payment</div>
                            <div className="mt-0.5 text-lg font-black text-white">
                                {payStep === "receipt" ? "Payment Complete" : `Pay ${payRow?.fullName?.trim() || payRow?.employeeId}`}
                            </div>
                        </div>

                        <div className="px-5 py-5">
                            {payErr && (
                                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                                    {payErr}
                                </div>
                            )}

                            {/* Step 1 — Rate input */}
                            {payStep === "input" && payRow && (
                                <>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
                                            <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Hours</div>
                                            <div className="mt-0.5 text-xl font-extrabold text-[color:var(--subway-green)]">{payRow.totalHours.toFixed(2)}</div>
                                        </div>
                                        <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
                                            <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Total</div>
                                            <div className="mt-0.5 text-xl font-extrabold text-gray-900">
                                                {payCalculated !== null ? `$${payCalculated.toFixed(2)}` : "—"}
                                            </div>
                                        </div>
                                    </div>

                                    <label className="block text-xs font-bold text-gray-600 mb-1">Hourly Rate ($)</label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        placeholder="e.g. 12.50"
                                        value={payRate}
                                        autoFocus
                                        onChange={(e) => setPayRate(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[color:var(--subway-green)] focus:ring-1 focus:ring-[color:var(--subway-green)]"
                                    />

                                    <div className="mt-4 flex gap-2">
                                        <button type="button" onClick={closePay}
                                            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                                            Cancel
                                        </button>
                                        <button type="button"
                                            onClick={() => {
                                                const r = parseFloat(payRate);
                                                if (!r || r <= 0) { setPayErr("Enter a valid hourly rate."); return; }
                                                setPayErr(null);
                                                setPayStep("confirm");
                                            }}
                                            className="flex-1 rounded-lg bg-[color:var(--subway-green)] py-2.5 text-sm font-extrabold text-white hover:opacity-90 transition">
                                            Next →
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Step 2 — Confirm */}
                            {payStep === "confirm" && payRow && (
                                <>
                                    <p className="text-sm text-gray-700 mb-4">You are about to simulate paying:</p>
                                    <div className="rounded-xl border border-[color:var(--subway-yellow)] bg-amber-50 px-4 py-3 mb-4">
                                        <div className="text-base font-extrabold text-gray-900">{payRow.fullName?.trim() || payRow.employeeId}</div>
                                        <div className="mt-1 text-sm text-gray-600">
                                            {payRow.totalHours.toFixed(2)} hrs × ${parseFloat(payRate).toFixed(2)}/hr
                                        </div>
                                        <div className="mt-1 text-xl font-black text-[color:var(--subway-green)]">
                                            = ${(payCalculated ?? 0).toFixed(2)}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">Last {days} days · Punches will be cleared after confirmation</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setPayStep("input")}
                                            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                                            ← Back
                                        </button>
                                        <button type="button" onClick={confirmPay} disabled={payLoading}
                                            className="flex-1 rounded-lg bg-[color:var(--subway-green)] py-2.5 text-sm font-extrabold text-white hover:opacity-90 transition disabled:opacity-60">
                                            {payLoading ? "Processing…" : "Confirm Pay"}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Step 3 — Receipt */}
                            {payStep === "receipt" && payReceipt && (
                                <>
                                    <div className="flex items-center justify-center mb-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--subway-green)]/10">
                                            <span className="text-3xl text-[color:var(--subway-green)] font-black">✓</span>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-4 space-y-1">
                                        <div className="font-extrabold text-gray-900 text-base">{payReceipt.employeeName}</div>
                                        <div className="text-xs text-gray-500">#{payReceipt.employeeId}</div>
                                        <div className="pt-1 text-sm text-gray-700">
                                            {payReceipt.hoursWorked.toFixed(2)} hrs @ ${payReceipt.hourlyRate.toFixed(2)}/hr
                                        </div>
                                        <div className="text-2xl font-black text-[color:var(--subway-green)]">
                                            ${payReceipt.totalPaid.toFixed(2)} <span className="text-base font-bold text-gray-500">paid</span>
                                        </div>
                                        <div className="text-xs text-gray-400 pt-1">
                                            {new Date(payReceipt.periodStart).toLocaleDateString([], { month: "short", day: "numeric" })}
                                            {" – "}
                                            {new Date(payReceipt.periodEnd).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                        </div>
                                    </div>
                                    <button type="button" onClick={closePay}
                                        className="w-full rounded-lg bg-[color:var(--subway-green)] py-2.5 text-sm font-extrabold text-white hover:opacity-90 transition">
                                        Done
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}