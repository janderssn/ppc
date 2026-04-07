import React, { useState } from 'react';
import { Calendar, ImagePlus, X, Plus, Trash2, HelpCircle, MapPin, Move, Circle, Upload, Download, FileArchive, Users, Image, BookOpen } from 'lucide-react';
import WaypointEditor from './components/WaypointEditor';
import { parseZip } from './lib/waypoint-export';
import type { Waypoint } from './types';
import { INITIAL_WAYPOINTS, TEMPLATES } from './types';

function IntroPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative mx-4 flex max-w-lg max-h-[calc(100vh-2rem)] flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — fixed */}
        <div className="shrink-0 px-8 pt-8 pb-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-text-muted transition-colors hover:bg-gray-100 hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="mb-1 text-xl font-bold text-text-main">PPC Waypoint Editor</h2>
          <p className="mb-4 text-sm text-text-muted">
            Create waypoint sets for Point Picking Competitions scored on{' '}
            <a href="https://www.paralogg.se" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline hover:text-primary/80">
              paralogg.se
            </a>
          </p>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-1">
          <div className="space-y-4 text-sm text-text-main">
            <div>
              <h3 className="mb-1 font-bold">Getting started</h3>
              <ul className="list-inside list-disc space-y-1 text-text-muted">
                <li className="hidden md:list-item"><strong className="text-text-main">Ctrl + Click</strong> on the map to place a waypoint</li>
                <li className="md:hidden">Tap the <strong className="text-text-main">+</strong> button, then tap the map to place a waypoint</li>
                <li>Click a waypoint to select it, then edit name, radius and score</li>
                <li>Drag a waypoint to move it, drag its border to resize</li>
                <li>Use <strong className="text-text-main">Import</strong> to load a template or an existing file (KML, GPX, CUP, WPT, ZIP)</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-1 font-bold">Competition details</h3>
              <p className="text-text-muted">
                Fill in the title, description, dates, banner image and participant list in the sidebar. Participants need a name and their{' '}
                <a href="https://www.flightlog.org" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline hover:text-primary/80">flightlog.org</a> ID.
              </p>
            </div>

            <div>
              <h3 className="mb-1 font-bold">Publishing your competition</h3>
              <ol className="list-inside list-decimal space-y-1 text-text-muted">
                <li>When your waypoints and details are ready, click <strong className="text-text-main">Export &rarr; ZIP</strong></li>
                <li>This creates a package with waypoints in all formats, metadata, participants and your banner image</li>
                <li>Send the ZIP file to the paralogg.se administrator by email to get it published</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer — fixed */}
        <div className="shrink-0 px-8 pb-8 pt-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90"
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  );
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[2000] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-text-main">Help & Instructions</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-gray-100 hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 text-sm">
          {/* What is PPC */}
          <section>
            <h3 className="mb-2 text-base font-bold text-text-main">What is a PPC?</h3>
            <p className="text-text-muted leading-relaxed">
              A <strong className="text-text-main">Point Picking Competition</strong> is a paragliding format where pilots
              collect points by flying through predefined geographic waypoints. Each waypoint is a cylinder with a center
              coordinate, a radius and a score value. Pilots upload their GPS tracklogs and the scoring system checks which
              waypoints they passed through. Competitions are scored and tracked on{' '}
              <a href="https://www.paralogg.se" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline hover:text-primary/80">
                paralogg.se
              </a>.
            </p>
          </section>

          {/* Map editing */}
          <section>
            <h3 className="mb-3 text-base font-bold text-text-main">Map editing</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text-main">Place waypoints</p>
                  <p className="text-text-muted hidden md:block">Hold <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-text-main border border-gray-200">Ctrl</kbd> and click anywhere on the map to create a new waypoint.</p>
                  <p className="text-text-muted md:hidden">Tap the <strong className="text-text-main">+</strong> button on the map, then tap where you want to place a new waypoint.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Move className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text-main">Move waypoints</p>
                  <p className="text-text-muted">Click and drag the center of a waypoint circle to reposition it.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Circle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text-main">Resize radius</p>
                  <p className="text-text-muted">Click and drag the border of a waypoint circle to change its radius. You can also type an exact value or use the presets in the sidebar.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <section>
            <h3 className="mb-3 text-base font-bold text-text-main">Sidebar</h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-text-main">Waypoint list</p>
                <p className="text-text-muted">Click any waypoint in the list to select it and edit its name, description, radius and score. Use the search bar to filter by name. The trash icon deletes a waypoint.</p>
              </div>
              <div>
                <p className="font-medium text-text-main">Name &amp; description</p>
                <p className="text-text-muted">The <strong className="text-text-main">name</strong> is a short identifier (max 6 characters) shown on the map label. The <strong className="text-text-main">description</strong> is a longer label for context, e.g. a landmark or place name.</p>
              </div>
              <div>
                <p className="font-medium text-text-main">Score</p>
                <p className="text-text-muted">The point value a pilot earns for passing through this waypoint. Higher scores for harder-to-reach or more remote waypoints.</p>
              </div>
            </div>
          </section>

          {/* Competition details */}
          <section>
            <h3 className="mb-3 text-base font-bold text-text-main">Competition details</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Image className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text-main">Banner image</p>
                  <p className="text-text-muted">Click the dashed area at the top of the sidebar to upload a banner image for the competition. It will be included in the ZIP export.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text-main">Participants</p>
                  <p className="text-text-muted">
                    Add pilots who will compete. Each participant needs a <strong className="text-text-main">name</strong> and
                    their <a href="https://www.flightlog.org" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline hover:text-primary/80">flightlog.org</a> <strong className="text-text-main">ID</strong> (the
                    number in their flightlog profile URL). This is used by paralogg.se to automatically fetch their tracklogs.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Import */}
          <section>
            <h3 className="mb-3 text-base font-bold text-text-main">Import</h3>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-text-muted">
                  Click <strong className="text-text-main">Import</strong> at the bottom of the sidebar to open the import menu. You can load
                  a <strong className="text-text-main">prebuilt template</strong> (Sala PPC, Lanzarote PPC) or import waypoints from a file.
                  Supported formats: <strong className="text-text-main">KML</strong> (Google Earth),{' '}
                  <strong className="text-text-main">GPX</strong> (GPS Exchange),{' '}
                  <strong className="text-text-main">CUP</strong> (SeeYou),{' '}
                  <strong className="text-text-main">WPT</strong> (OziExplorer), and{' '}
                  <strong className="text-text-main">ZIP</strong> packages. ZIP files can include waypoints, metadata, participants and a banner image.
                </p>
              </div>
            </div>
          </section>

          {/* Export & publish */}
          <section>
            <h3 className="mb-3 text-base font-bold text-text-main">Export &amp; publish</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-text-muted">
                    Click <strong className="text-text-main">Export</strong> to download waypoints in individual formats (GPX, KML, CUP, WPT)
                    for use in flight instruments and planning tools.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileArchive className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text-main">ZIP export (full package)</p>
                  <p className="text-text-muted">
                    Choose <strong className="text-text-main">Export &rarr; ZIP</strong> to create a complete competition package. It contains:
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-text-muted">
                    <li><strong className="text-text-main">PPC.txt</strong> &mdash; title, dates, description</li>
                    <li><strong className="text-text-main">waypoints.*</strong> &mdash; all four formats (KML, GPX, CUP, WPT)</li>
                    <li><strong className="text-text-main">participants.csv</strong> &mdash; pilot names and flightlog IDs</li>
                    <li><strong className="text-text-main">banner image</strong> &mdash; if one was added</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Publishing workflow */}
          <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <h3 className="mb-2 text-base font-bold text-text-main">Publishing to paralogg.se</h3>
            <ol className="list-inside list-decimal space-y-2 text-text-muted">
              <li>Fill in all competition details (title, dates, description, banner, participants)</li>
              <li>Place and configure your waypoints on the map</li>
              <li>Click <strong className="text-text-main">Export &rarr; ZIP</strong> to download the full package</li>
              <li>Send the ZIP file by email to the paralogg.se administrator (Staffan) and ask him to publish it</li>
              <li>Once published, participants can fly the waypoints and their tracklogs will be scored automatically</li>
            </ol>
          </section>

          {/* Links */}
          <section>
            <h3 className="mb-2 text-base font-bold text-text-main">Useful links</h3>
            <ul className="space-y-1">
              <li>
                <a href="https://www.paralogg.se" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline hover:text-primary/80">
                  paralogg.se
                </a>{' '}
                <span className="text-text-muted">&mdash; competition scoring and results</span>
              </li>
              <li>
                <a href="https://www.paralogg.se/ppcComps" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline hover:text-primary/80">
                  paralogg.se/ppcComps
                </a>{' '}
                <span className="text-text-muted">&mdash; list of PPC competitions</span>
              </li>
              <li>
                <a href="https://www.flightlog.org" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline hover:text-primary/80">
                  flightlog.org
                </a>{' '}
                <span className="text-text-muted">&mdash; pilot flight logs and IDs</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
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

  const closeIntro = () => setShowIntro(false);

  return (
    <div className="h-dvh w-screen font-sans">
      {showIntro && <IntroPopup onClose={closeIntro} />}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

      <button
        onClick={() => setShowHelp(true)}
        className="fixed right-4 top-4 z-[1500] flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/80 shadow-float backdrop-blur transition-all hover:scale-105 hover:bg-white md:right-4 md:top-4"
        title="Help & Instructions"
      >
        <HelpCircle className="h-5 w-5 text-text-main" />
      </button>

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
