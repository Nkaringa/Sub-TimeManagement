# Device Registration — Feature Documentation

Restricts clock-in/out operations to registered store tablets only. Employees can still log in and view their hours from any browser, but punching requires a device token stored in the tablet's `localStorage`.

---

## How It Works

### One-Time Setup (Manager)

1. Manager logs in on the store tablet
2. Scrolls to **"Registered Devices"** section on the dashboard
3. Clicks **"Register This Device"**
4. Enters a label (e.g., "Front Counter Tablet")
5. System generates a 64-character cryptographic token
6. Token is saved to the database **and** the browser's `localStorage`
7. Device is now authorized for that store

### Daily Use (Employee)

1. Employee logs in on the same tablet
2. Dashboard reads `deviceToken` from `localStorage` automatically
3. When they punch in/out, the token is sent along with the request
4. API validates: token exists, is active, and belongs to the employee's store
5. Punch succeeds

### If Employee Tries From Home

1. Their personal browser has no `deviceToken` in `localStorage`
2. Dashboard shows an orange warning: *"This device is not registered for clocking in/out. Please use the store tablet."*
3. Clock In / Clock Out buttons are disabled
4. They can still view hours, payments, and status — just can't punch

---

## Database Model

```prisma
model RegisteredDevice {
  id           String   @id @default(cuid())
  storeId      String
  store        Store    @relation(fields: [storeId], references: [id])

  token        String   @unique            // 64-char hex via crypto.randomBytes(32)
  name         String                      // Label, e.g. "Front Counter Tablet"
  registeredBy String                      // Manager's employeeId who registered it

  isActive     Boolean  @default(true)     // Soft-delete for revocation
  createdAt    DateTime @default(now())

  @@index([storeId])
}
```

---

## API Endpoints

### POST `/api/devices/register`

Registers the current device for a store. Manager/SuperAdmin only.

**Request:**
```json
{ "name": "Front Counter Tablet" }
```

**Response (201):**
```json
{
  "ok": true,
  "device": {
    "id": "clxyz...",
    "token": "a1b2c3d4...64chars",
    "name": "Front Counter Tablet",
    "createdAt": "2026-03-05T..."
  }
}
```

The `token` is returned **only once** at registration. The frontend stores it in `localStorage`.

### GET `/api/devices`

Lists all active registered devices for the manager's store. Manager/SuperAdmin only.

**Response (200):**
```json
{
  "ok": true,
  "devices": [
    {
      "id": "clxyz...",
      "name": "Front Counter Tablet",
      "registeredBy": "101-MGR1",
      "createdAt": "2026-03-05T..."
    }
  ]
}
```

Note: `token` is not returned in the list (security — only shown once at registration).

### DELETE `/api/devices`

Revokes a registered device. Sets `isActive = false` (soft delete for audit trail).

**Request:**
```json
{ "deviceId": "clxyz..." }
```

**Response (200):**
```json
{ "ok": true }
```

---

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modified | Added `RegisteredDevice` model + relation to `Store` |
| `prisma/migrations/20260305163616_add_registered_device/` | Created | Migration for `RegisteredDevice` table |
| `src/app/api/devices/register/route.ts` | Created | POST — register device (manager-only) |
| `src/app/api/devices/route.ts` | Created | GET — list devices, DELETE — revoke device |
| `src/app/api/punch/route.ts` | Modified | Added device token validation before punch |
| `src/app/employee/dashboard/page.tsx` | Modified | Reads token from localStorage, sends with punch, shows warning if missing, disables buttons |
| `src/app/manager/dashboard/page.tsx` | Modified | Added "Registered Devices" section, register modal, revoke buttons |

---

## Punch API Validation Flow

The `/api/punch` endpoint now validates in this order:

1. Session cookie (`logged_in`)
2. Role (`EMPLOYEE`)
3. Store code + employee ID cookies present
4. Punch type valid (`IN` or `OUT`)
5. Store exists in database
6. Store is open (for clock-in only)
7. User exists and is active
8. **Device token present in request body**
9. **Device token exists in DB, is active, and belongs to the same store**
10. Not a duplicate punch (can't clock IN twice in a row)
11. Create the punch record

Steps 8–9 are the new device verification layer.

---

## Manager Dashboard UI

The manager dashboard now includes a **"Registered Devices"** section below the active employees list:

- **Device list:** Shows name, who registered it, and date
- **Revoke button:** On each device row — sets `isActive = false` in the database
- **"Register This Device" button:** Visible only when the current browser has no device token — opens a modal to enter a device name
- **Status indicator:** Shows "This device is registered for clock in/out" when the current browser has a valid token

---

## Employee Dashboard Changes

- **Warning banner:** Orange banner shown when no `deviceToken` exists in `localStorage`
- **Disabled buttons:** Clock In and Clock Out buttons are disabled when no device token is present
- **Token sent with punch:** The `deviceToken` from `localStorage` is included in every punch request body

---

## Deployment Notes

This feature is fully compatible with the existing Vercel + Neon deployment:

- **Migration:** Runs automatically during Vercel build via `prisma migrate deploy` (already in the build script)
- **New API routes:** Picked up automatically by Next.js as serverless functions
- **`crypto.randomBytes`:** Node.js built-in, available in Vercel's serverless runtime
- **`localStorage`:** Browser-only, no server-side impact
- **Middleware:** Device API routes are not in the public prefixes list, so they correctly require authentication

**To deploy:** Push the code to GitHub. Vercel auto-deploys and runs the migration.

---

## Security Considerations

- Tokens are 64-character hex strings (256 bits of entropy) — not guessable
- Tokens are stored as unique indexed values in PostgreSQL
- Token is returned only once (at registration) and never exposed via GET endpoints
- Revocation is soft-delete (`isActive = false`) to maintain audit trail
- Device token validation happens server-side — client-side disabling is UX only, not the security boundary
- Each token is scoped to a specific store — a token from Store 101 cannot be used to punch at Store 102

---

## Testing Checklist

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Manager registers tablet | Login as manager → Register Device → Enter name → Confirm | Token in localStorage, device in list |
| Employee punches on registered tablet | Login as employee on same browser → Clock In → Clock Out | Punches succeed normally |
| Employee tries from unregistered device | Open incognito/different browser → Login as employee | Orange warning, buttons disabled |
| Manager revokes device | Login as manager → Click Revoke on a device | Device removed from list, punches fail on that device |
| Multiple devices per store | Register 2 different browsers | Both can be used for punching |
