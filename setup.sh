#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' 'Installing backend dependencies...'
cd backend
[ -f .env ] || cp .env.example .env
npm ci
npx prisma generate
cd ..

printf '%s\n' 'Installing client dependencies...'
cd client
[ -f .env ] || cp .env.example .env
npm ci
cd ..

printf '%s\n' 'Starting PostgreSQL...'
docker compose up -d --wait postgres

printf '%s\n' 'Applying database migrations and seed data...'
cd backend
npx prisma migrate deploy
npx prisma db seed
cd ..

printf '\n%s\n' 'Setup complete.'
printf '%s\n' 'Terminal 1: cd backend && npm run start:dev'
printf '%s\n' 'Terminal 2: cd client && npm run dev'
printf '%s\n' 'Open: http://localhost:5173'
