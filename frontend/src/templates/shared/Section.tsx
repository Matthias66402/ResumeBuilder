/**
 * Shared section rendering for all templates, modelled on Reactive Resume's templates/shared/sections.tsx.
 * Templates decide the page layout and heading style; the entries look the same everywhere.
 */
import DOMPurify from "dompurify";
import type { ReactNode } from "react";
import { SECTION_FIELDS, type AnyItem } from "../../builder/sectionFields";
import type { ItemWebsite, ResumeData, SectionKey } from "../../types/resume";
import Icon from "./Icon";
import { sectionTitle } from "./labels";
import { entryKey, isOnSheet, useSheet } from "./sheet";

interface Entry {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  location?: string;
  website?: ItemWebsite;
  /** Makes the title (with its icon) a link, as for profiles. */
  titleLink?: string;
  /** Icon in front of the website link (projects). */
  linkIcon?: string;
  description?: string;
  keywords?: string[];
  level?: number;
  /** Item icon (profiles, skills, interests) and its optional custom color. */
  icon?: string;
  iconColor?: string;
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
  projects: (i) => ({ title: i.name, meta: i.period, website: i.website, linkIcon: i.linkIcon, description: i.description }),
  skills: (i) => ({ title: i.name, subtitle: i.proficiency, keywords: i.keywords, level: i.level, icon: i.icon, iconColor: i.iconColor }),
  languages: (i) => ({ title: i.language, subtitle: i.fluency, level: i.level }),
  interests: (i) => ({ title: i.name, keywords: i.keywords, icon: i.icon, iconColor: i.iconColor }),
  awards: (i) => ({ title: i.title, subtitle: i.awarder, meta: i.date, website: i.website, description: i.description }),
  certifications: (i) => ({ title: i.title, subtitle: i.issuer, meta: i.date, website: i.website, description: i.description }),
  publications: (i) => ({ title: i.title, subtitle: i.publisher, meta: i.date, website: i.website, description: i.description }),
  volunteer: (i) => ({ title: i.organization, meta: i.period, location: i.location, website: i.website, description: i.description }),
  // The network heading carries the link; the link line below only shows when it has its own text.
  profiles: (i) => ({
    title: i.network,
    subtitle: i.username,
    titleLink: i.website.url,
    website: i.website.label.trim() ? i.website : undefined,
    icon: i.icon,
    iconColor: i.iconColor,
  }),
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

function Website({ website, icon }: { website?: ItemWebsite; icon?: string }) {
  if (!website?.url) return null;
  return (
    <a className={`rb-link ${icon ? "rb-link-icon" : ""}`} href={absoluteLink(website.url)} target="_blank" rel="noreferrer">
      {icon && <Icon name={icon} />}
      {website.label || website.url.replace(/^https?:\/\/(www\.)?/, "")}
    </a>
  );
}

/** Keywords as one comma-separated line, or (skills with keywordLayout "list") one per line. */
function Keywords({ keywords, list }: { keywords?: string[]; list: boolean }) {
  if (!keywords?.length) return null;
  if (!list) return <p className="rb-keywords">{keywords.join(", ")}</p>;
  return (
    <ul className="rb-keywords rb-keywords-list">
      {keywords.map((keyword, index) => (
        <li key={index}>{keyword}</li>
      ))}
    </ul>
  );
}

function EntryView({
  entry,
  compact,
  icons,
  levels = true,
  keywordList = false,
}: {
  entry: Entry;
  compact: boolean;
  icons: boolean;
  levels?: boolean;
  keywordList?: boolean;
}) {
  return (
    <div className="rb-entry">
      <div className="rb-entry-head">
        <div className="rb-entry-title">
          <strong className="rb-entry-name">
            {entry.titleLink ? (
              <a className="rb-link rb-link-icon" href={absoluteLink(entry.titleLink)} target="_blank" rel="noreferrer">
                {icons && entry.icon && <Icon name={entry.icon} color={entry.iconColor || undefined} />}
                {entry.title}
              </a>
            ) : (
              <>
                {icons && entry.icon && <Icon name={entry.icon} color={entry.iconColor || undefined} />}
                {entry.title}
              </>
            )}
          </strong>
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
      {levels && entry.level !== undefined && <Level value={entry.level} />}
      <Keywords keywords={entry.keywords} list={keywordList} />
      <Website website={entry.website} icon={icons ? entry.linkIcon : undefined} />
      {entry.description && <Html html={entry.description} />}
      {!!entry.children?.length && (
        <div className="rb-roles">
          {entry.children.map((child) => (
            <EntryView key={child.id} entry={child} compact={compact} icons={icons} />
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
  render?: (heading: ReactNode | null, body: ReactNode) => ReactNode;
}

export function Section({ data, id, compact = false, render }: SectionProps) {
  const sheet = useSheet();
  if (!isSectionVisible(data, id)) return null;
  const { hideIcons, hideSectionIcons } = data.metadata.page;
  const keywordList = id === "skills" && data.sections.skills.keywordLayout === "list";
  const levels = data.metadata.design.level.type !== "hidden";

  // Each entry (or the whole summary) is one unit the paginator may move to the next sheet; `data-entry` marks it for measuring.
  const units =
    id === "summary"
      ? [{ key: entryKey("summary", "summary"), node: <Html html={data.summary.content} /> }]
      : visibleEntries(data, id as SectionKey).map((entry) => ({
          key: entryKey(id, entry.id),
          node: <EntryView entry={entry} compact={compact} icons={!hideIcons} levels={levels} keywordList={keywordList} />,
        }));
  const onSheet = units.filter((u) => isOnSheet(sheet, u.key));
  if (!onSheet.length) return null;

  // The heading goes with the section's first entry; a section continued from the previous sheet has none.
  const sectionIcon = id === "summary" ? data.summary.icon : data.sections[id as SectionKey].icon;
  const heading =
    onSheet[0].key === units[0].key ? (
      <>
        {!hideSectionIcons && sectionIcon && <Icon name={sectionIcon} className="rb-section-icon" />}
        {sectionTitle(data, id as SectionKey | "summary")}
      </>
    ) : null;
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

/** Links typed without a scheme ("xing.com/…") would resolve relative to the app; treat them as https. */
const absoluteLink = (link: string) => (/^[a-z][a-z0-9+.-]*:/i.test(link) ? link : `https://${link.replace(/^\/+/, "")}`);

/** Contact details: one wrapped line, a vertical list, or a two-column grid (Porygon); icons as in Reactive Resume. */
export function Contact({ data, variant = "inline", emailIcon = "envelope" }: { data: ResumeData; variant?: "inline" | "list" | "grid"; emailIcon?: string }) {
  const { email, phone, location, website, customFields } = data.basics;
  const showIcons = !data.metadata.page.hideIcons;
  const items: { key: string; icon: string; content: ReactNode }[] = [];
  if (location) items.push({ key: "location", icon: "map-pin", content: location });
  if (phone) items.push({ key: "phone", icon: "phone", content: phone });
  if (email)
    items.push({
      key: "email",
      icon: emailIcon,
      content: (
        <a className="rb-link" href={`mailto:${email}`}>
          {email}
        </a>
      ),
    });
  if (website.url)
    items.push({
      key: "website",
      icon: "globe",
      content: (
        <a className="rb-link" href={absoluteLink(website.url)} target="_blank" rel="noreferrer">
          {website.label || website.url.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ),
    });
  for (const field of customFields) {
    if (!field.text.trim()) continue;
    items.push({
      key: field.id,
      icon: field.icon,
      content: field.link.trim() ? (
        <a className="rb-link" href={absoluteLink(field.link.trim())} target="_blank" rel="noreferrer">
          {field.text}
        </a>
      ) : (
        field.text
      ),
    });
  }

  return (
    <div className={`rb-contact rb-contact-${variant} ${showIcons ? "rb-contact-icons" : ""}`}>
      {items.map((item) => (
        <span key={item.key} className="rb-contact-item">
          {showIcons && <Icon name={item.icon} />}
          <span>{item.content}</span>
        </span>
      ))}
    </div>
  );
}
