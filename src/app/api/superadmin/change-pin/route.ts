import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";
    const adminId = jar.get("adminId")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!adminId) {
        return NextResponse.json({ ok: false, message: "Missing admin context" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const currentPin = String(body?.currentPin ?? "").trim();
    const newPin = String(body?.newPin ?? "").trim();
    const confirmPin = String(body?.confirmPin ?? "").trim();

    if (!/^\d{4,12}$/.test(currentPin)) {
        return NextResponse.json({ ok: false, message: "Current PIN must be 4–12 digits" }, { status: 400 });
    }
    if (!/^\d{4,12}$/.test(newPin)) {
        return NextResponse.json({ ok: false, message: "New PIN must be 4–12 digits" }, { status: 400 });
    }
    if (newPin !== confirmPin) {
        return NextResponse.json({ ok: false, message: "PINs do not match" }, { status: 400 });
    }

    const admin = await prisma.superAdmin.findUnique({
        where: { adminId },
        select: { id: true, pinHash: true },
    });

    if (!admin) {
        return NextResponse.json({ ok: false, message: "Admin not found" }, { status: 404 });
    }

    const match = await bcrypt.compare(currentPin, admin.pinHash);
    if (!match) {
        return NextResponse.json({ ok: false, message: "Current PIN is incorrect" }, { status: 401 });
    }

    const pinHash = await bcrypt.hash(newPin, 10);
    await prisma.superAdmin.update({ where: { id: admin.id }, data: { pinHash } });

    return NextResponse.json({ ok: true }, { status: 200 });
}
