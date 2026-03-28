# 🌪️ Tornado Tracker — Storm Intelligence System

A web-based interface for visualizing and analyzing NOAA storm event data. This tool allows users to upload CSV datasets, map columns, filter by EF scale, and export refined data.

## 📖 About

This is a **passion project** developed by **Me!** to streamline the analysis of severe weather events. It provides a clean, intuitive interface for meteorologists, researchers, and weather enthusiasts to interact with storm data without needing complex GIS software.

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
2. **Open** `index.html` in a modern web browser
   > 💡 For best results with local file loading, use a local server (e.g., VS Code Live Server, Python `http.server`)
3. **Upload Data**: Drag & drop a CSV file or click to browse
4. **Map Columns** (if needed): Confirm Latitude/Longitude columns are mapped correctly
5. **Analyze**: Use filters to isolate events; click table rows to center map on specific storms
6. **Export**: Download filtered data for reports or further analysis

## 🛠️ Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom variables, Flexbox, animations
- **JavaScript (Vanilla ES6+)** — No frameworks, pure DOM manipulation
- **Leaflet.js** — Interactive map rendering
- **PapaParse** — Robust CSV parsing in-browser

## 📁 File Structure
```
├──tornado-tracker/
│   ├── index.html # Main application structure
│   ├── style.css # All styling (dark theme, animations, layout)
│   ├── script.js # Core logic: parsing, mapping, filtering, rendering
│   └── README.md # This file
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

## 🎨 Design Notes

- Dark theme optimized for extended data analysis sessions
- EF colors follow NOAA conventions (EF0=Green → EF5=White)
- Monospace fonts for data readability; condensed display fonts for headers
- Smooth animations and hover states for interactive feedback

## 👨‍💻 Author

**Roger**  
*Passion Project*

---
*System Version: 1.0.0*  
*Built with ❤️ for storm chasers and data enthusiasts*
