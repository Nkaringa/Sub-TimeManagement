import { NextResponse } from "next/server";

function getCookie(cookieHeader: string, name: string) {
    const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}



export async function POST(req: Request) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const session = getCookie(cookieHeader, "session");
    const superadminMode = getCookie(cookieHeader, "superadminMode");
    const adminId = getCookie(cookieHeader, "adminId");

    // Must have been in admin impersonation mode
    if (session !== "logged_in" || superadminMode !== "true" || !adminId) {
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
