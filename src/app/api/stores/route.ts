import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const stores = await prisma.store.findMany({
        where: { isActive: true },
        select: { code: true, name: true, isOpen: true },
        orderBy: { code: "asc" },
    });

    return NextResponse.json({ ok: true, stores }, { status: 200 });
}

export async function POST(req: Request) {
    // Only SUPERADMIN can create stores
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const code = String(body?.code ?? "").trim();
    const name = String(body?.name ?? "").trim();

    if (!code) {
        return NextResponse.json({ ok: false, message: "Store code is required." }, { status: 400 });
    }
    if (!name) {
        return NextResponse.json({ ok: false, message: "Store name is required." }, { status: 400 });
    }

    const existing = await prisma.store.findUnique({ where: { code } });
    if (existing) {
        return NextResponse.json({ ok: false, message: `Store ${code} already exists.` }, { status: 409 });
    }

    const store = await prisma.store.create({
        data: { code, name, isOpen: true },
        select: { code: true, name: true, isOpen: true },
    });

    return NextResponse.json({ ok: true, store }, { status: 201 });
}

export async function PATCH(req: Request) {
    // MANAGER can toggle ONLY their store. SUPERADMIN can toggle any store.
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";
    const cookieStoreCode = jar.get("storeCode")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "MANAGER" && role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const code = String(body?.code ?? "").trim();

    if (!code) {
        return NextResponse.json({ ok: false, message: "Store code is required." }, { status: 400 });
    }
    if (typeof body?.isOpen !== "boolean") {
        return NextResponse.json({ ok: false, message: "isOpen must be boolean." }, { status: 400 });
    }

    // Managers can only toggle their own store
    if (role === "MANAGER" && cookieStoreCode && cookieStoreCode !== code) {
        return NextResponse.json({ ok: false, message: "Managers can only update their own store." }, { status: 403 });
    }

    const nextIsOpen = Boolean(body.isOpen);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.store.findUnique({
                where: { code },
                select: { id: true, code: true, name: true, isOpen: true },
            });

            if (!existing) {
                return { error: NextResponse.json({ ok: false, message: "Store not found." }, { status: 404 }) };
            }

            // If closing store: auto clock-out all currently IN employees
            let autoClockedOut = 0;

            if (existing.isOpen && !nextIsOpen) {
                const activeUsers = await tx.$queryRaw<Array<{ userId: string }>>`
                    SELECT u."id" as "userId"
                    FROM "User" u
                    JOIN LATERAL (
                        SELECT tp."type", tp."at"
                        FROM "TimePunch" tp
                        WHERE tp."userId" = u."id"
                        ORDER BY tp."at" DESC
                        LIMIT 1
                    ) p ON true
                    WHERE u."storeId" = ${existing.id}
                      AND u."role" = 'EMPLOYEE'
                      AND u."isActive" = true
                      AND p."type" = 'IN'
                `;

                if (activeUsers.length > 0) {
                    const now = new Date();
                    await tx.timePunch.createMany({
                        data: activeUsers.map((u) => ({
                            storeId: existing.id,
                            userId: u.userId,
                            type: "OUT",
                            at: now,
                        })),
                    });
                    autoClockedOut = activeUsers.length;
                }
            }

            const updated = await tx.store.update({
                where: { code },
                data: { isOpen: nextIsOpen },
                select: { code: true, name: true, isOpen: true },
            });

            return { updated, autoClockedOut };
        });

        if ("error" in result) return result.error;

        return NextResponse.json(
            { ok: true, store: result.updated, autoClockedOut: result.autoClockedOut },
            { status: 200 }
        );
    } catch {
        return NextResponse.json({ ok: false, message: "Failed to update store status." }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    // SUPERADMIN only — edit store name
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const code = String(body?.code ?? "").trim();
    const name = String(body?.name ?? "").trim();

    if (!code) {
        return NextResponse.json({ ok: false, message: "Store code is required." }, { status: 400 });
    }
    if (!name) {
        return NextResponse.json({ ok: false, message: "Store name is required." }, { status: 400 });
    }

    const existing = await prisma.store.findUnique({
        where: { code },
        select: { isActive: true },
    });

    if (!existing || !existing.isActive) {
        return NextResponse.json({ ok: false, message: "Store not found." }, { status: 404 });
    }

    const updated = await prisma.store.update({
        where: { code },
        data: { name },
        select: { code: true, name: true, isOpen: true },
    });

    return NextResponse.json({ ok: true, store: updated }, { status: 200 });
}

export async function DELETE(req: Request) {
    // SUPERADMIN only — soft-delete a store
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const code = String(body?.code ?? "").trim();

    if (!code) {
        return NextResponse.json({ ok: false, message: "Store code is required." }, { status: 400 });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const store = await tx.store.findUnique({
                where: { code },
                select: { id: true, isActive: true, isOpen: true },
            });

            if (!store || !store.isActive) {
                return { error: NextResponse.json({ ok: false, message: "Store not found." }, { status: 404 }) };
            }

            // If store is open, auto clock-out all active employees first
            if (store.isOpen) {
                const activeUsers = await tx.$queryRaw<Array<{ userId: string }>>`
                    SELECT u."id" as "userId"
                    FROM "User" u
                    JOIN LATERAL (
                        SELECT tp."type"
                        FROM "TimePunch" tp
                        WHERE tp."userId" = u."id"
                        ORDER BY tp."at" DESC
                        LIMIT 1
                    ) p ON true
                    WHERE u."storeId" = ${store.id}
                      AND u."role" = 'EMPLOYEE'
                      AND u."isActive" = true
                      AND p."type" = 'IN'
                `;

                if (activeUsers.length > 0) {
                    const now = new Date();
                    await tx.timePunch.createMany({
                        data: activeUsers.map((u) => ({
                            storeId: store.id,
                            userId: u.userId,
                            type: "OUT",
                            at: now,
                        })),
                    });
                }
            }

            // Deactivate all employees in this store
            await tx.user.updateMany({
                where: { storeId: store.id, isActive: true },
                data: { isActive: false },
            });

            // Soft-delete the store
            await tx.store.update({
                where: { code },
                data: { isOpen: false, isActive: false },
            });

            return { ok: true };
        });

        if ("error" in result) return result.error;

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch {
        return NextResponse.json({ ok: false, message: "Failed to remove store." }, { status: 500 });
    }
}
