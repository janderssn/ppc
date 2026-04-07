import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Trash2,
  MapPin,
  MousePointer2,
  Plus,
  Minus,
  Layers,
  Search,
  Download,
  Upload,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Maximize,
  FilePlus,
  Map as MapIcon,
  List,
  Crosshair
} from 'lucide-react';
import { downloadWaypoints, downloadZipExport, parseKml, parseZip, type ExportFormat, type ZipExportData } from '../lib/waypoint-export';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMapEvents,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { Waypoint, INITIAL_WAYPOINTS } from '../types';
import 'leaflet/dist/leaflet.css';

// Custom marker icon for the center point and label
const createCustomIcon = (index: number, isSelected: boolean, isHovered: boolean, name: string, score: number) => {
  const highlight = isSelected || isHovered;
  return L.divIcon({
    className: 'custom-waypoint-icon',
    html: `
      <div aria-hidden="true" style="position: absolute; transform: translate(-50%, -50%);">
        <div class="h-2.5 w-2.5 rounded-full border-2 ${highlight ? 'border-[#1186d0] bg-white ring-4 ring-[#1186d0]/30' : 'border-white bg-[#1186d0]'} shadow-sm"></div>
      </div>
      <div aria-hidden="true" style="position: absolute; left: 8px; transform: translateY(-50%);" class="flex items-center">
        <svg width="6" height="14" viewBox="0 0 6 14" style="margin-right: -1px; filter: drop-shadow(-1px 0 1px rgba(0,0,0,0.1));">
          <path d="M6,0 L0,7 L6,14 Z" fill="${highlight ? '#1186d0' : 'rgba(255,255,255,0.95)'}" />
        </svg>
        <div class="flex items-center whitespace-nowrap shadow-md ${highlight ? 'bg-[#1186d0] ring-2 ring-[#1186d0]/30' : 'bg-white/95'}" style="padding: 2px 8px 2px 4px; gap: 6px; border-radius: 0 9999px 9999px 0;">
          <span class="wp-icon-label text-[10px] font-bold uppercase tracking-tight ${highlight ? 'text-white/80' : 'text-[#2C3E50]/60'}" data-text="WP ${String(index + 1).padStart(2, '0')}: ${name}"></span>
          <span style="width: 1px; height: 12px;" class="${highlight ? 'bg-white/30' : 'bg-gray-300'}"></span>
          <span class="wp-icon-label text-xs font-black ${highlight ? 'text-white' : 'text-[#1186d0]'}" data-text="${score}"></span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

interface WaypointComponentProps {
  wp: Waypoint;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Waypoint>) => void;
  onHover: (id: string | null) => void;
}

const WaypointMapItem: React.FC<WaypointComponentProps> = ({ wp, index, isSelected, isHovered, onSelect, onUpdate, onHover }) => {
  const map = useMap();
  const isDragging = useRef<'move' | 'resize' | null>(null);
  const dragStartData = useRef<{
    lat: number;
    lng: number;
    radius: number;
    clickLat: number;
    clickLng: number;
  } | null>(null);

  const startDrag = (latlng: L.LatLng) => {
    const center = L.latLng(wp.lat, wp.lng);
    const distToCenter = map.distance(center, latlng);

    const threshold = Math.max(wp.radius * 0.15, 20);
    if (Math.abs(distToCenter - wp.radius) < threshold) {
      isDragging.current = 'resize';
    } else {
      isDragging.current = 'move';
    }

    dragStartData.current = {
      lat: wp.lat,
      lng: wp.lng,
      radius: wp.radius,
      clickLat: latlng.lat,
      clickLng: latlng.lng
    };

    map.dragging.disable();
  };

  const moveDrag = (latlng: L.LatLng) => {
    if (!isDragging.current || !dragStartData.current) return;

    if (isDragging.current === 'move') {
      const deltaLat = latlng.lat - dragStartData.current.clickLat;
      const deltaLng = latlng.lng - dragStartData.current.clickLng;
      onUpdate(wp.id, {
        lat: dragStartData.current.lat + deltaLat,
        lng: dragStartData.current.lng + deltaLng
      });
    } else if (isDragging.current === 'resize') {
      const center = L.latLng(dragStartData.current.lat, dragStartData.current.lng);
      const newRadius = map.distance(center, latlng);
      onUpdate(wp.id, { radius: Math.max(10, Math.round(newRadius)) });
    }
  };

  const endDrag = () => {
    isDragging.current = null;
    dragStartData.current = null;
    map.dragging.enable();
    map.off('mousemove', handleMouseMove);
    map.off('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e);
    onSelect(wp.id);
    startDrag(e.latlng);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: L.LeafletMouseEvent) => {
    moveDrag(e.latlng);
  };

  const handleMouseUp = () => {
    endDrag();
  };

  const circleRef = useRef<L.Circle | null>(null);
  const touchActiveRef = useRef(false);
  const latestHandlers = useRef({ startDrag, moveDrag, endDrag, onSelect });
  latestHandlers.current = { startDrag, moveDrag, endDrag, onSelect };

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    const el = circle.getElement();
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      touchActiveRef.current = true;
      latestHandlers.current.onSelect(wp.id);
      const touch = e.touches[0];
      const rect = map.getContainer().getBoundingClientRect();
      const latlng = map.containerPointToLatLng(L.point(touch.clientX - rect.left, touch.clientY - rect.top));
      latestHandlers.current.startDrag(latlng);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchActiveRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = map.getContainer().getBoundingClientRect();
      const latlng = map.containerPointToLatLng(L.point(touch.clientX - rect.left, touch.clientY - rect.top));
      latestHandlers.current.moveDrag(latlng);
    };

    const onTouchEnd = () => {
      if (!touchActiveRef.current) return;
      touchActiveRef.current = false;
      latestHandlers.current.endDrag();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [wp.id, map]);

  return (
    <>
      <Circle
        ref={circleRef}
        center={[wp.lat, wp.lng]}
        radius={wp.radius}
        pathOptions={{
          color: '#1186d0',
          fillColor: '#1186d0',
          fillOpacity: isSelected ? 0.2 : 0.1,
          weight: (isSelected || isHovered) ? 4 : 2,
          className: 'cursor-move'
        }}
        eventHandlers={{
          mousedown: handleMouseDown,
          click: (e) => L.DomEvent.stopPropagation(e),
          mouseover: () => onHover(wp.id),
          mouseout: () => onHover(null),
        }}
      />
      <Marker
        position={[wp.lat, wp.lng]}
        icon={createCustomIcon(index, isSelected, isHovered, wp.name, wp.score)}
        interactive={false}
      />
    </>
  );
};

function computeWaypointBounds(waypoints: Waypoint[]): L.LatLngBounds | null {
  if (waypoints.length === 0) return null;
  const bounds = L.latLngBounds([]);
  for (const wp of waypoints) {
    bounds.extend(L.latLng(wp.lat, wp.lng).toBounds(wp.radius * 2));
  }
  return bounds;
}

function MapEvents({ onMapClick, onClearSelection, addMode, onAddModeUsed }: { onMapClick: (lat: number, lng: number) => void, onClearSelection: () => void, addMode?: boolean, onAddModeUsed?: () => void }) {
  useMapEvents({
    click(e) {
      if (addMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
        onAddModeUsed?.();
      } else if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      } else {
        onClearSelection();
      }
    },
  });
  return null;
}

function FitBoundsOnImport({ waypoints, trigger }: { waypoints: Waypoint[]; trigger: number }) {
  const map = useMap();
  const prevTrigger = useRef(trigger);
  useEffect(() => {
    if (trigger !== prevTrigger.current) {
      prevTrigger.current = trigger;
      const bounds = computeWaypointBounds(waypoints);
      if (bounds) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [trigger, waypoints, map]);
  return null;
}

// Haversine distance formula
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const CustomControls: React.FC<{
  layerType: 'street' | 'satellite';
  setLayerType: (type: 'street' | 'satellite') => void;
  waypoints: Waypoint[];
}> = ({ layerType, setLayerType, waypoints }) => {
  const map = useMap();

  const fitWaypoints = () => {
    if (waypoints.length === 0) return;
    const bounds = L.latLngBounds(waypoints.map((wp) => [wp.lat, wp.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  };

  return (
    <div className="absolute left-6 top-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
      <div className="flex flex-col overflow-hidden rounded-lg border border-white/40 shadow-float glass-panel">
        <button
          onClick={() => map.zoomIn()}
          className="flex h-10 w-10 items-center justify-center bg-white/80 text-text-main transition-colors hover:bg-white hover:text-primary"
          title="Zoom In"
        >
          <Plus className="h-5 w-5" />
        </button>
        <div className="h-[1px] w-full bg-white/40" />
        <button
          onClick={() => map.zoomOut()}
          className="flex h-10 w-10 items-center justify-center bg-white/80 text-text-main transition-colors hover:bg-white hover:text-primary"
          title="Zoom Out"
        >
          <Minus className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={fitWaypoints}
        disabled={waypoints.length === 0}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/40 shadow-float glass-panel transition-all hover:scale-105 active:scale-95 bg-white/80 disabled:opacity-40"
        title="Fit all waypoints"
      >
        <Maximize className="h-5 w-5 text-text-main" />
      </button>

      <button
        onClick={() => setLayerType(layerType === 'street' ? 'satellite' : 'street')}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/40 shadow-float glass-panel transition-all hover:scale-105 active:scale-95 bg-white/80"
        title={`Switch to ${layerType === 'street' ? 'Satellite' : 'Street'} View`}
      >
        <Layers className="h-5 w-5 text-text-main" />
      </button>
    </div>
  );
};

const MapResizeObserver: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const resize = () => {
      requestAnimationFrame(() => {
        map.invalidateSize(false);
      });
    };

    resize();

    const observer = new ResizeObserver(() => {
      resize();
    });

    observer.observe(container);
    window.addEventListener('resize', resize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [map]);

  return null;
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

const PRESET_RADII = [200, 400, 1000, 2000, 3000];
const PRESET_SCORES = [1, 2, 3, 4, 5, 10, 15, 20];

interface Template {
  key: string;
  label: string;
}

interface WaypointEditorProps {
  initialWaypoints?: Waypoint[];
  waypoints?: Waypoint[];
  onChange?: (waypoints: Waypoint[]) => void;
  readOnly?: boolean;
  sidebarHeader?: React.ReactNode;
  sidebarTitle?: string;
  sidebarTitleNode?: React.ReactNode;
  sidebarActions?: React.ReactNode;
  sidebarFooterActions?: React.ReactNode;
  zipExportData?: ZipExportData;
  onImportParticipants?: (participants: Array<{ name: string; flightlogId: string }>) => void;
  onImportMeta?: (meta: { title?: string; description?: string; startDate?: string; endDate?: string; bannerUrl?: string | null }) => void;
  onNew?: () => void;
  templates?: Template[];
  onLoadTemplate?: (key: string) => void;
}

export default function WaypointEditor({
  initialWaypoints = INITIAL_WAYPOINTS,
  waypoints: controlledWaypoints,
  onChange,
  readOnly = false,
  sidebarHeader,
  sidebarTitle,
  sidebarTitleNode,
  sidebarActions,
  sidebarFooterActions,
  zipExportData,
  onImportParticipants,
  onImportMeta,
  onNew,
  templates,
  onLoadTemplate,
}: WaypointEditorProps) {
  const isMobile = useIsMobile();
  const startWaypoints = controlledWaypoints ?? initialWaypoints;
  const initialBounds = useMemo(() => computeWaypointBounds(startWaypoints), []);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(startWaypoints);
  const [selectedId, setSelectedId] = useState<string | null>(startWaypoints[0]?.id ?? null);
  const [fitTrigger, setFitTrigger] = useState(0);

  const [layerType, setLayerType] = useState<'street' | 'satellite'>('street');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(520);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isWaypointsCollapsed, setIsWaypointsCollapsed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Mobile view state
  const [mobileView, setMobileView] = useState<'map' | 'details' | 'waypoints'>('map');
  // Mobile add-waypoint mode: tap on map to place
  const [addMode, setAddMode] = useState(false);
  const sidebarStyle = isSidebarCollapsed
    ? { width: '3.5rem', minWidth: '3.5rem' }
    : { width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` };
  const resolvedSidebarTitle = sidebarTitle?.trim() || 'Waypoints';

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  React.useEffect(() => {
    if (selectedId && scrollContainerRef.current) {
      const element = scrollContainerRef.current.querySelector(`[data-waypoint-id="${selectedId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  React.useEffect(() => {
    if (!isResizingSidebar) {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      const minWidth = 384;
      const maxWidth = Math.min(960, window.innerWidth - 320);
      const nextWidth = Math.min(Math.max(event.clientX, minWidth), maxWidth);
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [isResizingSidebar]);

  const filteredWaypoints = useMemo(() => {
    return waypoints.filter(wp =>
      wp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [waypoints, searchTerm]);

  const totalPoints = useMemo(() =>
    waypoints.reduce((acc, wp) => acc + wp.score, 0),
  [waypoints]);

  const totalDistance = useMemo(() => {
    if (waypoints.length < 2) return 0;
    let dist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      dist += getDistance(
        waypoints[i].lat, waypoints[i].lng,
        waypoints[i + 1].lat, waypoints[i + 1].lng
      );
    }
    return dist;
  }, [waypoints]);

  const updateWaypointsAndNotify = useCallback((newWaypoints: Waypoint[]) => {
    setWaypoints(newWaypoints);
    onChange?.(newWaypoints);
  }, [onChange]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (readOnly) return;
    const newWaypoint: Waypoint = {
      id: Math.random().toString(36).substr(2, 9),
      name: `WP ${waypoints.length + 1}`,
      radius: 400,
      score: 1,
      lat,
      lng,
    };

    const newWaypoints = [...waypoints, newWaypoint];
    updateWaypointsAndNotify(newWaypoints);
    handleSelect(newWaypoint.id);
  }, [waypoints, handleSelect, readOnly, updateWaypointsAndNotify]);

  const updateWaypoint = (id: string, updates: Partial<Waypoint>) => {
    if (readOnly) return;
    const newWaypoints = waypoints.map(wp => wp.id === id ? { ...wp, ...updates } : wp);
    updateWaypointsAndNotify(newWaypoints);
  };

  const deleteWaypoint = (id: string) => {
    if (readOnly) return;
    const newWaypoints = waypoints.filter(wp => wp.id !== id);
    updateWaypointsAndNotify(newWaypoints);
    if (selectedId === id) handleSelect(null);
  };

  const clearAll = () => {
    if (readOnly) return;
    if (!window.confirm('Delete all waypoints?')) return;
    updateWaypointsAndNotify([]);
    handleSelect(null);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const isZip = file.name.toLowerCase().endsWith(".zip");

    if (isZip) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = parseZip(reader.result as ArrayBuffer);
        if (result.waypoints.length === 0) {
          alert("No waypoints found in ZIP file");
          return;
        }
        const merged = [...waypoints, ...result.waypoints];
        updateWaypointsAndNotify(merged);
        setFitTrigger((n) => n + 1);
        if (result.participants.length > 0 && onImportParticipants) {
          onImportParticipants(result.participants);
        }
        if (onImportMeta) {
          const meta: { title?: string; description?: string; startDate?: string; endDate?: string; bannerUrl?: string | null } = {};
          if (result.title) meta.title = result.title;
          if (result.description) meta.description = result.description;
          if (result.startDate) meta.startDate = result.startDate;
          if (result.endDate) meta.endDate = result.endDate;
          if (result.bannerUrl) meta.bannerUrl = result.bannerUrl;
          if (Object.keys(meta).length > 0) onImportMeta(meta);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        const imported = parseKml(text);
        if (imported.length === 0) {
          alert("No waypoints found in file");
          return;
        }
        updateWaypointsAndNotify([...waypoints, ...imported]);
        setFitTrigger((n) => n + 1);
      };
      reader.readAsText(file);
    }

    event.target.value = "";
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Sidebar — hidden on mobile when viewing map */}
      <aside
        className={`relative z-[999] flex h-full flex-col border-r border-gray-200 bg-surface shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-[width,min-width] duration-200 ${isResizingSidebar ? 'select-none' : ''} ${isMobile ? (mobileView !== 'map' ? 'w-full min-w-full' : 'hidden') : ''}`}
        style={isMobile ? undefined : sidebarStyle}
      >
        {!isMobile && (
        <div className="shrink-0 border-b border-gray-100 bg-white">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-between gap-3 p-4'}`}>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                {sidebarTitleNode ?? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Competition</p>
                    <p className="truncate text-sm font-bold text-text-main">{resolvedSidebarTitle}</p>
                  </>
                )}
              </div>
            )}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className="rounded-md border border-gray-200 bg-white p-2 text-text-muted transition-colors hover:bg-gray-50 hover:text-text-main"
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              </button>
          </div>
        </div>
        )}

        {isSidebarCollapsed ? (
          <div className="flex flex-1 flex-col items-center gap-4 px-2 py-4">
            <div className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted [writing-mode:vertical-rl] [text-orientation:mixed]">
              {resolvedSidebarTitle}
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
              {waypoints.length}
            </span>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {/* Details section — shown on desktop always, on mobile only in details tab */}
              {sidebarHeader && (!isMobile || mobileView === 'details') && (
                <div className="border-b border-gray-100">
                  {sidebarHeader}
                </div>
              )}

              {/* Waypoints section — shown on desktop always, on mobile only in waypoints tab */}
              {(!isMobile || mobileView === 'waypoints') && (
              <>
              <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
                {!isMobile && (
                <button
                  type="button"
                  onClick={() => setIsWaypointsCollapsed((prev) => !prev)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Waypoints</span>
                  <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${isWaypointsCollapsed ? "-rotate-90" : ""}`} />
                </button>
                )}

                {!isWaypointsCollapsed && (
                  <div className={`${isMobile ? '' : 'border-t border-gray-100'} p-4`}>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          placeholder="Search waypoints..."
                          className="w-full rounded-lg border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs font-medium focus:border-primary focus:ring-primary/20"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={clearAll}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-accent-destructive transition-colors hover:bg-red-50"
                          aria-label="Clear all waypoints"
                          title="Clear all waypoints"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!isWaypointsCollapsed && (
                <div
                  ref={scrollContainerRef}
                  className="space-y-1 p-2"
                >
                {filteredWaypoints.map((wp) => {
                  const originalIndex = waypoints.findIndex(w => w.id === wp.id);
                  return (
                    <div
                      key={wp.id}
                      data-waypoint-id={wp.id}
                      onClick={() => handleSelect(wp.id)}
                      onMouseEnter={() => setHoveredId(wp.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`
                        group relative cursor-pointer rounded-lg border-2 px-2.5 py-1.5 transition-all
                        ${selectedId === wp.id
                          ? 'border-primary bg-blue-50/50 shadow-sm'
                          : hoveredId === wp.id
                            ? 'border-primary/70 bg-blue-50/40'
                            : `border-transparent ${originalIndex % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'} hover:border-primary/30`}
                      `}
                    >
                        <div className={`${selectedId === wp.id ? 'mb-2' : ''} flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <span className={`
                              flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors
                              ${selectedId === wp.id || hoveredId === wp.id ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted group-hover:bg-primary group-hover:text-white'}
                            `}>
                              {originalIndex + 1}
                            </span>
                            <input
                              className="w-16 cursor-pointer border-none bg-transparent p-0 text-xs font-medium text-text-main focus:cursor-text focus:ring-0"
                              value={wp.name}
                              onChange={(e) => updateWaypoint(wp.id, { name: e.target.value })}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                              onClick={(e) => e.stopPropagation()}
                              readOnly={readOnly}
                              maxLength={6}
                            />
                            <input
                              className="min-w-0 flex-1 cursor-pointer border-none bg-transparent p-0 text-xs text-text-muted focus:cursor-text focus:text-text-main focus:ring-0"
                              placeholder="Description"
                              value={wp.description || ""}
                              onChange={(e) => updateWaypoint(wp.id, { description: e.target.value })}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                              onClick={(e) => e.stopPropagation()}
                              readOnly={readOnly}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedId !== wp.id && (
                              <span className="text-[10px] font-bold text-text-muted tabular-nums">
                                {wp.radius}m · {wp.score}pts
                              </span>
                            )}
                            {!readOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete waypoint "${wp.name}"?`)) {
                                    deleteWaypoint(wp.id);
                                  }
                                }}
                                className="text-text-muted transition-colors hover:text-accent-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {selectedId === wp.id && (
                          <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Radius (m)</label>
                            {!readOnly ? (
                              <>
                                <div className="flex flex-wrap gap-1">
                                  {PRESET_RADII.map(r => (
                                    <button
                                      key={r}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateWaypoint(wp.id, { radius: r });
                                      }}
                                      className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${wp.radius === r ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    className="w-full rounded border-gray-200 bg-white py-1 pl-2 pr-6 text-sm font-medium tabular-nums focus:border-primary focus:ring-primary/20"
                                    value={wp.radius}
                                    onChange={(e) => updateWaypoint(wp.id, { radius: Number(e.target.value) })}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className="absolute right-2 top-1.5 text-[10px] text-text-muted">m</span>
                                </div>
                              </>
                            ) : (
                              <div className="rounded border border-gray-200 bg-white py-1 pl-2 pr-6 text-sm font-medium tabular-nums text-text-main">
                                {wp.radius}m
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Score</label>
                            {!readOnly ? (
                              <>
                                <div className="flex flex-wrap gap-1">
                                  {PRESET_SCORES.map(s => (
                                    <button
                                      key={s}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateWaypoint(wp.id, { score: s });
                                      }}
                                      className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${wp.score === s ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    className="w-full rounded border-gray-200 bg-white py-1 px-2 text-sm font-medium tabular-nums focus:border-primary focus:ring-primary/20"
                                    value={wp.score}
                                    onChange={(e) => updateWaypoint(wp.id, { score: Number(e.target.value) })}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="rounded border border-gray-200 bg-white py-1 px-2 text-sm font-medium tabular-nums text-text-main">
                                {wp.score}
                              </div>
                            )}
                          </div>
                            <div className="col-span-2 mt-1 flex items-center gap-1 text-[10px] text-text-muted">
                              <MapPin className="h-3 w-3" />
                              {wp.lat.toFixed(4)}° N, {wp.lng.toFixed(4)}° E
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
                {filteredWaypoints.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="mb-2 h-8 w-8 text-gray-200" />
                    <p className="text-sm font-medium text-text-muted">No waypoints found matching "{searchTerm}"</p>
                  </div>
                )}
              </div>
            )}
            </>
            )}
            </div>

            <div className={`shrink-0 border-t border-gray-200 bg-background-light p-6 ${isMobile ? 'pb-20' : ''}`}>
              {sidebarFooterActions && (
                <div className="mb-4 flex gap-2 border-b border-gray-200 pb-4">
                  {sidebarFooterActions}
                </div>
              )}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase">Total Points</span>
                <span className="text-lg font-bold text-text-main">{totalPoints.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase">Est. Distance</span>
                <span className="text-sm font-bold text-primary">{totalDistance.toFixed(2)} km</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                {!readOnly && onNew && (
                  <button
                    onClick={onNew}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-text-main transition-colors hover:bg-gray-50"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    New
                  </button>
                )}
                {!readOnly && (
                  <div className="relative">
                    <input ref={importFileRef} type="file" accept=".kml,.gpx,.cup,.wpt,.zip" className="sr-only" onChange={(e) => { handleImport(e); setImportOpen(false); }} />
                    {templates && templates.length > 0 ? (
                      <>
                        <button
                          onClick={() => setImportOpen(!importOpen)}
                          className="relative flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-text-main transition-colors hover:bg-gray-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Import
                          <ChevronDown className={`absolute right-2.5 h-3 w-3 text-text-muted transition-transform ${importOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {importOpen && (
                          <>
                            <div className="fixed inset-0 z-[1100]" onClick={() => setImportOpen(false)} />
                            <div className="absolute bottom-full left-0 right-0 mb-1 z-[1101] rounded-lg border border-gray-200 bg-white py-1 shadow-float">
                              <button
                                onClick={() => { importFileRef.current?.click(); }}
                                className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-text-main hover:bg-gray-50"
                              >
                                <span>From file...</span>
                                <span className="text-[10px] text-text-muted">KML, GPX, CUP, WPT, ZIP</span>
                              </button>
                              <div className="mx-3 h-px bg-gray-100" />
                              <div className="px-4 py-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Templates</span>
                              </div>
                              {templates.map((t) => (
                                <button
                                  key={t.key}
                                  onClick={() => { onLoadTemplate?.(t.key); setImportOpen(false); }}
                                  className="flex w-full items-center px-4 py-2 text-xs font-medium text-text-main hover:bg-gray-50"
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-text-main transition-colors hover:bg-gray-50">
                        <Upload className="h-3.5 w-3.5" />
                        Import
                        <input type="file" accept=".kml,.gpx,.cup,.wpt,.zip" className="sr-only" onChange={handleImport} />
                      </label>
                    )}
                  </div>
                )}
                {waypoints.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setExportOpen(!exportOpen)}
                    className="relative flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-text-main transition-colors hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                    <ChevronDown className={`absolute right-2.5 h-3 w-3 text-text-muted transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {exportOpen && (
                    <>
                      <div className="fixed inset-0 z-[1100]" onClick={() => setExportOpen(false)} />
                      <div className="absolute bottom-full left-0 right-0 mb-1 z-[1101] rounded-lg border border-gray-200 bg-white py-1 shadow-float">
                        {zipExportData && (
                          <>
                            <button
                              onClick={() => {
                                downloadZipExport(waypoints, zipExportData);
                                setExportOpen(false);
                              }}
                              className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-text-main hover:bg-gray-50"
                            >
                              <span>ZIP (.zip)</span>
                              <span className="text-[10px] text-text-muted">Full package</span>
                            </button>
                            <div className="mx-3 h-px bg-gray-100" />
                          </>
                        )}
                        {([
                          { format: 'gpx' as ExportFormat, label: 'GPX (.gpx)', desc: 'GPS Exchange' },
                          { format: 'kml' as ExportFormat, label: 'KML (.kml)', desc: 'Google Earth' },
                          { format: 'cup' as ExportFormat, label: 'CUP (.cup)', desc: 'SeeYou' },
                          { format: 'wpt' as ExportFormat, label: 'WPT (.wpt)', desc: 'OziExplorer' },
                        ]).map(({ format, label, desc }) => (
                          <button
                            key={format}
                            onClick={() => {
                              downloadWaypoints(waypoints, format);
                              setExportOpen(false);
                            }}
                            className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-text-main hover:bg-gray-50"
                          >
                            <span>{label}</span>
                            <span className="text-[10px] text-text-muted">{desc}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              </div>
            </div>
          </>
        )}
        {!isSidebarCollapsed && !isMobile && (
          <div
            className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize bg-transparent transition-colors hover:bg-primary/10"
            onMouseDown={(event) => {
              event.preventDefault();
              setIsResizingSidebar(true);
            }}
            aria-hidden="true"
          />
        )}
      </aside>

      {/* Map Viewport — hidden on mobile when viewing details/waypoints */}
      <section className={`relative flex-1 h-full overflow-hidden ${isMobile && mobileView !== 'map' ? 'hidden' : ''}`}>
        <MapContainer
          {...(initialBounds
            ? { bounds: initialBounds, boundsOptions: { padding: [60, 60] } }
            : { center: [59.875, 16.665] as [number, number], zoom: 13 }
          )}
          className="h-full w-full"
          zoomControl={false}
        >
          <MapResizeObserver />
          <FitBoundsOnImport waypoints={waypoints} trigger={fitTrigger} />
          <TileLayer
            attribution={layerType === 'street'
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              : 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'}
            url={layerType === 'street'
              ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'}
          />

          <MapEvents
            onMapClick={handleMapClick}
            onClearSelection={() => handleSelect(null)}
            addMode={addMode}
            onAddModeUsed={() => setAddMode(false)}
          />

          <CustomControls layerType={layerType} setLayerType={setLayerType} waypoints={waypoints} />

          {waypoints.map((wp: Waypoint, index: number) => (
            <WaypointMapItem
              key={wp.id}
              wp={wp}
              index={index}
              isSelected={selectedId === wp.id}
              isHovered={hoveredId === wp.id}
              onSelect={handleSelect}
              onUpdate={updateWaypoint}
              onHover={setHoveredId}
            />
          ))}
        </MapContainer>

        {/* Tooltip Guide — desktop only */}
        {!readOnly && !isMobile && (
          <div className="absolute bottom-6 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-xs font-medium text-text-main shadow-float glass-panel">
            <MousePointer2 className="h-4 w-4 text-primary" />
            <span className="flex items-center gap-1.5">
              <kbd className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-bold text-text-muted border border-gray-200 shadow-sm">CTRL</kbd>
              + Click to place a new waypoint
            </span>
          </div>
        )}

        {/* Mobile: add-mode tooltip */}
        {!readOnly && isMobile && addMode && (
          <div className="absolute top-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg">
            <Crosshair className="h-4 w-4" />
            Tap map to place waypoint
          </div>
        )}

        {/* Mobile: floating add-waypoint button */}
        {!readOnly && isMobile && mobileView === 'map' && !addMode && (
          <button
            onClick={() => setAddMode(true)}
            className="absolute bottom-[4.5rem] right-4 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg active:scale-95 transition-transform"
            title="Add waypoint"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

      </section>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-[1100] flex border-t border-gray-200 bg-white safe-bottom">
          <button
            onClick={() => { setMobileView('details'); setAddMode(false); }}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${mobileView === 'details' ? 'text-primary' : 'text-text-muted'}`}
          >
            <FilePlus className="h-5 w-5" />
            Details
          </button>
          <button
            onClick={() => { setMobileView('map'); setAddMode(false); }}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${mobileView === 'map' ? 'text-primary' : 'text-text-muted'}`}
          >
            <MapIcon className="h-5 w-5" />
            Map
          </button>
          <button
            onClick={() => { setMobileView('waypoints'); setAddMode(false); }}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${mobileView === 'waypoints' ? 'text-primary' : 'text-text-muted'}`}
          >
            <List className="h-5 w-5" />
            Waypoints
          </button>
        </nav>
      )}
    </div>
  );
}
