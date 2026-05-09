# 🌪️ Tornado Tracker — Storm Intelligence System

A web-based interface for visualizing and analyzing NOAA storm event data. This tool allows users to upload CSV datasets, map columns, filter by EF scale, and export refined data.

## 📖 About

This is a **passion project** developed by **Roger** to streamline the analysis of severe weather events. It provides a clean, intuitive interface for meteorologists, researchers, and weather enthusiasts to interact with storm data without needing complex GIS software.

## ✨ Features

- **CSV Upload**: Drag & drop support for NOAA SPC Storm Events DB files or custom CSVs
- **Smart Column Mapping**: Auto-detects common column names (lat, lon, EF, etc.) with manual override
- **Interactive Leaflet Map**: Visualizes storm paths with color-coded EF intensity markers
- **Advanced Filtering**: Filter by EF Scale (EF0–EF5), State, Month, Date Range, and free-text search
- **Sortable Data Table**: Click headers to sort; click rows to highlight on map
- **Export Functionality**: Download filtered results as CSV
- **Responsive Dark UI**: Optimized for data visibility with radar-style aesthetics

## 🚀 Usage

1. **Clone or download** this repository
2. npm install
   npm run dev        # → http://localhost:5173
   npm run build      # production build to dist/
   npm run typecheck  # tsc --noEmit (no build, just type errors)
3. **Upload Data**: Drag & drop a CSV file or click to browse
4. **Map Columns** (if needed): Confirm Latitude/Longitude columns are mapped correctly
5. **Analyze**: Use filters to isolate events; click table rows to center map on specific storms
6. **Export**: Download filtered data for reports or further analysis

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


## 📁 File Structure

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

## 🗂️ Expected CSV Columns

The app auto-detects these common column names:

| Field | Accepted Column Names |
|-------|----------------------|
| ID | `om`, `tornado_id`, `id`, `event_id` |
| Date | `date`, `event_date`, `begin_date` |
| State | `st`, `state` |
| Start Lat | `slat`, `start_lat`, `lat`, `latitude` |
| Start Lon | `slon`, `start_lon`, `lon`, `longitude` |
| EF Scale | `mag`, `ef_scale`, `f_scale`, `ef` |
| Length | `len`, `length_miles`, `path_length` |
| Fatalities | `fat`, `fatalities`, `deaths_direct` |
| Damage | `loss`, `damage_millions`, `damage` |

> ⚠️ **Latitude and Longitude are required** for mapping. Other fields are optional.

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

## 🎨 Design Notes

- Dark theme optimized for extended data analysis sessions
- EF colors follow NOAA conventions (EF0=Green → EF5=Pink)
- Monospace fonts for data readability; condensed display fonts for headers
- Smooth animations and hover states for interactive feedback

## 👨‍💻 Author

**Roger**  
*Passion Project*

---

## 🗺️ Development Roadmap

The goal is to evolve Tornado Tracker from a single-session CSV viewer into a full-featured severe weather research platform. The roadmap is organised into four phases, each building on the last.

---

### Phase 1 — Foundation & Polish *COMPLETED*

Solidify the core experience before layering on complexity.

- **Date range picker** — Replace the coarse time slider with explicit start/end date inputs for precise event windowing.
- **Marker clustering** — Integrate `Leaflet.markercluster` to group dense markers at low zoom levels; prevents overplotting on national-scale views.
- **Year & county filters** — Extend the filter panel with year and county dropdowns to complement the existing state and month selectors.
- **Table pagination / virtualisation** — Paginate or virtualise the event table so 50,000-row datasets load without freezing the browser.
- **Path width visual encoding** — Scale polyline stroke width by tornado path width (in yards) for a more physically accurate map representation.
- **Multi-file merge** — Allow dragging in multiple CSV files at once and merging them into a single working dataset.

---

### Phase 2 — Analytics & Charts *(Mostly implemented, main focus right now is making the UI more user friendly and optimizing performance)*

Turn raw event data into insight without leaving the browser.

- **Stats dashboard panel** — A collapsible side panel with bar and line charts (Chart.js or D3): events by EF scale, by month, by state, and damage trends.
- **Outbreak detection** — Cluster events by date proximity (within ±24 hours and ±100 km) to automatically flag outbreak days and display them as grouped records.
- **Density heatmap layer** — A toggleable `Leaflet.heat` layer weighted by fatalities, injuries, or EF scale to reveal the historical Tornado Alley and Dixie Alley boundaries from the data itself.
- **Animated timeline playback** — Play events forward chronologically with play/pause/speed controls to visualise how an outbreak propagated across a region.
- **Trend analysis** — Year-over-year and decade-over-decade trend lines for event frequency, fatality rates, and inflation-adjusted damage totals.
- **Comparison mode** — Load two datasets or two filtered date ranges side by side on a split map or dual chart for before/after and regional comparisons.

---

### Phase 3 — Intelligence & Live Data *(Medium-term, 2–4 months)*

Connect to live sources and add research-grade analytical features.

- **NOAA SPC live feed** — Fetch live storm reports directly from NOAA SPC GeoJSON endpoints so researchers can monitor active events without preparing a CSV.
- **NEXRAD radar overlay** — Integrate NOAA radar WMS tiles into the Leaflet map so tornado paths can be contextualised with reflectivity imagery at the time of the event.
- **Risk zone mapping** — Score and choropleth-shade counties by historical risk using event frequency, EF distribution, and population-normalised fatality rates.
- **Report builder** — Generate a shareable one-page PDF or HTML summary of the current filtered view: header stats, map snapshot, and key findings — suitable for inclusion in research documents.
- **Pattern matching** — Given a selected event, surface the N most historically similar tornadoes by track geometry, EF rating, and season for analogous-event research.
- **Event annotations** — Allow researchers to attach timestamped notes, external links (e.g. to storm surveys or news archives), and custom tags to individual records, stored in `localStorage`.

---

### Phase 4 — Platform & Collaboration *(Long-term, 4–12 months)*

Graduate from a local tool to a shared research platform.

- **Hosted backend** — Server-side storage (e.g. Supabase or a lightweight Node/Python API) for user accounts, saved filter presets, and persistent dataset uploads.
- **Shareable URLs** — Encode the full application state (active filters, map centre, zoom, selected event) into a permalink so a specific view can be bookmarked or shared with a colleague.
- **Community datasets** — A contribution system where vetted users can submit, peer-review, and flag community-curated datasets (e.g. pre-cleaned multi-decade NOAA archives).
- **Embeddable widget & REST API** — An iframe-embeddable map widget and a lightweight REST API so other weather sites and educators can surface Tornado Tracker views without building their own.
- **ML damage prediction** — A trained regression model (using historical path length, width, EF, and population density) that estimates likely fatalities and property damage for newly entered events.
- **Mobile PWA** — Progressive Web App packaging with a service worker cache so field researchers can load a dataset before heading out and use the tool offline.

---

### Guiding Principles

- **Privacy first** — All data processing remains in-browser until a hosted backend is explicitly added. No data is sent anywhere without the user's knowledge.
- **Research-grade accuracy** — Every data transformation (unit detection, damage normalisation, EF parsing) should be transparent and auditable.
- **Accessible by default** — Keyboard navigation, sufficient colour contrast, and screen-reader-friendly markup should be maintained at every phase.

---

*System Version: 1.0.0*  
*Built with ❤️ for storm chasers and data enthusiasts*
