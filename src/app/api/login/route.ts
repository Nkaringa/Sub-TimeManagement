import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const userIdRaw = String(body?.userId ?? "").trim(); // e.g. "101-0007" or "101-MGR1"
    const pin = String(body?.pin ?? "").trim();

    if (!userIdRaw) {
        return NextResponse.json({ ok: false, message: "Employee ID is required" }, { status: 400 });
    }
    if (!/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ ok: false, message: "PIN must be 4–6 digits." }, { status: 400 });
    }

    const storeCode = userIdRaw.split("-")[0];
    if (!storeCode) {
        return NextResponse.json({ ok: false, message: "Invalid Employee ID format" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({ where: { code: storeCode } });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: {
            storeId_employeeId: {
                storeId: store.id,
                employeeId: userIdRaw,
            },
        },
        select: {
            employeeId: true,
            fullName: true,
            pinHash: true,
            role: true,
            isActive: true,
        },
    });

    if (!user || !user.isActive) {
        return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
    }

    const ok = await bcrypt.compare(pin, user.pinHash);
    if (!ok) {
        return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
    }

    const redirectTo = user.role === "MANAGER" ? "/manager/dashboard" : "/employee/dashboard";

    const res = NextResponse.json({
        ok: true,
        redirectTo,
        role: user.role,
        employeeId: user.employeeId,
        storeCode: store.code,
        fullName: user.fullName,
    });

    res.cookies.set("session", "logged_in", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
    });

    res.cookies.set("role", user.role, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    res.cookies.set("employeeId", user.employeeId, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    res.cookies.set("storeCode", store.code, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    res.cookies.set("displayName", user.fullName || "", { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });

    return res;
}