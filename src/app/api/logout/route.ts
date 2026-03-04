import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ ok: true });

    // employee/manager session cookies
    res.cookies.set("session", "", { path: "/", maxAge: 0 });
    res.cookies.set("role", "", { path: "/", maxAge: 0 });
    res.cookies.set("employeeId", "", { path: "/", maxAge: 0 });
    res.cookies.set("storeCode", "", { path: "/", maxAge: 0 });
    res.cookies.set("displayName", "", { path: "/", maxAge: 0 });

    // ✅ superadmin cookies
    res.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
    res.cookies.set("adminId", "", { path: "/", maxAge: 0 });

    return res;
}