import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import type { Waypoint } from "../types";

// --- Helpers ---

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDescription(wp: Waypoint): string {
  const label = wp.description || wp.name;
  return `${label} (${wp.score} p) Cyl: ${wp.radius} m`;
}

function formatCupDescription(wp: Waypoint): string {
  return `${wp.name} -${wp.score} p- Cyl- ${wp.radius} m`;
}

function decimalToCupLat(decimal: number): string {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const hemisphere = decimal >= 0 ? "N" : "S";
  return `${String(degrees).padStart(2, "0")}${minutes.toFixed(3).padStart(6, "0")}${hemisphere}`;
}

function decimalToCupLon(decimal: number): string {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const hemisphere = decimal >= 0 ? "E" : "W";
  return `${String(degrees).padStart(3, "0")}${minutes.toFixed(3).padStart(6, "0")}${hemisphere}`;
}

// --- Export functions ---

function exportToKml(waypoints: Waypoint[]): string {
  const placemarks = waypoints
    .map(
      (wp) => `      <Placemark>
        <name>${escapeXml(wp.name)}</name>
        <description>${escapeXml(formatDescription(wp))}</description>
        <Point>
        <coordinates>${wp.lng},${wp.lat},0</coordinates>
        </Point>
      </Placemark>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://earth.google.com/kml/2.1">
  <Document>
    <Folder>
      <name>Waypoints</name>
${placemarks}
    </Folder>
  </Document>
</kml>
`;
}

function exportToCup(waypoints: Waypoint[]): string {
  const header = "name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc";
  const rows = waypoints.map((wp) => {
    const name = `"${formatCupDescription(wp).replace(/"/g, "'")}"`;
    const code = wp.name.slice(0, 6).toUpperCase();
    const lat = decimalToCupLat(wp.lat);
    const lon = decimalToCupLon(wp.lng);
    return `${name},${code},,${lat},${lon},0.0m,1,,,,`;
  });
  return [header, ...rows].join("\n") + "\n";
}

function exportToGpx(waypoints: Waypoint[]): string {
  const wpts = waypoints
    .map(
      (wp) => `  <wpt lat="${wp.lat}" lon="${wp.lng}">
    <ele>0</ele>
    <name>${escapeXml(wp.name)}</name>
    <cmt>${escapeXml(formatDescription(wp))}</cmt>
    <desc>${escapeXml(formatDescription(wp))}</desc>
    <sym>Dot</sym>
  </wpt>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"
     creator="PPC"
     version="1.1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
${wpts}
</gpx>
`;
}

function exportToWpt(waypoints: Waypoint[]): string {
  const header = [
    "OziExplorer Waypoint File Version 1.1",
    "WGS 84",
    "Reserved 2",
    "Reserved 3",
  ].join("\n");

  const rows = waypoints.map((wp, i) => {
    const desc = formatDescription(wp);
    return `${i + 1},${wp.name},${wp.lat},${wp.lng},,0,1,3,0,65535,${desc},0,0,0,0`;
  });

  return [header, ...rows].join("\n") + "\n";
}

// --- Import functions ---

export function parseKml(kmlText: string): Waypoint[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, "text/xml");
  const placemarks = doc.querySelectorAll("Placemark");
  const waypoints: Waypoint[] = [];

  placemarks.forEach((pm) => {
    const name = pm.querySelector("name")?.textContent?.trim() || "";
    const description = pm.querySelector("description")?.textContent?.trim() || "";
    const coords = pm.querySelector("coordinates")?.textContent?.trim() || "";

    const [lngStr, latStr] = coords.split(",");
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);
    if (isNaN(lng) || isNaN(lat)) return;

    // Parse description: "Description (score p) Cyl: radius m"
    let score = 1;
    let radius = 400;
    let wpDesc = "";
    const scoreMatch = description.match(/\((\d+)\s*p\)/);
    if (scoreMatch) score = parseInt(scoreMatch[1], 10);
    const radiusMatch = description.match(/Cyl:\s*(\d+)\s*m/);
    if (radiusMatch) radius = parseInt(radiusMatch[1], 10);
    const descLabelMatch = description.match(/^(.+?)\s*\(/);
    if (descLabelMatch) wpDesc = descLabelMatch[1].trim();

    waypoints.push({
      id: Math.random().toString(36).substr(2, 9),
      name,
      description: wpDesc !== name ? wpDesc : "",
      score,
      radius,
      lat,
      lng,
    });
  });

  return waypoints;
}

export function parseGpx(gpxText: string): Waypoint[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxText, "text/xml");
  const wpts = doc.querySelectorAll("wpt");
  const waypoints: Waypoint[] = [];

  wpts.forEach((wpt) => {
    const lat = parseFloat(wpt.getAttribute("lat") || "");
    const lng = parseFloat(wpt.getAttribute("lon") || "");
    if (isNaN(lat) || isNaN(lng)) return;

    const name = wpt.querySelector("name")?.textContent?.trim() || "";
    const desc = wpt.querySelector("desc")?.textContent?.trim() || wpt.querySelector("cmt")?.textContent?.trim() || "";

    let score = 1;
    let radius = 400;
    let wpDesc = "";
    const scoreMatch = desc.match(/\((\d+)\s*p\)/);
    if (scoreMatch) score = parseInt(scoreMatch[1], 10);
    const radiusMatch = desc.match(/Cyl:\s*(\d+)\s*m/);
    if (radiusMatch) radius = parseInt(radiusMatch[1], 10);
    const descLabelMatch = desc.match(/^(.+?)\s*\(/);
    if (descLabelMatch) wpDesc = descLabelMatch[1].trim();

    waypoints.push({ id: Math.random().toString(36).substr(2, 9), name, description: wpDesc !== name ? wpDesc : "", score, radius, lat, lng });
  });

  return waypoints;
}

export function parseCup(cupText: string): Waypoint[] {
  const lines = cupText.trim().split("\n");
  if (lines.length < 2) return [];

  const waypoints: Waypoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV: name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc
    const parts: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { parts.push(current); current = ""; continue; }
      current += ch;
    }
    parts.push(current);

    if (parts.length < 5) continue;

    const rawName = parts[0].trim();
    const latStr = parts[3].trim();
    const lonStr = parts[4].trim();

    const lat = cupCoordToDecimal(latStr, "NS");
    const lng = cupCoordToDecimal(lonStr, "EW");
    if (isNaN(lat) || isNaN(lng)) continue;

    // Try to extract score/radius from name: "Name -score p- Cyl- radius m"
    let name = rawName;
    let score = 1;
    let radius = 400;
    const scoreMatch = rawName.match(/-(\d+)\s*p-/);
    if (scoreMatch) score = parseInt(scoreMatch[1], 10);
    const radiusMatch = rawName.match(/Cyl-\s*(\d+)\s*m/);
    if (radiusMatch) radius = parseInt(radiusMatch[1], 10);
    // Clean name: take text before first dash pattern
    const cleanMatch = rawName.match(/^(.+?)\s+-\d+/);
    if (cleanMatch) name = cleanMatch[1].trim();

    waypoints.push({ id: Math.random().toString(36).substr(2, 9), name, description: "", score, radius, lat, lng });
  }

  return waypoints;
}

function cupCoordToDecimal(coord: string, hemispheres: string): number {
  if (!coord) return NaN;
  const hem = coord.slice(-1).toUpperCase();
  const numeric = coord.slice(0, -1);
  const degLen = hemispheres === "NS" ? 2 : 3;
  const degrees = parseInt(numeric.slice(0, degLen), 10);
  const minutes = parseFloat(numeric.slice(degLen));
  if (isNaN(degrees) || isNaN(minutes)) return NaN;
  const decimal = degrees + minutes / 60;
  return hem === "S" || hem === "W" ? -decimal : decimal;
}

export function parseWpt(wptText: string): Waypoint[] {
  const lines = wptText.trim().split("\n");
  // Skip 4-line OziExplorer header
  const waypoints: Waypoint[] = [];
  for (let i = 4; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 5) continue;
    const name = parts[1]?.trim() || "";
    const lat = parseFloat(parts[2]);
    const lng = parseFloat(parts[3]);
    if (isNaN(lat) || isNaN(lng)) continue;

    let score = 1;
    let radius = 400;
    const desc = parts[10] || "";
    let wpDesc = "";
    const scoreMatch = desc.match(/\((\d+)\s*p\)/);
    if (scoreMatch) score = parseInt(scoreMatch[1], 10);
    const radiusMatch = desc.match(/Cyl:\s*(\d+)\s*m/);
    if (radiusMatch) radius = parseInt(radiusMatch[1], 10);
    const descLabelMatch = desc.match(/^(.+?)\s*\(/);
    if (descLabelMatch) wpDesc = descLabelMatch[1].trim();

    waypoints.push({ id: Math.random().toString(36).substr(2, 9), name, description: wpDesc !== name ? wpDesc : "", score, radius, lat, lng });
  }
  return waypoints;
}

export interface ZipImportResult {
  waypoints: Waypoint[];
  participants: Array<{ name: string; flightlogId: string }>;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  bannerUrl?: string | null;
}

function parseCsvParticipants(csvText: string): Array<{ name: string; flightlogId: string }> {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  const result: Array<{ name: string; flightlogId: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Simple CSV: "Name",flightlogId  or  Name,flightlogId
    const parts: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { parts.push(current); current = ""; continue; }
      current += ch;
    }
    parts.push(current);
    const name = parts[0]?.trim() || "";
    const flightlogId = parts[1]?.trim() || "";
    if (name) result.push({ name, flightlogId });
  }
  return result;
}

export function parseZip(zipData: ArrayBuffer): ZipImportResult {
  const files = unzipSync(new Uint8Array(zipData));

  // Waypoints: priority order kml > gpx > cup > wpt
  const parsers: Array<{ ext: string; parse: (text: string) => Waypoint[] }> = [
    { ext: ".kml", parse: parseKml },
    { ext: ".gpx", parse: parseGpx },
    { ext: ".cup", parse: parseCup },
    { ext: ".wpt", parse: parseWpt },
  ];

  let waypoints: Waypoint[] = [];
  for (const { ext, parse } of parsers) {
    const entry = Object.keys(files).find((name) => {
      const base = name.split("/").pop() || name;
      return base.toLowerCase().endsWith(ext);
    });
    if (entry) {
      const text = strFromU8(files[entry]);
      const result = parse(text);
      if (result.length > 0) { waypoints = result; break; }
    }
  }

  // Participants from CSV
  let participants: Array<{ name: string; flightlogId: string }> = [];
  const csvEntry = Object.keys(files).find((name) => {
    const base = name.split("/").pop() || name;
    return base.toLowerCase().endsWith(".csv");
  });
  if (csvEntry) {
    participants = parseCsvParticipants(strFromU8(files[csvEntry]));
  }

  // PPC.txt metadata
  let title: string | undefined;
  let description: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;
  const ppcEntry = Object.keys(files).find((name) => {
    const base = name.split("/").pop() || name;
    return base.toLowerCase() === "ppc.txt";
  });
  if (ppcEntry) {
    const lines = strFromU8(files[ppcEntry]).split("\n").map((l) => l.trimEnd());
    // Format: line 0 = title, line 2 = "Dates: YYYY-MM-DD - YYYY-MM-DD", line 4+ = description
    if (lines[0]?.trim()) title = lines[0].trim();
    const datesLine = lines.find((l) => l.startsWith("Dates:"));
    if (datesLine) {
      const match = datesLine.match(/Dates:\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
      if (match) {
        startDate = match[1];
        endDate = match[2];
      }
    }
    // Description = everything after the dates line (skip blank lines between)
    const datesIdx = lines.findIndex((l) => l.startsWith("Dates:"));
    if (datesIdx >= 0) {
      const descLines = lines.slice(datesIdx + 1);
      // Trim leading blank lines
      while (descLines.length > 0 && !descLines[0].trim()) descLines.shift();
      if (descLines.length > 0) description = descLines.join("\n").trimEnd();
    }
  }

  // Banner image
  let bannerUrl: string | null = null;
  const imgEntry = Object.keys(files).find((name) => {
    const base = name.split("/").pop() || name;
    return /\.(jpe?g|png|webp)$/i.test(base);
  });
  if (imgEntry) {
    const ext = imgEntry.split(".").pop()!.toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const bytes = files[imgEntry];
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    bannerUrl = `data:${mime};base64,${btoa(binary)}`;
  }

  return { waypoints, participants, title, description, startDate, endDate, bannerUrl };
}

// --- Download trigger ---

export interface ZipExportData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  participants: Array<{ name: string; flightlogId: string }>;
}

export type ExportFormat = "wpt" | "cup" | "gpx" | "kml";

export function downloadWaypoints(
  waypoints: Waypoint[],
  format: ExportFormat,
  filename = "waypoints"
): void {
  const exporters: Record<ExportFormat, (wps: Waypoint[]) => string> = {
    kml: exportToKml,
    cup: exportToCup,
    gpx: exportToGpx,
    wpt: exportToWpt,
  };

  const mimeTypes: Record<ExportFormat, string> = {
    kml: "application/vnd.google-earth.kml+xml",
    cup: "text/plain",
    gpx: "application/gpx+xml",
    wpt: "text/plain",
  };

  const content = exporters[format](waypoints);
  const blob = new Blob([content], { type: mimeTypes[format] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadZipExport(
  waypoints: Waypoint[],
  data: ZipExportData,
): void {
  const slug = data.title.replace(/[^a-zA-Z0-9]+/g, "_").replace(/_+$/, "");
  const files: Record<string, Uint8Array> = {};

  // PPC.txt
  const lines = [
    data.title,
    "",
    `Dates: ${data.startDate && data.endDate ? `${data.startDate} - ${data.endDate}` : data.startDate || data.endDate || "TBD"}`,
    "",
    data.description,
  ];
  files["PPC.txt"] = strToU8(lines.join("\n"));

  // Waypoints in multiple formats
  files["waypoints.kml"] = strToU8(exportToKml(waypoints));
  files["waypoints.gpx"] = strToU8(exportToGpx(waypoints));
  files["waypoints.cup"] = strToU8(exportToCup(waypoints));
  files["waypoints.wpt"] = strToU8(exportToWpt(waypoints));

  // Participants CSV
  if (data.participants.length > 0) {
    const csvRows = ["Pilot,Flightlog ID", ...data.participants.map((p) => `"${p.name.replace(/"/g, '""')}",${p.flightlogId}`)];
    files["participants.csv"] = strToU8(csvRows.join("\n"));
  }

  // Banner image
  if (data.bannerUrl) {
    const match = data.bannerUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (match) {
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      files[`banner.${ext}`] = bytes;
    }
  }

  const zipped = zipSync(files);
  const blob = new Blob([zipped], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
