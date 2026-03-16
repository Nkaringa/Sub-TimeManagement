import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";

    if (session !== "logged_in" || role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const storeCode = String(body?.storeCode ?? "").trim();
    if (!storeCode) {
        return NextResponse.json({ ok: false, message: "Missing storeCode" }, { status: 400 });
    }

    // Verify store exists and is active
    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { code: true, name: true, isActive: true },
    });
    if (!store || !store.isActive) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    const maxAge = 60 * 60 * 4; // 4 hours
    const res = NextResponse.json({ ok: true });

    // Switch to manager context for this store
    res.cookies.set("role", "MANAGER", { sameSite: "lax", path: "/", maxAge });
    res.cookies.set("storeCode", store.code, { sameSite: "lax", path: "/", maxAge });
    res.cookies.set("employeeId", "ADMIN", { sameSite: "lax", path: "/", maxAge });
    // Marker so manager dashboard can show "Admin Mode" banner
    res.cookies.set("superadminMode", "true", { sameSite: "lax", path: "/", maxAge });

    return res;
}
