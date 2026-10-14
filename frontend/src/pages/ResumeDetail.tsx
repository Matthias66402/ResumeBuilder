import DOMPurify from "dompurify";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { ItemWebsite, Resume, Sections } from "../types/resume";

// How each section's items are shown: a title line, a subtitle line and the date text.
interface Row {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  website?: ItemWebsite;
  description?: string;
  keywords?: string[];
  children?: Row[];
}

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" · ");

const SECTIONS: { [K in keyof Sections]: { label: string; rows: (items: Sections[K]["items"]) => Row[] } } = {
  experience: {
    label: "Berufserfahrung",
    rows: (items) =>
      items.map((i) => ({
        id: i.id,
        title: join(i.position, i.company),
        subtitle: i.location,
        meta: i.period,
        website: i.website,
        description: i.description,
        children: i.roles.map((r) => ({ id: r.id, title: r.position, meta: r.period, description: r.description })),
      })),
  },
  education: {
    label: "Ausbildung",
    rows: (items) =>
      items.map((i) => ({
        id: i.id,
        title: i.school,
        subtitle: join(i.degree, i.area, i.grade, i.location),
        meta: i.period,
        website: i.website,
        description: i.description,
      })),
  },
  projects: {
    label: "Projekte",
    rows: (items) =>
      items.map((i) => ({ id: i.id, title: i.name, meta: i.period, website: i.website, description: i.description })),
  },
  skills: {
    label: "Kenntnisse",
    rows: (items) => items.map((i) => ({ id: i.id, title: i.name, subtitle: i.proficiency, keywords: i.keywords })),
  },
  languages: {
    label: "Sprachen",
    rows: (items) => items.map((i) => ({ id: i.id, title: i.language, subtitle: i.fluency })),
  },
  certifications: {
    label: "Zertifikate",
    rows: (items) =>
      items.map((i) => ({
        id: i.id,
        title: i.title,
        subtitle: i.issuer,
        meta: i.date,
        website: i.website,
        description: i.description,
      })),
  },
  awards: {
    label: "Auszeichnungen",
    rows: (items) =>
      items.map((i) => ({
        id: i.id,
        title: i.title,
        subtitle: i.awarder,
        meta: i.date,
        website: i.website,
        description: i.description,
      })),
  },
  publications: {
    label: "Publikationen",
    rows: (items) =>
      items.map((i) => ({
        id: i.id,
        title: i.title,
        subtitle: i.publisher,
        meta: i.date,
        website: i.website,
        description: i.description,
      })),
  },
  volunteer: {
    label: "Ehrenamt",
    rows: (items) =>
      items.map((i) => ({
        id: i.id,
        title: i.organization,
        subtitle: i.location,
        meta: i.period,
        website: i.website,
        description: i.description,
      })),
  },
  interests: {
    label: "Interessen",
    rows: (items) => items.map((i) => ({ id: i.id, title: i.name, keywords: i.keywords })),
  },
  profiles: {
    label: "Profile",
    rows: (items) => items.map((i) => ({ id: i.id, title: i.network, subtitle: i.username, website: i.website })),
  },
  references: {
    label: "Referenzen",
    rows: (items) =>
      items.map((i) => ({
        id: i.id,
        title: i.name,
        subtitle: join(i.position, i.phone),
        website: i.website,
        description: i.description,
      })),
  },
};

function Html({ html }: { html: string }) {
  if (!html) return null;
  return <div className="rich-text mt-1 text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

function RowView({ row }: { row: Row }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-medium">{row.title}</p>
        {row.meta && <p className="text-sm text-slate-500">{row.meta}</p>}
      </div>
      {row.subtitle && <p className="text-sm text-slate-600">{row.subtitle}</p>}
      {row.website?.url && (
        <a href={row.website.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 hover:underline">
          {row.website.label || row.website.url}
        </a>
      )}
      {row.description && <Html html={row.description} />}
      {!!row.keywords?.length && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {row.keywords.map((k) => (
            <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {k}
            </span>
          ))}
        </div>
      )}
      {!!row.children?.length && (
        <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
          {row.children.map((c) => (
            <RowView key={c.id} row={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function ResumeDetail() {
  const { id } = useParams<{ id: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) api.getResume(id).then(setResume).catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <main className="mx-auto max-w-3xl px-4 py-10 text-red-700">{error}</main>;
  if (!resume) return <main className="mx-auto max-w-3xl px-4 py-10 text-slate-500">Lade …</main>;

  const { basics, summary, sections } = resume.data;
  const contact = [basics.email, basics.phone, basics.location].filter(Boolean);

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <Link to="/" className="text-sm text-blue-700 hover:underline">
        ← Alle Lebensläufe
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold">{basics.name || resume.name}</h1>
        {basics.headline && <p className="text-slate-600">{basics.headline}</p>}
        {contact.length > 0 && <p className="mt-2 text-sm text-slate-600">{contact.join(" · ")}</p>}
        {basics.website.url && (
          <a href={basics.website.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 hover:underline">
            {basics.website.label || basics.website.url}
          </a>
        )}
      </header>

      {summary.content && (
        <Card title="Profil">
          <Html html={summary.content} />
        </Card>
      )}

      {(Object.keys(SECTIONS) as (keyof Sections)[]).map((key) => {
        const items = sections[key].items;
        if (!items.length) return null;
        const config = SECTIONS[key] as { label: string; rows: (items: unknown[]) => Row[] };
        return (
          <Card key={key} title={config.label}>
            <div className="space-y-4">
              {config.rows(items).map((row) => (
                <RowView key={row.id} row={row} />
              ))}
            </div>
          </Card>
        );
      })}

      <details className="rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-medium text-slate-600">Roh-JSON (Reactive-Resume-Format)</summary>
        <pre className="mt-3 max-h-[32rem] overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
          {JSON.stringify(resume.data, null, 2)}
        </pre>
      </details>
    </main>
  );
}
