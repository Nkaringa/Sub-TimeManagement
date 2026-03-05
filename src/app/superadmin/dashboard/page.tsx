"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Overview = {
    totalStores: number;
    openStores: number;
    closedStores: number;
};

type StoreOption = { code: string; name: string; isOpen: boolean };

function todayDate() {
    return new Date().toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
}

export default function SuperAdminDashboardPage() {
    const router = useRouter();

    const [overview, setOverview] = useState<Overview>({
        totalStores: 0,
        openStores: 0,
        closedStores: 0,
    });

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // Stores for dropdown
    const [stores, setStores] = useState<StoreOption[]>([]);
    const [storesLoading, setStoresLoading] = useState(true);
    const [storesError, setStoresError] = useState<string | null>(null);
    const [selectedStore, setSelectedStore] = useState<string>("");

    // --- Add Store form state ---
    const [addCode, setAddCode] = useState("");
    const [addName, setAddName] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const [addMsg, setAddMsg] = useState<string | null>(null);

    async function loadOverview() {
        setErr(null);
        try {
            const res = await fetch("/api/superadmin/overview", { cache: "no-store" });
            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                throw new Error(data?.message ?? "Failed to load overview");
            }

            setOverview({
                totalStores: Number(data.totalStores ?? 0),
                openStores: Number(data.openStores ?? 0),
                closedStores: Number(data.closedStores ?? 0),
            });
        } catch (e: any) {
            setErr(e?.message ?? "Failed to load overview");
        } finally {
            setLoading(false);
        }
    }

    async function loadStores() {
        setStoresLoading(true);
        setStoresError(null);

        try {
            const res = await fetch("/api/stores", { cache: "no-store" });
            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                throw new Error(data?.message ?? "Failed to load stores");
            }

            const list: StoreOption[] = Array.isArray(data.stores) ? data.stores : [];
            setStores(list);

            // auto-select first store (if none selected)
            if (!selectedStore && list.length > 0) {
                setSelectedStore(list[0].code);
            }
        } catch (e: any) {
            setStoresError(e?.message ?? "Failed to load stores");
        } finally {
            setStoresLoading(false);
        }
    }

    useEffect(() => {
        setLoading(true);
        loadOverview();
        loadStores();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [openLoading, setOpenLoading] = useState(false);
    const [openErr, setOpenErr] = useState<string | null>(null);

    async function openStoreDashboard() {
        const code = selectedStore.trim();
        if (!code) return;
        setOpenLoading(true);
        setOpenErr(null);
        try {
            const res = await fetch("/api/superadmin/impersonate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ storeCode: code }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
                setOpenErr(data?.message ?? "Failed to open store.");
                return;
            }
            router.push("/manager/dashboard");
        } catch {
            setOpenErr("Network error.");
        } finally {
            setOpenLoading(false);
        }
    }

    async function onAddStore(e: React.FormEvent) {
        e.preventDefault();
        setAddMsg(null);

        const code = addCode.trim();
        const name = addName.trim();

        if (!code) return setAddMsg("Store code is required.");
        if (!name) return setAddMsg("Store name is required.");

        setAddLoading(true);
        try {
            const res = await fetch("/api/stores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Always create stores as OPEN (manager controls open/close later)
                body: JSON.stringify({ code, name, isOpen: true }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setAddMsg(data?.message ?? "Failed to add store.");
                return;
            }

            setAddMsg(`✅ Store ${data.store.code} • ${data.store.name} added (OPEN).`);
            setAddCode("");
            setAddName("");

            // refresh both KPIs + dropdown list
            await Promise.all([loadOverview(), loadStores()]);
        } catch {
            setAddMsg("Network error. Please try again.");
        } finally {
            setAddLoading(false);
        }
    }

    // --- Edit Store ---
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editCode, setEditCode] = useState("");
    const [editName, setEditName] = useState("");
    const [editLoading, setEditLoading] = useState(false);
    const [editMsg, setEditMsg] = useState<string | null>(null);

    function openEditModal(store: StoreOption) {
        setEditCode(store.code);
        setEditName(store.name);
        setEditMsg(null);
        setEditModalOpen(true);
    }

    async function onEditStore() {
        const name = editName.trim();
        if (!name) { setEditMsg("Store name is required."); return; }

        setEditLoading(true);
        setEditMsg(null);
        try {
            const res = await fetch("/api/stores", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: editCode, name }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
                setEditMsg(data?.message ?? "Failed to update store.");
                return;
            }
            setEditModalOpen(false);
            await Promise.all([loadOverview(), loadStores()]);
        } catch {
            setEditMsg("Network error.");
        } finally {
            setEditLoading(false);
        }
    }

    // --- Remove Store ---
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const [removeCode, setRemoveCode] = useState("");
    const [removeName, setRemoveName] = useState("");
    const [removeLoading, setRemoveLoading] = useState(false);

    function openRemoveConfirm(store: StoreOption) {
        setRemoveCode(store.code);
        setRemoveName(store.name);
        setRemoveConfirmOpen(true);
    }

    async function onRemoveStore() {
        setRemoveLoading(true);
        setErr(null);
        try {
            const res = await fetch("/api/stores", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: removeCode }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
                setErr(data?.message ?? "Failed to remove store.");
                return;
            }
            setRemoveConfirmOpen(false);
            setSelectedStore("");
            await Promise.all([loadOverview(), loadStores()]);
        } catch {
            setErr("Network error.");
        } finally {
            setRemoveLoading(false);
        }
    }

    return (
        <main className="min-h-screen px-5 py-10">
            <div className="mx-auto w-full max-w-5xl">
                {/* Top bar */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-wide">
                            SuperAdmin Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-white/75">{todayDate()}</p>
                    </div>

                    <button
                        onClick={async () => {
                            await fetch("/api/logout", { method: "POST" }).catch(() => null);
                            router.push("/login");
                        }}
                        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white
              hover:bg-white/15 active:scale-[0.99] transition"
                    >
                        Log out
                    </button>
                </div>

                {/* Card */}
                <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
                    {/* Header */}
                    <div className="relative bg-[color:var(--subway-green)] px-6 py-5 overflow-hidden">
                        <div
                            className="absolute -right-8 -top-6 h-[220%] w-24 rotate-[18deg] opacity-15"
                            style={{
                                background: "linear-gradient(180deg, var(--subway-yellow), transparent)",
                            }}
                        />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <div className="text-[11px] font-bold tracking-widest text-white/80 uppercase">
                                    SYSTEM OVERVIEW
                                </div>
                                <div className="mt-1 text-xl font-black tracking-wide text-white">
                                    Subway Clock Admin
                                </div>
                            </div>

                            <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-extrabold tracking-widest uppercase text-white">
                                SUPERADMIN
                            </div>
                        </div>

                        <div
                            className="absolute inset-x-0 bottom-0 h-1.5"
                            style={{
                                background:
                                    "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                            }}
                        />
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6">
                        {err && (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
                                {err}
                            </div>
                        )}

                        {/* KPIs (real data from /api/superadmin/overview) */}
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                <div className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">
                                    Total Stores
                                </div>
                                <div className="mt-1 text-2xl font-extrabold text-gray-900">
                                    {loading ? "—" : overview.totalStores}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                <div className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">
                                    Stores Open
                                </div>
                                <div className="mt-1 text-2xl font-extrabold text-[color:var(--subway-green)]">
                                    {loading ? "—" : overview.openStores}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                <div className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">
                                    Stores Closed
                                </div>
                                <div className="mt-1 text-2xl font-extrabold text-gray-900">
                                    {loading ? "—" : overview.closedStores}
                                </div>
                            </div>
                        </div>

                        {/* Add Store */}
                        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">
                                Add Store
                            </div>

                            <form onSubmit={onAddStore} className="mt-3 grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                        Store Code
                                    </label>
                                    <input
                                        value={addCode}
                                        onChange={(e) => setAddCode(e.target.value.trimStart())}
                                        placeholder="1001"
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                      placeholder:text-gray-400"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                        Store Name
                                    </label>
                                    <input
                                        value={addName}
                                        onChange={(e) => setAddName(e.target.value)}
                                        placeholder="Michigan"
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10
                      placeholder:text-gray-400"
                                    />
                                </div>

                                <div className="flex flex-col justify-end">
                                    <button
                                        type="submit"
                                        disabled={addLoading}
                                        className="rounded-xl bg-[color:var(--subway-green)] px-5 py-2.5 text-sm font-extrabold tracking-widest uppercase text-white
                      shadow-[0_8px_18px_rgba(0,140,21,0.18)] hover:brightness-110 active:scale-[0.99] transition
                      disabled:opacity-40 disabled:shadow-none"
                                    >
                                        {addLoading ? "ADDING..." : "ADD"}
                                    </button>
                                </div>
                            </form>

                            {addMsg && <div className="mt-3 text-sm font-semibold text-gray-700">{addMsg}</div>}

                            <p className="mt-2 text-[11px] text-gray-400">
                                This creates a Store record in the database (defaults to OPEN). Login/Register dropdowns will pick it up automatically.
                            </p>
                        </div>

                        {/* Store selector (replaces Quick Jump input) */}
                        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">
                                Open store dashboard
                            </div>

                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <select
                                    value={selectedStore}
                                    onChange={(e) => setSelectedStore(e.target.value)}
                                    disabled={storesLoading || stores.length === 0}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
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
                                                {s.code} • {s.name} {s.isOpen ? "(Open)" : "(Closed)"}
                                            </option>
                                        ))
                                    )}
                                </select>

                                <button
                                    type="button"
                                    onClick={openStoreDashboard}
                                    disabled={!selectedStore.trim() || openLoading}
                                    className="rounded-xl bg-[color:var(--subway-green)] px-5 py-2.5 text-sm font-extrabold tracking-widest uppercase text-white
                    shadow-[0_8px_18px_rgba(0,140,21,0.18)] hover:brightness-110 active:scale-[0.99] transition
                    disabled:opacity-40 disabled:shadow-none"
                                >
                                    {openLoading ? "Opening…" : "Open"}
                                </button>
                            </div>

                            {openErr && (
                                <div className="mt-2 text-[11px] font-semibold text-red-600">{openErr}</div>
                            )}
                            {storesError && (
                                <div className="mt-2 text-[11px] font-semibold text-red-600">{storesError}</div>
                            )}

                            <p className="mt-2 text-[11px] text-gray-400">
                                This will open the store's manager dashboard for that location.
                            </p>
                        </div>

                        {/* Manage Stores */}
                        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">
                                    Manage Stores
                                </div>
                                <span className="text-xs font-bold text-gray-400">
                                    {stores.length} store{stores.length !== 1 ? "s" : ""}
                                </span>
                            </div>

                            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                                {storesLoading ? (
                                    <div className="p-3 text-sm text-gray-500">Loading stores...</div>
                                ) : stores.length === 0 ? (
                                    <div className="p-3 text-sm text-gray-500">No stores found.</div>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {stores.map((s) => (
                                            <li key={s.code} className="flex items-center justify-between px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">
                                                            #{s.code} &middot; {s.name}
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-gray-500">
                                                            {s.isOpen ? "Open" : "Closed"}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(s)}
                                                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-extrabold tracking-widest uppercase text-gray-700
                                                            hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99] transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openRemoveConfirm(s)}
                                                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[10px] font-extrabold tracking-widest uppercase text-red-600
                                                            hover:bg-red-50 active:scale-[0.99] transition"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
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

            {/* Edit Store Modal */}
            {editModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setEditModalOpen(false)}
                        aria-label="Close edit store"
                    />

                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />
                            <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">
                                Edit store
                            </div>
                            <div className="mt-1 text-xl font-black tracking-widest text-[color:var(--subway-yellow)] uppercase">
                                Store #{editCode}
                            </div>
                            <div
                                className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{
                                    background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                                }}
                            />
                        </div>

                        <div className="px-6 py-6">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                Store Name
                            </label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400
                                    focus:border-[color:var(--subway-green)] focus:ring-1 focus:ring-[color:var(--subway-green)] outline-none transition"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") onEditStore(); }}
                            />

                            {editMsg && <div className="mt-2 text-sm font-semibold text-red-600">{editMsg}</div>}

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    className="rounded-xl border border-gray-200 bg-white py-3 text-sm font-extrabold tracking-widest uppercase text-gray-700 hover:border-gray-300 active:scale-[0.99] transition"
                                    disabled={editLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={onEditStore}
                                    disabled={editLoading || !editName.trim()}
                                    className="rounded-xl bg-[color:var(--subway-yellow)] py-3 text-sm font-extrabold tracking-widest uppercase text-[color:var(--subway-green)]
                                        hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60"
                                >
                                    {editLoading ? "..." : "Save"}
                                </button>
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

            {/* Remove Store Confirmation Modal */}
            {removeConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setRemoveConfirmOpen(false)}
                        aria-label="Close remove confirmation"
                    />

                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />
                            <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">
                                Confirm removal
                            </div>
                            <div className="mt-1 text-xl font-black tracking-widest text-[color:var(--subway-yellow)] uppercase">
                                Remove Store
                            </div>
                            <div
                                className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{
                                    background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                                }}
                            />
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm text-gray-800 font-semibold">
                                Are you sure you want to remove Store{" "}
                                <span className="font-black">#{removeCode}</span> ({removeName})?
                            </p>
                            <p className="mt-2 text-xs text-gray-500 font-medium">
                                This will close the store, clock out all active employees,
                                deactivate all employee accounts, and revoke all registered devices.
                                The store will no longer appear in dropdowns or dashboards.
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRemoveConfirmOpen(false)}
                                    className="rounded-xl border border-gray-200 bg-white py-3 text-sm font-extrabold tracking-widest uppercase text-gray-700 hover:border-gray-300 active:scale-[0.99] transition"
                                    disabled={removeLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={onRemoveStore}
                                    disabled={removeLoading}
                                    className="rounded-xl bg-red-600 py-3 text-sm font-extrabold tracking-widest uppercase text-white
                                        hover:bg-red-700 active:scale-[0.99] transition disabled:opacity-60"
                                >
                                    {removeLoading ? "..." : "Remove"}
                                </button>
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