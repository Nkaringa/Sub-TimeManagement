import { NextResponse } from "next/server";
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
    const employeeId = getCookie(cookieHeader, "employeeId");

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

    // --- Device verification ---
    const deviceToken = String(body?.deviceToken ?? "").trim();
    if (!deviceToken) {
        return NextResponse.json(
            { ok: false, message: "This device is not registered. Contact your manager." },
            { status: 403 }
        );
    }

    const device = await prisma.registeredDevice.findUnique({
        where: { token: deviceToken },
        select: { storeId: true, isActive: true },
    });

    if (!device || !device.isActive || device.storeId !== store.id) {
        return NextResponse.json(
            { ok: false, message: "This device is not registered for your store." },
            { status: 403 }
        );
    }

    // Prevent duplicate IN/OUT spam
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
