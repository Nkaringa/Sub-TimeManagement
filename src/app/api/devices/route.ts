import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCookie(cookieHeader: string, name: string) {
    const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}

export async function GET(req: Request) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const session = getCookie(cookieHeader, "session");
    const role = getCookie(cookieHeader, "role");
    const storeCode = getCookie(cookieHeader, "storeCode");

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "MANAGER" && role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!storeCode) {
        return NextResponse.json({ ok: false, message: "Missing store context" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    const devices = await prisma.registeredDevice.findMany({
        where: { storeId: store.id, isActive: true },
        select: { id: true, name: true, registeredBy: true, createdAt: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, devices }, { status: 200 });
}

export async function DELETE(req: Request) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const session = getCookie(cookieHeader, "session");
    const role = getCookie(cookieHeader, "role");
    const storeCode = getCookie(cookieHeader, "storeCode");

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "MANAGER" && role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!storeCode) {
        return NextResponse.json({ ok: false, message: "Missing store context" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const deviceId = String(body?.deviceId ?? "").trim();

    if (!deviceId) {
        return NextResponse.json({ ok: false, message: "Device ID is required." }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    const device = await prisma.registeredDevice.findUnique({
        where: { id: deviceId },
        select: { storeId: true, isActive: true },
    });

    if (!device || device.storeId !== store.id) {
        return NextResponse.json({ ok: false, message: "Device not found." }, { status: 404 });
    }
    if (!device.isActive) {
        return NextResponse.json({ ok: false, message: "Device already revoked." }, { status: 409 });
    }

    await prisma.registeredDevice.update({
        where: { id: deviceId },
        data: { isActive: false },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
}
