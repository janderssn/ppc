# PPC Waypoint Editor

A browser-based editor for creating waypoint sets for paragliding **Point Picking Competitions** (PPC), scored on [paralogg.se](https://www.paralogg.se).

**Live:** [ppc.fly.dev](https://ppc.fly.dev)

## What is a PPC?

A Point Picking Competition is a paragliding format where pilots collect points by flying through predefined geographic waypoints. Each waypoint is a cylinder with a center coordinate, a radius and a score value. Pilots upload their GPS tracklogs and the scoring system on [paralogg.se](https://www.paralogg.se) checks which waypoints they passed through.

## Features

- Interactive Leaflet map editor — Ctrl+Click to place waypoints, drag to move, drag borders to resize
- Sidebar with waypoint list, search, radius/score presets
- Competition metadata: title, description, dates, banner image, participant list
- Prebuilt templates (Sala PPC, Lanzarote PPC)
- Import from file: KML, GPX, CUP, WPT, ZIP
- Export individual formats or full ZIP package for submission to paralogg.se

## Publishing a competition

1. Place waypoints and fill in competition details in the sidebar
2. Add participants with their [flightlog.org](https://www.flightlog.org) IDs
3. Click **Export > ZIP** to download the full package
4. Email the ZIP to the paralogg.se administrator to get it published

The ZIP contains:
- `PPC.txt` — title, dates, description
- `waypoints.kml/gpx/cup/wpt` — waypoints in all four formats
- `participants.csv` — pilot names and flightlog IDs
- `banner.jpg/png/webp` — banner image (if added)

## Development

```bash
npm install        # Install dependencies
npm run dev        # Dev server on http://localhost:3000
npm run build      # Production build (dist/)
npm run lint       # Type-check (tsc --noEmit)
```

## Deployment

Deployed on [Fly.io](https://fly.io) as a static site (nginx).

```bash
fly deploy         # Build and deploy to ppc.fly.dev
```

## Tech stack

- React 19, Vite, TypeScript
- Leaflet + react-leaflet (maps)
- Tailwind CSS v4
- fflate (ZIP compression)
- No backend, no router, no database — all state is local
