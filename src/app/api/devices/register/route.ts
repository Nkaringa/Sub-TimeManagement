import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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
    if (role !== "MANAGER" && role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!storeCode) {
        return NextResponse.json({ ok: false, message: "Missing store context" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();

    if (!name) {
        return NextResponse.json({ ok: false, message: "Device name is required." }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const device = await prisma.registeredDevice.create({
        data: {
            storeId: store.id,
            token,
            name,
            registeredBy: employeeId ?? "unknown",
        },
        select: { id: true, token: true, name: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, device }, { status: 201 });
}
