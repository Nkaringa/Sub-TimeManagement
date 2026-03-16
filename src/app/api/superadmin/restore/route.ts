import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const superadminMode = jar.get("superadminMode")?.value ?? "";

    // Must have been in admin impersonation mode
    if (session !== "logged_in" || superadminMode !== "true") {
        return NextResponse.json({ ok: false, message: "Not in superadmin mode" }, { status: 401 });
    }

    const maxAge = 60 * 60 * 24;
    const res = NextResponse.json({ ok: true });

    // Restore superadmin role
    res.cookies.set("role", "SUPERADMIN", { sameSite: "lax", path: "/", maxAge });

    // Clear manager / impersonation cookies
    res.cookies.set("storeCode", "", { path: "/", maxAge: 0 });
    res.cookies.set("employeeId", "", { path: "/", maxAge: 0 });
    res.cookies.set("superadminMode", "", { path: "/", maxAge: 0 });

    return res;
}
