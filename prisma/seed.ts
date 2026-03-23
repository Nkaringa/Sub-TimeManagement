import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const stores: { code: string; name: string; timezone: string }[] = [
  { code: "774",   name: "Downtown, KY",                      timezone: "America/New_York" },
  { code: "1135",  name: "Ann Arbor, MI",                     timezone: "America/New_York" },
  { code: "1419",  name: "Traverse City, MI",                 timezone: "America/New_York" },
  { code: "1478",  name: "Grand Rapids, MI",                  timezone: "America/New_York" },
  { code: "1607",  name: "Charlotte, NC",                     timezone: "America/New_York" },
  { code: "1683",  name: "Wyoming, MI",                       timezone: "America/New_York" },
  { code: "1822",  name: "West Avenue, MI",                   timezone: "America/New_York" },
  { code: "2072",  name: "Traverse City, MI",                 timezone: "America/New_York" },
  { code: "2767",  name: "Lexington, KY",                     timezone: "America/New_York" },
  { code: "3250",  name: "Danville, KY",                      timezone: "America/New_York" },
  { code: "3382",  name: "Jenison, MI",                       timezone: "America/New_York" },
  { code: "3981",  name: "Grand Rapids, MI",                  timezone: "America/New_York" },
  { code: "4252",  name: "Big Rapids, MI",                    timezone: "America/New_York" },
  { code: "4316",  name: "1010 E. Michigan, Saline, MI",      timezone: "America/New_York" },
  { code: "5076",  name: "Washtenaw, MI",                     timezone: "America/New_York" },
  { code: "5150",  name: "Packard, MI",                       timezone: "America/New_York" },
  { code: "5614",  name: "Laurinburg, NC",                    timezone: "America/New_York" },
  { code: "6128",  name: "Lansing, MI",                       timezone: "America/New_York" },
  { code: "6196",  name: "Michigan Center, MI",               timezone: "America/New_York" },
  { code: "6525",  name: "Versailles, KY",                    timezone: "America/New_York" },
  { code: "6885",  name: "68th St. Subway, MI",               timezone: "America/New_York" },
  { code: "7404",  name: "Chillicothe, IL",                   timezone: "America/Chicago"  },
  { code: "7442",  name: "Okemos, MI",                        timezone: "America/New_York" },
  { code: "7842",  name: "Grand Ledge, MI",                   timezone: "America/New_York" },
  { code: "7897",  name: "Haslett, MI",                       timezone: "America/New_York" },
  { code: "10061", name: "Plymouth, MI",                      timezone: "America/New_York" },
  { code: "10267", name: "Lexington, KY",                     timezone: "America/New_York" },
  { code: "10353", name: "Lansing, MI",                       timezone: "America/New_York" },
  { code: "11221", name: "Hagerstown, IN",                    timezone: "America/New_York" },
  { code: "11405", name: "Livonia, MI",                       timezone: "America/New_York" },
  { code: "11992", name: "Balch Springs, TX",                 timezone: "America/Chicago"  },
  { code: "12272", name: "Brooklyn, MI",                      timezone: "America/New_York" },
  { code: "12556", name: "Fulton St. Subway, MI",             timezone: "America/New_York" },
  { code: "12623", name: "Broadway, TX",                      timezone: "America/Chicago"  },
  { code: "12716", name: "Airport Road, MI",                  timezone: "America/New_York" },
  { code: "12940", name: "Allendale, MI",                     timezone: "America/New_York" },
  { code: "12997", name: "Lowell, MI",                        timezone: "America/New_York" },
  { code: "13630", name: "Vandercook, MI",                    timezone: "America/New_York" },
  { code: "14123", name: "Fortville, IN",                     timezone: "America/New_York" },
  { code: "14544", name: "Morrell St., MI",                   timezone: "America/New_York" },
  { code: "14786", name: "Jamestown, NC",                     timezone: "America/New_York" },
  { code: "14831", name: "Clinton, MI",                       timezone: "America/New_York" },
  { code: "15447", name: "Ann Arbor, MI",                     timezone: "America/New_York" },
  { code: "16690", name: "Seven Lakes, NC",                   timezone: "America/New_York" },
  { code: "16871", name: "Livonia, MI",                       timezone: "America/New_York" },
  { code: "17399", name: "Eaton Rapids, MI",                  timezone: "America/New_York" },
  { code: "17428", name: "Nicholasville, KY",                 timezone: "America/New_York" },
  { code: "18616", name: "Westland, MI",                      timezone: "America/New_York" },
  { code: "19401", name: "Vass, NC",                          timezone: "America/New_York" },
  { code: "22393", name: "Lancaster, KY",                     timezone: "America/New_York" },
  { code: "22786", name: "Parnall Road, MI",                  timezone: "America/New_York" },
  { code: "23626", name: "Laingsburg, MI",                    timezone: "America/New_York" },
  { code: "25236", name: "North Park, MI",                    timezone: "America/New_York" },
  { code: "25745", name: "Dayton, OH",                        timezone: "America/New_York" },
  { code: "27265", name: "Kettering, OH",                     timezone: "America/New_York" },
  { code: "27710", name: "Lansing, MI",                       timezone: "America/New_York" },
  { code: "28105", name: "WalMart, OH",                       timezone: "America/New_York" },
  { code: "28680", name: "Chums Corners, MI",                 timezone: "America/New_York" },
  { code: "28735", name: "Lexington, KY",                     timezone: "America/New_York" },
  { code: "29078", name: "Livonia, MI",                       timezone: "America/New_York" },
  { code: "30209", name: "Lexington, KY",                     timezone: "America/New_York" },
  { code: "30682", name: "Indianapolis, IN",                  timezone: "America/New_York" },
  { code: "31990", name: "Belding, MI",                       timezone: "America/New_York" },
  { code: "32895", name: "Kingsley, MI",                      timezone: "America/New_York" },
  { code: "33764", name: "Nicholasville, KY",                 timezone: "America/New_York" },
  { code: "33864", name: "Cleveland, NC",                     timezone: "America/New_York" },
  { code: "34071", name: "Granite Quarry, NC",                timezone: "America/New_York" },
  { code: "34105", name: "Peoria, IL, Wal-Mart Allen Rd",     timezone: "America/Chicago"  },
  { code: "34755", name: "Lansing, MI",                       timezone: "America/New_York" },
  { code: "34886", name: "Laurinburg, NC",                    timezone: "America/New_York" },
  { code: "34955", name: "Charlotte, MI",                     timezone: "America/New_York" },
  { code: "35023", name: "Walmart Jxn, MI",                   timezone: "America/New_York" },
  { code: "36822", name: "Danville, KY",                      timezone: "America/New_York" },
  { code: "36950", name: "Interlochen, MI",                   timezone: "America/New_York" },
  { code: "39725", name: "Lansing, MI",                       timezone: "America/New_York" },
  { code: "44951", name: "Fishers, IN",                       timezone: "America/New_York" },
  { code: "45532", name: "Grand Rapids, MI",                  timezone: "America/New_York" },
  { code: "45655", name: "Hudsonville, MI",                   timezone: "America/New_York" },
  { code: "49752", name: "Shell Drive-thru",                  timezone: "America/New_York" },
  { code: "49849", name: "Laurel Hill, NC",                   timezone: "America/New_York" },
  { code: "49927", name: "Lansing, MI",                       timezone: "America/New_York" },
  { code: "50515", name: "Metro Subway",                      timezone: "America/New_York" },
  { code: "51384", name: "Mattawan, MI",                      timezone: "America/New_York" },
  { code: "51859", name: "Clemmons, NC",                      timezone: "America/New_York" },
  { code: "52155", name: "Moscow Road, MI",                   timezone: "America/New_York" },
  { code: "52438", name: "Terre Haute, IN",                   timezone: "America/Chicago"  },
  { code: "54606", name: "Subway 54606, MI",                  timezone: "America/New_York" },
  { code: "54743", name: "Subway54743, KY",                   timezone: "America/New_York" },
  { code: "55589", name: "Ovid, MI",                          timezone: "America/New_York" },
  { code: "56130", name: "Huber Heights, OH",                 timezone: "America/New_York" },
  { code: "56263", name: "Wilmington, OH",                    timezone: "America/New_York" },
  { code: "58124", name: "Grandville, MI",                    timezone: "America/New_York" },
  { code: "58549", name: "Charlotte, NC",                     timezone: "America/New_York" },
  { code: "60316", name: "Lake June, TX",                     timezone: "America/Chicago"  },
  { code: "64739", name: "Mesquite, TX",                      timezone: "America/Chicago"  },
  { code: "66420", name: "Wyoming, MI",                       timezone: "America/New_York" },
  { code: "71988", name: "KY Store #71988",                   timezone: "America/New_York" },
  { code: "72412", name: "KY Store #72412",                   timezone: "America/New_York" },
]

async function main() {
  console.log('Clearing existing data...')
  await prisma.timePunch.deleteMany()
  await prisma.user.deleteMany()
  await prisma.store.deleteMany()

  console.log('Seeding stores and managers...')
  const pin1234 = await bcrypt.hash('1234', 12)

  for (const s of stores) {
    const store = await prisma.store.create({
      data: {
        storeNumber: s.code,
        name: s.name,
        timezone: s.timezone,
      },
    })

    await prisma.user.create({
      data: {
        employeeId: 'MGR1',
        name: 'Manager',
        pin: pin1234,
        mustChangePin: true,
        role: Role.MANAGER,
        storeId: store.id,
      },
    })
  }

  console.log('Seeding super admin...')
  const pin0000 = await bcrypt.hash('0000', 12)

  await prisma.user.create({
    data: {
      employeeId: 'ADMIN',
      name: 'Super Admin',
      pin: pin0000,
      mustChangePin: true,
      role: Role.SUPER_ADMIN,
      storeId: null,
    },
  })

  console.log(`Done. ${stores.length} stores + ${stores.length} managers + 1 super admin.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
