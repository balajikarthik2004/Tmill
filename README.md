# tmills-erp

Executive Command Center + ERP prototype for **Thiagarajar Mills (P) Limited** (Kappalur, Madurai, Tamil Nadu) — a textile spinning and weaving manufacturer.

> **Prototype notice.** All operational figures in this app (production volumes, orders, inventory, energy, finance) are **illustrative demo data**, not actual T-Mills operational figures. Only the descriptive company details on the Administration page (profile, product ranges, quality policy, contact details, machinery/lab partners) are drawn from the public website at [tmills.com](https://www.tmills.com/).

## Running it

```bash
pnpm install
pnpm dev        # dev server on http://localhost:5173
pnpm build      # typecheck + production build
pnpm typecheck  # TypeScript project build (strict, zero errors)
pnpm lint       # oxlint
```

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 8 + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-first `@theme` config) |
| Components | shadcn/ui pattern over Radix UI primitives |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | React Router v6 (`createBrowserRouter`) |
| State | Zustand (factory selector, date range, user role) |
| Tables | TanStack Table v8 |
| Dates | date-fns |

## Design system

**"Forest & Cream"** — defined entirely in `src/index.css` (`@theme` + `:root` tokens), so pages
inherit it without local colour choices.

| Role | Token / value |
| --- | --- |
| Shell (sidebar, dark surfaces) | `forest-950 → forest-900` ink green |
| Canvas | warm cream `#f6f4ef` with two very soft emerald/copper blooms |
| Surface | white cards, hairline `border` (warm, not blue-grey), soft ink shadows |
| Primary | emerald `brand-500` `#0f6e56` |
| Accent | copper `copper-500` `#b4632a` — active markers, eyebrow labels, target lines |
| Status | `success` moss · `warning` amber · `danger` brick · `info` slate-teal |
| Charts | `src/lib/chartColors.ts` — six earthy categorical hues, cream-safe |
| Display type | **Sora** (headings, KPI figures via the `.num` utility) |
| UI type | **Inter** (body, tables, controls), tabular figures everywhere |
| Radius / elevation | `--radius: 0.75rem`; warm-ink shadow ramp `shadow-xs … shadow-2xl` |

Utilities worth knowing: `.paper-card` (aliased as `.glass-card`) for the house card treatment,
`.hover-lift` for interactive cards, `.num` for display-font figures, `.section-label` for eyebrow
labels, `.weave` for the woven-cloth texture on dark hero surfaces.

## Architecture

```
src/
  app/          router + providers
  components/
    layout/     Shell, Sidebar, Header, Breadcrumbs
    ui/         shadcn/ui primitives (Radix-based)
    kpi/        KpiCard, TrendPill, Sparkline
    charts/     ProductionTrend, FactoryBars, ProductDonut, EnergyMix
    tables/     DataTable, StatusBadge, RiskBadge
    alerts/     AlertCenter, AlertItem
    ai/         AskTMills assistant panel (UI only, canned responses)
    common/     ComingSoonPage, PeriodDropdown
  pages/        dashboard, sales, admin, …
  mock/         typed mock data modules (never inlined in components)
  services/     async wrappers over mock/ with 150–400 ms simulated latency
  types/        shared domain types
  hooks/        useAsync (loading / error / empty state handling)
  lib/          utils, formatters, navigation tree, seeded RNG
  store/        Zustand app store
```

**Backend swap-in point.** Components never import from `src/mock/` — they call `src/services/`, which today wraps the mock modules in async functions with simulated latency. Replacing those function bodies with REST/GraphQL calls requires no component changes.

**Deterministic demo data.** Mock generators use a seeded PRNG (`src/lib/random.ts`), so figures stay stable across reloads instead of reshuffling on every render.

## Domain model

`Customer → SalesOrder → ProductionOrder → ProductionBatch → Machine → CottonLot → Supplier`, with `QualityTest`, `FinishedGoods` and `Dispatch` attaching to batches. `src/mock/traceability.ts` walks this graph in both directions (`buildTraceGraph`).

Mock dataset: 4 factories, ~40 machines, 20 customers (domestic + Germany/Italy/Bangladesh/Turkey/USA/Japan), 15 suppliers, 238 sales orders, 150 production orders, 36 cotton lots, 30 days of production and energy history, ~50 quality tests, ~30 alerts and activities.

## What's built

**Executive Command Center (`/`)** — fully functional:

- Personalised greeting header with brand banner and live date
- Six KPI cards (Yarn Production, Fabric Production, OEE, Quality Pass Rate, Orders On-Time, Renewable Energy) with trend pills, each linking through to its module
- Production Trend — actual bars vs. target line, period selector, click a bar to drill into `/production?date=…`
- Factory Performance — per-unit achievement bars, clickable
- Production by Product Type — donut with centre total and clickable segments/legend
- Active Orders tiles (On Schedule / At Risk / Delayed / Completed) → filtered order list
- Inventory Overview with reorder-level warnings, Maintenance summary, Energy Consumption donut with kWh/kg vs target
- Recent Alerts and Recent Activities feeds, plus a sustainability banner
- Floating **Ask T-Mills** assistant — chat UI with suggested questions and canned responses (no backend)

**Sales Orders (`/sales/sales-orders`)** — real TanStack Table grid with sorting, pagination, and `?risk=` filtering from the dashboard tiles. Columns: Order ID, Customer, Country, Product, Qty, Due, Production, Quality, Dispatch, Risk.

**Administration (`/admin`)** — company profile, quality & environment policy, product ranges, plant registry, machinery & lab partners, sourced from tmills.com.

Every other sidebar leaf routes to a branded placeholder that carries forward any filters it was navigated with, so no dashboard click is ever a dead end.

**Global filters.** The factory selector and date-range selector in the header (mirrored by the per-card period dropdowns) genuinely filter the dashboard data through the service layer.

## Still to build

Deeper module screens: Sales (customers, enquiries, quotations, export orders, dispatch), Planning, Procurement, Cotton & Raw Materials, Inventory, per-process Production pages plus cotton traceability, Quality, Maintenance, Energy, Finance, HR, Reports, and Master Data CRUD.
