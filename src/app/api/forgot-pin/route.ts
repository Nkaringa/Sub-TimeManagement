import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);

    const storeCode = String(body?.storeCode ?? "").trim();
    const employeeId = String(body?.employeeId ?? "").trim();
    const phoneLast4 = String(body?.phoneLast4 ?? "").replace(/\D/g, "").slice(0, 4);
    const newPin = String(body?.newPin ?? "").trim();
    const confirmPin = String(body?.confirmPin ?? "").trim();

    if (!storeCode) {
        return NextResponse.json({ ok: false, message: "Store is required" }, { status: 400 });
    }
    if (!employeeId) {
        return NextResponse.json({ ok: false, message: "Employee ID is required" }, { status: 400 });
    }
    if (phoneLast4.length !== 4) {
        return NextResponse.json({ ok: false, message: "Last 4 phone digits are required" }, { status: 400 });
    }
    if (!/^\d{4,6}$/.test(newPin)) {
        return NextResponse.json({ ok: false, message: "New PIN must be 4–6 digits" }, { status: 400 });
    }
    if (newPin !== confirmPin) {
        return NextResponse.json({ ok: false, message: "PINs do not match" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    // Normalize employeeId (same logic as login: if no dash, prepend storeCode)
    const normalizedId = employeeId.includes("-") ? employeeId : `${storeCode}-${employeeId}`;

    const user = await prisma.user.findUnique({
        where: { storeId_employeeId: { storeId: store.id, employeeId: normalizedId } },
        select: { id: true, phone: true, isActive: true },
    });

    if (!user || !user.isActive) {
        return NextResponse.json({ ok: false, message: "Employee not found" }, { status: 404 });
    }

    const storedLast4 = user.phone ? user.phone.replace(/\D/g, "").slice(-4) : "";
    if (!storedLast4 || storedLast4 !== phoneLast4) {
        return NextResponse.json({ ok: false, message: "Phone number does not match our records" }, { status: 401 });
    }

    const pinHash = await bcrypt.hash(newPin, 10);
    await prisma.user.update({ where: { id: user.id }, data: { pinHash } });

    return NextResponse.json({ ok: true }, { status: 200 });
}
