import { language } from "../../lib/dates";
import type { ResumeData, SectionKey } from "../../types/resume";

type Labels = Record<SectionKey | "summary", string>;

const LABELS: Record<string, Labels> = {
  de: {
    summary: "Profil",
    profiles: "Profile",
    experience: "Berufserfahrung",
    education: "Ausbildung",
    projects: "Projekte",
    skills: "Kenntnisse",
    languages: "Sprachen",
    interests: "Interessen",
    awards: "Auszeichnungen",
    certifications: "Zertifikate",
    publications: "Publikationen",
    volunteer: "Ehrenamt",
    references: "Referenzen",
  },
  en: {
    summary: "Summary",
    profiles: "Profiles",
    experience: "Experience",
    education: "Education",
    projects: "Projects",
    skills: "Skills",
    languages: "Languages",
    interests: "Interests",
    awards: "Awards",
    certifications: "Certifications",
    publications: "Publications",
    volunteer: "Volunteering",
    references: "References",
  },
};

export const SECTION_KEYS: SectionKey[] = [
  "profiles",
  "experience",
  "education",
  "projects",
  "skills",
  "languages",
  "interests",
  "awards",
  "certifications",
  "publications",
  "volunteer",
  "references",
];

export const defaultTitle = (key: SectionKey | "summary", locale: string) =>
  (LABELS[language(locale)] ?? LABELS.en)[key];

/** The section heading: the user's title, or the localized default when it's empty (as in Reactive Resume). */
export function sectionTitle(data: ResumeData, key: SectionKey | "summary"): string {
  const title = key === "summary" ? data.summary.title : data.sections[key].title;
  return title.trim() || defaultTitle(key, data.metadata.page.locale);
}
