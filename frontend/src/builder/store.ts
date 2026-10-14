/**
 * Builder state, modelled on Reactive Resume's draft store (apps/web/src/features/resume/builder/draft.ts):
 * immer updates, undo/redo snapshots with coalescing, and a debounced save of the whole document.
 */
import { produce, type Draft } from "immer";
import { create } from "zustand";
import { api } from "../api";
import { formatDates } from "../lib/dates";
import type { Resume, ResumeData, ResumeDates } from "../types/resume";

const MAX_HISTORY = 100;
const COALESCE_MS = 1000;
const SAVE_DELAY_MS = 800;

export type SaveStatus = "saved" | "pending" | "saving" | "error";

interface BuilderState {
  id: string | null;
  name: string;
  data: ResumeData | null;
  status: SaveStatus;
  past: ResumeData[];
  future: ResumeData[];
  lastKey: string | null;
  lastAt: number;
  load: (resume: Resume) => void;
  /** Mutates the resume through immer. Edits with the same `key` within a second form one undo step. */
  update: (fn: (draft: Draft<ResumeData>) => void, key?: string) => void;
  rename: (name: string) => void;
  undo: () => void;
  redo: () => void;
}

/** Rewrites every legacy `period` / `date` text from the structured dates, like Reactive Resume's syncResumeDates. */
function syncDates(data: Draft<ResumeData>) {
  const { locale, dateFormat } = data.metadata.page;
  const fmt = (dates: ResumeDates) => formatDates(dates, locale, dateFormat);
  const s = data.sections;
  for (const items of [s.experience.items, s.education.items, s.projects.items, s.volunteer.items]) {
    for (const item of items) item.period = fmt(item.dates);
  }
  for (const item of s.experience.items) for (const role of item.roles) role.period = fmt(role.dates);
  for (const items of [s.awards.items, s.certifications.items, s.publications.items]) {
    for (const item of items) item.date = fmt(item.dates);
  }
}

export const useBuilder = create<BuilderState>()((set, get) => ({
  id: null,
  name: "",
  data: null,
  status: "saved",
  past: [],
  future: [],
  lastKey: null,
  lastAt: 0,

  load: (resume) => {
    saver.reset(resume.name, resume.data);
    set({ id: resume.id, name: resume.name, data: resume.data, status: "saved", past: [], future: [], lastKey: null });
  },

  update: (fn, key) => {
    const { data, past, lastKey, lastAt } = get();
    if (!data) return;
    const next = produce(data, (draft) => {
      fn(draft);
      syncDates(draft);
    });
    if (next === data) return;
    const now = Date.now();
    const coalesce = key !== undefined && key === lastKey && now - lastAt < COALESCE_MS;
    set({
      data: next,
      past: coalesce ? past : [...past, data].slice(-MAX_HISTORY),
      future: [],
      lastKey: key ?? null,
      lastAt: now,
    });
    saver.schedule();
  },

  rename: (name) => {
    set({ name });
    saver.schedule();
  },

  undo: () => {
    const { data, past, future } = get();
    const prev = past.at(-1);
    if (!data || !prev) return;
    set({ data: prev, past: past.slice(0, -1), future: [data, ...future], lastKey: null });
    saver.schedule();
  },

  redo: () => {
    const { data, past, future } = get();
    const [next, ...rest] = future;
    if (!data || !next) return;
    set({ data: next, past: [...past, data], future: rest, lastKey: null });
    saver.schedule();
  },
}));

/** Debounced autosave: one request at a time; changes made during a request are sent right after it. */
const saver = (() => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;
  let saved: { name: string; data: ResumeData | null } = { name: "", data: null };

  const isDirty = () => {
    const { name, data } = useBuilder.getState();
    return name !== saved.name || data !== saved.data;
  };

  async function save() {
    const { id, name, data } = useBuilder.getState();
    if (!id || !data) return;
    useBuilder.setState({ status: "saving" });
    try {
      // An empty name isn't valid server-side; the data is still saved.
      await api.updateResume(id, { name: name.trim() || undefined, data });
      saved = { name, data };
      useBuilder.setState({ status: isDirty() ? "pending" : "saved" });
    } catch {
      useBuilder.setState({ status: "error" });
    }
  }

  async function flush() {
    timer = undefined;
    if (inFlight || !isDirty()) return;
    inFlight = save().finally(() => (inFlight = null));
    await inFlight;
    if (isDirty() && useBuilder.getState().status !== "error") schedule();
  }

  /** Resolves once everything typed so far is on the server (e.g. before the PDF export). */
  async function saveNow() {
    clearTimeout(timer);
    while (inFlight || isDirty()) {
      if (inFlight) await inFlight;
      else {
        inFlight = save().finally(() => (inFlight = null));
        await inFlight;
      }
      if (useBuilder.getState().status === "error") throw new Error("Speichern fehlgeschlagen.");
    }
  }

  function schedule() {
    useBuilder.setState({ status: "pending" });
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY_MS);
  }

  return {
    schedule,
    flush,
    saveNow,
    isDirty,
    reset: (name: string, data: ResumeData) => {
      clearTimeout(timer);
      saved = { name, data };
    },
  };
})();

export const flushSave = () => saver.flush();
export const saveNow = () => saver.saveNow();
export const hasUnsavedChanges = () => saver.isDirty();
