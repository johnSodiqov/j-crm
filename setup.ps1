$ErrorActionPreference = 'Stop'

Write-Host 'Installing backend dependencies...'
Push-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npx prisma generate
Pop-Location

Write-Host 'Installing client dependencies...'
Push-Location client
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
Pop-Location

Write-Host 'Starting PostgreSQL...'
docker compose up -d --wait postgres

Write-Host 'Applying database migrations and seed data...'
Push-Location backend
npx prisma migrate deploy
npx prisma db seed
Pop-Location

Write-Host ''
Write-Host 'Setup complete.'
Write-Host 'Terminal 1: cd backend; npm run start:dev'
Write-Host 'Terminal 2: cd client; npm run dev'
Write-Host 'Open: http://localhost:5173'
