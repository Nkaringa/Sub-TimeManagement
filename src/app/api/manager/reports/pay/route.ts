import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCookie(cookieHeader: string, name: string) {
    const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}



function sumWorkedMs(punches: Array<{ type: string; at: Date }>, endCap: Date): number {
    let totalMs = 0;
    let currentIn: Date | null = null;
    for (const p of punches) {
        if (p.type === "IN") {
            if (!currentIn) currentIn = p.at;
        } else if (p.type === "OUT") {
            if (currentIn) {
                totalMs += Math.max(0, p.at.getTime() - currentIn.getTime());
                currentIn = null;
            }
        }
    }
    if (currentIn) totalMs += Math.max(0, endCap.getTime() - currentIn.getTime());
    return totalMs;

}

export async function POST(req: Request) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const session = getCookie(cookieHeader, "session");
    const role = getCookie(cookieHeader, "role");
    const storeCode = getCookie(cookieHeader, "storeCode");
    const managerEmployeeId = getCookie(cookieHeader, "employeeId");

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "MANAGER") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!storeCode) {
        return NextResponse.json({ ok: false, message: "Missing store context" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const userId = String(body?.userId ?? "").trim();
    const hourlyRate = Number(body?.hourlyRate);
    const days = Number(body?.days ?? 7);

    if (!userId) {
        return NextResponse.json({ ok: false, message: "Missing userId" }, { status: 400 });
    }
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
        return NextResponse.json({ ok: false, message: "Invalid hourly rate" }, { status: 400 });
    }
    if (![7, 14].includes(days)) {
        return NextResponse.json({ ok: false, message: "days must be 7 or 14" }, { status: 400 });
    }

    // Resolve store
    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    // Resolve user — must belong to this store
    const user = await prisma.user.findFirst({
        where: { id: userId, storeId: store.id },
        select: { id: true, employeeId: true, fullName: true, isActive: true },
    });
    if (!user) {
        return NextResponse.json({ ok: false, message: "Employee not found" }, { status: 404 });
    }

    // Period window
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const punches = await prisma.timePunch.findMany({
        where: { userId: user.id, at: { gte: periodStart } },
        orderBy: { at: "asc" },
        select: { id: true, type: true, at: true },
    });

    if (punches.length === 0) {
        return NextResponse.json({ ok: false, message: "No punches found for this period" }, { status: 409 });
    }

    const totalMs = sumWorkedMs(punches, now);
    const hoursWorked = totalMs / 3600000;
    const totalPaid = Math.round(hoursWorked * hourlyRate * 100) / 100;
    const employeeName = user.fullName?.trim() || user.employeeId;

    // Transaction: log payment + delete punches
    await prisma.$transaction([
        prisma.paymentLog.create({
            data: {
                storeId: store.id,
                userId: user.id,
                employeeId: user.employeeId,
                employeeName,
                periodStart,
                periodEnd: now,
                hoursWorked,
                hourlyRate,
                totalPaid,
                paidByManager: managerEmployeeId ?? "unknown",
            },
        }),
        prisma.timePunch.deleteMany({
            where: {
                userId: user.id,
                at: { gte: periodStart },
            },
        }),
    ]);

    return NextResponse.json({
        ok: true,
        receipt: {
            employeeName,
            employeeId: user.employeeId,
            hoursWorked: Math.round(hoursWorked * 100) / 100,
            hourlyRate,
            totalPaid,
            periodStart: periodStart.toISOString(),
            periodEnd: now.toISOString(),
        },
    });
}
