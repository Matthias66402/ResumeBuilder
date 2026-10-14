/**
 * Shared section rendering for all templates, modelled on Reactive Resume's templates/shared/sections.tsx.
 * Templates decide the page layout and heading style; the entries look the same everywhere.
 */
import DOMPurify from "dompurify";
import type { ReactNode } from "react";
import { SECTION_FIELDS, type AnyItem } from "../../builder/sectionFields";
import type { ItemWebsite, ResumeData, SectionKey } from "../../types/resume";
import { sectionTitle } from "./labels";
import { entryKey, isOnSheet, useSheet } from "./sheet";

interface Entry {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  location?: string;
  website?: ItemWebsite;
  description?: string;
  keywords?: string[];
  level?: number;
  children?: Entry[];
}

const join = (...parts: (string | undefined)[]) => parts.filter((p) => p?.trim()).join(" · ");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ENTRY: Record<SectionKey, (i: any) => Omit<Entry, "id">> = {
  experience: (i) => ({
    title: i.company,
    subtitle: i.roles.length ? undefined : i.position,
    meta: i.period,
    location: i.location,
    website: i.website,
    description: i.description,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: i.roles.filter((r: any) => r.position.trim()).map((r: any) => ({ id: r.id, title: r.position, meta: r.period, description: r.description })),
  }),
  education: (i) => ({ title: i.school, subtitle: join(i.degree, i.area, i.grade), meta: i.period, location: i.location, website: i.website, description: i.description }),
  projects: (i) => ({ title: i.name, meta: i.period, website: i.website, description: i.description }),
  skills: (i) => ({ title: i.name, subtitle: i.proficiency, keywords: i.keywords, level: i.level }),
  languages: (i) => ({ title: i.language, subtitle: i.fluency, level: i.level }),
  interests: (i) => ({ title: i.name, keywords: i.keywords }),
  awards: (i) => ({ title: i.title, subtitle: i.awarder, meta: i.date, website: i.website, description: i.description }),
  certifications: (i) => ({ title: i.title, subtitle: i.issuer, meta: i.date, website: i.website, description: i.description }),
  publications: (i) => ({ title: i.title, subtitle: i.publisher, meta: i.date, website: i.website, description: i.description }),
  volunteer: (i) => ({ title: i.organization, meta: i.period, location: i.location, website: i.website, description: i.description }),
  profiles: (i) => ({ title: i.network, subtitle: i.username, website: i.website }),
  references: (i) => ({ title: i.name, subtitle: join(i.position, i.phone), website: i.website, description: i.description }),
};

/** Visible entries: hidden ones and drafts without their required field are not printed. */
function visibleEntries(data: ResumeData, key: SectionKey): Entry[] {
  const { required } = SECTION_FIELDS[key];
  return (data.sections[key].items as AnyItem[])
    .filter((item) => !item.hidden && String(item[required] ?? "").trim())
    .map((item) => ({ id: item.id, ...ENTRY[key](item) }));
}

export function isSectionVisible(data: ResumeData, id: string): boolean {
  if (id === "summary") return !data.summary.hidden && !!data.summary.content.trim();
  const key = id as SectionKey;
  return !!data.sections[key] && !data.sections[key].hidden && visibleEntries(data, key).length > 0;
}

export function Html({ html }: { html: string }) {
  if (!html.trim()) return null;
  return <div className="rich-text rb-rich" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

function Level({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="rb-level" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "rb-level-on" : ""} />
      ))}
    </span>
  );
}

function Website({ website }: { website?: ItemWebsite }) {
  if (!website?.url) return null;
  return (
    <a className="rb-link" href={website.url} target="_blank" rel="noreferrer">
      {website.label || website.url.replace(/^https?:\/\/(www\.)?/, "")}
    </a>
  );
}

function EntryView({ entry, compact }: { entry: Entry; compact: boolean }) {
  return (
    <div className="rb-entry">
      <div className="rb-entry-head">
        <div className="rb-entry-title">
          <strong>{entry.title}</strong>
          {entry.subtitle && <span className="rb-entry-subtitle">{entry.subtitle}</span>}
        </div>
        {!compact && (entry.meta || entry.location) && (
          <div className="rb-entry-meta">
            {entry.meta && <span>{entry.meta}</span>}
            {entry.location && <span>{entry.location}</span>}
          </div>
        )}
      </div>
      {compact && (entry.meta || entry.location) && <div className="rb-entry-meta-inline">{join(entry.meta, entry.location)}</div>}
      {entry.level !== undefined && <Level value={entry.level} />}
      {!!entry.keywords?.length && <p className="rb-keywords">{entry.keywords.join(", ")}</p>}
      <Website website={entry.website} />
      {entry.description && <Html html={entry.description} />}
      {!!entry.children?.length && (
        <div className="rb-roles">
          {entry.children.map((child) => (
            <EntryView key={child.id} entry={child} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  data: ResumeData;
  id: string;
  /** Sidebar sections stack meta under the title, since the column is narrow. */
  compact?: boolean;
  /** Templates can wrap heading and body differently (e.g. Bronzor's label column). The heading is null on a continuation sheet. */
  render?: (heading: string | null, body: ReactNode) => ReactNode;
}

export function Section({ data, id, compact = false, render }: SectionProps) {
  const sheet = useSheet();
  if (!isSectionVisible(data, id)) return null;

  // Each entry (or the whole summary) is one unit the paginator may move to the next sheet; `data-entry` marks it for measuring.
  const units =
    id === "summary"
      ? [{ key: entryKey("summary", "summary"), node: <Html html={data.summary.content} /> }]
      : visibleEntries(data, id as SectionKey).map((entry) => ({
          key: entryKey(id, entry.id),
          node: <EntryView entry={entry} compact={compact} />,
        }));
  const onSheet = units.filter((u) => isOnSheet(sheet, u.key));
  if (!onSheet.length) return null;

  // The heading goes with the section's first entry; a section continued from the previous sheet has none.
  const heading = onSheet[0].key === units[0].key ? sectionTitle(data, id as SectionKey | "summary") : null;
  const body = (
    <div className="rb-entries">
      {onSheet.map((u) => (
        <div key={u.key} data-entry={u.key}>
          {u.node}
        </div>
      ))}
    </div>
  );

  return (
    <section className={`rb-section rb-section-${id}`} data-section={id}>
      {render ? (
        render(heading, body)
      ) : (
        <>
          {heading && <h2 className="rb-heading">{heading}</h2>}
          {body}
        </>
      )}
    </section>
  );
}

export function Contact({ data, separator = " · " }: { data: ResumeData; separator?: string }) {
  const { email, phone, location, website } = data.basics;
  const parts: ReactNode[] = [
    location && <span key="l">{location}</span>,
    phone && <span key="p">{phone}</span>,
    email && (
      <a key="e" className="rb-link" href={`mailto:${email}`}>
        {email}
      </a>
    ),
    website.url && (
      <a key="w" className="rb-link" href={website.url} target="_blank" rel="noreferrer">
        {website.label || website.url.replace(/^https?:\/\/(www\.)?/, "")}
      </a>
    ),
  ].filter(Boolean);
  return (
    <p className="rb-contact">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="rb-sep">{separator}</span>}
          {part}
        </span>
      ))}
    </p>
  );
}
