import { NextResponse } from "next/server";

export async function GET(req: Request) {
    // These are non-httpOnly cookies you already set in /api/login
    const cookieHeader = req.headers.get("cookie") ?? "";

    const getCookie = (name: string) => {
        const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
        return m ? decodeURIComponent(m[1]) : null;
    };

    const session = getCookie("session");
    const role = getCookie("role");
    const employeeId = getCookie("employeeId");
    const storeCode = getCookie("storeCode");

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json(
        { ok: true, role, employeeId, storeCode },
        { status: 200 }
    );
}