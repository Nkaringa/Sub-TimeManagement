"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ActiveRow = {
    employeeId: string;
    since: string; // ISO
};

type DeviceRow = {
    id: string;
    name: string;
    registeredBy: string;
    createdAt: string; // ISO
};

type OverviewResponse = {
    ok: boolean;
    message?: string;
    store?: { code: string; name: string; isOpen: boolean };
    totals?: { totalEmployees: number; clockedIn: number; clockedOut: number };
    active?: ActiveRow[];
    manager?: { fullName?: string | null; employeeId?: string | null };
};

function todayDate() {
    return new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function formatDisplayTime(d: Date) {
    const hours = d.getHours();
    const hh = hours % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hh}:${mm} ${ampm}`;
}

export default function ManagerDashboardPage() {
    const router = useRouter();

    const [storeCode, setStoreCode] = useState("—");
    const [storeName, setStoreName] = useState("—");
    const [isOpen, setIsOpen] = useState(true);
    const [managerLabel, setManagerLabel] = useState("—");

    const [totalEmployees, setTotalEmployees] = useState(0);
    const [clockedIn, setClockedIn] = useState(0);
    const [clockedOut, setClockedOut] = useState(0);

    const [active, setActive] = useState<ActiveRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [toggling, setToggling] = useState(false);

    // confirmation modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingNextIsOpen, setPendingNextIsOpen] = useState<boolean>(true);

    // SuperAdmin impersonation mode
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [adminRestoring, setAdminRestoring] = useState(false);

    useEffect(() => {
        const m = document.cookie.match(/superadminMode=([^;]+)/);
        setIsAdminMode(m?.[1] === "true");
    }, []);

    async function backToAdmin() {
        setAdminRestoring(true);
        try {
            await fetch("/api/superadmin/restore", { method: "POST" });
            router.push("/superadmin/dashboard");
        } catch {
            router.push("/superadmin/dashboard");
        }
    }

    // ---------- Device Registration ----------
    const [devices, setDevices] = useState<DeviceRow[]>([]);
    const [thisDeviceRegistered, setThisDeviceRegistered] = useState(false);
    const [registerModalOpen, setRegisterModalOpen] = useState(false);
    const [deviceName, setDeviceName] = useState("");
    const [registering, setRegistering] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);

    async function loadDevices() {
        try {
            const res = await fetch("/api/devices", { cache: "no-store", credentials: "include" });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.ok && Array.isArray(data.devices)) {
                setDevices(data.devices);
            }
        } catch { /* silent */ }

        if (typeof window !== "undefined") {
            const localToken = localStorage.getItem("deviceToken");
            setThisDeviceRegistered(!!localToken);
        }
    }

    async function registerDevice() {
        const trimmed = deviceName.trim();
        if (!trimmed) return;

        setRegistering(true);
        setErr(null);

        try {
            const res = await fetch("/api/devices/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: trimmed }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setErr(data?.message ?? "Failed to register device.");
                return;
            }

            localStorage.setItem("deviceToken", data.device.token);
            setThisDeviceRegistered(true);
            setDeviceName("");
            setRegisterModalOpen(false);
            await loadDevices();
        } catch {
            setErr("Network error while registering device.");
        } finally {
            setRegistering(false);
        }
    }

    async function revokeDevice(deviceId: string) {
        setRevoking(deviceId);
        setErr(null);

        try {
            const res = await fetch("/api/devices", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ deviceId }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setErr(data?.message ?? "Failed to revoke device.");
                return;
            }

            await loadDevices();
        } catch {
            setErr("Network error while revoking device.");
        } finally {
            setRevoking(null);
        }
    }

    async function loadOverview() {
        setErr(null);

        try {
            const res = await fetch("/api/manager/overview", {
                method: "GET",
                cache: "no-store",
                credentials: "include",
            });

            const data: OverviewResponse = await res.json().catch(() => ({ ok: false }));

            if (!res.ok || !data.ok || !data.store || !data.totals) {
                setErr(data.message ?? "Failed to load manager overview.");
                return;
            }

            setStoreCode(data.store.code);
            setStoreName(data.store.name);
            setIsOpen(Boolean(data.store.isOpen));

            setTotalEmployees(data.totals.totalEmployees);
            setClockedIn(data.totals.clockedIn);
            setClockedOut(data.totals.clockedOut);

            setActive(Array.isArray(data.active) ? data.active : []);

            const label =
                data.manager?.fullName?.trim()
                    ? data.manager.fullName
                    : data.manager?.employeeId ?? "—";
            setManagerLabel(label);
        } catch {
            setErr("Network error while loading dashboard.");
        }
    }

    useEffect(() => {
        let mounted = true;

        async function firstLoad() {
            setLoading(true);
            await Promise.all([loadOverview(), loadDevices()]);
            if (!mounted) return;
            setLoading(false);
        }

        firstLoad();

        const t = setInterval(() => {
            loadOverview();
        }, 10_000);

        return () => {
            mounted = false;
            clearInterval(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const statusLabel = useMemo(() => {
        if (loading) return "LOADING";
        return isOpen ? "OPEN" : "CLOSED";
    }, [loading, isOpen]);

    function requestToggle() {
        if (!storeCode || storeCode === "—") {
            setErr("Store code not available yet. Try refreshing.");
            return;
        }

        const next = !isOpen;
        setPendingNextIsOpen(next);
        setConfirmOpen(true);
    }

    async function doToggle(nextIsOpen: boolean) {
        if (!storeCode || storeCode === "—") return;

        setToggling(true);
        setErr(null);

        try {
            const res = await fetch("/api/stores", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ code: storeCode, isOpen: nextIsOpen }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                setErr(data?.message ?? "Failed to update store status.");
                return;
            }

            setIsOpen(Boolean(data.store?.isOpen));

            // Refresh overview so counts/list update (especially after auto clock-out)
            await loadOverview();
        } catch {
            setErr("Network error while updating store status.");
        } finally {
            setToggling(false);
        }
    }

    return (
        <main className="min-h-screen px-5 py-8">
            {/* SuperAdmin Mode banner */}
            {isAdminMode && (
                <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-3 bg-[color:var(--subway-yellow)] px-4 py-2 shadow-md">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold tracking-widest text-[color:var(--subway-green)] uppercase">🔑 SuperAdmin View Mode</span>
                        <span className="text-[10px] text-[color:var(--subway-green)]/70">— viewing as manager for this store</span>
                    </div>
                    <button type="button" onClick={backToAdmin} disabled={adminRestoring}
                        className="rounded-lg bg-[color:var(--subway-green)] px-3 py-1.5 text-[11px] font-extrabold tracking-widest uppercase text-white hover:opacity-90 transition disabled:opacity-60">
                        {adminRestoring ? "Returning…" : "← Back to Admin Panel"}
                    </button>
                </div>
            )}

            <div className={`mx-auto w-full max-w-4xl${isAdminMode ? " pt-10" : ""}`}>
                {/* Top bar */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-wide">Manager Dashboard</h1>
                        <p className="mt-1 text-sm text-white/75">{todayDate()}</p>
                    </div>

                    <button
                        onClick={async () => {
                            await fetch("/api/logout", { method: "POST", credentials: "include" }).catch(() => null);
                            router.push("/login");
                        }}
                        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 active:scale-[0.99] transition"
                    >
                        Log out
                    </button>
                </div>

                {/* Main card */}
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
                                    STORE {storeCode} • {storeName}
                                </div>

                                <div className="mt-1 text-lg font-black tracking-wide text-white">
                                    Manager{" "}
                                    <span className="ml-2 text-[color:var(--subway-yellow)]">{managerLabel}</span>
                                </div>
                            </div>

                            {/* Store Status + Toggle */}
                            <div className="flex items-center gap-2">
                                <div className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold tracking-widest uppercase text-white">
                                    Store Status: {statusLabel}
                                </div>

                                <button
                                    type="button"
                                    onClick={requestToggle}
                                    disabled={loading || toggling || storeCode === "—"}
                                    className="rounded-full bg-[color:var(--subway-yellow)] px-4 py-1.5 text-[11px] font-extrabold tracking-widest uppercase text-[color:var(--subway-green)]
                    hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60 disabled:hover:brightness-100"
                                    title={isOpen ? "Close store" : "Open store"}
                                >
                                    {toggling ? "..." : isOpen ? "CLOSE" : "OPEN"}
                                </button>
                            </div>
                        </div>

                        <div
                            className="absolute inset-x-0 bottom-0 h-1"
                            style={{
                                background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
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

                        {/* KPI cards */}
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                                <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Total Employees</div>
                                <div className="mt-0.5 text-xl font-extrabold text-gray-900">{totalEmployees}</div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                                <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Clocked In</div>
                                <div className="mt-0.5 text-xl font-extrabold text-[color:var(--subway-green)]">{clockedIn}</div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                                <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Clocked Out</div>
                                <div className="mt-0.5 text-xl font-extrabold text-gray-900">{clockedOut}</div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => router.push("/manager/employeeinfo")}
                                className="rounded-xl bg-[color:var(--subway-green)] px-5 py-3 text-white font-extrabold tracking-widest uppercase text-sm
                  shadow-[0_8px_18px_rgba(0,140,21,0.18)] hover:brightness-110 active:scale-[0.99] transition"
                            >
                                View Employees
                            </button>

                            <button
                                type="button"
                                onClick={() => router.push("/manager/reports")}
                                className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold tracking-widest uppercase
                  border-2 border-[color:var(--subway-green)] text-[color:var(--subway-green)]
                  hover:bg-[color:var(--subway-green)] hover:text-white active:scale-[0.99] transition"
                            >
                                Time Reports
                            </button>
                        </div>

                        {/* Active employees */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-extrabold tracking-widest text-gray-700 uppercase">Active Employees</h2>
                                <span className="text-xs font-bold text-gray-400">{active.length} active</span>
                            </div>

                            <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
                                {active.length === 0 ? (
                                    <div className="p-3 text-sm text-gray-500">No one is clocked in.</div>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {active.map((e) => {
                                            const since = formatDisplayTime(new Date(e.since));
                                            return (
                                                <li key={e.employeeId} className="flex items-center justify-between px-4 py-3">
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">#{e.employeeId}</div>
                                                        <div className="mt-0.5 text-xs text-gray-500">Since {since}</div>
                                                    </div>

                                                    <span className="rounded-full bg-[color:var(--subway-yellow)] px-3 py-1 text-[10px] font-extrabold tracking-widest text-[color:var(--subway-green)] uppercase">
                                                        IN
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            <p className="mt-3 text-xs text-gray-400">This list is live from the database (auto-refreshes).</p>
                        </div>

                        {/* Device Management */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-extrabold tracking-widest text-gray-700 uppercase">Registered Devices</h2>
                                <span className="text-xs font-bold text-gray-400">{devices.length} device{devices.length !== 1 ? "s" : ""}</span>
                            </div>

                            <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
                                {devices.length === 0 ? (
                                    <div className="p-3 text-sm text-gray-500">No devices registered yet.</div>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {devices.map((d) => (
                                            <li key={d.id} className="flex items-center justify-between px-4 py-3">
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{d.name}</div>
                                                    <div className="mt-0.5 text-xs text-gray-500">
                                                        By {d.registeredBy} &middot; {new Date(d.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => revokeDevice(d.id)}
                                                    disabled={revoking === d.id}
                                                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[10px] font-extrabold tracking-widest uppercase text-red-600
                                                        hover:bg-red-50 active:scale-[0.99] transition disabled:opacity-50"
                                                >
                                                    {revoking === d.id ? "..." : "Revoke"}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {!thisDeviceRegistered && (
                                <button
                                    type="button"
                                    onClick={() => setRegisterModalOpen(true)}
                                    className="mt-3 w-full rounded-xl bg-[color:var(--subway-green)] px-5 py-3 text-white font-extrabold tracking-widest uppercase text-sm
                                        shadow-[0_8px_18px_rgba(0,140,21,0.18)] hover:brightness-110 active:scale-[0.99] transition"
                                >
                                    Register This Device
                                </button>
                            )}

                            {thisDeviceRegistered && (
                                <p className="mt-3 text-xs text-[color:var(--subway-green)] font-semibold">
                                    This device is registered for clock in/out.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Bottom stripe */}
                    <div
                        className="h-2 w-full"
                        style={{
                            background: "linear-gradient(90deg, var(--subway-green) 0%, var(--subway-green) 55%, var(--subway-yellow) 55%, var(--subway-yellow) 100%)",
                        }}
                    />
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setConfirmOpen(false)}
                        aria-label="Close confirmation"
                    />

                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />

                            <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">
                                Confirm action
                            </div>

                            <div className="mt-1 text-xl font-black tracking-widest text-[color:var(--subway-yellow)] uppercase">
                                {pendingNextIsOpen ? "Open Store" : "Close Store"}
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
                                {pendingNextIsOpen ? (
                                    <>
                                        Are you sure you want to <span className="font-black">OPEN</span> Store{" "}
                                        <span className="font-black">#{storeCode}</span>?
                                    </>
                                ) : (
                                    <>
                                        Are you sure you want to <span className="font-black">CLOSE</span> Store{" "}
                                        <span className="font-black">#{storeCode}</span>?
                                        <span className="block mt-2 text-xs text-gray-500 font-medium">
                                            Closing will automatically clock out all currently clocked-in employees.
                                        </span>
                                    </>
                                )}
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmOpen(false)}
                                    className="rounded-xl border border-gray-200 bg-white py-3 text-sm font-extrabold tracking-widest uppercase text-gray-700 hover:border-gray-300 active:scale-[0.99] transition"
                                    disabled={toggling}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        setConfirmOpen(false);
                                        await doToggle(pendingNextIsOpen);
                                    }}
                                    className="rounded-xl bg-[color:var(--subway-yellow)] py-3 text-sm font-extrabold tracking-widest uppercase text-[color:var(--subway-green)]
                    hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60"
                                    disabled={toggling}
                                >
                                    Confirm
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

            {/* Register Device Modal */}
            {registerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setRegisterModalOpen(false)}
                        aria-label="Close register device"
                    />

                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                        <div className="relative bg-[color:var(--subway-green)] px-6 pt-6 pb-5 overflow-hidden">
                            <div
                                className="absolute -right-6 -top-4 h-[200%] w-20 rotate-[20deg] opacity-20"
                                style={{ background: "linear-gradient(180deg, var(--subway-yellow), transparent)" }}
                            />

                            <div className="text-[11px] font-extrabold tracking-widest text-white/80 uppercase">
                                Device setup
                            </div>

                            <div className="mt-1 text-xl font-black tracking-widest text-[color:var(--subway-yellow)] uppercase">
                                Register This Device
                            </div>

                            <div
                                className="absolute inset-x-0 bottom-0 h-1.5"
                                style={{
                                    background: "linear-gradient(90deg, var(--subway-yellow), var(--subway-yellow-light), var(--subway-yellow))",
                                }}
                            />
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm text-gray-700 font-medium">
                                Give this device a name so you can identify it later.
                            </p>

                            <input
                                type="text"
                                value={deviceName}
                                onChange={(e) => setDeviceName(e.target.value)}
                                placeholder="e.g. Front Counter Tablet"
                                className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400
                                    focus:border-[color:var(--subway-green)] focus:ring-1 focus:ring-[color:var(--subway-green)] outline-none transition"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") registerDevice(); }}
                            />

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setRegisterModalOpen(false); setDeviceName(""); }}
                                    className="rounded-xl border border-gray-200 bg-white py-3 text-sm font-extrabold tracking-widest uppercase text-gray-700 hover:border-gray-300 active:scale-[0.99] transition"
                                    disabled={registering}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={registerDevice}
                                    disabled={registering || !deviceName.trim()}
                                    className="rounded-xl bg-[color:var(--subway-yellow)] py-3 text-sm font-extrabold tracking-widest uppercase text-[color:var(--subway-green)]
                                        hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60"
                                >
                                    {registering ? "..." : "Register"}
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