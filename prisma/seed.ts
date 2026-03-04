import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function mustEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

async function upsertSuperAdmin(adminId: string, pin: string) {
    const pinHash = await bcrypt.hash(pin, 10);

    await prisma.superAdmin.upsert({
        where: { adminId },
        update: { pinHash, isActive: true },
        create: { adminId, pinHash, isActive: true },
    });
}

async function main() {
    // Stores
    const store101 = await prisma.store.upsert({
        where: { code: "101" },
        update: { name: "Michigan" },
        create: { code: "101", name: "Michigan" },
    });

    const store102 = await prisma.store.upsert({
        where: { code: "102" },
        update: { name: "New York" },
        create: { code: "102", name: "New York" },
    });

    // Users (demo PINs — change later)
    const managerPin = await bcrypt.hash("1234", 10);
    const employeePin = await bcrypt.hash("1234", 10);

    await prisma.user.upsert({
        where: { storeId_employeeId: { storeId: store101.id, employeeId: "101-MGR1" } },
        update: { role: Role.MANAGER, pinHash: managerPin, isActive: true, fullName: "Alex Manager" },
        create: {
            storeId: store101.id,
            employeeId: "101-MGR1",
            fullName: "Alex Manager",
            pinHash: managerPin,
            role: Role.MANAGER,
            phone: "0000000000",
            email: "manager101@example.com",
            isActive: true,
        },
    });

    await prisma.user.upsert({
        where: { storeId_employeeId: { storeId: store101.id, employeeId: "101-0007" } },
        update: { role: Role.EMPLOYEE, pinHash: employeePin, isActive: true, fullName: "John Employee" },
        create: {
            storeId: store101.id,
            employeeId: "101-0007",
            fullName: "John Employee",
            pinHash: employeePin,
            role: Role.EMPLOYEE,
            phone: "0000000000",
            email: "employee101@example.com",
            isActive: true,
        },
    });

    // ✅ Global SuperAdmins (no store linkage)
    await upsertSuperAdmin(mustEnv("SUPERADMIN_1_ID"), mustEnv("SUPERADMIN_1_PIN"));
    await upsertSuperAdmin(mustEnv("SUPERADMIN_2_ID"), mustEnv("SUPERADMIN_2_PIN"));

    console.log("✅ Seed complete");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });