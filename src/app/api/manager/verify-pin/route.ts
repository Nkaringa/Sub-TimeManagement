import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function getCookie(cookieHeader: string, name: string) {
    const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}



export async function POST(req: Request) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const session = getCookie(cookieHeader, "session");
    const role = getCookie(cookieHeader, "role");
    const storeCode = getCookie(cookieHeader, "storeCode");
    const managerEmployeeId = getCookie(cookieHeader, "employeeId");

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "MANAGER") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!storeCode || !managerEmployeeId) {
        return NextResponse.json({ ok: false, message: "Missing manager context" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const pin = String(body?.pin ?? "").trim();
    if (!/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ ok: false, message: "Invalid PIN format" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({ where: { code: storeCode }, select: { id: true } });
    if (!store) return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });

    const manager = await prisma.user.findUnique({
        where: { storeId_employeeId: { storeId: store.id, employeeId: managerEmployeeId } },
        select: { pinHash: true, isActive: true, role: true },
    });

    if (!manager || !manager.isActive || manager.role !== "MANAGER") {
        return NextResponse.json({ ok: false, message: "Manager not found" }, { status: 404 });
    }

    const ok = await bcrypt.compare(pin, manager.pinHash);
    if (!ok) {
        return NextResponse.json({ ok: false, message: "Incorrect manager PIN" }, { status: 401 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
}
