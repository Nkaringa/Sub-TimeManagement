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

    const [overview, setOverview] = useState<Overview>({ totalStores: 0, openStores: 0, closedStores: 0 });
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // Stores list
    const [stores, setStores] = useState<StoreOption[]>([]);
    const [storesLoading, setStoresLoading] = useState(true);
    const [storesError, setStoresError] = useState<string | null>(null);

    // Open store dropdown
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [openLoading, setOpenLoading] = useState(false);
    const [openErr, setOpenErr] = useState<string | null>(null);

    // Add store form
    const [addCode, setAddCode] = useState("");
    const [addName, setAddName] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const [addMsg, setAddMsg] = useState<string | null>(null);

    // Edit store modal
    const [editOpen, setEditOpen] = useState(false);
    const [editCode, setEditCode] = useState("");
    const [editName, setEditName] = useState("");
    const [editLoading, setEditLoading] = useState(false);
    const [editMsg, setEditMsg] = useState<string | null>(null);

    // Remove store modal
    const [removeOpen, setRemoveOpen] = useState(false);
    const [removeCode, setRemoveCode] = useState("");
    const [removeConfirm, setRemoveConfirm] = useState("");
    const [removeLoading, setRemoveLoading] = useState(false);
    const [removeMsg, setRemoveMsg] = useState<string | null>(null);

    // Change PIN modal
    const [changePinOpen, setChangePinOpen] = useState(false);
    const [cpCurrent, setCpCurrent] = useState("");
    const [cpNew, setCpNew] = useState("");
    const [cpConfirm, setCpConfirm] = useState("");
    const [cpLoading, setCpLoading] = useState(false);
    const [cpMsg, setCpMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [cpShowCurrent, setCpShowCurrent] = useState(false);
    const [cpShowNew, setCpShowNew] = useState(false);

    async function loadOverview() {
        setErr(null);
        try {
            const res = await fetch("/api/superadmin/overview", { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Failed to load overview");
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
            if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Failed to load stores");
            const list: StoreOption[] = Array.isArray(data.stores) ? data.stores : [];
            setStores(list);
            if (!selectedStore && list.length > 0) setSelectedStore(list[0].code);
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

    // Close modals on ESC
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setEditOpen(false);
                setRemoveOpen(false);
                setChangePinOpen(false);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

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
            if (!res.ok || !data?.ok) { setOpenErr(data?.message ?? "Failed to open store."); return; }
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
                body: JSON.stringify({ code, name, isOpen: true }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) { setAddMsg(data?.message ?? "Failed to add store."); return; }
            setAddMsg(`Store ${data.store.code} • ${data.store.name} added.`);
            setAddCode("");
            setAddName("");
            await Promise.all([loadOverview(), loadStores()]);
        } catch {
            setAddMsg("Network error. Please try again.");
        } finally {
            setAddLoading(false);
        }
    }

    function openEditModal(store: StoreOption) {
        setEditCode(store.code);
        setEditName(store.name);
        setEditMsg(null);
        setEditOpen(true);
    }

    async function onEditStore(e: React.FormEvent) {
        e.preventDefault();
        setEditMsg(null);
        const name = editName.trim();
        if (!name) return setEditMsg("Store name is required.");
        setEditLoading(true);
        try {
            const res = await fetch("/api/stores", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: editCode, name }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) { setEditMsg(data?.message ?? "Failed to update store."); return; }
            setEditOpen(false);
            await Promise.all([loadOverview(), loadStores()]);
        } catch {
            setEditMsg("Network error. Please try again.");
        } finally {
            setEditLoading(false);
        }
    }

    function openRemoveModal(store: StoreOption) {
        setRemoveCode(store.code);
        setRemoveConfirm("");
        setRemoveMsg(null);
        setRemoveOpen(true);
    }

    async function onRemoveStore() {
        if (removeConfirm !== removeCode) return setRemoveMsg("Code does not match.");
        setRemoveLoading(true);
        setRemoveMsg(null);
        try {
            const res = await fetch("/api/stores", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: removeCode }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) { setRemoveMsg(data?.message ?? "Failed to remove store."); return; }
            setRemoveOpen(false);
            if (selectedStore === removeCode) setSelectedStore("");
            await Promise.all([loadOverview(), loadStores()]);
        } catch {
            setRemoveMsg("Network error. Please try again.");
        } finally {
            setRemoveLoading(false);
        }
    }

    async function onChangePin(e: React.FormEvent) {
        e.preventDefault();
        setCpMsg(null);
        setCpLoading(true);
        try {
            const res = await fetch("/api/superadmin/change-pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPin: cpCurrent, newPin: cpNew, confirmPin: cpConfirm }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
                setCpMsg({ ok: false, text: data?.message ?? "Failed to change PIN." });
                return;
            }
            setCpMsg({ ok: true, text: "PIN changed successfully!" });
            setCpCurrent(""); setCpNew(""); setCpConfirm("");
        } catch {
            setCpMsg({ ok: false, text: "Network error. Please try again." });
        } finally {
            setCpLoading(false);
        }
    }

    return (
        <main className="min-h-screen px-5 py-10">
            <div className="mx-auto w-full max-w-5xl">
                {/* Top bar */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-wide">SuperAdmin Dashboard</h1>
                        <p className="mt-1 text-sm text-white/75">{todayDate()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => { setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpMsg(null); setChangePinOpen(true); }}
                            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 active:scale-[0.99] transition"
                        >
                            Change PIN
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
                <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
                    {/* Header */}
                    <div className="relative bg-[color:var(--subway-green)] px-6 py-5 overflow-hidden">
                        <div
                            className="absolute -right-8 -top-6 h-[220%] w-24 rotate-[18deg] opacity-15"
                            style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                        />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <div className="text-[11px] font-bold tracking-widest text-white/80 uppercase">SYSTEM OVERVIEW</div>
                                <div className="mt-1 text-xl font-black tracking-wide text-white">S-Ops Clock Admin</div>
                            </div>
                            <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-extrabold tracking-widest uppercase text-white">
                                SUPERADMIN
                            </div>
                        </div>
                        <div
                            className="absolute inset-x-0 bottom-0 h-1.5"
                            style={{ background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))" }}
                        />
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6">
                        {err && (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
                                {err}
                            </div>
                        )}

                        {/* KPIs */}
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                <div className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Total Stores</div>
                                <div className="mt-1 text-2xl font-extrabold text-gray-900">{loading ? "—" : overview.totalStores}</div>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                <div className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Stores Open</div>
                                <div className="mt-1 text-2xl font-extrabold text-[color:var(--subway-green)]">{loading ? "—" : overview.openStores}</div>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                <div className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Stores Closed</div>
                                <div className="mt-1 text-2xl font-extrabold text-gray-900">{loading ? "—" : overview.closedStores}</div>
                            </div>
                        </div>

                        {/* Add Store */}
                        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">Add Store</div>

                            <form onSubmit={onAddStore} className="mt-3 grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Store Code</label>
                                    <input
                                        value={addCode}
                                        onChange={(e) => setAddCode(e.target.value.trimStart())}
                                        placeholder="1001"
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10 placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Store Name</label>
                                    <input
                                        value={addName}
                                        onChange={(e) => setAddName(e.target.value)}
                                        placeholder="Michigan"
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10 placeholder:text-gray-400"
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button
                                        type="submit"
                                        disabled={addLoading}
                                        className="rounded-xl bg-[color:var(--subway-green)] px-5 py-2.5 text-sm font-extrabold tracking-widest uppercase text-white
                      shadow-[0_8px_18px_rgba(0,140,21,0.18)] hover:brightness-110 active:scale-[0.99] transition disabled:opacity-40 disabled:shadow-none"
                                    >
                                        {addLoading ? "ADDING..." : "ADD"}
                                    </button>
                                </div>
                            </form>

                            {addMsg && <div className="mt-3 text-sm font-semibold text-gray-700">{addMsg}</div>}
                            <p className="mt-2 text-[11px] text-gray-400">
                                Creates a store (defaults to OPEN). Login/Register dropdowns update automatically.
                            </p>
                        </div>

                        {/* Open Store Dashboard */}
                        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">Open Store Dashboard</div>

                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <select
                                    value={selectedStore}
                                    onChange={(e) => setSelectedStore(e.target.value)}
                                    disabled={storesLoading || stores.length === 0}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                    focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10 disabled:opacity-60"
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
                    shadow-[0_8px_18px_rgba(0,140,21,0.18)] hover:brightness-110 active:scale-[0.99] transition disabled:opacity-40 disabled:shadow-none"
                                >
                                    {openLoading ? "Opening…" : "Open"}
                                </button>
                            </div>

                            {openErr && <div className="mt-2 text-[11px] font-semibold text-red-600">{openErr}</div>}
                            {storesError && <div className="mt-2 text-[11px] font-semibold text-red-600">{storesError}</div>}
                            <p className="mt-2 text-[11px] text-gray-400">Opens the manager dashboard for that store location.</p>
                        </div>

                        {/* Manage Stores table */}
                        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="text-[11px] font-extrabold tracking-widest text-gray-600 uppercase">Manage Stores</div>

                            {storesLoading ? (
                                <p className="mt-3 text-sm text-gray-400">Loading...</p>
                            ) : stores.length === 0 ? (
                                <p className="mt-3 text-sm text-gray-400">No stores found.</p>
                            ) : (
                                <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-widest text-gray-500 uppercase">Code</th>
                                                <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-widest text-gray-500 uppercase">Name</th>
                                                <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-widest text-gray-500 uppercase">Status</th>
                                                <th className="px-4 py-2.5 text-right text-[11px] font-bold tracking-widest text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {stores.map((s) => (
                                                <tr key={s.code} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-gray-900">{s.code}</td>
                                                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{s.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${s.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                                            {s.isOpen ? "Open" : "Closed"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditModal(s)}
                                                                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 active:scale-[0.98] transition"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openRemoveModal(s)}
                                                                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 active:scale-[0.98] transition"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <p className="mt-2 text-[11px] text-gray-400">Edit renames a store. Remove deactivates it and all its employees.</p>
                        </div>
                    </div>

                    {/* Bottom stripe */}
                    <div
                        className="h-2 w-full"
                        style={{ background: "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 55%, var(--subway-yellow) 55%, var(--subway-yellow) 100%)" }}
                    />
                </div>
            </div>

            {/* Edit Store Modal */}
            {editOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setEditOpen(false)} aria-label="Close" />
                    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div className="absolute -right-8 -top-6 h-[220%] w-24 rotate-[18deg] opacity-15"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }} />
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">Edit Store</div>
                                    <div className="mt-1 text-xl font-black tracking-wide text-white">{editCode}</div>
                                </div>
                                <button type="button" onClick={() => setEditOpen(false)}
                                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold text-white hover:bg-white/15 transition active:scale-[0.99]">
                                    Close
                                </button>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{ background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))" }} />
                        </div>

                        <div className="px-6 py-6">
                            <form onSubmit={onEditStore} className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Store Name</label>
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Store name"
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10 placeholder:text-gray-400"
                                    />
                                </div>

                                {editMsg && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{editMsg}</div>
                                )}

                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="w-full rounded-xl bg-[color:var(--subway-green)] py-3 font-extrabold tracking-widest text-white text-sm uppercase
                  shadow-[0_8px_22px_rgba(0,140,21,0.30)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
                                >
                                    {editLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </form>
                        </div>

                        <div className="h-2 w-full"
                            style={{ background: "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 50%, var(--subway-yellow) 50%, var(--subway-yellow) 100%)" }} />
                    </div>
                </div>
            )}

            {/* Remove Store Modal */}
            {removeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setRemoveOpen(false)} aria-label="Close" />
                    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-red-600 px-6 pt-6 pb-5 overflow-hidden">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">Remove Store</div>
                                    <div className="mt-1 text-xl font-black tracking-wide text-white">{removeCode}</div>
                                </div>
                                <button type="button" onClick={() => setRemoveOpen(false)}
                                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold text-white hover:bg-white/15 transition active:scale-[0.99]">
                                    Cancel
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-6 space-y-4">
                            <p className="text-sm text-gray-700">
                                This will <span className="font-bold text-red-600">permanently deactivate</span> store <span className="font-bold">{removeCode}</span> and all its employees. This cannot be undone.
                            </p>

                            <div>
                                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                    Type <span className="font-black text-gray-900">{removeCode}</span> to confirm
                                </label>
                                <input
                                    value={removeConfirm}
                                    onChange={(e) => setRemoveConfirm(e.target.value)}
                                    placeholder={removeCode}
                                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-semibold outline-none transition-all
                      focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-400/10 placeholder:text-gray-400"
                                />
                            </div>

                            {removeMsg && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{removeMsg}</div>
                            )}

                            <button
                                type="button"
                                onClick={onRemoveStore}
                                disabled={removeLoading || removeConfirm !== removeCode}
                                className="w-full rounded-xl bg-red-600 py-3 font-extrabold tracking-widest text-white text-sm uppercase
                  shadow-[0_8px_22px_rgba(220,38,38,0.30)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
                            >
                                {removeLoading ? "Removing..." : "Remove Store"}
                            </button>
                        </div>

                        <div className="h-2 w-full bg-red-600" />
                    </div>
                </div>
            )}

            {/* Change PIN Modal */}
            {changePinOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-label="Change PIN">
                    <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setChangePinOpen(false)} aria-label="Close" />

                    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div className="absolute -right-8 -top-6 h-[220%] w-24 rotate-[18deg] opacity-15"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }} />
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">Security</div>
                                    <div className="mt-1 text-xl font-black tracking-wide text-[color:var(--subway-yellow)] uppercase">Change PIN</div>
                                </div>
                                <button type="button" onClick={() => setChangePinOpen(false)}
                                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold text-white hover:bg-white/15 transition active:scale-[0.99]">
                                    Close
                                </button>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{ background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))" }} />
                        </div>

                        <div className="px-6 py-6">
                            <form onSubmit={onChangePin} className="space-y-3.5">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Current PIN</label>
                                    <div className="mt-1.5 relative">
                                        <input
                                            value={cpCurrent}
                                            onChange={(e) => setCpCurrent(e.target.value.replace(/\D/g, "").slice(0, 12))}
                                            placeholder="••••••••"
                                            type={cpShowCurrent ? "text" : "password"}
                                            inputMode="numeric"
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 pr-16 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10 placeholder:text-gray-400"
                                        />
                                        <button type="button" onClick={() => setCpShowCurrent((s) => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-[color:var(--subway-green)] transition">
                                            {cpShowCurrent ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">New PIN</label>
                                    <div className="mt-1.5 relative">
                                        <input
                                            value={cpNew}
                                            onChange={(e) => setCpNew(e.target.value.replace(/\D/g, "").slice(0, 12))}
                                            placeholder="4–12 digit PIN"
                                            type={cpShowNew ? "text" : "password"}
                                            inputMode="numeric"
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 pr-16 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10 placeholder:text-gray-400"
                                        />
                                        <button type="button" onClick={() => setCpShowNew((s) => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-[color:var(--subway-green)] transition">
                                            {cpShowNew ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Confirm New PIN</label>
                                    <input
                                        value={cpConfirm}
                                        onChange={(e) => setCpConfirm(e.target.value.replace(/\D/g, "").slice(0, 12))}
                                        placeholder="Repeat new PIN"
                                        type="password"
                                        inputMode="numeric"
                                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 font-medium outline-none transition-all focus:bg-white focus:border-[color:var(--subway-green)] focus:ring-4 focus:ring-[color:var(--subway-green)]/10 placeholder:text-gray-400"
                                    />
                                </div>

                                {cpMsg && (
                                    <div className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${cpMsg.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                                        {cpMsg.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={cpLoading || !cpCurrent || !cpNew || !cpConfirm}
                                    className="w-full rounded-xl bg-[color:var(--subway-green)] py-3 font-extrabold tracking-widest text-white text-sm uppercase
                  shadow-[0_8px_22px_rgba(0,140,21,0.30)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
                                >
                                    {cpLoading ? "Saving..." : "Update PIN"}
                                </button>
                            </form>
                        </div>

                        <div className="h-2 w-full"
                            style={{ background: "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 50%, var(--subway-yellow) 50%, var(--subway-yellow) 100%)" }} />
                    </div>
                </div>
            )}
        </main>
    );
}
