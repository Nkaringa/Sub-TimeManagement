import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
    const jar = await cookies();
    const session = jar.get("session")?.value ?? "";
    const role = jar.get("role")?.value ?? null;
    const employeeId = jar.get("employeeId")?.value ?? null;
    const storeCode = jar.get("storeCode")?.value ?? null;

    if (session !== "logged_in") {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json(
        { ok: true, role, employeeId, storeCode },
        { status: 200 }
    );
}
