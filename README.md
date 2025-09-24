# Mini E‑Commerce Web Application (Next.js + SQLite/Turso + Drizzle)

A full‑stack mini e‑commerce app with authentication, role‑based access (Customer/Seller/Admin), product management, shopping cart, and order processing. Built with Next.js 15 App Router, Shadcn/UI, Drizzle ORM, and a Turso (libSQL/SQLite) database.

Quick links:
- Homepage: /
- Login: /login
- Register: /register
- Seller Dashboard: /seller (Seller/Admin)
- Admin Panel: /admin (Admin)

## Features by Role
- Customer
  - Register/Login
  - Browse/search products with price filters
  - Add to cart and place orders
  - View own orders (via API; basic UI on homepage flash + Admin page for overview)
- Seller
  - Login
  - Create products (name, price, stock, image, description)
  - Update products (price/stock)
  - Delete own products
  - View orders containing their products (via API)
- Admin
  - Login
  - Manage all products (through API; update/delete)
  - View all orders with customer info (Admin panel)
  - Can create products on behalf of any seller via API

## Tech Stack
- Frontend: Next.js 15 (App Router), React 19, Shadcn/UI, Tailwind v4
- API: Next.js Route Handlers under /api
- Auth: httpOnly signed session cookie, bcrypt password hashing
- DB/ORM: Turso (libSQL, SQLite), Drizzle ORM

## Directory Overview
- src/app/
  - page.tsx: Homepage (products grid, filters, cart, auth modals)
  - login/page.tsx, register/page.tsx
  - seller/page.tsx: Seller dashboard
  - admin/page.tsx: Admin panel
  - api/: REST‑style endpoints (auth, products, orders)
- src/db/
  - index.ts: Drizzle client
  - schema.ts: Drizzle schema (users, products, orders, order_items)
  - seeds/: seed scripts for users and products
- src/lib/auth.ts: getCurrentUser helper (reads secure cookie)

## Environment Variables
Create a .env file in the project root:

```
TURSO_CONNECTION_URL=libsql://your-db-url
TURSO_AUTH_TOKEN=your-auth-token
SESSION_SECRET=your-secret-key-here
```

Notes:
- SESSION_SECRET is used to sign the session cookie. Provide a strong, random value in production.
- A working Turso URL/token are required for local dev. You can also point to file: SQLite if desired by adjusting db client.

## Install & Run

1) Install dependencies
- npm install

2) Start dev server
- npm run dev

3) Open http://localhost:3000

Seed users/products (optional, already created by DatabaseAgent in this environment):
- Users: admin (Admin), seller (Seller), john (Customer), jane (Customer)
- Password for all: password123
- Products: 6 sample items owned by seller

## Database Schema (SQL)
```
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Customer','Seller','Admin')) DEFAULT 'Customer',
  created_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  seller_id INTEGER NOT NULL REFERENCES users(id),
  image_url TEXT,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);
```

## API Endpoints
Base URL: http://localhost:3000

Auth
- POST /api/auth/register { username, email, password, role? }
- POST /api/auth/login { email, password }
- POST /api/auth/logout
- GET /api/auth/me

Products
- GET /api/products?search=&minPrice=&maxPrice=&sellerId=&limit=&offset=
- POST /api/products (Seller/Admin only)
- PATCH /api/products/[id] (owner/Admin)
- DELETE /api/products/[id] (owner/Admin)

Orders
- GET /api/orders (auth; Admin sees all, Customer sees own, Seller sees orders containing their products)
- POST /api/orders { items: [{ product_id, quantity }] } (Customer/Admin)
- GET /api/orders/[id] (auth with access control)

Example: Create Order
```
curl -X POST http://localhost:3000/api/orders \
  -H 'Content-Type: application/json' \
  --cookie "session=<your-cookie>" \
  -d '{"items": [{"product_id": 1, "quantity": 2}]}'
```

## UI Overview
- Homepage: filters, grid, add to cart, place order; inline login/register dialogs
- Seller Dashboard: create/update/delete products, quick stock/price adjust
- Admin Panel: list all orders with basic details/images

## Security Notes
- Passwords hashed with bcrypt (saltRounds: 12)
- httpOnly, sameSite=lax session cookie signed with HMAC; 7‑day expiry
- Role checks enforced in product/order endpoints

## Future Improvements
- Dedicated customer order history page
- Product categories and advanced search filters
- Pagination and infinite scroll
- Image upload management (S3, etc.)
- Proper payments integration (Stripe)
- Replace custom cookie with JWT or a robust auth library across routes

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.