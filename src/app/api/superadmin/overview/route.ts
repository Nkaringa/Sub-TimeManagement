import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
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
