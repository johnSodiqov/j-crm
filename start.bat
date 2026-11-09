@echo off
setlocal
cd /d "%~dp0"
set "ROOT=%~dp0"
title Shop CRM

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js is required. Install Node.js 20 or newer, then run this file again.
    goto failed
)

where npm >nul 2>&1
if errorlevel 1 (
    echo npm is required. Reinstall Node.js with npm, then run this file again.
    goto failed
)

node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)"
if errorlevel 1 (
    echo Node.js 20 or newer is required. Upgrade Node.js, then run this file again.
    goto failed
)

if not exist "%ROOT%backend\.env" (
    copy "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
    if errorlevel 1 (
        echo Could not create backend\.env from its example.
        goto failed
    )
    echo Created backend\.env. Check that DATABASE_URL matches your local PostgreSQL setup.
)

if not exist "%ROOT%client\.env" (
    copy "%ROOT%client\.env.example" "%ROOT%client\.env" >nul
    if errorlevel 1 (
        echo Could not create client\.env from its example.
        goto failed
    )
)

if not exist "%ROOT%backend\node_modules" goto install_backend
if not exist "%ROOT%backend\node_modules\bcryptjs" goto install_backend
goto check_client

:install_backend
echo Installing backend dependencies...
pushd "%ROOT%backend"
call npm ci
if errorlevel 1 (
    popd
    echo Backend dependency installation failed.
    goto failed
)
popd

:check_client
if not exist "%ROOT%client\node_modules" goto install_client
goto prepare_database

:install_client
echo Installing client dependencies...
pushd "%ROOT%client"
call npm ci
if errorlevel 1 (
    popd
    echo Client dependency installation failed.
    goto failed
)
popd

:prepare_database
pushd "%ROOT%backend"
echo Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    popd
    echo Prisma Client generation failed.
    goto failed
)
echo Checking PostgreSQL connection and applying migrations...
call npx prisma migrate deploy
if errorlevel 1 (
    popd
    echo Could not connect to PostgreSQL or apply database migrations.
    echo Make sure the PostgreSQL service is running, the shop_crm database exists,
    echo and DATABASE_URL in backend\.env has the correct connection details.
    goto failed
)

if not exist "node_modules\.shop-crm-seeded" (
    echo Adding demo users and sample products...
    call npx prisma db seed
    if errorlevel 1 (
        popd
        echo Database seeding failed.
        goto failed
    )
    type nul > "node_modules\.shop-crm-seeded"
)
popd

echo Starting the API and web application...
start "Shop CRM API" /D "%ROOT%backend" cmd /k "npm run start:dev"
start "Shop CRM Web" /D "%ROOT%client" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"
echo Shop CRM is starting. Keep the API and Web windows open while using it.
exit /b 0

:failed
echo.
pause
exit /b 1
