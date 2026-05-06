# Techzu Backend API

Express + Prisma + PostgreSQL + Socket.IO backend for timed merch-drop reservations and purchases.

## Requirements

- Node.js 20+
- npm
- PostgreSQL (local or hosted, e.g. Neon)

## Environment

Create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
CLIENT_ORIGIN="http://localhost:5173"
PORT=3001
```

## Install and Run

```bash
npm install
```

Generate Prisma client and apply schema:

```bash
npm run db:generate
npm run db:push
```

Optional seed:

```bash
npm run db:seed
```

Run in development:

```bash
npm run dev
```

Build and run production bundle:

```bash
npm run build
npm start
```

## SQL Schema Setup

This project uses Prisma schema from `prisma/schema.prisma`. If you want SQL-first setup, create the same tables with SQL like this:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE drops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "priceCents" INTEGER NOT NULL,
  "totalUnits" INTEGER NOT NULL,
  "availableStock" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "startsAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NULL
);

CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  "dropId" TEXT NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMP NOT NULL,
  status "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  "dropId" TEXT NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drops_active_starts_at ON drops ("isActive", "startsAt");
CREATE INDEX idx_reservations_status_expires_at ON reservations (status, "expiresAt");
CREATE INDEX idx_reservations_user_drop_status ON reservations ("userId", "dropId", status);
CREATE INDEX idx_purchases_drop_created_at_desc ON purchases ("dropId", "createdAt" DESC);
```

If you use SQL manually, keep it in sync with `prisma/schema.prisma`.

## Architecture Choice: 60-Second Expiration

Reservation TTL is implemented as:

- On reserve, backend creates reservation with `expiresAt = now + 60_000ms`.
- A sweep loop runs every 2 seconds in `src/services/reservationExpiry.service.ts`.
- Each sweep transaction finds `ACTIVE` reservations where `expiresAt < now`, marks them `EXPIRED`, and returns stock to the related drop.
- After update, server broadcasts stock and inventory sync events through Socket.IO.

This keeps expiration deterministic server-side and independent of client clocks.

## Concurrency: Last-Item Protection

To prevent two users claiming the last item at once:

- Reserve flow uses a DB transaction (`prisma.$transaction`).
- Stock decrement is done with conditional atomic update:
  - `updateMany(where: { id, availableStock: { gt: 0 } }, data: { availableStock: { decrement: 1 } })`
- Only one concurrent request can decrement from `1 -> 0`; any other concurrent request gets `count === 0` and returns `409 No stock available`.
- Reservation creation happens in the same transaction, so stock decrement and hold creation stay consistent.

This avoids overselling even under race conditions.
