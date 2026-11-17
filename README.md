# FaCICuSe — Connected Insights, Coordinated Spaces

FaCICuSe is a full-stack university facility management, reservation coordination, and maintenance tracking web application.

## Architecture (Hexagonal / Ports & Adapters)

- `client/` — Pure JavaScript React (`JSX`) + semantic HTML5 + plain CSS3 glassmorphism interface.
  - `client/styles/` — Design tokens, responsive grid layouts, and Glassy Dashboard V24 + Navigation Tabs V10 components.
  - `client/pages/` — Public website (`/`, `/facilities`, `/facilities/:id`, `/signin`) and authenticated role workspaces (`/app/*`).
  - `client/services/` — Fetch API client and Firebase client SDK adapter.
- `server/domain/` — Pure JavaScript domain entities, value objects (`TimeSlot`, `EmailDomainPolicy`), invariants, and metric calculations with zero framework or driver dependencies.
- `server/application/` — Application port contracts (`ports.js`) and use cases (`facilityUseCases`, `reservationUseCases`, `maintenanceUseCases`, `userUseCases`, `dashboardUseCases`, `analyticsUseCases`).
- `server/adapters/inbound/` — Express REST routes, authentication/role middleware, HTTP controllers, and domain error mapping.
- `server/adapters/outbound/` — PostgreSQL Drizzle repositories, Firebase Admin token verification + signed demo session adapter, and idempotent seed service.
- `server/infrastructure/` — Environment configuration and Composition Root (`container.js`).
- `src/db/` — Cloud SQL PostgreSQL connection pool and Drizzle schema (`schema.ts`, `drizzle.config.ts`).

## Environment Configuration

See `.env.example` for all required variables:

- `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` — Cloud SQL PostgreSQL connection credentials.
- `ALLOWED_UNIVERSITY_DOMAINS` — Comma-separated official university domains allowed to register via Google Sign-In (optional during evaluation; configure for campus production).
- `ADMIN_BOOTSTRAP_EMAILS` — Comma-separated emails automatically granted System Administrator access upon verified sign-in.
- `SESSION_SECRET` — Server-side HMAC secret for demo sandbox session cookies.

## Verification & Running

- Domain Unit Tests: `npm test` (`node --test server/domain/rules.test.js`)
- Development Server: `npm run dev` (Express + Vite middleware on port `3000`)
- Production Build: `npm run build` followed by `npm start`
