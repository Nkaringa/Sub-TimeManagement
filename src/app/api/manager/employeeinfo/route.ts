// src/app/api/manager/employeeinfo/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function formatDisplayTime(d: Date) {
    const hours = d.getHours();
    const hh = hours % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hh}:${mm} ${ampm}`;
}

export async function GET() {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";
    const storeCode = jar.get("storeCode")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "MANAGER") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!storeCode) {
        return NextResponse.json({ ok: false, message: "Missing store context" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true, code: true, name: true },
    });

    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    const users = await prisma.user.findMany({
        where: { storeId: store.id },
        orderBy: [{ role: "asc" }, { employeeId: "asc" }],
        select: {
            id: true,
            employeeId: true,
            fullName: true,
            role: true,
            phone: true,
            email: true,
            ssnLast4: true,
            isActive: true,
            createdAt: true,
        },
    });

    if (users.length === 0) {
        return NextResponse.json(
            { ok: true, store: { code: store.code, name: store.name }, employees: [] },
            { status: 200 }
        );
    }

    // Latest punch per user
    const latestPunches = await prisma.timePunch.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
        orderBy: [{ userId: "asc" }, { at: "desc" }],
        select: { userId: true, type: true, at: true },
    });

    const lastByUser = new Map<string, { type: string; at: Date }>();
    for (const p of latestPunches) {
        if (!lastByUser.has(p.userId)) lastByUser.set(p.userId, { type: p.type, at: p.at });
    }

    const rows = users.map((u) => {
        const last = lastByUser.get(u.id) ?? null;
        const status = last?.type === "IN" ? "IN" : "OUT";
        const since = last?.type === "IN" && last?.at ? formatDisplayTime(last.at) : null;

        return {
            userId: u.id,
            employeeId: u.employeeId,
            fullName: u.fullName?.trim() ? u.fullName : null,
            role: u.role,
            phone: u.phone || null,
            email: u.email || null,
            ssnLast4: u.ssnLast4 || null,
            isActive: u.isActive,
            createdAt: u.createdAt.toISOString(),
            status,
            since,
        };
    });

    return NextResponse.json(
        {
            ok: true,
            store: { code: store.code, name: store.name },
            employees: rows,
        },
        { status: 200 }
    );
}
