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

const STORES: { code: string; name: string }[] = [
    { code: "774",   name: "Downtown, KY" },
    { code: "1135",  name: "Ann Arbor, MI" },
    { code: "1419",  name: "Traverse City, MI" },
    { code: "1478",  name: "Grand Rapids, MI" },
    { code: "1607",  name: "Charlotte, NC" },
    { code: "1683",  name: "Wyoming, MI" },
    { code: "1822",  name: "West Avenue, MI" },
    { code: "2072",  name: "Traverse City, MI" },
    { code: "2767",  name: "Lexington, KY" },
    { code: "3250",  name: "Danville, KY" },
    { code: "3382",  name: "Jenison, MI" },
    { code: "3981",  name: "Grand Rapids, MI" },
    { code: "4252",  name: "Big Rapids, MI" },
    { code: "4316",  name: "1010 E. Michigan, Saline, MI" },
    { code: "5076",  name: "Washtenaw, MI" },
    { code: "5150",  name: "Packard, MI" },
    { code: "5614",  name: "Laurinburg, NC" },
    { code: "6128",  name: "Lansing, MI" },
    { code: "6196",  name: "Michigan Center, MI" },
    { code: "6525",  name: "Versailles, KY" },
    { code: "6885",  name: "68th St. Subway, MI" },
    { code: "7404",  name: "Chillicothe, IL" },
    { code: "7442",  name: "Okemos, MI" },
    { code: "7842",  name: "Grand Ledge, MI" },
    { code: "7897",  name: "Haslett, MI" },
    { code: "10061", name: "Plymouth, MI" },
    { code: "10267", name: "Lexington, KY" },
    { code: "10353", name: "Lansing, MI" },
    { code: "11221", name: "Hagerstown, IN" },
    { code: "11405", name: "Livonia, MI" },
    { code: "11992", name: "Balch Springs, TX" },
    { code: "12272", name: "Brooklyn, MI" },
    { code: "12556", name: "Fulton St. Subway, MI" },
    { code: "12623", name: "Broadway, TX" },
    { code: "12716", name: "Airport Road, MI" },
    { code: "12940", name: "Allendale, MI" },
    { code: "12997", name: "Lowell, MI" },
    { code: "13630", name: "Vandercook, MI" },
    { code: "14123", name: "Fortville, IN" },
    { code: "14544", name: "Morrell St., MI" },
    { code: "14786", name: "Jamestown, NC" },
    { code: "14831", name: "Clinton, MI" },
    { code: "15447", name: "Ann Arbor, MI" },
    { code: "16690", name: "Seven Lakes, NC" },
    { code: "16871", name: "Livonia, MI" },
    { code: "17399", name: "Eaton Rapids, MI" },
    { code: "17428", name: "Nicholasville, KY" },
    { code: "18616", name: "Westland, MI" },
    { code: "19401", name: "Vass, NC" },
    { code: "22393", name: "Lancaster, KY" },
    { code: "22786", name: "Parnall Road, MI" },
    { code: "23626", name: "Laingsburg, MI" },
    { code: "25236", name: "North Park, MI" },
    { code: "25745", name: "Dayton, OH" },
    { code: "27265", name: "Kettering, OH" },
    { code: "27710", name: "Lansing, MI" },
    { code: "28105", name: "WalMart, OH" },
    { code: "28680", name: "Chums Corners, MI" },
    { code: "28735", name: "Lexington, KY" },
    { code: "29078", name: "Livonia, MI" },
    { code: "30209", name: "Lexington, KY" },
    { code: "30682", name: "Indianapolis, IN" },
    { code: "31990", name: "Belding, MI" },
    { code: "32895", name: "Kingsley, MI" },
    { code: "33764", name: "Nicholasville, KY" },
    { code: "33864", name: "Cleveland, NC" },
    { code: "34071", name: "Granite Quarry, NC" },
    { code: "34105", name: "Peoria, IL, Wal-Mart Allen Rd" },
    { code: "34755", name: "Lansing, MI" },
    { code: "34886", name: "Laurinburg, NC" },
    { code: "34955", name: "Charlotte, MI" },
    { code: "35023", name: "Walmart Jxn, MI" },
    { code: "36822", name: "Danville, KY" },
    { code: "36950", name: "Interlochen, MI" },
    { code: "39725", name: "Lansing, MI" },
    { code: "44951", name: "Fishers, IN" },
    { code: "45532", name: "Grand Rapids, MI" },
    { code: "45655", name: "Hudsonville, MI" },
    { code: "49752", name: "Shell Drive-thru" },
    { code: "49849", name: "Laurel Hill, NC" },
    { code: "49927", name: "Lansing, MI" },
    { code: "50515", name: "Metro Subway" },
    { code: "51384", name: "Mattawan, MI" },
    { code: "51859", name: "Clemmons, NC" },
    { code: "52155", name: "Moscow Road, MI" },
    { code: "52438", name: "Terre Haute, IN" },
    { code: "54606", name: "Subway 54606, MI" },
    { code: "54743", name: "Subway54743, KY" },
    { code: "55589", name: "Ovid, MI" },
    { code: "56130", name: "Huber Heights, OH" },
    { code: "56263", name: "Wilmington, OH" },
    { code: "58124", name: "Grandville, MI" },
    { code: "58549", name: "Charlotte, NC" },
    { code: "60316", name: "Lake June, TX" },
    { code: "64739", name: "Mesquite, TX" },
    { code: "66420", name: "Wyoming, MI" },
    { code: "71988", name: "KY Store #71988" },
    { code: "72412", name: "KY Store #72412" },
];

async function main() {
    // Clear all store-linked data (SuperAdmin table is untouched)
    await prisma.timePunch.deleteMany({});
    await prisma.user.deleteMany({});
    // RegisteredDevice table exists in DB from a prior migration but not in current schema — delete via raw SQL
    await prisma.$executeRawUnsafe(`DELETE FROM "RegisteredDevice"`);
    await prisma.store.deleteMany({});

    // Hash default PIN once for all primary managers
    const defaultPin = await bcrypt.hash("1234", 10);

    // Seed all 98 stores + one primary manager per store
    for (const s of STORES) {
        const store = await prisma.store.upsert({
            where: { code: s.code },
            update: { name: s.name },
            create: { code: s.code, name: s.name },
        });

        await prisma.user.upsert({
            where: { storeId_employeeId: { storeId: store.id, employeeId: `${s.code}-MGR` } },
            update: { role: Role.MANAGER, pinHash: defaultPin, isActive: true, fullName: "Primary Manager" },
            create: {
                storeId: store.id,
                employeeId: `${s.code}-MGR`,
                fullName: "Primary Manager",
                pinHash: defaultPin,
                role: Role.MANAGER,
                isActive: true,
            },
        });
    }

    // SuperAdmins (from environment variables — unchanged)
    await upsertSuperAdmin(mustEnv("SUPERADMIN_1_ID"), mustEnv("SUPERADMIN_1_PIN"));
    await upsertSuperAdmin(mustEnv("SUPERADMIN_2_ID"), mustEnv("SUPERADMIN_2_PIN"));

    console.log(`✅ Seed complete — ${STORES.length} stores + ${STORES.length} primary managers`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
