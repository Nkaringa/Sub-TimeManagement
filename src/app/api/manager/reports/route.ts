import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCookie(cookieHeader: string, name: string) {
  const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function clampDate(d: Date, min: Date, max: Date) {
  const t = d.getTime();
  return new Date(Math.min(Math.max(t, min.getTime()), max.getTime()));
}
function sumHoursFromPunches(
  punches: Array<{ type: string; at: Date }>,
  rangeStart: Date,
  rangeEnd: Date,
) {
  // assumes punches already sorted by at asc
  let totalMs = 0;
  let currentIn: Date | null = null;

  for (const p of punches) {
    if (p.type === "IN") {
      // ignore repeated IN while already IN
      if (!currentIn) currentIn = p.at;
    } else if (p.type === "OUT") {
      if (currentIn) {
        const a = clampDate(currentIn, rangeStart, rangeEnd);
        const b = clampDate(p.at, rangeStart, rangeEnd);
        totalMs += Math.max(0, b.getTime() - a.getTime());
        currentIn = null;
      }
    }
  }

  // If still IN by end of list, cap to rangeEnd
  if (currentIn) {
    const a = clampDate(currentIn, rangeStart, rangeEnd);
    const b = rangeEnd;
    totalMs += Math.max(0, b.getTime() - a.getTime());
  }

  return totalMs / (1000 * 60 * 60);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days") ?? "7");
  const days = daysParam === 14 ? 14 : 7;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const session = getCookie(cookieHeader, "session");
  const role = getCookie(cookieHeader, "role");
  const storeCode = getCookie(cookieHeader, "storeCode");

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
    select: { id: true, code: true, name: true },
  });
  if (!store) {
    return NextResponse.json(
      { ok: false, message: "Store not found" },
      { status: 404 },
    );
  }

  const now = new Date();
  const rangeEnd = now;
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));
  rangeStart.setHours(0, 0, 0, 0);

  // Employees in this store
  const employees = await prisma.user.findMany({
    where: { storeId: store.id, role: "EMPLOYEE", isActive: true },
    select: { id: true, employeeId: true, fullName: true, createdAt: true },
    orderBy: { employeeId: "asc" },
  });

  const employeeIds = employees.map((e) => e.id);

  // All punches in range for these employees
  const punches = await prisma.timePunch.findMany({
    where: {
      storeId: store.id,
      userId: { in: employeeIds },
      at: { gte: rangeStart, lte: rangeEnd },
    },
    orderBy: [{ userId: "asc" }, { at: "asc" }],
    select: {
      userId: true,
      type: true,
      at: true,
    },
  });

  // Group punches by userId
  const byUser = new Map<string, Array<{ type: string; at: Date }>>();
  for (const p of punches) {
    if (!byUser.has(p.userId)) byUser.set(p.userId, []);
    byUser.get(p.userId)!.push({ type: p.type, at: p.at });
  }

  const rows = employees.map((e) => {
    const list = byUser.get(e.id) ?? [];
    const totalHours = sumHoursFromPunches(list, rangeStart, rangeEnd);

    const lastPunch = list.length ? list[list.length - 1] : null;
    const isMissingOut = (() => {
      if (!lastPunch) return false;
      return lastPunch.type === "IN"; // last punch in range is IN
    })();

    return {
      userId: e.id,
      employeeId: e.employeeId,
      fullName: e.fullName?.trim() ? e.fullName : null,
      totalHours: Number(totalHours.toFixed(2)),
      missingOut: isMissingOut,
      punches: list.map((p) => ({ type: p.type, at: p.at.toISOString() })),
    };
  });

  const totalHoursAll = Number(
    rows.reduce((acc, r) => acc + (r.totalHours || 0), 0).toFixed(2),
  );
  const totalPunches = punches.length;
  const missingOutCount = rows.filter((r) => r.missingOut).length;

  return NextResponse.json(
    {
      ok: true,
      store: { code: store.code, name: store.name },
      range: {
        days,
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      },
      summary: {
        employees: rows.length,
        totalPunches,
        totalHoursAll,
        missingOutCount,
      },
      rows,
    },
    { status: 200 },
  );
}
