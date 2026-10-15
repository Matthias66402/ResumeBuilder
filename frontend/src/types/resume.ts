// Mirrors backend/app/schemas/resume.py (Reactive Resume data schema, camelCase JSON).

export interface Website {
  url: string;
  label: string;
}

export interface ItemWebsite extends Website {
  inlineLink: boolean;
}

export interface ResumeDates {
  start: string | null;
  end: string | null;
  present: boolean;
  raw?: string;
}

interface BaseItem {
  id: string;
  hidden: boolean;
}

export interface ProfileItem extends BaseItem {
  icon: string;
  iconColor: string;
  network: string;
  username: string;
  website: ItemWebsite;
}

export interface RoleItem {
  id: string;
  position: string;
  period: string;
  dates: ResumeDates;
  description: string;
}

export interface ExperienceItem extends BaseItem {
  company: string;
  position: string;
  location: string;
  period: string;
  dates: ResumeDates;
  website: ItemWebsite;
  description: string;
  roles: RoleItem[];
}

export interface EducationItem extends BaseItem {
  school: string;
  degree: string;
  area: string;
  grade: string;
  location: string;
  period: string;
  dates: ResumeDates;
  website: ItemWebsite;
  description: string;
}

export interface ProjectItem extends BaseItem {
  name: string;
  period: string;
  dates: ResumeDates;
  website: ItemWebsite;
  description: string;
}

export interface SkillItem extends BaseItem {
  icon: string;
  iconColor: string;
  name: string;
  proficiency: string;
  level: number;
  keywords: string[];
}

export interface LanguageItem extends BaseItem {
  language: string;
  fluency: string;
  level: number;
}

export interface InterestItem extends BaseItem {
  icon: string;
  iconColor: string;
  name: string;
  keywords: string[];
}

interface DatedEntry extends BaseItem {
  title: string;
  date: string;
  dates: ResumeDates;
  website: ItemWebsite;
  description: string;
}

export interface AwardItem extends DatedEntry {
  awarder: string;
}

export interface CertificationItem extends DatedEntry {
  issuer: string;
}

export interface PublicationItem extends DatedEntry {
  publisher: string;
}

export interface VolunteerItem extends BaseItem {
  organization: string;
  location: string;
  period: string;
  dates: ResumeDates;
  website: ItemWebsite;
  description: string;
}

export interface ReferenceItem extends BaseItem {
  name: string;
  position: string;
  website: ItemWebsite;
  phone: string;
  description: string;
}

export interface Section<T> {
  title: string;
  icon: string;
  columns: number;
  hidden: boolean;
  showHeading: boolean;
  keepTogether: boolean;
  startOnNewPage: boolean;
  items: T[];
}

export interface Sections {
  profiles: Section<ProfileItem>;
  experience: Section<ExperienceItem>;
  education: Section<EducationItem>;
  projects: Section<ProjectItem>;
  skills: Section<SkillItem> & { layout: "default" | "inline"; keywordLayout: "inline" | "list" };
  languages: Section<LanguageItem>;
  interests: Section<InterestItem>;
  awards: Section<AwardItem>;
  certifications: Section<CertificationItem>;
  publications: Section<PublicationItem>;
  volunteer: Section<VolunteerItem>;
  references: Section<ReferenceItem>;
}

export type SectionKey = keyof Sections;

export interface PageLayout {
  fullWidth: boolean;
  main: string[];
  sidebar: string[];
}

export interface TypographyItem {
  fontFamily: string;
  fontWeights: string[];
  fontSize: number;
  lineHeight: number;
}

export type DateFormat = "short" | "long" | "numeric" | "iso";

export interface Metadata {
  template: string;
  layout: { sidebarWidth: number; pages: PageLayout[] };
  page: {
    gapX: number;
    gapY: number;
    marginX: number;
    marginY: number;
    format: "a4" | "letter" | "free-form";
    locale: string;
    dateFormat: DateFormat;
    hideLinkUnderline: boolean;
    hideIcons: boolean;
    hideSectionIcons: boolean;
    /** Not in Reactive Resume: running text ragged right or justified; missing in older resumes. */
    textAlign?: "left" | "justify";
  };
  design: {
    colors: { primary: string; text: string; background: string };
    level: { icon: string; type: string };
  };
  /** nameFontSize (pt) is not in Reactive Resume: overrides the template's name size; null/missing = template. */
  typography: { body: TypographyItem; heading: TypographyItem; nameFontSize?: number | null };
  notes: string;
  styleRules: unknown[];
}

export interface Picture {
  hidden: boolean;
  fit: "cover" | "contain";
  url: string;
  /** Width in pt; the height is size / aspectRatio. */
  size: number;
  rotation: number;
  aspectRatio: number;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  shadowColor: string;
  shadowWidth: number;
}

export interface ResumeData {
  picture: Picture;
  basics: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: Website;
    customFields: { id: string; icon: string; text: string; link: string }[];
  };
  summary: Omit<Section<never>, "items"> & { content: string };
  sections: Sections;
  customSections: unknown[];
  metadata: Metadata;
}

export interface ResumeSummary {
  id: string;
  name: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resume extends ResumeSummary {
  data: ResumeData;
}
