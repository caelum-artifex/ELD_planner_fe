# Frontend — Trip + ELD Planner UI

React + Vite single-page application that lets drivers enter trip details and instantly generates a route map, duty timeline, turn-by-turn instructions, and FMCSA-style daily ELD log sheets.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite 5 |
| Map | React-Leaflet + OpenStreetMap (free, no API key) |
| Styling | Plain CSS (custom design system) |
| HTTP | Native `fetch` |

---

## Project structure

```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── .env.example            # Copy to .env for local dev
└── src/
    ├── main.jsx            # App entry point
    ├── App.jsx             # All UI components and page layout
    └── styles.css          # Global design system styles
```

---

## Local setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if backend runs on a different port/host

# Start dev server
npm run dev
```

App available at: `http://0.0.0.0:5173`

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE` | `http://127.0.0.1:8000/api` | Backend API base URL |

Set `VITE_API_BASE` to your live backend URL when deploying.

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server with HMR |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## UI sections

### Trip Inputs
Four fields: Current Location, Pickup Location, Dropoff Location, Current Cycle Used (hours). All geocoded by the backend via Nominatim.

### KPI cards
Summary stats returned from the API: total distance, estimated drive time, projected cycle used, total turn-by-turn steps.

### Route Map
Interactive Leaflet map showing the full route polyline (blue) and three stop markers (current, pickup, dropoff) with popups.

### Drive Instructions
Tabbed panel — switch between **Current → Pickup** and **Pickup → Dropoff** legs. All steps are shown in a scrollable list with step number, maneuver instruction, road name, and distance.

### Duty Timeline & Rest Events
Responsive auto-fill grid of event cards. Each card shows the time range, status, notes, and duration. Cards are colour-coded by status:

| Colour | Status |
|---|---|
| 🟢 Green left bar | Driving |
| 🔵 Blue left bar | Sleeper Berth |
| 🔴 Red left bar | On Duty (Not Driving) |
| ⚫ Grey left bar | Off Duty |

### Daily Log Sheets
One SVG log sheet rendered per calendar day, matching the FMCSA 49 CFR 395 paper log grid:
- FMCSA hour labels (M / 1–11 / N / 1–11 / M)
- Four colour-coded row bands (Off Duty / Sleeper / Driving / On Duty)
- Filled bars for each duty segment
- Totals footer: Driving / On Duty (Stop) / Sleeper / Off Duty (driving time is **not** double-counted in on-duty total)

---

## Deployment (Vercel)

1. Push the `frontend/` folder (or whole repo) to GitHub.
2. Import the project in [vercel.com](https://vercel.com).
3. Set the **Root Directory** to `frontend`.
4. Add the environment variable:
   ```
   VITE_API_BASE = https://your-backend.onrender.com/api
   ```
5. Deploy — Vercel auto-detects Vite and runs `npm run build`.
