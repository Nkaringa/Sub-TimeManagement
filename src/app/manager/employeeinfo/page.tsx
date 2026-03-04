"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
    userId: string;
    employeeId: string;
    fullName: string | null;
    role: "EMPLOYEE" | "MANAGER" | "SUPERADMIN";
    phone: string | null;
    email: string | null;
    ssnLast4: string | null;
    isActive: boolean;
    createdAt: string; // ISO
    status: "IN" | "OUT";
    since: string | null;
};

type ApiResponse = {
    ok: boolean;
    message?: string;
    store?: { code: string; name: string };
    employees?: Row[];
};

function todayDate() {
    return new Date().toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
}

function formatDateShort(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function maskLast4(last4: string | null) {
    if (!last4) return "Not stored";
    return `***-**-${last4}`;
}

export default function ManagerEmployeesPage() {
    const router = useRouter();

    const [store, setStore] = useState<{ code: string; name: string } | null>(null);
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<"ALL" | "EMPLOYEE" | "MANAGER">("ALL");

    // Modals
    const [selected, setSelected] = useState<Row | null>(null);

    const [viewOpen, setViewOpen] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editFullName, setEditFullName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editActive, setEditActive] = useState(true);
    const [editSaving, setEditSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteText, setDeleteText] = useState("");
    const [deleteSaving, setDeleteSaving] = useState(false);

    const [ssnRevealOpen, setSsnRevealOpen] = useState(false);
    const [managerPin, setManagerPin] = useState("");
    const [pinVerifying, setPinVerifying] = useState(false);
    const [ssnRevealed, setSsnRevealed] = useState(false);

    async function load() {
        setErr(null);
        try {
            const res = await fetch("/api/manager/employeeinfo", { cache: "no-store" });
            const data: ApiResponse = await res.json().catch(() => ({ ok: false }));

            if (!res.ok || !data.ok) {
                setErr(data.message ?? "Failed to load EmployeeInfo.");
                return;
            }

            setStore(data.store ?? null);
            setRows(Array.isArray(data.employees) ? data.employees : []);
        } catch {
            setErr("Network error while loading EmployeeInfo.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let mounted = true;

        async function first() {
            setLoading(true);
            await load();
            if (!mounted) return;
            setLoading(false);
        }

        first();
        const t = setInterval(load, 10_000);
        return () => {
            mounted = false;
            clearInterval(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();

        return rows.filter((r) => {
            if (filter !== "ALL" && r.role !== filter) return false;
            if (!needle) return true;

            const hay = [
                r.employeeId,
                r.fullName ?? "",
                r.role,
                r.email ?? "",
                r.phone ?? "",
                r.status,
            ]
                .join(" ")
                .toLowerCase();

            return hay.includes(needle);
        });
    }, [rows, q, filter]);

    const inCount = useMemo(() => rows.filter((r) => r.status === "IN").length, [rows]);

    function openView(r: Row) {
        setSelected(r);
        setSsnRevealed(false);
        setViewOpen(true);
    }

    function openEdit(r: Row) {
        setSelected(r);
        setEditFullName(r.fullName ?? "");
        setEditEmail(r.email ?? "");
        setEditPhone(r.phone ?? "");
        setEditActive(Boolean(r.isActive));
        setEditOpen(true);
    }

    function openDelete(r: Row) {
        setSelected(r);
        setDeleteText("");
        setDeleteOpen(true);
    }

    async function saveEdit() {
        if (!selected) return;
        setEditSaving(true);
        setErr(null);

        try {
            const res = await fetch(`/api/manager/employeeinfo/${encodeURIComponent(selected.userId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: editFullName,
                    email: editEmail,
                    phone: editPhone,
                    isActive: editActive,
                }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setErr(data?.message ?? "Failed to save changes.");
                return;
            }

            setEditOpen(false);
            await load();
        } catch {
            setErr("Network error while saving.");
        } finally {
            setEditSaving(false);
        }
    }

    async function confirmDelete() {
        if (!selected) return;
        setDeleteSaving(true);
        setErr(null);

        try {
            const res = await fetch(`/api/manager/employeeinfo/${encodeURIComponent(selected.userId)}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmName: deleteText }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setErr(data?.message ?? "Delete failed.");
                return;
            }

            setDeleteOpen(false);
            await load();
        } catch {
            setErr("Network error while deleting.");
        } finally {
            setDeleteSaving(false);
        }
    }

    async function verifyManagerPin() {
        setErr(null);
        setPinVerifying(true);

        try {
            const res = await fetch("/api/manager/verify-pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin: managerPin }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
                setErr(data?.message ?? "PIN verification failed.");
                return;
            }

            setSsnRevealed(true);
            setSsnRevealOpen(false);
            setManagerPin("");
        } catch {
            setErr("Network error verifying PIN.");
        } finally {
            setPinVerifying(false);
        }
    }

    const expectedDeleteText = useMemo(() => {
        if (!selected) return "";
        const expected = (selected.fullName?.trim() || selected.employeeId).trim();
        return expected;
    }, [selected]);

    return (
        <main className="min-h-screen px-5 py-8">
            <div className="mx-auto w-full max-w-5xl">
                {/* Top bar */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-wide">Employees</h1>
                        <p className="mt-1 text-sm text-white/75">{todayDate()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push("/manager/dashboard")}
                            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 active:scale-[0.99] transition"
                        >
                            Back
                        </button>

                        <button
                            onClick={async () => {
                                await fetch("/api/logout", { method: "POST" }).catch(() => null);
                                router.push("/login");
                            }}
                            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 active:scale-[0.99] transition"
                        >
                            Log out
                        </button>
                    </div>
                </div>

                {/* Card */}
                <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                    {/* Header */}
                    <div className="relative bg-[color:var(--subway-green)] px-6 py-4 overflow-hidden">
                        <div
                            className="absolute -right-8 -top-6 h-[220%] w-24 rotate-[18deg] opacity-15"
                            style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                        />
                        <div className="relative z-10 flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[11px] font-bold tracking-widest text-white/80 uppercase">
                                    {store ? `STORE ${store.code} • ${store.name}` : "STORE —"}
                                </div>
                                <div className="mt-1 text-lg font-black tracking-wide text-white">
                                    Directory{" "}
                                    <span className="ml-2 text-[color:var(--subway-yellow)]">
                                        {loading ? "Loading…" : `${rows.length} users`}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold tracking-widest uppercase text-white">
                                Active now: {loading ? "—" : inCount}
                            </div>
                        </div>

                        <div
                            className="absolute inset-x-0 bottom-0 h-1"
                            style={{
                                background:
                                    "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                            }}
                        />
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5">
                        {err && (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
                                {err}
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search by name, ID, email, status…"
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                    focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                    placeholder:text-gray-400"
                                />

                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value as any)}
                                    className="w-full sm:w-56 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                    focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10"
                                >
                                    <option value="ALL">All roles</option>
                                    <option value="EMPLOYEE">Employees</option>
                                    <option value="MANAGER">Managers</option>
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={load}
                                className="rounded-xl bg-[color:var(--subway-green)] px-5 py-2.5 text-sm font-extrabold tracking-widest uppercase text-white
                  shadow-[0_8px_18px_rgba(0,140,21,0.18)] hover:brightness-110 active:scale-[0.99] transition"
                            >
                                Refresh
                            </button>
                        </div>

                        {/* Table */}
                        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">
                                <div className="col-span-3">Employee</div>
                                <div className="col-span-2">Role</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-3">Contact</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>

                            {loading ? (
                                <div className="px-4 py-4 text-sm text-gray-500">Loading…</div>
                            ) : filtered.length === 0 ? (
                                <div className="px-4 py-4 text-sm text-gray-500">No matching users.</div>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {filtered.map((r) => (
                                        <li key={r.userId} className="grid grid-cols-12 items-center px-4 py-3">
                                            <div className="col-span-3">
                                                <button
                                                    type="button"
                                                    onClick={() => openView(r)}
                                                    className="text-left"
                                                    title="View employee"
                                                >
                                                    <div className="text-sm font-black text-gray-900 hover:underline">
                                                        {r.fullName?.trim() ? r.fullName : r.employeeId}
                                                    </div>
                                                </button>
                                                <div className="mt-0.5 text-xs text-gray-500">#{r.employeeId}</div>
                                                {!r.isActive && (
                                                    <div className="mt-1 text-[11px] font-bold text-red-600">Inactive</div>
                                                )}
                                                <div className="mt-1 text-[11px] text-gray-400">
                                                    Created {formatDateShort(r.createdAt)}
                                                </div>
                                            </div>

                                            <div className="col-span-2 text-sm font-bold text-gray-800">{r.role}</div>

                                            <div className="col-span-2">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-extrabold tracking-widest uppercase ${r.status === "IN"
                                                        ? "bg-[color:var(--subway-yellow)] text-[color:var(--subway-green)]"
                                                        : "bg-gray-100 text-gray-700"
                                                        }`}
                                                    title={r.status === "IN" && r.since ? `Since ${r.since}` : undefined}
                                                >
                                                    {r.status === "IN" ? `IN${r.since ? ` • ${r.since}` : ""}` : "OUT"}
                                                </span>
                                            </div>

                                            <div className="col-span-3">
                                                <div className="text-sm font-semibold text-gray-900">{r.email ?? "—"}</div>
                                                <div className="mt-0.5 text-xs text-gray-500">{r.phone ?? "—"}</div>
                                            </div>

                                            <div className="col-span-2 flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openView(r)}
                                                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-extrabold tracking-widest uppercase text-gray-800 hover:border-[color:var(--subway-green)] hover:text-[color:var(--subway-green)] transition"
                                                >
                                                    View
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(r)}
                                                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-extrabold tracking-widest uppercase text-gray-800 hover:border-[color:var(--subway-green)] hover:text-[color:var(--subway-green)] transition"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openDelete(r)}
                                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold tracking-widest uppercase text-red-700 hover:bg-red-100 transition"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <p className="mt-3 text-xs text-gray-400">This page auto-refreshes every 10 seconds (live-ish view).</p>
                    </div>

                    {/* Bottom stripe */}
                    <div
                        className="h-2 w-full"
                        style={{
                            background:
                                "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 55%, var(--subway-yellow) 55%, var(--subway-yellow) 100%)",
                        }}
                    />
                </div>
            </div>

            {/* VIEW MODAL */}
            {viewOpen && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button className="absolute inset-0 bg-black/50" onClick={() => setViewOpen(false)} aria-label="Close" />
                    <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">Employee</div>
                                    <div className="mt-1 text-xl font-black tracking-wide text-white">
                                        {selected.fullName?.trim() ? selected.fullName : selected.employeeId}
                                        <span className="ml-2 text-[color:var(--subway-yellow)]">#{selected.employeeId}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewOpen(false)}
                                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold text-white hover:bg-white/15 transition"
                                >
                                    Close
                                </button>
                            </div>

                            <div
                                className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{
                                    background:
                                        "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                                }}
                            />
                        </div>

                        <div className="px-6 py-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                    <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">Role</div>
                                    <div className="mt-1 text-sm font-black text-gray-900">{selected.role}</div>
                                </div>
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                    <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">Status</div>
                                    <div className="mt-1 text-sm font-black text-gray-900">
                                        {selected.status === "IN" ? `IN${selected.since ? ` • ${selected.since}` : ""}` : "OUT"}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">Contact</div>
                                <div className="mt-2 text-sm text-gray-900">
                                    <div className="font-semibold">{selected.email ?? "—"}</div>
                                    <div className="text-gray-500">{selected.phone ?? "—"}</div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">
                                        SSN (Sensitive)
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setErr(null);
                                            setManagerPin("");
                                            setSsnRevealOpen(true);
                                        }}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-extrabold tracking-widest uppercase text-gray-800 hover:border-[color:var(--subway-green)] hover:text-[color:var(--subway-green)] transition"
                                    >
                                        View SSN
                                    </button>
                                </div>

                                <div className="mt-2 text-sm font-black text-gray-900">
                                    {ssnRevealed ? maskLast4(selected.ssnLast4) : "Hidden"}
                                </div>
                                <p className="mt-2 text-[11px] text-gray-400">
                                    We only store SSN last 4 for now. Full SSN should not be stored unless encrypted + audited.
                                </p>
                            </div>
                        </div>

                        <div
                            className="h-2 w-full"
                            style={{
                                background:
                                    "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 55%, var(--subway-yellow) 55%, var(--subway-yellow) 100%)",
                            }}
                        />
                    </div>
                </div>
            )}

            {/* PIN MODAL */}
            {ssnRevealOpen && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button className="absolute inset-0 bg-black/50" onClick={() => setSsnRevealOpen(false)} aria-label="Close" />
                    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />
                            <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">Verify Manager PIN</div>
                            <div className="mt-1 text-lg font-black tracking-wide text-white">
                                View SSN for{" "}
                                <span className="text-[color:var(--subway-yellow)]">#{selected.employeeId}</span>
                            </div>

                            <div
                                className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{
                                    background:
                                        "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                                }}
                            />
                        </div>

                        <div className="px-6 py-6 space-y-3">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Manager PIN</label>
                            <input
                                value={managerPin}
                                onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="4–6 digits"
                                inputMode="numeric"
                                type="password"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                  focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10"
                            />

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSsnRevealOpen(false)}
                                    className="w-1/2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold tracking-widest uppercase
                    border-2 border-gray-200 text-gray-800 hover:border-[color:var(--subway-green)] hover:text-[color:var(--subway-green)] transition"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={verifyManagerPin}
                                    disabled={pinVerifying || managerPin.length < 4}
                                    className="w-1/2 rounded-xl bg-[color:var(--subway-green)] px-4 py-2.5 text-sm font-extrabold tracking-widest uppercase text-white
                    hover:brightness-110 transition disabled:opacity-40"
                                >
                                    {pinVerifying ? "..." : "Verify"}
                                </button>
                            </div>

                            <p className="text-[11px] text-gray-400">
                                This is a basic protection layer. Later we can add audit logs.
                            </p>
                        </div>

                        <div
                            className="h-2 w-full"
                            style={{
                                background:
                                    "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 55%, var(--subway-yellow) 55%, var(--subway-yellow) 100%)",
                            }}
                        />
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editOpen && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button className="absolute inset-0 bg-black/50" onClick={() => setEditOpen(false)} aria-label="Close" />
                    <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">Edit</div>
                                    <div className="mt-1 text-xl font-black tracking-wide text-white">
                                        #{selected.employeeId}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditOpen(false)}
                                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold text-white hover:bg-white/15 transition"
                                >
                                    Close
                                </button>
                            </div>

                            <div
                                className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{
                                    background:
                                        "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                                }}
                            />
                        </div>

                        <div className="px-6 py-6 space-y-3">
                            <div>
                                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Full Name</label>
                                <input
                                    value={editFullName}
                                    onChange={(e) => setEditFullName(e.target.value)}
                                    placeholder="e.g., Alex Johnson"
                                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                    focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Email</label>
                                    <input
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        placeholder="name@email.com"
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Phone</label>
                                    <input
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        placeholder="digits ok"
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10"
                                    />
                                </div>
                            </div>

                            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                                <input
                                    type="checkbox"
                                    checked={editActive}
                                    onChange={(e) => setEditActive(e.target.checked)}
                                    className="h-4 w-4 accent-[color:var(--subway-green)]"
                                />
                                Active
                            </label>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditOpen(false)}
                                    className="w-1/2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold tracking-widest uppercase
                    border-2 border-gray-200 text-gray-800 hover:border-[color:var(--subway-green)] hover:text-[color:var(--subway-green)] transition"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={saveEdit}
                                    disabled={editSaving}
                                    className="w-1/2 rounded-xl bg-[color:var(--subway-green)] px-4 py-2.5 text-sm font-extrabold tracking-widest uppercase text-white
                    hover:brightness-110 transition disabled:opacity-40"
                                >
                                    {editSaving ? "SAVING..." : "SAVE"}
                                </button>
                            </div>

                            <p className="text-[11px] text-gray-400">
                                “Delete” is handled as deactivation to protect payroll/history.
                            </p>
                        </div>

                        <div
                            className="h-2 w-full"
                            style={{
                                background:
                                    "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 55%, var(--subway-yellow) 55%, var(--subway-yellow) 100%)",
                            }}
                        />
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deleteOpen && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button className="absolute inset-0 bg-black/50" onClick={() => setDeleteOpen(false)} aria-label="Close" />
                    <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />

                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">Delete Employee</div>
                                    <div className="mt-1 text-xl font-black tracking-wide text-white">
                                        #{selected.employeeId}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setDeleteOpen(false)}
                                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold text-white hover:bg-white/15 transition"
                                >
                                    Close
                                </button>
                            </div>

                            <div
                                className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{
                                    background:
                                        "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                                }}
                            />
                        </div>

                        <div className="px-6 py-6 space-y-3">
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                                This will <span className="font-black">deactivate</span> the employee (safe for payroll history). To confirm, type:
                                <div className="mt-2 font-black text-amber-900">{expectedDeleteText}</div>
                            </div>

                            <input
                                value={deleteText}
                                onChange={(e) => setDeleteText(e.target.value)}
                                placeholder="Type exactly to confirm"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                  focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10"
                            />

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteOpen(false)}
                                    className="w-1/2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold tracking-widest uppercase
                    border-2 border-gray-200 text-gray-800 hover:border-[color:var(--subway-green)] hover:text-[color:var(--subway-green)] transition"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={deleteSaving || deleteText !== expectedDeleteText}
                                    className="w-1/2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-extrabold tracking-widest uppercase text-white
                    hover:brightness-110 transition disabled:opacity-40"
                                >
                                    {deleteSaving ? "DELETING..." : "CONFIRM"}
                                </button>
                            </div>

                            <p className="text-[11px] text-gray-400">
                                Later we can add an “Undo” / re-activate flow.
                            </p>
                        </div>

                        <div
                            className="h-2 w-full"
                            style={{
                                background:
                                    "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 55%, var(--subway-yellow) 55%, var(--subway-yellow) 100%)",
                            }}
                        />
                    </div>
                </div>
            )}
        </main>
    );
}