import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function startOfWeekMonday(d: Date) {
    const day = d.getDay(); // 0 Sun, 1 Mon...
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function sumHoursFromPunches(punches: Array<{ type: string; at: Date }>, endCap: Date) {
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

    return totalMs / (1000 * 60 * 60);
}

export async function GET() {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? "";
    const storeCode = jar.get("storeCode")?.value ?? "";
    const employeeId = jar.get("employeeId")?.value ?? "";

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
    }
    if (role !== "EMPLOYEE") {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    if (!storeCode || !employeeId) {
        return NextResponse.json({ ok: false, message: "Missing store/employee context" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
        where: { code: storeCode },
        select: { id: true, code: true, isOpen: true },
    });
    if (!store) return NextResponse.json({ ok: false, message: "Store not found" }, { status: 404 });

    const user = await prisma.user.findUnique({
        where: { storeId_employeeId: { storeId: store.id, employeeId } },
        select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
        return NextResponse.json({ ok: false, message: "User not found/inactive" }, { status: 404 });
    }

    const now = new Date();
    const weekStart = startOfWeekMonday(now);
    const biweeklyStart = new Date(weekStart);
    biweeklyStart.setDate(biweeklyStart.getDate() - 7);

    const punches = await prisma.timePunch.findMany({
        where: { userId: user.id, at: { gte: biweeklyStart } },
        orderBy: { at: "asc" },
        select: { type: true, at: true },
    });

    const lastWeekPunches = punches.filter((p) => p.at < weekStart);
    const thisWeekPunches = punches.filter((p) => p.at >= weekStart);

    const lastWeekHours = sumHoursFromPunches(lastWeekPunches, weekStart);
    const thisWeekHours = sumHoursFromPunches(thisWeekPunches, now);
    const biweeklyHours = lastWeekHours + thisWeekHours;

    const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    const daily = days.map((dayStart) => {
        const nextDay = new Date(dayStart);
        nextDay.setDate(nextDay.getDate() + 1);

        const dayEndCap = nextDay.getTime() < now.getTime() ? nextDay : now;
        const dayPunches = thisWeekPunches.filter((p) => p.at >= dayStart && p.at < nextDay);

        const hours = sumHoursFromPunches(dayPunches, dayEndCap);

        const mm = String(dayStart.getMonth() + 1).padStart(2, "0");
        const dd = String(dayStart.getDate()).padStart(2, "0");
        const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayStart.getDay()];

        return { day: weekday, date: `${mm}/${dd}`, hours: Number(hours.toFixed(1)) };
    });

    return NextResponse.json(
        {
            ok: true,
            store: { code: store.code, isOpen: store.isOpen },
            hours: {
                thisWeek: Number(thisWeekHours.toFixed(1)),
                lastWeek: Number(lastWeekHours.toFixed(1)),
                biWeekly: Number(biweeklyHours.toFixed(1)),
            },
            daily,
        },
        { status: 200 }
    );
}