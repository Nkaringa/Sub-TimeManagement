import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCookie(cookieHeader: string, name: string) {
    const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}




export async function GET() {
    const stores = await prisma.store.findMany({
        select: { code: true, name: true, isOpen: true },
        orderBy: { code: "asc" },
    });

    return NextResponse.json({ ok: true, stores }, { status: 200 });
}

export async function POST(req: Request) {
    // Only SUPERADMIN should be able to create stores
    const cookieHeader = req.headers.get("cookie") ?? "";
    const session = getCookie(cookieHeader, "session");
    const role = getCookie(cookieHeader, "role");

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "SUPERADMIN") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);

    const code = String(body?.code ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const isOpen = body?.isOpen === false ? false : true;

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
        data: { code, name, isOpen },
        select: { code: true, name: true, isOpen: true },
    });

    return NextResponse.json({ ok: true, store }, { status: 201 });

}

export async function PATCH(req: Request) {
    // MANAGER can toggle ONLY their store. SUPERADMIN can toggle any store.
    const cookieHeader = req.headers.get("cookie") ?? "";
    const session = getCookie(cookieHeader, "session");
    const role = getCookie(cookieHeader, "role");
    const cookieStoreCode = getCookie(cookieHeader, "storeCode");

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

        // If we returned a NextResponse error from inside transaction
        // @ts-ignore
        if (result?.error) return result.error;

        // @ts-ignore
        return NextResponse.json(
            { ok: true, store: result.updated, autoClockedOut: result.autoClockedOut },
            { status: 200 }
        );
    } catch {
        return NextResponse.json({ ok: false, message: "Failed to update store status." }, { status: 500 });
    }
}

