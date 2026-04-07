# CLAUDE.md

## Project Overview

PPC Lite — a standalone, client-only waypoint editor for creating and exporting paragliding competition waypoints. No backend, no authentication, no save/publish. Extracted from the full PPC project.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server on http://localhost:3000
npm run build        # Production build (outputs to dist/)
npm run lint         # Type-check only (tsc --noEmit)
npm run clean        # Remove dist/
```

No tests configured.

## Architecture

Single-page React app. All state is local — no router, no backend.

- **`src/App.tsx`** — Root component. Manages competition metadata (title, dates, description, banner, participants) and waypoints in local state. Renders sidebar header form and WaypointEditor.
- **`src/components/WaypointEditor.tsx`** — Interactive Leaflet map editor. Handles waypoint CRUD, drag-to-move, drag-border-to-resize, search, import/export.
- **`src/lib/waypoint-export.ts`** — Multi-format import/export (KML, GPX, CUP, WPT, ZIP).
- **`src/types.ts`** — `Waypoint` interface and seed data.
- **`src/index.css`** — Tailwind v4 theme tokens and utility classes.

## Key Technical Details

- **Tailwind CSS v4** via `@tailwindcss/vite` — theme tokens in `src/index.css` `@theme` block.
- **Path alias**: `@/*` maps to `src/` (configured in tsconfig + vite.config).
- **Leaflet CSS** loaded from CDN in `index.html` and also imported in WaypointEditor.
- **No router, no state library, no backend** — all state is local React state.
