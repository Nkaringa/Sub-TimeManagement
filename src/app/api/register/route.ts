// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

function onlyDigits(s: string) {
    return String(s ?? "").replace(/\D/g, "");
}

function normalizeEmployeeId(storeCode: string, employeeIdRaw: string) {
    const sc = String(storeCode ?? "").trim();
    const raw = String(employeeIdRaw ?? "").trim();

    // If user typed full form like "101-jc01", respect it (but ensure store matches)
    if (raw.includes("-")) {
        const [prefix, rest] = raw.split("-", 2);
        if (!prefix || !rest) return null;
        if (prefix !== sc) return null; // prevent registering into wrong store accidentally
        return `${prefix}-${rest}`; // keep case as typed
    }

    // If user typed "jc01" → "101-jc01"
    if (!raw) return null;
    return `${sc}-${raw}`;
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);

    const storeCode = String(body?.storeId ?? "").trim(); // e.g. "101"
    const roleRaw = String(body?.role ?? "EMPLOYEE").trim();
    const role = roleRaw === "MANAGER" ? Role.MANAGER : Role.EMPLOYEE;

    const fullName = String(body?.fullName ?? "").trim(); // (not stored yet in schema; safe to ignore for now)
    const employeeIdInput = String(body?.employeeId ?? "").trim();

    const phoneDigits = onlyDigits(body?.phone);
    const email = String(body?.email ?? "").trim() || null;

    const ssnDigits = onlyDigits(body?.ssn); // full input from UI
    const pin = String(body?.pin ?? "").trim();

    if (!storeCode) {
        return NextResponse.json({ ok: false, message: "Store number is required." }, { status: 400 });
    }
    if (!employeeIdInput) {
        return NextResponse.json({ ok: false, message: "Employee ID is required." }, { status: 400 });
    }
    if (!fullName) {
        return NextResponse.json({ ok: false, message: "Full name is required." }, { status: 400 });
    }
    if (!/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ ok: false, message: "PIN must be 4–6 digits." }, { status: 400 });
    }
    if (phoneDigits.length !== 10) {
        return NextResponse.json({ ok: false, message: "Contact number must be 10 digits." }, { status: 400 });
    }
    if (ssnDigits.length !== 9) {
        return NextResponse.json({ ok: false, message: "SSN must be 9 digits." }, { status: 400 });
    }

    const employeeId = normalizeEmployeeId(storeCode, employeeIdInput);
    if (!employeeId) {
        return NextResponse.json(
            { ok: false, message: "Employee ID format invalid for selected store." },
            { status: 400 }
        );
    }

    const store = await prisma.store.findUnique({ where: { code: storeCode } });
    if (!store) {
        return NextResponse.json({ ok: false, message: "Store not found." }, { status: 400 });
    }

    // Enforce "max 2 managers per store"
    if (role === Role.MANAGER) {
        const mgrCount = await prisma.user.count({
            where: { storeId: store.id, role: Role.MANAGER, isActive: true },
        });

        if (mgrCount >= 2) {
            return NextResponse.json(
                { ok: false, message: "This store already has the maximum number of managers." },
                { status: 409 }
            );
        }
    }

    // Check if employeeId already exists in this store
    const existing = await prisma.user.findUnique({
        where: { storeId_employeeId: { storeId: store.id, employeeId } },
    });

    if (existing) {
        return NextResponse.json(
            { ok: false, message: "That Employee ID is already registered for this store." },
            { status: 409 }
        );
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const ssnLast4 = ssnDigits.slice(-4);

    await prisma.user.create({
        data: {
            storeId: store.id,
            employeeId,
            fullName,
            pinHash,
            role,
            phone: phoneDigits, // store digits only
            email,
            ssnLast4,
            isActive: true,
        },
    });

    return NextResponse.json({
        ok: true,
        // after successful account creation, go back to login
        redirectTo: "/login",
        // just helpful for UI debugging
        normalizedEmployeeId: employeeId,
    });
}