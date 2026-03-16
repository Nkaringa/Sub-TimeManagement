import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
    if (role !== "EMPLOYEE") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!storeCode || !employeeId) {
        return NextResponse.json({ ok: false, message: "Missing store/employee context" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const type = String(body?.type ?? "").trim().toUpperCase();
    if (type !== "IN" && type !== "OUT") {
        return NextResponse.json({ ok: false, message: "Invalid punch type" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true, code: true, isOpen: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    // Block clock-in if store closed
    if (!store.isOpen && type === "IN") {
        return NextResponse.json(
            { ok: false, message: "Store is closed. Ask your manager to open the store." },
            { status: 409 }
        );
    }

    const user = await prisma.user.findUnique({
        where: { storeId_employeeId: { storeId: store.id, employeeId } },
        select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
        return NextResponse.json({ ok: false, message: "User not found/inactive" }, { status: 404 });
    }

    // Prevent duplicate IN/OUT
    const lastPunch = await prisma.timePunch.findFirst({
        where: { userId: user.id },
        orderBy: { at: "desc" },
        select: { type: true },
    });
    if (lastPunch?.type === type) {
        return NextResponse.json(
            { ok: false, message: `Already clocked ${type === "IN" ? "in" : "out"}.` },
            { status: 409 }
        );
    }

    const punch = await prisma.timePunch.create({
        data: { storeId: store.id, userId: user.id, type },
        select: { type: true, at: true },
    });

    return NextResponse.json(
        { ok: true, punch, store: { code: store.code, isOpen: store.isOpen } },
        { status: 200 }
    );
}
