// src/app/api/superadmin/overview/route.ts
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

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }

    // Only SuperAdmin can access this endpoint
    if (role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const [totalStores, openStores, closedStores] = await Promise.all([
        prisma.store.count({ where: { isActive: true } }),
        prisma.store.count({ where: { isActive: true, isOpen: true } }),
        prisma.store.count({ where: { isActive: true, isOpen: false } }),
    ]);

    return NextResponse.json({ ok: true, totalStores, openStores, closedStores }, { status: 200 });
}
