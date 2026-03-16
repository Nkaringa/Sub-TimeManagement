import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function sumWorkedSeconds(punches: Array<{ type: string; at: Date }>, endCap: Date) {
    let totalMs = 0;
    let currentIn: Date | null = null;

    for (const p of punches) {
        if (p.type === "IN") {
            if (!currentIn) currentIn = p.at; // ignore repeated IN
        } else if (p.type === "OUT") {
            if (currentIn) {
                totalMs += Math.max(0, p.at.getTime() - currentIn.getTime());
                currentIn = null;
            }
        }
    }

    if (currentIn) {
        totalMs += Math.max(0, endCap.getTime() - currentIn.getTime());
    }

    return Math.floor(totalMs / 1000);

}

export async function GET() {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";
    const storeCode = jar.get("storeCode")?.value ?? "";
    const employeeId = jar.get("employeeId")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    if (role !== "EMPLOYEE") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    if (!storeCode || !employeeId) {
        return NextResponse.json(
            { ok: false, message: "Missing store/user context" },
            { status: 400 }
        );
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true, code: true, isOpen: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
        where: { storeId_employeeId: { storeId: store.id, employeeId } },
        select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
        return NextResponse.json({ ok: false }, { status: 404 });
    }

    const last = await prisma.timePunch.findFirst({
        where: { userId: user.id },
        orderBy: { at: "desc" },
        select: { type: true, at: true },
    });

    // Today's work so far (server-side baseline)
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const punchesToday = await prisma.timePunch.findMany({
        where: { userId: user.id, at: { gte: dayStart } },
        orderBy: { at: "asc" },
        select: { type: true, at: true },
    });

    const workedTodaySeconds = sumWorkedSeconds(punchesToday, now);

    return NextResponse.json(
        {
            ok: true,
            store: { code: store.code, isOpen: store.isOpen },
            lastPunch: last ?? null,
            workedTodaySeconds,
        },
        { status: 200 }
    );
}
