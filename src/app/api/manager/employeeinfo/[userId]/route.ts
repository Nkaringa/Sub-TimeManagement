import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function normalizePhone(phone: string) {
    const digits = String(phone ?? "").replace(/\D/g, "");
    return digits.length ? digits : "";
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getManagerContext() {
    const jar = await cookies();
    return {
        session: jar.get("session")?.value ?? "",
        role: jar.get("role")?.value ?? "",
        storeCode: jar.get("storeCode")?.value ?? "",
        requesterEmployeeId: jar.get("employeeId")?.value ?? "",
    };
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ userId: string }> },
) {
    const { session, role, storeCode, requesterEmployeeId } = await getManagerContext();

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
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    const { userId } = await params;
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Missing userId" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);

    const fullNameRaw = String(body?.fullName ?? "").trim();
    const emailRaw = String(body?.email ?? "").trim();
    const phoneRaw = String(body?.phone ?? "").trim();
    const isActive =
        typeof body?.isActive === "boolean" ? body.isActive : undefined;

    const email = emailRaw.length ? emailRaw : null;
    const phoneDigits = phoneRaw.length ? normalizePhone(phoneRaw) : "";
    const phone = phoneDigits.length ? phoneDigits : null;

    if (email && !isValidEmail(email)) {
        return NextResponse.json({ ok: false, message: "Invalid email format" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
        where: { id: userId, storeId: store.id },
        select: { id: true, role: true, employeeId: true },
    });

    if (!target) {
        return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    if (target.role === "MANAGER") {
        return NextResponse.json(
            { ok: false, message: "Managers cannot edit manager accounts from this page." },
            { status: 403 },
        );
    }

    if (requesterEmployeeId && target.employeeId === requesterEmployeeId && isActive === false) {
        return NextResponse.json(
            { ok: false, message: "You cannot deactivate your own account." },
            { status: 403 },
        );
    }

    const updated = await prisma.user.update({
        where: { id: target.id },
        data: {
            fullName: fullNameRaw,
            email,
            phone,
            ...(isActive === undefined ? {} : { isActive }),
        },
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

    return NextResponse.json({ ok: true, user: updated }, { status: 200 });
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ userId: string }> },
) {
    const { session, role, storeCode, requesterEmployeeId } = await getManagerContext();

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
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });
    }

    const { userId } = await params;
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Missing userId" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const confirmText = String(body?.confirmName ?? "").trim();

    const user = await prisma.user.findFirst({
        where: { id: userId, storeId: store.id },
        select: { id: true, fullName: true, employeeId: true, role: true, isActive: true },
    });

    if (!user) {
        return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    if (user.role === "MANAGER") {
        return NextResponse.json(
            { ok: false, message: "Cannot delete a manager from this page." },
            { status: 403 },
        );
    }

    if (requesterEmployeeId && user.employeeId === requesterEmployeeId) {
        return NextResponse.json(
            { ok: false, message: "You cannot delete your own account." },
            { status: 403 },
        );
    }

    const expected = (user.fullName?.trim() || user.employeeId).trim();
    if (confirmText !== expected) {
        return NextResponse.json(
            { ok: false, message: `Type exactly: ${expected}` },
            { status: 409 },
        );
    }

    const lastPunch = await prisma.timePunch.findFirst({
        where: { userId: user.id },
        orderBy: { at: "desc" },
        select: { type: true },
    });

    await prisma.$transaction(async (tx) => {
        if (lastPunch?.type === "IN") {
            await tx.timePunch.create({
                data: { userId: user.id, storeId: store.id, type: "OUT" },
            });
        }
        await tx.user.update({
            where: { id: user.id },
            data: { isActive: false },
        });
    });

    return NextResponse.json(
        { ok: true, autoClockOut: lastPunch?.type === "IN" },
        { status: 200 },
    );
}
