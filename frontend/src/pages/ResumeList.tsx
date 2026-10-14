import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import AppShell from "../components/AppShell";
import { getTemplate } from "../templates";
import ResumePreview from "../templates/ResumePreview";
import type { ResumeData, ResumeSummary } from "../types/resume";

const SHEET_WIDTH_PX = { a4: (210 * 96) / 25.4, letter: 8.5 * 96, "free-form": (210 * 96) / 25.4 };

/** "vor 5 Minuten", "gestern", … */
function relativeTime(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 30],
    ["month", 12],
  ];
  let value = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);
    value /= size;
  }
  return rtf.format(Math.round(value), "year");
}

/** First sheet of the resume in its template, scaled to the card width. */
function Thumbnail({ data }: { data: ResumeData }) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.25);
  const sheetWidth = SHEET_WIDTH_PX[data.metadata.page.format] ?? SHEET_WIDTH_PX.a4;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setZoom(entry.contentRect.width / sheetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [sheetWidth]);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden [&_.rb-sheet]:shadow-none" aria-hidden>
      <ResumePreview data={data} zoom={zoom} thumbnail />
    </div>
  );
}

interface CardProps {
  resume: ResumeSummary;
  data?: ResumeData;
  onDelete: () => void;
}

function ResumeCard({ resume, data, onDelete }: CardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <Link to={`/resumes/${resume.id}`} className="relative block aspect-[210/297] overflow-hidden bg-slate-100" aria-label={`${resume.name} bearbeiten`}>
        {data ? (
          <Thumbnail data={data} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/40 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow">
            <i className="ph ph-pencil-simple" aria-hidden /> Bearbeiten
          </span>
        </span>
      </Link>
      <div className="flex items-start gap-2 border-t border-slate-100 p-3">
        <div className="min-w-0 flex-1">
          <Link to={`/resumes/${resume.id}`} className="block truncate font-medium text-slate-900 hover:text-blue-700">
            {resume.name}
          </Link>
          <p className="truncate text-xs text-slate-500" title={new Date(resume.updated_at).toLocaleString("de-DE")}>
            {data && <span className="font-medium text-slate-600">{getTemplate(data.metadata.template).name}</span>}
            {data && " · "}
            bearbeitet {relativeTime(resume.updated_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          title="Löschen"
          aria-label={`${resume.name} löschen`}
          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <i className="ph ph-trash text-lg" aria-hidden />
        </button>
      </div>
    </article>
  );
}

/** Drop zone card: click or drag a PDF here to import it. */
function ImportCard({ busy, onPick, onFile }: { busy: boolean; onPick: () => void; onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onPick}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && !busy) onFile(file);
      }}
      className={`flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition ${
        busy
          ? "cursor-wait border-blue-300 bg-blue-50"
          : dragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-white/60 hover:border-blue-400 hover:bg-white"
      }`}
    >
      {busy ? (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="font-medium text-slate-800">Lebenslauf wird analysiert …</p>
          <p className="text-xs text-slate-500">Das dauert ein paar Sekunden.</p>
        </>
      ) : (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <i className="ph ph-file-arrow-up text-3xl" aria-hidden />
          </span>
          <p className="font-medium text-slate-800">PDF importieren</p>
          <p className="text-xs text-slate-500">Hierher ziehen oder klicken.<br />Text-PDFs bis 10 MB</p>
        </>
      )}
    </button>
  );
}

export default function ResumeList() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [details, setDetails] = useState<Record<string, ResumeData>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listResumes()
      .then((list) => {
        setResumes(list);
        // Full data only feeds the thumbnails, so each card fills in as soon as its resume arrives.
        for (const r of list) {
          api.getResume(r.id).then((full) => setDetails((d) => ({ ...d, [r.id]: full.data }))).catch(() => undefined);
        }
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const resume = await api.importResume(file);
      navigate(`/resumes/${resume.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (resume: ResumeSummary) => {
    if (!window.confirm(`„${resume.name}“ löschen? Das lässt sich nicht rückgängig machen.`)) return;
    try {
      await api.deleteResume(resume.id);
      setResumes((list) => list?.filter((r) => r.id !== resume.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const pick = () => fileInput.current?.click();

  return (
    <AppShell actions={[{ label: "PDF importieren", icon: "upload-simple", onClick: pick, disabled: busy }]}>
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Lebensläufe</h1>
            <p className="mt-1 text-sm text-slate-500">
              {resumes === null
                ? "Lade …"
                : resumes.length === 0
                  ? "Importiere deinen ersten Lebenslauf als PDF – er wird automatisch strukturiert."
                  : `${resumes.length} ${resumes.length === 1 ? "Lebenslauf" : "Lebensläufe"} · zum Bearbeiten anklicken`}
            </p>
          </div>
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <i className="ph ph-upload-simple text-base" aria-hidden /> PDF importieren
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <i className="ph ph-warning-circle mt-0.5 text-lg" aria-hidden />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Meldung schließen" className="text-red-500 hover:text-red-700">
              <i className="ph ph-x" aria-hidden />
            </button>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
          <ImportCard busy={busy} onPick={pick} onFile={upload} />
          {resumes?.map((r) => (
            <ResumeCard key={r.id} resume={r} data={details[r.id]} onDelete={() => remove(r)} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
