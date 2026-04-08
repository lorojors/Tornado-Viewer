# 🌪️ Tornado Tracker v2.0 — React + TypeScript + Vite

Rewrite of the original vanilla JS app into a typed, component-based architecture.
All Phase 1 and Phase 2 features are preserved exactly.

## Tech stack

| Layer     | Choice          | Why                                                           |
|-----------|-----------------|---------------------------------------------------------------|
| UI        | React 18        | Component model eliminates manual DOM sync                    |
| Language  | TypeScript 5    | Full type safety across TornadoEvent, FilterState, all utils  |
| Build     | Vite 5          | <50ms HMR, native ESM, zero config                           |
| State     | Zustand 4       | Single store replaces all scattered `let` globals             |
| Map       | Leaflet (imperative) | react-leaflet conflicts with markercluster + leaflet.heat |
| Charts    | Chart.js 4      | Managed imperatively via canvas refs + useEffect              |
| CSV       | PapaParse 5     | Same as before                                                |

## Deferred to Phase 3 / 4 (as discussed)

- **Go backend** — needed for Phase 4 (hosted datasets, user accounts)
- **Rust + WASM** — needed for Phase 3 pattern-matching, not current workloads
- **Redis** — needed once a backend serves concurrent users

## Getting started

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # production build to dist/
npm run typecheck  # tsc --noEmit (no build, just type errors)
```

## Project structure

```
src/
  types/        index.ts              — TornadoEvent, FilterState, all domain types
  utils/        columns.ts            — COL_ALIASES + detectColumns()
                parse.ts              — parseRows(), parseDateMs()
                filter.ts             — pure applyFilters(), applySort()
                outbreak.ts           — detectOutbreaks() sliding-window algorithm
                export.ts             — exportFilteredCSV() with File System Access API
                constants.ts          — EF_COLORS, getEfColor(), PAGE_SIZE, MONTHS
  store/        index.ts              — Zustand store + all selectors
  hooks/        useCSVLoader.ts       — PapaParse multi-file hook
                usePlayback.ts        — timeline playback timer hook
  components/   App.tsx               — root, screen routing
                Header.tsx            — logo, stats, theme toggle
                DropZone.tsx          — file drop + column mapper modal
                MapView.tsx           — Leaflet map (imperative)
                FilterPanel.tsx       — all filter controls
                DataTable.tsx         — paginated sortable table + export bar
                AnalyticsPanel.tsx    — 4-tab analytics (Charts/Outbreaks/Trends/Compare)
  styles/       globals.css           — CSS variables + all styles (no CSS modules needed)
  main.tsx      — ReactDOM.createRoot entry point
```

## Key architectural decisions

**Why imperative Leaflet instead of react-leaflet?**
`leaflet.markercluster` and `leaflet.heat` are not aware of React's render cycle.
Using `react-leaflet` would require writing adapter components for both plugins,
which is more code and more surface area for bugs than managing Leaflet directly
in a single `useEffect` inside `MapView.tsx`.

**Why no CSS modules / Tailwind?**
The existing CSS variable system from v1 works perfectly and carries over directly.
Adding a CSS preprocessor for a single-page app with ~400 lines of styles is overhead
without benefit.

**Why Zustand over Redux / Context?**
The store shape is flat, mutations are synchronous, and there are no complex async
flows that need middleware. Zustand eliminates 80% of the boilerplate Redux would
require for the same result.
