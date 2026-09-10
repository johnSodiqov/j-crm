# AGENTS.md

## Project status

This repository is a CRM MVP for a retail shop. The project is partially implemented and currently sits in the "functional MVP / needs project-level verification and finishing" stage.

Important:
- Do not commit, push, or modify Git history without explicit user approval.
- Before making changes, read the existing implementation and reuse current database/API patterns instead of creating parallel structures.
- Prefer fixing the current logic over rewriting large modules.

## Project summary

Stack:
- Frontend: React + Vite + TypeScript + Tailwind
- Backend: NestJS + Prisma + PostgreSQL
- Auth: JWT + bcrypt + role-based guards

Main directories:
- backend/
- client/
- deploy/nginx/

## What is already implemented

### Core backend
Implemented in the current codebase:
- JWT login flow and role-based auth guards
- Prisma schema with sales, products, customers, suppliers, expenses, stocks, debts, returns
- Product CRUD and archive flow
- Categories
- Sales creation with stock decrements and stock movements
- Returns with stock restoration
- Customer debts and debt payments
- Supplier purchases and supplier payments
- User management and admin/seller roles
- Expense creation and reporting data
- Dashboard aggregate data
- Reports and filters
- Audit log

Relevant files:
- backend/src/app.controller.ts
- backend/src/app.service.ts
- backend/src/common/auth.guard.ts
- backend/src/common/role.guard.ts
- backend/prisma/schema.prisma

### Frontend
Implemented in the current UI:
- Login screen
- Shell/navigation
- Dashboard page
- Products page
- Sales page
- Customers page
- Purchases page
- Expenses page
- Suppliers page
- Debts page
- Returns page
- Reports page
- Warehouse page
- Warehouse history page
- Users page
- Audit page
- TODO page with task creation, completion status, creator, completer, and timestamps

Relevant files:
- client/src/App.tsx
- client/src/pages/*
- client/src/components/*
- client/src/api/client.ts

### Deployment
- nginx config exists for reverse proxy and static frontend serving
- proxy config points API requests to backend

Relevant files:
- deploy/nginx/nginx.conf
- deploy/nginx/shop-crm.conf

## What is not fully implemented / not verified yet

The following items from the technical specification are not fully finished, or at least not confirmed as working in the current environment.

### 1) Dashboard completeness
The dashboard exists, but the specification demands more detailed metrics and automatic cross-linking. The current code includes some values, but not all required items in the same structure and not all are guaranteed to be completely aligned with the full business logic.

Required final state:
- total customer debt
- total number of clients
- available cash balance
- sales count for current month
- expenses for current month
- revenue for current month
- profit for current month
- customer debts
- supplier debts
- current USD rate
- drill-down links from metrics to relevant sections

### 2) Payment methods in sales
The schema includes mixed payment methods, but the full business flow must be checked against the spec and current UI logic.

Required final state:
- explicit payment method selection in sale creation
- cash, card, transfer, debt, mixed
- mixed payment splits should sum to total
- debt field should create a debt for a selected customer
- UI + API + calculation must be verified end-to-end

### 3) Seller restrictions
The app has a role system, but some business restrictions must be validated against the TZ.

Required final state:
- sellers must not see purchase cost, profit, supplier debt, financial analytics, balance, etc.
- admin can see full financial data
- seller queries must hide sensitive values in API responses

### 4) Analytics section
The project has a reports page, but the technical specification requires a dedicated analytics section with richer period filters and graphs.

Required final state:
- today, yesterday, current week, current month, previous month, custom range
- sales analytics
- expense analytics
- warehouse analytics
- general financial balance report
- charts by day and category

### 5) Debts and customer/supplier profiles
There is debt logic and supplier purchase logic, but the final TZ requires richer debt management and profile views.

Required final state:
- separate debts section for customers and suppliers
- overdue/active/upcoming/paid classification
- customer profile with checks, debts, payments
- supplier profile with purchase/payment history and debt state
- due date and debt age logic

### 6) Expense categories and accounting
There is an expense system, but the TZ demands structured categories and automatic inclusion in analytics/balance.

Required final state:
- standard categories for utilities, salary, taxes, supplies, hire, founder expenses, other
- automatic inclusion in analytics and balance
- responsible employee assignment

### 7) True cost / actual product cost
The schema includes product purchase price, but the TZ asks for actual cost including logistics, unloading, and other distribution costs.

Required final state:
- cost distribution between products when some expenses are shared
- actual cost logic rather than only purchase price
- cost should affect profit calculations consistently

### 8) Final validation and regression checks
These have not yet been proven as a completed end-to-end run.

Must still be verified:
- sale creation
- sale on credit
- mixed payment
- customer debt payment
- purchase creation
- supplier debt
- supplier payment
- expense creation
- product stock reduction
- return flow
- cost and profit calculation
- dashboard update after each operation
- analytics generation
- balance report
- admin vs seller permissions

### 9) Localization and themes
RU/UZ localization and theme support are started in the client, but full page coverage remains:
- language switcher with Russian and Uzbek translations is implemented
- shared navigation, headers, login, tables, dashboard, sales, TODO, and report controls use translation resources
- selected language is persisted for the current browser
- add a theme switcher with light and dark themes
- persist the selected theme and verify all pages, forms, tables, dropdowns, charts, modals, and mobile layouts in both themes
- keep light as the default theme and ensure readable contrast in dark mode

### 10) Task management
Implemented in the current MVP:
- persistent tasks with TODO and DONE statuses
- task creator and completion user
- creation and completion timestamps
- `/todo` page with new and completed task sections
- API routes for listing, creating, and completing tasks

## Current status verdict

Current stage:
- Backend and frontend MVP architecture: implemented
- Business logic coverage: mostly implemented, but some TZ items are incomplete or not confirmed
- Final verification: not fully complete
- Production readiness: not yet confirmed

## Highest-priority next tasks

1. Validate current environment and database connection
2. Run Prisma generate/migrate/seed and confirm backend starts cleanly
3. Check JWT auth and protected endpoints after proxying / Nginx config
4. Validate seller/admin role restrictions with live requests
5. Confirm sales, debt, purchase, return, and expense flows end-to-end
6. Implement missing analytics and dashboard fields from the spec
7. Finish debt profile and supplier profile requirements
8. Reconcile expense and cost calculations with real financial balance formula
9. Finish RU/UZ localization and complete light/dark theme coverage

## Verification status

Verified in this session:
- backend build compiles successfully with `npm run build` from backend
- client build succeeds with `npm run build` from client
- auth guard fix was applied to handle Authorization headers more robustly
- Nginx config was updated to forward Authorization headers

Not yet fully verified live:
- login flow in running environment
- sales + debt flows in browser
- all dashboard metrics
- analytics report results
- seller restrictions in real UI flows
- Nginx deployment in actual Windows environment

## Rules for future agents

- Read the current app before editing.
- Do not create parallel structures if a model or API route already exists.
- Prefer incremental fixes over large rewrites.
- When implementing TZ features, first check whether the database schema already supports them.
- If you change financial logic, verify both backend calculations and frontend display together.
- Keep all money values consistent with Prisma Decimal usage.
- Never commit or push without explicit user approval.
