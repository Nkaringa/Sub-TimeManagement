import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCookie(cookieHeader: string, name: string) {
    const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}

function normalizePhone(phone: string) {
    const digits = String(phone ?? "").replace(/\D/g, "");
    return digits.length ? digits : "";
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * PATCH /api/manager/employeeinfo/:userId
 * Allows manager to update EMPLOYEE fields for their store.
 * Safe defaults:
 * - Only affects users in the manager's store
 * - Does NOT allow editing MANAGER accounts (you can relax later if needed)
 * - Does NOT allow manager to deactivate themselves
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ userId: string }> },
) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const session = getCookie(cookieHeader, "session");
    const role = getCookie(cookieHeader, "role");
    const storeCode = getCookie(cookieHeader, "storeCode");
    const requesterEmployeeId = getCookie(cookieHeader, "employeeId"); // manager's employeeId

    if (session !== "logged_in") {
        return NextResponse.json(
            { ok: false, message: "Not logged in" },
            { status: 401 },
        );
    }
    if (role !== "MANAGER") {
        return NextResponse.json(
            { ok: false, message: "Forbidden" },
            { status: 403 },
        );
    }
    if (!storeCode) {
        return NextResponse.json(
            { ok: false, message: "Missing store context" },
            { status: 400 },
        );
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json(
            { ok: false, message: "Store not found" },
            { status: 404 },
        );
    }

    const { userId } = await params;
    if (!userId) {
        return NextResponse.json(
            { ok: false, message: "Missing userId" },
            { status: 400 },
        );
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
        return NextResponse.json(
            { ok: false, message: "Invalid email format" },
            { status: 400 },
        );
    }

    // Find target user inside THIS store only
    const target = await prisma.user.findFirst({
        where: { id: userId, storeId: store.id },
        select: { id: true, role: true, employeeId: true },
    });

    if (!target) {
        return NextResponse.json(
            { ok: false, message: "User not found" },
            { status: 404 },
        );
    }

    // ✅ Safer default: do NOT allow manager to edit MANAGER accounts from this screen
    if (target.role === "MANAGER") {
        return NextResponse.json(
            {
                ok: false,
                message: "Managers cannot edit manager accounts from this page.",
            },
            { status: 403 },
        );
    }

    // ✅ Prevent self-deactivation (even if somehow manager is editing themselves)
    if (
        requesterEmployeeId &&
        target.employeeId === requesterEmployeeId &&
        isActive === false
    ) {
        return NextResponse.json(
            { ok: false, message: "You cannot deactivate your own account." },
            { status: 403 },
        );
    }

    const updated = await prisma.user.update({
        where: { id: target.id },
        data: {
            fullName: fullNameRaw, // store empty string if blank is fine (schema default "")
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

/**
 * DELETE /api/manager/employeeinfo/:userId
 * Soft-delete (deactivate) with typed confirmation.
 * Safe defaults:
 * - Only affects users in the manager's store
 * - Cannot delete MANAGER accounts
 * - Cannot delete self
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ userId: string }> },
) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const session = getCookie(cookieHeader, "session");
    const role = getCookie(cookieHeader, "role");
    const storeCode = getCookie(cookieHeader, "storeCode");
    const requesterEmployeeId = getCookie(cookieHeader, "employeeId");

    if (session !== "logged_in") {
        return NextResponse.json(
            { ok: false, message: "Not logged in" },
            { status: 401 },
        );
    }
    if (role !== "MANAGER") {
        return NextResponse.json(
            { ok: false, message: "Forbidden" },
            { status: 403 },
        );
    }
    if (!storeCode) {
        return NextResponse.json(
            { ok: false, message: "Missing store context" },
            { status: 400 },
        );
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true },
    });
    if (!store) {
        return NextResponse.json(
            { ok: false, message: "Store not found" },
            { status: 404 },
        );
    }

    const { userId } = await params;
    if (!userId) {
        return NextResponse.json(
            { ok: false, message: "Missing userId" },
            { status: 400 },
        );
    }

    const body = await req.json().catch(() => null);
    const confirmText = String(body?.confirmName ?? "").trim();

    const user = await prisma.user.findFirst({
        where: { id: userId, storeId: store.id },
        select: {
            id: true,
            fullName: true,
            employeeId: true,
            role: true,
            isActive: true,
        },
    });

    if (!user) {
        return NextResponse.json(
            { ok: false, message: "User not found" },
            { status: 404 },
        );
    }

    // ✅ Do not allow deleting managers from this page (safer)
    if (user.role === "MANAGER") {
        return NextResponse.json(
            { ok: false, message: "Cannot delete a manager from this page." },
            { status: 403 },
        );
    }

    // ✅ Prevent self-delete
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

    // Check if employee is currently clocked in (last punch = IN)
    const lastPunch = await prisma.timePunch.findFirst({
        where: { userId: user.id },
        orderBy: { at: "desc" },
        select: { type: true },
    });

    // Soft delete + auto clock-out if currently IN, all in one transaction
    await prisma.$transaction(async (tx) => {
        if (lastPunch?.type === "IN") {
            await tx.timePunch.create({
                data: {
                    userId: user.id,
                    storeId: store.id,
                    type: "OUT",
                },
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
