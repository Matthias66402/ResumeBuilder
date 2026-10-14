import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import ContentPanel from "../builder/content/ContentPanel";
import DesignPanel from "../builder/design/DesignPanel";
import { flushSave, hasUnsavedChanges, useBuilder, type SaveStatus } from "../builder/store";
import { IconButton, Icons } from "../builder/ui";
import ResumePreview, { PAGE_SIZES } from "../templates/ResumePreview";

const MM_TO_PX = 96 / 25.4;
const SHEET_WIDTH_PX = { a4: 210 * MM_TO_PX, letter: 8.5 * 96, "free-form": 210 * MM_TO_PX };

const STATUS: Record<SaveStatus, { text: string; className: string }> = {
  saved: { text: "Gespeichert", className: "text-slate-500" },
  pending: { text: "Ungespeicherte Änderungen", className: "text-slate-500" },
  saving: { text: "Speichert …", className: "text-slate-500" },
  error: { text: "Speichern fehlgeschlagen", className: "text-red-600" },
};

type Tab = "content" | "preview" | "design";

function JsonDialog({ onClose }: { onClose: () => void }) {
  const data = useBuilder((s) => s.data!);
  const name = useBuilder((s) => s.name);
  const json = JSON.stringify(data, null, 2);

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${name || "resume"}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Reactive-Resume-JSON</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigator.clipboard.writeText(json)} className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">
              Kopieren
            </button>
            <button type="button" onClick={download} className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">
              Herunterladen
            </button>
            <IconButton title="Schließen" onClick={onClose}>
              <Icons.X />
            </IconButton>
          </div>
        </div>
        <pre className="overflow-auto p-4 text-xs">{json}</pre>
      </div>
    </div>
  );
}

function TopBar({ zoom, setZoom, onJson }: { zoom: number | "fit"; setZoom: (z: number | "fit") => void; onJson: () => void }) {
  const { name, status, past, future, rename, undo, redo } = useBuilder();
  const { text, className } = STATUS[status];
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 print:hidden">
      <Link to="/" title="Alle Lebensläufe" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
        <Icons.ArrowLeft />
      </Link>
      <input
        value={name}
        onChange={(e) => rename(e.target.value)}
        aria-label="Name des Lebenslaufs"
        className="min-w-0 flex-1 rounded-md px-2 py-1 font-semibold outline-none hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
      />
      <span className={`hidden text-xs md:inline ${className}`}>
        {text}
        {status === "error" && (
          <button type="button" onClick={() => flushSave()} className="ml-2 underline">
            Erneut versuchen
          </button>
        )}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <IconButton title="Rückgängig (Strg+Z)" disabled={!past.length} onClick={undo}>
          <Icons.Undo />
        </IconButton>
        <IconButton title="Wiederholen (Strg+Y)" disabled={!future.length} onClick={redo}>
          <Icons.Redo />
        </IconButton>
        <select
          value={zoom}
          onChange={(e) => setZoom(e.target.value === "fit" ? "fit" : Number(e.target.value))}
          aria-label="Zoom"
          className="hidden rounded-md border border-slate-300 px-1.5 py-1 text-xs sm:block"
        >
          <option value="fit">Einpassen</option>
          {[0.5, 0.75, 1, 1.25, 1.5].map((z) => (
            <option key={z} value={z}>
              {z * 100} %
            </option>
          ))}
        </select>
        <IconButton title="JSON anzeigen" onClick={onJson}>
          <Icons.Code />
        </IconButton>
        <button type="button" onClick={() => window.print()} className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          <Icons.Printer /> <span className="hidden sm:inline">PDF drucken</span>
        </button>
      </div>
    </header>
  );
}

/** Sets the printed page size from metadata.page.format (Reactive Resume: A4, Letter). */
function PrintPageStyle() {
  const format = useBuilder((s) => s.data!.metadata.page.format);
  return <style>{`@page { size: ${PAGE_SIZES[format]?.css ?? "A4"}; margin: 0; }`}</style>;
}

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const data = useBuilder((s) => s.data);
  const loadedId = useBuilder((s) => s.id);
  const load = useBuilder((s) => s.load);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [fitZoom, setFitZoom] = useState(1);
  const [showJson, setShowJson] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setError(null);
    api.getResume(id).then(load).catch((e: Error) => setError(e.message));
  }, [id, load]);

  // Undo/redo shortcuts, except while typing in the rich text editor (it has its own history).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).closest?.(".ProseMirror")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        useBuilder.getState().undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        useBuilder.getState().redo();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flushSave();
    };
  }, []);

  // "Einpassen": scale the sheet to the width of the preview column.
  const format = data?.metadata.page.format ?? "a4";
  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setFitZoom(Math.min(1.25, Math.max(0.3, (entry.contentRect.width - 48) / SHEET_WIDTH_PX[format])));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [format, data !== null, tab]);

  if (error) return <main className="p-10 text-red-700">{error}</main>;
  if (!data || loadedId !== id) return <main className="p-10 text-slate-500">Lade …</main>;

  const panel = (name: Tab) => (tab === name ? "flex" : "hidden xl:flex");

  return (
    <div className="flex h-screen flex-col bg-slate-100 print:block print:h-auto print:bg-white">
      <PrintPageStyle />
      <TopBar zoom={zoom} setZoom={setZoom} onJson={() => setShowJson(true)} />

      <nav className="flex border-b border-slate-200 bg-white xl:hidden print:hidden">
        {(
          [
            ["content", "Inhalt"],
            ["preview", "Vorschau"],
            ["design", "Design"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`flex-1 py-2 text-sm font-medium ${tab === value ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"}`}>
            {label}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1 print:block">
        <aside className={`${panel("content")} w-full shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white xl:w-[380px] print:hidden`}>
          <ContentPanel />
        </aside>
        <main ref={canvas} className={`${panel("preview")} min-w-0 flex-1 justify-center overflow-auto p-6 print:block print:overflow-visible print:p-0`}>
          <div className="h-fit">
            <ResumePreview data={data} zoom={zoom === "fit" ? fitZoom : zoom} />
          </div>
        </main>
        <aside className={`${panel("design")} w-full shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white xl:w-[320px] print:hidden`}>
          <DesignPanel />
        </aside>
      </div>

      {showJson && <JsonDialog onClose={() => setShowJson(false)} />}
    </div>
  );
}
