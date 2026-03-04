import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const jar = await cookies();

    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";
    const storeCode = jar.get("storeCode")?.value ?? "";
    const managerEmployeeId = jar.get("employeeId")?.value ?? "";

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
        select: { id: true, code: true, name: true, isOpen: true },
    });

    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    // Manager display name (fullName if present)
    let managerFullName: string | null = null;
    if (managerEmployeeId) {
        const mgr = await prisma.user.findUnique({
            where: {
                storeId_employeeId: {
                    storeId: store.id,
                    employeeId: managerEmployeeId,
                },
            },
            select: { fullName: true, employeeId: true },
        });

        managerFullName = mgr?.fullName ?? null;
    }

    // Total employees (employees only)
    const totalEmployees = await prisma.user.count({
        where: { storeId: store.id, role: "EMPLOYEE", isActive: true },
    });

    // Active employees = latest punch is IN
    const active = await prisma.$queryRaw<Array<{ employeeId: string; at: Date }>>`
    SELECT u."employeeId" as "employeeId", p."at" as "at"
    FROM "User" u
    JOIN LATERAL (
      SELECT tp."type", tp."at"
      FROM "TimePunch" tp
      WHERE tp."userId" = u."id"
      ORDER BY tp."at" DESC
      LIMIT 1
    ) p ON true
    WHERE u."storeId" = ${store.id}
      AND u."role" = 'EMPLOYEE'
      AND u."isActive" = true
      AND p."type" = 'IN'
    ORDER BY p."at" DESC;
  `;

    const clockedIn = active.length;
    const clockedOut = Math.max(0, totalEmployees - clockedIn);

    return NextResponse.json(
        {
            ok: true,
            manager: {
                employeeId: managerEmployeeId || null,
                fullName: managerFullName,
            },
            store: { code: store.code, name: store.name, isOpen: store.isOpen },
            totals: { totalEmployees, clockedIn, clockedOut },
            active: active.map((a) => ({
                employeeId: a.employeeId,
                since: a.at.toISOString(),
            })),
        },
        { status: 200 }
    );
}