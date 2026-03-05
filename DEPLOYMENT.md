# Subway Management System — Deployment & Infrastructure Guide

## Application Overview

- **Stack:** Next.js 16 + TypeScript + Prisma ORM + PostgreSQL + Tailwind CSS
- **Hosting:** Vercel (app) + Neon (database)
- **Purpose:** Employee time-clock and store management across multiple Subway locations

---

## Deployment Steps

### Step 1: Create Neon Database

1. Sign up at https://neon.tech (GitHub login works)
2. Click **New Project**
3. Settings:
   - Project name: `subway-management`
   - PostgreSQL version: **16**
   - Region: closest to your users
4. Copy the connection string:
   ```
   postgresql://neondb_owner:xxxxx@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Seed the Neon Database (from local machine)

```bash
cd /Users/karinganageshgoud/Desktop/Subway/subwaymanagement

# Point Prisma at the remote Neon database (replace with your actual URL)
export DATABASE_URL="postgresql://neondb_owner:xxxxx@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Set superadmin credentials
export SUPERADMIN_1_ID=JpOpps
export SUPERADMIN_1_PIN=04032026
export SUPERADMIN_2_ID=NK27
export SUPERADMIN_2_PIN=12242608

# Apply all migrations (creates tables, indexes, constraints)
npx prisma migrate deploy

# Insert starter data (stores, demo users, superadmins)
npx prisma db seed

# Verify with visual browser UI
npx prisma studio
```

**What this does:**
- `prisma migrate deploy` — applies all 5 migrations to create tables (Store, User, TimePunch, SuperAdmin, PaymentLog), enums, and indexes on the empty Neon database
- `prisma db seed` — runs `prisma/seed.ts` which inserts 2 stores, 2 demo users (PINs bcrypt-hashed), and 2 superadmin accounts

### Step 3: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Subway Management System"

# Option A: Using GitHub CLI
gh repo create subwaymanagement --private --source=. --push

# Option B: Manual (create repo at github.com/new first)
git remote add origin https://github.com/YOUR_USERNAME/subwaymanagement.git
git branch -M main
git push -u origin main
```

> **Important:** Verify `.env` is NOT committed. It contains credentials and is already in `.gitignore`.

### Step 4: Deploy to Vercel

1. Go to https://vercel.com → sign in with GitHub
2. Click **Add New Project** → select `subwaymanagement`
3. Override **Build Command** to:
   ```
   prisma generate && prisma migrate deploy && next build
   ```
4. Add **Environment Variables:**

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `SUPERADMIN_1_ID` | `JpOpps` |
   | `SUPERADMIN_1_PIN` | `04032026` |
   | `SUPERADMIN_2_ID` | `NK27` |
   | `SUPERADMIN_2_PIN` | `12242608` |

5. Click **Deploy**

### Step 5: Verify

| Test | Credentials | Expected |
|------|-------------|----------|
| Manager login | `101-MGR1` / PIN `1234` | Manager dashboard |
| Employee login | `101-0007` / PIN `1234` | Employee dashboard with clock in/out |
| SuperAdmin login | `JpOpps` / PIN `04032026` | SuperAdmin dashboard |
| Registration | Create new employee | Redirect to login, then login works |
| Store toggle | As manager, close/open store | Employees see closed banner |

---

## Architecture

```
User Browser
    │
    ▼
Vercel Edge Network (middleware.ts — route protection, role redirects)
    │
    ▼
Vercel Serverless Functions (API routes — business logic)
    │
    ▼
Neon PostgreSQL (hosted, connection pooling, auto-suspend)
```

- **Middleware:** Runs on Vercel Edge (globally distributed)
- **API Routes:** Run as serverless functions
- **Database:** Neon PostgreSQL with auto-scaling
- **Static assets:** Served from Vercel CDN

---

## Infrastructure Capacity Analysis

### Assumptions

- **100 stores**, each with **3–5 employees** (max 5)
- **~600 total users** (500 employees + 100 managers)
- **20 visits per store per day** (quick open → punch → close)
- Each visit lasts **~1 minute** on average
- Dashboards poll the server every **10 seconds** while open

### Vercel Usage Estimate

**Per-visit serverless invocations:**

| Action | Employee Visit | Manager Visit |
|--------|---------------|---------------|
| Page load | 1 | 1 |
| Initial data fetch | 2 (status + hours) | 1 (overview) |
| Polling (6 cycles at 10s) | 12 (2 calls/poll) | 6 (1 call/poll) |
| Punch / action | 3 | 2 |
| **Total** | **~18** | **~10** |

**Weighted average:** ~16 invocations per visit (80% employee, 20% manager)

```
Daily:   100 stores × 20 visits × 16 invocations = 32,000/day
Monthly: 32,000 × 30 = 960,000 invocations/month
```

**Vercel limits:**

| Resource | Free Tier | Your Usage | Status |
|----------|-----------|------------|--------|
| Serverless invocations | 100,000/month | 960,000/month | **9.6× over** |
| Edge invocations (middleware) | 1,000,000/month | ~960,000/month | Tight but OK |
| Bandwidth | 100 GB/month | ~5 GB/month | Fine |

### Neon Usage Estimate

**Compute hours:**

Neon charges for the time the compute endpoint is awake (not per query). It auto-suspends after 5 minutes of inactivity.

With 2,000 visits/day (~2–3 visits per minute during business hours), the database never auto-suspends during working hours.

```
Single timezone:    ~14 active hours/day × 30 = 420 compute hours/month
Multiple timezones: ~17 active hours/day × 30 = 510 compute hours/month
```

**Storage:**

```
500 employees × 2 punches/day × 365 days = 365,000 rows/year
~200 bytes per TimePunch row = ~73 MB/year
Total with all tables: ~100 MB after year one
```

**Neon limits:**

| Resource | Free Tier | Your Usage | Status |
|----------|-----------|------------|--------|
| Compute hours | 191 hours/month | 420–510 hours/month | **2–3× over** |
| Storage | 512 MB | ~100 MB/year | Fine |
| Connections | 100 pooled | ~20 peak | Fine |

### Cost Summary for 100 Stores

| Scenario | Vercel | Neon | Total/month |
|----------|--------|------|-------------|
| Both free tiers | $0 | $0 | **Not sufficient** |
| Vercel Pro + Neon Launch | $20 | $19 + ~$19 overage | **~$58/month** |
| Vercel Pro + Neon Scale | $20 | $69 | **~$89/month** |

> **Neon Launch overage math:** 300 hours included, ~420 used, 120 overage hours × $0.16/hr = ~$19

### Scaling Thresholds

| Store Count | Free Tier Viable? | Recommended Plan | Est. Cost |
|-------------|-------------------|------------------|-----------|
| 1–10 stores | Yes | Both free tiers | $0 |
| 10–12 stores | Borderline | Vercel Free + Neon Free | $0 |
| 13–50 stores | No | Vercel Pro + Neon Launch | ~$39/month |
| 50–100 stores | No | Vercel Pro + Neon Launch (with overages) | ~$58/month |
| 100+ stores | No | Vercel Pro + Neon Scale | ~$89/month |

### Cost Reduction Option

Increasing the dashboard polling interval from **10 seconds to 30 seconds** would cut serverless invocations by ~60%, keeping Vercel Pro comfortable even at 100+ stores and reducing Neon active time.

---

## Credentials Reference

### SuperAdmin Accounts

| Admin | ID | PIN |
|-------|-----|------|
| SuperAdmin 1 | `JpOpps` | `04032026` |
| SuperAdmin 2 | `NK27` | `12242608` |

### Demo Accounts (from seed)

| Role | Employee ID | PIN | Store |
|------|-------------|-----|-------|
| Manager | `101-MGR1` | `1234` | Store 101 (Michigan) |
| Employee | `101-0007` | `1234` | Store 101 (Michigan) |

> All PINs are stored as bcrypt hashes in the database. Plaintext values only exist in Vercel's encrypted environment variable storage.

---

## Build Configuration

**`package.json` build script:**
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

This runs on every Vercel deployment:
1. `prisma generate` — creates the Prisma Client
2. `prisma migrate deploy` — applies any pending migrations to Neon
3. `next build` — compiles the Next.js application
