import React, { useState } from 'react';
import { Calendar, ImagePlus, X, Plus, Trash2 } from 'lucide-react';
import WaypointEditor from './components/WaypointEditor';
import { parseZip } from './lib/waypoint-export';
import type { Waypoint } from './types';
import { INITIAL_WAYPOINTS, TEMPLATES } from './types';

export default function App() {
  const [editorKey, setEditorKey] = useState(0);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(INITIAL_WAYPOINTS);
  const [title, setTitle] = useState('Untitled Competition');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Array<{ name: string; flightlogId: string }>>([
    { name: '', flightlogId: '' },
  ]);
  const validParticipants = participants.filter((p) => p.name.trim());

  const applyZipResult = (result: ReturnType<typeof parseZip>) => {
    setWaypoints(result.waypoints);
    setTitle(result.title || 'Untitled Competition');
    setDescription(result.description || '');
    setStartDate(result.startDate || '');
    setEndDate(result.endDate || '');
    setBannerUrl(result.bannerUrl || null);
    setParticipants(
      result.participants.length > 0
        ? [...result.participants, { name: '', flightlogId: '' }]
        : [{ name: '', flightlogId: '' }],
    );
    setEditorKey((k) => k + 1);
  };

  const handleNew = () => {
    if (waypoints.length > 0 && !window.confirm('Start over? All unsaved changes will be lost.')) return;
    setWaypoints([]);
    setTitle('Untitled Competition');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setBannerUrl(null);
    setParticipants([{ name: '', flightlogId: '' }]);
    setEditorKey((k) => k + 1);
  };

  const handleLoadTemplate = async (key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    if (waypoints.length > 0 && !window.confirm(`Load "${t.label}"? All unsaved changes will be lost.`)) return;
    try {
      const resp = await fetch(t.zipUrl);
      if (!resp.ok) throw new Error(`Failed to fetch template: ${resp.status}`);
      const buf = await resp.arrayBuffer();
      const result = parseZip(buf);
      if (result.waypoints.length === 0) {
        alert('No waypoints found in template');
        return;
      }
      applyZipResult(result);
    } catch (err) {
      alert(`Failed to load template: ${err instanceof Error ? err.message : err}`);
    }
  };

  const handleBannerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBannerUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const updateParticipant = (index: number, field: 'name' | 'flightlogId', value: string) => {
    const next = [...participants];
    next[index] = { ...next[index], [field]: value };
    setParticipants(next);
  };

  const addParticipantRow = () => {
    setParticipants([...participants, { name: '', flightlogId: '' }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const sidebarHeader = (
    <div className="space-y-4 p-4">
      {/* Banner */}
      {bannerUrl ? (
        <div className="relative">
          <img src={bannerUrl} alt="Banner" className="h-28 w-full rounded-lg object-cover" />
          <button
            onClick={() => setBannerUrl(null)}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="flex h-28 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-primary/40 hover:bg-gray-100">
          <div className="flex flex-col items-center gap-1 text-text-muted">
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Add banner</span>
          </div>
          <input type="file" accept="image/*" className="sr-only" onChange={handleBannerChange} />
        </label>
      )}

      {/* Title */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Title</label>
        <input
          type="text"
          placeholder="Competition title"
          className="w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium focus:border-primary focus:ring-primary/20"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Description</label>
        <textarea
          placeholder="Describe the competition..."
          rows={3}
          className="w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium resize-y focus:border-primary focus:ring-primary/20"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Start</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="date"
              lang="sv-SE"
              className="w-full rounded-lg border-gray-200 bg-gray-50 py-2 pl-8 pr-2 text-sm font-medium focus:border-primary focus:ring-primary/20"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">End</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="date"
              lang="sv-SE"
              className="w-full rounded-lg border-gray-200 bg-gray-50 py-2 pl-8 pr-2 text-sm font-medium focus:border-primary focus:ring-primary/20"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">Participants</label>
          <button
            onClick={addParticipantRow}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Name"
                className="flex-1 rounded border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium focus:border-primary focus:ring-primary/20"
                value={p.name}
                onChange={(e) => updateParticipant(i, 'name', e.target.value)}
              />
              <input
                type="text"
                placeholder="Flightlog ID"
                className="w-24 rounded border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium focus:border-primary focus:ring-primary/20"
                value={p.flightlogId}
                onChange={(e) => updateParticipant(i, 'flightlogId', e.target.value)}
              />
              <button
                onClick={() => removeParticipant(i)}
                className="p-1 text-text-muted transition-colors hover:text-accent-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen font-sans">
      <WaypointEditor
        key={editorKey}
        waypoints={waypoints}
        initialWaypoints={waypoints}
        onChange={setWaypoints}
        sidebarHeader={sidebarHeader}
        sidebarTitle={title || 'Untitled'}
        zipExportData={{
          title: title || 'Untitled',
          description,
          startDate,
          endDate,
          bannerUrl,
          participants: validParticipants,
        }}
        onImportParticipants={(imported) => {
          setParticipants([
            ...participants.filter((p) => p.name.trim()),
            ...imported,
            { name: '', flightlogId: '' },
          ]);
        }}
        onImportMeta={(meta) => {
          if (meta.title) setTitle(meta.title);
          if (meta.description) setDescription(meta.description);
          if (meta.startDate) setStartDate(meta.startDate);
          if (meta.endDate) setEndDate(meta.endDate);
          if (meta.bannerUrl) setBannerUrl(meta.bannerUrl);
        }}
        onNew={handleNew}
        templates={[
          { key: 'sala', label: 'Sala PPC' },
          { key: 'lanzarote', label: 'Lanzarote PPC' },
        ]}
        onLoadTemplate={handleLoadTemplate}
      />
    </div>
  );
}
