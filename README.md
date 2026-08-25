# 🌾 AgriStore — Agricultural Store Business Software

A full-stack management system for agricultural input stores (seeds, fertilizers,
pesticides, animal feed, tools, and irrigation supplies). It covers inventory,
point-of-sale, purchasing, supplier & customer management, customer credit
("khata" / pay-later book), payments collection, and business reports —
everything a small-to-mid-size agro store needs to run day-to-day operations.

## Features

- **Inventory management** — products with SKU, category, unit (kg/bag/litre/piece),
  cost & selling price, stock levels, reorder thresholds, batch numbers, and
  expiry dates. Low-stock and expiring-soon alerts on the dashboard. Manual
  stock adjustments with an audit trail (damage, stock-take corrections, etc.).
- **Point of Sale (POS)** — fast product search, cart-based sale entry, walk-in
  or registered customers, discounts, and multiple payment modes (cash, bank,
  mobile money, cheque, or credit). Stock is decremented automatically and
  sales can be cancelled (which restores stock and reverses any credit).
- **Customer credit ledger ("khata")** — track how much each farmer/customer
  owes, enforce optional credit limits, record repayments, and view a full
  chronological statement (debits from sales, credits from payments) with a
  running balance.
- **Suppliers & purchasing** — record supplier details and purchase invoices;
  receiving a purchase increases stock and updates cost price. Track partial
  payments to suppliers.
- **Reports** — sales & purchases summaries over a date range, best-selling
  products, inventory valuation, low-stock snapshot, and accounts receivable
  (who owes the store money).
- **Role-based access** — Admin, Manager, and Cashier roles with different
  permissions (e.g. only Admins manage users; Cashiers can process sales and
  record payments but not edit the catalog).
- **Dashboard** — today's sales & cash collected, month-to-date sales,
  outstanding customer credit, inventory value, low-stock and expiring-soon
  counts.

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Backend   | Node.js, Express, TypeScript, Prisma ORM, SQLite (swappable to PostgreSQL/MySQL) |
| Auth      | JWT (JSON Web Tokens), bcrypt password hashing |
| Frontend  | React 18, TypeScript, Vite, React Router, Tailwind CSS, Axios |
| Validation| Zod (request validation on every endpoint) |

The database defaults to SQLite for zero-config local development. Swap the
`provider` in `server/prisma/schema.prisma` to `postgresql` (and point
`DATABASE_URL` at your database) to run against Postgres in production —
the schema, migrations, and application code do not otherwise change.

## Project Structure

```
├── server/            Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma   Database schema
│   │   └── seed.ts         Demo data (users, categories, products, etc.)
│   └── src/
│       ├── routes/         One file per resource (auth, products, sales, …)
│       ├── middleware/     JWT auth guard, role guard, error handler
│       ├── lib/, utils/    Prisma client singleton, JWT helpers, error types
│       └── app.ts, index.ts
└── client/            React + TypeScript SPA
    └── src/
        ├── pages/          One screen per route (Dashboard, POS, Products, …)
        ├── components/     Layout, Modal, StatCard, route guards
        ├── context/        Auth context (JWT storage, current user, roles)
        └── api/            Axios client with auth header + error handling
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### 1. Backend setup

```bash
cd server
cp .env.example .env      # adjust JWT_SECRET etc. if desired
npm install
npx prisma migrate dev --name init   # creates SQLite DB + applies schema
npm run seed                          # loads demo users, products, suppliers, customers
npm run dev                           # starts API on http://localhost:4000
```

Seeded demo logins:

| Role    | Email                    | Password    |
|---------|---------------------------|-------------|
| Admin   | admin@agristore.test      | Admin@123   |
| Cashier | cashier@agristore.test    | Cashier@123 |

### 2. Frontend setup

In a second terminal:

```bash
cd client
npm install
npm run dev     # starts the app on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the backend on port 4000
(see `client/vite.config.ts`), so both servers just need to be running.

Open **http://localhost:5173** and sign in with one of the demo accounts above.

### 3. Production build

```bash
# Backend
cd server && npm run build && npm run prisma:deploy && npm start

# Frontend
cd client && npm run build   # outputs static assets to client/dist/
```

Serve `client/dist/` with any static file host (Nginx, Vercel, Netlify, etc.)
and point it at your deployed API, or serve it from the Express app.

## API Overview

All endpoints are under `/api` and (except `/api/auth/login` and the initial
`/api/auth/register`) require a `Authorization: Bearer <token>` header.

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /auth/users` (admin), `PATCH /auth/users/:id/active` (admin) |
| Categories | `GET/POST /categories`, `PUT/DELETE /categories/:id` |
| Products | `GET/POST /products`, `GET/PUT /products/:id`, `DELETE /products/:id` (deactivate), `POST /products/:id/adjust` |
| Suppliers | `GET/POST /suppliers`, `GET/PUT/DELETE /suppliers/:id` |
| Customers | `GET/POST /customers`, `GET/PUT/DELETE /customers/:id`, `GET /customers/:id/ledger` |
| Purchases | `GET/POST /purchases`, `GET /purchases/:id`, `POST /purchases/:id/pay` |
| Sales | `GET/POST /sales`, `GET /sales/:id`, `POST /sales/:id/cancel` |
| Payments | `GET/POST /payments` (customer repayments against credit) |
| Dashboard | `GET /dashboard/summary` |
| Reports | `GET /reports/sales`, `/reports/purchases`, `/reports/top-products`, `/reports/inventory`, `/reports/receivables` |

Creating a sale or purchase is transactional: stock quantities and (for
credit sales) the customer's credit balance are updated atomically along with
the sale/purchase record, so the numbers never drift out of sync.

## Roles & Permissions

- **ADMIN** — full access, including managing user accounts and deleting
  categories/suppliers/customers.
- **MANAGER** — manage the catalog, suppliers, purchases, sales, customers,
  and view reports; cannot manage user accounts.
- **CASHIER** — process sales, record customer payments, create customers;
  read-only elsewhere.

The very first registered user automatically becomes an ADMIN; every
subsequent account must be created by an existing admin (via the Users page
or the `POST /auth/register` endpoint with an admin's token).

## Notes on the Data Model

- SQLite has no native enum type, so fields that are conceptually enums
  (`role`, `paymentMode`, `status`, …) are stored as `String` columns in
  `schema.prisma` and validated at the API layer with Zod. Switching the
  Prisma `provider` to `postgresql` would let you convert these back to real
  `enum` types if you prefer.
- Product deletion is a soft-delete (`active = false`) to preserve historical
  sales/purchase records; deactivated products are hidden from new sales but
  still show up in past invoices and reports.
- Cancelling a sale restores stock and reverses any outstanding credit it had
  added to the customer's balance.
