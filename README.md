# Subway Management System

A full-stack employee time-clock and store management application built for multi-location Subway restaurant operations. Managers oversee stores and employees, employees clock in/out and track hours, and super admins manage the entire system.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Database:** PostgreSQL 16 with Prisma ORM
- **Styling:** Tailwind CSS 4
- **Auth:** bcryptjs (PIN hashing) + cookie-based sessions
- **Hosting:** Vercel (app) + Neon (database)

## Features

### Employee
- Clock in / clock out with real-time shift timer
- View daily, weekly, and bi-weekly hours breakdown
- Store status awareness (cannot clock in when store is closed)
- Device-restricted punching (can only clock in/out from registered store tablets)

### Manager
- Store overview dashboard with live employee status
- Open/close store (auto clocks out all employees on close)
- Employee directory with search and role filters
- Edit employee details, deactivate accounts (soft delete)
- PIN verification for sensitive data access (SSN)
- Time reports and payroll tracking
- Register and manage authorized store devices for clock in/out

### Super Admin
- System-wide overview across all stores
- Create new store locations
- Toggle store status for any location
- Impersonate manager view for any store

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login and registration pages
│   │   ├── login/
│   │   └── register/
│   ├── employee/            # Employee dashboard
│   │   └── dashboard/
│   ├── manager/             # Manager pages
│   │   ├── dashboard/
│   │   ├── employeeinfo/
│   │   └── reports/
│   ├── superadmin/          # Super admin dashboard
│   │   └── dashboard/
│   ├── api/                 # API routes
│   │   ├── auth/            # login, logout, register, me
│   │   ├── devices/         # Device registration, list, revoke
│   │   ├── employee/        # status, hours, payments
│   │   ├── manager/         # overview, employeeinfo, reports, verify-pin
│   │   ├── superadmin/      # overview, login, impersonate, restore
│   │   ├── punch/           # Clock in/out (device-verified)
│   │   └── stores/          # Store CRUD
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   └── prisma.ts            # Prisma client singleton
└── middleware.ts             # Route protection and role-based access
prisma/
├── schema.prisma            # Database models
├── seed.ts                  # Initial data seeding
└── migrations/              # Migration history
```

## Database Schema

| Model | Purpose |
|-------|---------|
| **Store** | Subway locations with open/closed status |
| **User** | Employees and managers tied to a store |
| **TimePunch** | Clock in/out records with timestamps |
| **SuperAdmin** | System administrators (separate from store users) |
| **PaymentLog** | Payment tracking records |
| **RegisteredDevice** | Authorized store tablets for clock in/out |

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL) or a Neon account
- npm

### Local Development

1. **Clone and install:**
   ```bash
   git clone <repo-url>
   cd subwaymanagement
   npm install
   ```

2. **Start the database:**
   ```bash
   docker-compose up -d
   ```

3. **Set up environment variables:**

   Create a `.env` file:
   ```
   DATABASE_URL="postgresql://jpops:superpass@localhost:5432/time_clock?schema=public"
   SUPERADMIN_1_ID=<admin-id>
   SUPERADMIN_1_PIN=<admin-pin>
   SUPERADMIN_2_ID=<admin-id>
   SUPERADMIN_2_PIN=<admin-pin>
   ```

4. **Run migrations and seed:**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start the dev server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Demo Credentials (Local)

| Role | Employee ID | PIN |
|------|-------------|-----|
| Manager | `101-MGR1` | `1234` |
| Employee | `101-0007` | `1234` |

Super admin credentials are set via environment variables.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Vercel + Neon deployment guide, including infrastructure capacity analysis and cost estimates.

**Quick deploy:**

1. Create a Neon database (PostgreSQL 16)
2. Seed via `npx prisma migrate deploy && npx prisma db seed`
3. Push to GitHub
4. Import in Vercel with build command: `prisma generate && prisma migrate deploy && next build`
5. Set `DATABASE_URL` and superadmin env vars in Vercel dashboard

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Generate Prisma client, run migrations, build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open database browser UI |
| `npx prisma db seed` | Seed initial data |

## License

Private — not licensed for distribution.
