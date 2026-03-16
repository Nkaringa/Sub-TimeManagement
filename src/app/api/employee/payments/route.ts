import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";
    const storeCode = jar.get("storeCode")?.value ?? "";
    const employeeId = jar.get("employeeId")?.value ?? "";

    if (session !== "logged_in" || role !== "EMPLOYEE") {
        return NextResponse.json({ ok: false }, { status: 401 });
    }
    if (!storeCode || !employeeId) {
        return NextResponse.json({ ok: false, message: "Missing context" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    // Find the most recent payment for this employee in this store (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const payments = await prisma.paymentLog.findMany({
        where: {
            storeId: store.id,
            employeeId,
            paidAt: { gte: since },
        },
        orderBy: { paidAt: "desc" },
        take: 5,
        select: {
            id: true,
            employeeName: true,
            employeeId: true,
            hoursWorked: true,
            hourlyRate: true,
            totalPaid: true,
            periodStart: true,
            periodEnd: true,
            paidAt: true,
        },
    });

    return NextResponse.json({
        ok: true,
        payments: payments.map((p) => ({
            id: p.id,
            employeeName: p.employeeName,
            employeeId: p.employeeId,
            hoursWorked: Math.round(p.hoursWorked * 100) / 100,
            hourlyRate: p.hourlyRate,
            totalPaid: p.totalPaid,
            periodStart: p.periodStart.toISOString(),
            periodEnd: p.periodEnd.toISOString(),
            paidAt: p.paidAt.toISOString(),
        })),
    });
}
