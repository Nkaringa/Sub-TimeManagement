import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";
    const storeCode = jar.get("storeCode")?.value ?? "";
    const employeeId = jar.get("employeeId")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (!["EMPLOYEE", "MANAGER"].includes(role)) {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!storeCode || !employeeId) {
        return NextResponse.json({ ok: false, message: "Missing session context" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const currentPin = String(body?.currentPin ?? "").trim();
    const newPin = String(body?.newPin ?? "").trim();
    const confirmPin = String(body?.confirmPin ?? "").trim();

    if (!/^\d{4,6}$/.test(currentPin)) {
        return NextResponse.json({ ok: false, message: "Current PIN must be 4–6 digits" }, { status: 400 });
    }
    if (!/^\d{4,6}$/.test(newPin)) {
        return NextResponse.json({ ok: false, message: "New PIN must be 4–6 digits" }, { status: 400 });
    }
    if (newPin !== confirmPin) {
        return NextResponse.json({ ok: false, message: "PINs do not match" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({ where: { code: storeCode }, select: { id: true } });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
        where: { storeId_employeeId: { storeId: store.id, employeeId } },
        select: { id: true, pinHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
        return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    const match = await bcrypt.compare(currentPin, user.pinHash);
    if (!match) {
        return NextResponse.json({ ok: false, message: "Current PIN is incorrect" }, { status: 401 });
    }

    const pinHash = await bcrypt.hash(newPin, 10);
    await prisma.user.update({ where: { id: user.id }, data: { pinHash } });

    return NextResponse.json({ ok: true }, { status: 200 });
}
