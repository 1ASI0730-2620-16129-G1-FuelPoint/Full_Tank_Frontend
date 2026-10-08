# FullTank — B2B Fuel Distribution & Order Management Platform

Web application for managing fuel delivery orders, fleet logistics, tank inventory, and simulated payments between industrial buyers and fuel distribution providers.  
Built with **Vue 3**, **Vite**, **PrimeVue 4**, **Pinia**, **Vue Router 5**, and **Vue I18n 11**.

---

## Tech Stack

| Layer          | Technology                                   |
|----------------|----------------------------------------------|
| Framework      | Vue 3 (`<script setup>` SFCs)                |
| Build Tool     | Vite 8                                       |
| UI Library     | PrimeVue 4 + PrimeFlex 4 + PrimeIcons 7      |
| Theme          | Custom FullTank preset (Material base)       |
| State          | Pinia 3                                      |
| Routing        | Vue Router 5                                 |
| i18n           | Vue I18n 11 (`en-US` default, `es-419`)      |
| Charts         | Chart.js 4                                   |
| Testing        | Vitest 3                                     |
| HTTP Client    | Axios 1                                      |
| Backend Target | ASP.NET Core Web API (Port 5204)             |

---

## Backend Integration & Contracts

> [!IMPORTANT]
> **Backend Service**: The active backend is the ASP.NET Core REST API running at `http://localhost:5204/api/v1`. Backend migrations, schema changes, and persistence are managed by the backend service owner (refer to the backend repository `README.md`).
> 
> **Legacy `server/` Directory**: The `server/` directory contains legacy `json-server` mock artifacts (`db.json`, `routes.json`) kept for historical project reference only. Do **not** run `json-server` for current workflows. The TB1 demo runs on the **in-memory fake API** (`src/shared/infrastructure/fake/`, activated with `VITE_USE_FAKE_API=true`), not on `server/`.

### Server Command Contract
Transactional orchestration is executed atomically on the backend via dedicated command endpoints:
- `POST /api/v1/fuel-requests/{id}/approve` (empty body) &rarr; `OrderResource`
- `POST /api/v1/orders/{id}/dispatch` `{ driverId, vehicleId }` &rarr; `OrderResource`
- `POST /api/v1/orders/{id}/receive` (empty body) &rarr; `OrderResource`
- `POST /api/v1/orders/{id}/cancel` `{ reason }` &rarr; `OrderResource`

The frontend `coordination.service.js` executes these atomic operations via single server calls and triggers in-app state refreshes only upon command confirmation. If a command fails, no stale local refreshes or duplicate notifications occur.

### Onboarding Contract (`registrationToken`)
Registration follows a two-step handshake:
1. Company creation (`POST /api/v1/buyer-companies` or `POST /api/v1/provider-companies`) returns company metadata along with a transient `registrationToken`.
2. User account sign-up (`POST /api/v1/authentication/sign-up`) expects `{ ...userFields, registrationToken }` linking the account to the created company.
3. **Security boundary**: `registrationToken` is strictly held in memory during the registration lifecycle and is never logged or persisted in `localStorage`.

---

## Project Structure

```
src/
├── catalog/              # Provider catalog & fuel request presentation
├── equipment/            # Buyer equipment & consumption tracking
├── fulfillment/          # Fleet, vehicles, and authorized drivers
├── iam/                  # Authentication, JWT sessions, company profiles
├── inventory/            # Tank inventory, stock reservations, bounded refill
├── notification/         # In-app operational alerts (action-refreshed)
├── ordering/             # Fuel requests and delivery orders
├── payment/              # Simulated payments, invoices, breakdown
├── reporting/            # Dashboards & analytical reports
├── shared/               # Cross-cutting BaseApi, coordination, helpers, layout
├── locales/              # en.json (en-US) & es.json (es-419)
├── i18n.js               # Vue I18n configuration
├── router.js             # Vue Router with role guards and public /terms
├── pinia.js              # Pinia root instance
└── main.js               # Application entry point

server/                   # Legacy json-server artifacts (reference only; TB1 demo uses the in-memory fake API)
tests/                    # Vitest unit and regression test suite
```

---

## Getting Started

### Prerequisites

- **Node.js**: Recommended **Node 22.12+** or **Node 24** (Vite 8 requires Node 20.19+ or 22.12+).
- **npm**: npm 10+

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```
The application launches at `http://localhost:5173`. Ensure your ASP.NET Core backend is active at `http://localhost:5204`.

### Run Regression & Unit Tests

```bash
npm test
```
Tests run with an isolated in-memory storage stub and mock endpoints, avoiding live network calls.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```
> [!NOTE]
> Running `npm run preview` evaluates the production configuration (`.env.production`), which sets `VITE_FULLTANK_API_URL=/api/v1`. Without an active reverse proxy or env override (`VITE_FULLTANK_API_URL=http://localhost:5204/api/v1`), preview requests to `/api/v1` will hit the preview server instead of the backend.

---

## Environment Variables & Deployment

| Variable                | Development (`.env.development`) | Production (`.env.production`) | Purpose / Deployment Note |
|-------------------------|----------------------------------|--------------------------------|---------------------------|
| `VITE_FULLTANK_API_URL` | `http://localhost:5204/api/v1`   | `/api/v1`                      | Base URL for Axios requests. |

### Production Reverse Proxy & Firebase Hosting
- **Reverse Proxy Requirement**: When deploying with relative `/api/v1`, an actual reverse proxy (Nginx, Caddy, Cloudflare, Traefik) must be configured to forward `/api/v1/*` requests to the ASP.NET Core backend.
- **Firebase Hosting Caveat**: Firebase Hosting's SPA catch-all rewrite rule (`"source": "**", "destination": "/index.html"`) serves `index.html` for non-file requests and does **not** proxy API traffic to external servers.
- **Direct Backend URL Alternative**: If deploying to static hosting without a reverse proxy, inject the deployed HTTPS backend URL (e.g. `VITE_FULLTANK_API_URL=https://api.fulltank.example.com/api/v1`) at build time and configure the backend's `Cors:AllowedOrigins` to permit the frontend domain.

---

## Bounded Contexts & Disclaimers

| Context | Description & Scope | Status |
|---|---|---|
| **IAM** | Login, registration with `registrationToken` forwarding, JWT interceptor, profile updates. | Implemented |
| **Catalog** | Fuel providers catalog, unit prices, positive price guard, bounded requests. | Implemented |
| **Ordering** | Request lifecycle, atomic single-call approval, dispatch, reception, cancellation. | Implemented |
| **Inventory** | Stock levels, bounded tank refill up to capacity, persistence resilience. | Implemented |
| **Fulfillment** | Fleet vehicles and licensed drivers allocation. | Implemented |
| **Payment** | **Simulated academic demonstration**: generates demo payments and invoices; no real payment gateway, card processing, or financial transactions. | Implemented |
| **Notifications**| **In-app refreshed alerts**: operational notices refreshed upon user actions and store sync; no WebSockets or push notifications. | Implemented |
| **Reporting** | Spending and revenue analytics, Chart.js visualizations. | Implemented |
| **Terms & Disclaimer** | Public `/terms` route containing draft academic terms for local study; non-binding. | Implemented |

---

## Internationalization & Accessibility

- Locales: `en-US` (default) and `es-419`, synchronized with document `lang` attribute and standard `EN`/`ES` language switcher.
- Navigation includes keyboard-accessible `<button>` toggles with `aria-expanded` and semantic icon button labels (`aria-label`).
- Language switcher buttons provide `aria-pressed` indicators.
- Embedded maps and iframes declare descriptive `:title` attributes.
- Semantic `<footer>` included on layout pages with links to `/terms`.
