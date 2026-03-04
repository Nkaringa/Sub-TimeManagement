import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);

    const adminId = String(body?.adminId ?? "").trim();
    const pin = String(body?.pin ?? "").trim();

    if (!adminId) {
        return NextResponse.json({ ok: false, message: "Admin ID is required." }, { status: 400 });
    }

    // SuperAdmin PINs are 8 digits in your plan (allow 4–12 to be flexible)
    if (!/^\d{4,12}$/.test(pin)) {
        return NextResponse.json({ ok: false, message: "PIN must be 4–12 digits." }, { status: 400 });
    }

    const admin = await prisma.superAdmin.findUnique({
        where: { adminId },
        select: { adminId: true, pinHash: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const ok = await bcrypt.compare(pin, admin.pinHash);
    if (!ok) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const res = NextResponse.json(
        { ok: true, redirectTo: "/superadmin/dashboard", adminId: admin.adminId },
        { status: 200 }
    );

    // Use same session cookie so your existing middleware/guards can stay simple
    res.cookies.set("session", "logged_in", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
    });

    // Keep using role cookie for authorization checks in your existing routes
    res.cookies.set("role", "SUPERADMIN", { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });

    // Admin context
    res.cookies.set("adminId", admin.adminId, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });

    // Clear employee context if any
    res.cookies.set("employeeId", "", { path: "/", maxAge: 0 });
    res.cookies.set("storeCode", "", { path: "/", maxAge: 0 });
    res.cookies.set("displayName", "", { path: "/", maxAge: 0 });

    return res;
}