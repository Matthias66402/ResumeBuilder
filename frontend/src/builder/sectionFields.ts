/** Field configuration per section: the content editor renders all twelve sections from this. */
import type { SectionKey } from "../types/resume";

export type FieldType = "text" | "richtext" | "dates" | "keywords" | "level" | "url" | "roles";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Single-date entries (awards, certifications, publications) have no end date. */
  single?: boolean;
  half?: boolean;
}

// Items are edited generically; their exact shape is in types/resume.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyItem = Record<string, any> & { id: string; hidden: boolean };

export interface SectionConfig {
  fields: FieldDef[];
  /** Field that must be filled for the entry to be printed (Reactive Resume treats it as a draft otherwise). */
  required: string;
  title: (item: AnyItem) => string;
  subtitle: (item: AnyItem) => string;
  defaults: () => Record<string, unknown>;
}

const join = (...parts: (string | undefined)[]) => parts.filter((p) => p?.trim()).join(" · ");
const emptyDates = () => ({ start: null, end: null, present: false });
const emptyWebsite = () => ({ url: "", label: "", inlineLink: false });

const text = (key: string, label: string, half = true): FieldDef => ({ key, label, type: "text", half });
const description: FieldDef = { key: "description", label: "Beschreibung", type: "richtext" };
const website: FieldDef = { key: "website", label: "Website", type: "url" };
const period: FieldDef = { key: "dates", label: "Zeitraum", type: "dates" };
const date: FieldDef = { key: "dates", label: "Datum", type: "dates", single: true };

export const SECTION_FIELDS: Record<SectionKey, SectionConfig> = {
  experience: {
    fields: [text("company", "Firma"), text("position", "Position"), text("location", "Ort"), period, website, description, { key: "roles", label: "Rollen", type: "roles" }],
    required: "company",
    title: (i) => i.company,
    subtitle: (i) => join(i.position, i.period),
    defaults: () => ({ company: "", position: "", location: "", period: "", dates: emptyDates(), website: emptyWebsite(), description: "", roles: [] }),
  },
  education: {
    fields: [text("school", "Schule / Hochschule"), text("degree", "Abschluss"), text("area", "Fachrichtung"), text("grade", "Note"), text("location", "Ort"), period, website, description],
    required: "school",
    title: (i) => i.school,
    subtitle: (i) => join(i.degree, i.area, i.period),
    defaults: () => ({ school: "", degree: "", area: "", grade: "", location: "", period: "", dates: emptyDates(), website: emptyWebsite(), description: "" }),
  },
  projects: {
    fields: [text("name", "Name", false), period, website, description],
    required: "name",
    title: (i) => i.name,
    subtitle: (i) => i.period,
    defaults: () => ({ name: "", period: "", dates: emptyDates(), website: emptyWebsite(), description: "" }),
  },
  skills: {
    fields: [text("name", "Name"), text("proficiency", "Niveau"), { key: "level", label: "Stufe", type: "level" }, { key: "keywords", label: "Schlagwörter", type: "keywords" }],
    required: "name",
    title: (i) => i.name,
    subtitle: (i) => join(i.proficiency, (i.keywords as string[]).join(", ")),
    defaults: () => ({ icon: "", iconColor: "", name: "", proficiency: "", level: 0, keywords: [] }),
  },
  languages: {
    fields: [text("language", "Sprache"), text("fluency", "Niveau"), { key: "level", label: "Stufe", type: "level" }],
    required: "language",
    title: (i) => i.language,
    subtitle: (i) => i.fluency,
    defaults: () => ({ language: "", fluency: "", level: 0 }),
  },
  interests: {
    fields: [text("name", "Name", false), { key: "keywords", label: "Schlagwörter", type: "keywords" }],
    required: "name",
    title: (i) => i.name,
    subtitle: (i) => (i.keywords as string[]).join(", "),
    defaults: () => ({ icon: "", iconColor: "", name: "", keywords: [] }),
  },
  certifications: {
    fields: [text("title", "Titel"), text("issuer", "Aussteller"), date, website, description],
    required: "title",
    title: (i) => i.title,
    subtitle: (i) => join(i.issuer, i.date),
    defaults: () => ({ title: "", issuer: "", date: "", dates: emptyDates(), website: emptyWebsite(), description: "" }),
  },
  awards: {
    fields: [text("title", "Titel"), text("awarder", "Verliehen von"), date, website, description],
    required: "title",
    title: (i) => i.title,
    subtitle: (i) => join(i.awarder, i.date),
    defaults: () => ({ title: "", awarder: "", date: "", dates: emptyDates(), website: emptyWebsite(), description: "" }),
  },
  publications: {
    fields: [text("title", "Titel"), text("publisher", "Verlag"), date, website, description],
    required: "title",
    title: (i) => i.title,
    subtitle: (i) => join(i.publisher, i.date),
    defaults: () => ({ title: "", publisher: "", date: "", dates: emptyDates(), website: emptyWebsite(), description: "" }),
  },
  volunteer: {
    fields: [text("organization", "Organisation"), text("location", "Ort"), period, website, description],
    required: "organization",
    title: (i) => i.organization,
    subtitle: (i) => i.period,
    defaults: () => ({ organization: "", location: "", period: "", dates: emptyDates(), website: emptyWebsite(), description: "" }),
  },
  profiles: {
    fields: [text("network", "Netzwerk"), text("username", "Benutzername"), website],
    required: "network",
    title: (i) => i.network,
    subtitle: (i) => i.username,
    defaults: () => ({ icon: "", iconColor: "", network: "", username: "", website: emptyWebsite() }),
  },
  references: {
    fields: [text("name", "Name"), text("position", "Position"), text("phone", "Telefon"), website, description],
    required: "name",
    title: (i) => i.name,
    subtitle: (i) => i.position,
    defaults: () => ({ name: "", position: "", website: emptyWebsite(), phone: "", description: "" }),
  },
};

export const newRole = () => ({ id: crypto.randomUUID(), position: "", period: "", dates: emptyDates(), description: "" });
