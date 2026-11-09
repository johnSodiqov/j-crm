# Shop CRM

CRM for a retail shop. The repository contains a React/Vite client, a NestJS API, Prisma migrations, PostgreSQL setup, JWT authentication, roles, sales, purchases, debts, returns, expenses, reports and audit log.

## Requirements

- Git
- Node.js 20 or newer
- npm
- PostgreSQL for Windows when using `start.bat`
- Docker Desktop with Docker Compose only when using `setup.ps1` or `docker compose`

The Docker-based setup starts PostgreSQL in a container. The one-click Windows launcher instead connects to a locally installed PostgreSQL service.

## Quick Start

### Windows PowerShell

```powershell
git clone <GITHUB_REPOSITORY_URL>
cd crm
.\setup.ps1
```

If PowerShell blocks local scripts, run this once in the current terminal:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
```

### macOS/Linux

```bash
git clone <GITHUB_REPOSITORY_URL>
cd crm
chmod +x setup.sh
./setup.sh
```

The setup script:

1. Creates `backend/.env` and `client/.env` from the examples.
2. Installs dependencies with `npm ci`.
3. Starts PostgreSQL in Docker.
4. Generates Prisma Client.
5. Applies all migrations.
6. Seeds demo users and starter products.

## Run Development Servers

### Windows one-click startup without Docker

Install Node.js 20 or newer and PostgreSQL for Windows, and make sure the PostgreSQL service is running. Create the `shop_crm` database and configure `DATABASE_URL` in `backend/.env` to match your local PostgreSQL username and password. Then double-click `start.bat` in the project root. It installs npm dependencies if needed, applies migrations, seeds demo data once, starts the API and web app, and opens http://localhost:5173. Docker is not used. Keep the API and Web windows open while using the app.

Use two terminals from the repository root.

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

Start or stop PostgreSQL:

```bash
docker compose up -d postgres
docker compose stop postgres
```

To delete the local database volume and all local data:

```bash
docker compose down -v
```

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

### Port 5432 is already in use

Stop the locally installed PostgreSQL service or change the host port in `docker-compose.yml` and update `DATABASE_URL` in `backend/.env`.

### Prisma Client generation fails on Windows with EPERM

Stop the running Nest/Node process, then run:

```powershell
cd backend
npx prisma generate
```

### Reset local demo data

```bash
docker compose down -v
docker compose up -d postgres
cd backend
npx prisma migrate deploy
npx prisma db seed
```

## Nginx

A reverse-proxy example is available in [deploy/nginx/shop-crm.conf](deploy/nginx/shop-crm.conf). It serves `client/dist`, proxies `/api/` to the API and forwards the `Authorization` header. Replace Windows paths and configure nginx for the target server before deployment.
