# Shop CRM

CRM for a retail shop. The repository contains a React/Vite client, a NestJS API, Prisma migrations, PostgreSQL setup, JWT authentication, roles, sales, purchases, debts, returns, expenses, reports and audit log.

## Requirements

- Git
- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer, installed as a local service

Docker is not required. Internet access is needed on first setup to download the project dependencies.

## Quick Start

### Windows PowerShell

```powershell
git clone <GITHUB_REPOSITORY_URL>
cd crm
```

Install PostgreSQL and create an empty database named `shop_crm` (for example, in pgAdmin). Copy `backend/.env.example` to `backend/.env` if it does not exist, then set `DATABASE_URL` to use your PostgreSQL username and password:

```env
DATABASE_URL="postgresql://<USER>:<PASSWORD>@localhost:5432/shop_crm?schema=public"
```

Start the PostgreSQL Windows service, then run `.\start.bat`. It installs dependencies, applies migrations, seeds demo data, starts the API and web app, and opens the app. Alternatively, run `.\setup.ps1` to prepare the app after configuring PostgreSQL, then start the API and client in separate terminals as described below.

### macOS/Linux

```bash
git clone <GITHUB_REPOSITORY_URL>
cd crm
chmod +x setup.sh
./setup.sh
```

The setup scripts install dependencies and prepare the Prisma database. PostgreSQL must already be installed and running, and the empty `shop_crm` database must exist:

1. Creates `backend/.env` and `client/.env` from the examples.
2. Installs dependencies with `npm ci`.
3. Connects to the local PostgreSQL database configured in `backend/.env`.
4. Generates Prisma Client.
5. Applies all migrations.
6. Seeds demo users and starter products.

## Run Development Servers

### Windows one-click startup

Install Node.js 20 or newer and PostgreSQL on the computer. Create an empty database named `shop_crm` and note your PostgreSQL username and password. Clone or copy the complete project folder to the computer, update `DATABASE_URL` in `backend/.env` (created from the example on first run) to match those credentials, and start the PostgreSQL service. Double-click `start.bat` in the project root. It installs dependencies if needed, applies migrations, adds demo data, starts the API and web app, and opens http://localhost:5173. Keep the API and Web windows open while using the app.

Each computer gets its own local database; this setup does not copy or sync data from another computer. Clone the repository rather than copying local `.env` files or `node_modules`.

### macOS/Linux

Install Node.js 20 or newer, npm, and PostgreSQL, create the `shop_crm` database, and configure `backend/.env`. Then run:

```bash
./setup.sh
```

The setup script installs dependencies, applies migrations, and seeds demo data. Then use two terminals from the repository root to start the API and client:

Terminal 1, API:

```bash
cd backend
npm run start:dev
```

Terminal 2, client:

```bash
cd client
npm run dev
```

Open http://localhost:5173.

Demo accounts:

- Admin: `admin@example.com` / `admin123`
- Seller: `seller@example.com` / `seller123`

Change these credentials before using the application outside local development.

## Database Commands

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

On Windows, start or stop the PostgreSQL service from the Services app. On macOS/Linux, manage it with the service manager used by your PostgreSQL installation.

For a fresh local database, create a new empty database named `shop_crm` in pgAdmin or with `createdb`; applying migrations does not delete existing database data.

## Production Build

```bash
cd backend
npm ci
npm run build

cd ../client
npm ci
npm run build
```

The client output is written to `client/dist`. The API listens on port `3000` by default.

## Environment

Backend settings are documented in [backend/.env.example](backend/.env.example):

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- optional `CORS_ORIGIN`

Client settings are documented in [client/.env.example](client/.env.example). During local development, the default `/api` path is proxied by Vite to `http://localhost:3000`.

Never commit `.env` files or production secrets.

## Troubleshooting

### Port 3000 is already in use

The API may already be running. Check `http://localhost:3000/auth/login` or stop the old Node process before starting another one.

### Cannot connect to PostgreSQL

Make sure the PostgreSQL service is running, the `shop_crm` database exists, and the username/password/port in `backend/.env` are correct.

### Prisma Client generation fails on Windows with EPERM

Stop the running Nest/Node process, then run:

```powershell
cd backend
npx prisma generate
```

### Reset local demo data

Create a new empty `shop_crm` database using pgAdmin or `createdb`, then run:

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

## Nginx

A reverse-proxy example is available in [deploy/nginx/shop-crm.conf](deploy/nginx/shop-crm.conf). It serves `client/dist`, proxies `/api/` to the API and forwards the `Authorization` header. Replace Windows paths and configure nginx for the target server before deployment.
