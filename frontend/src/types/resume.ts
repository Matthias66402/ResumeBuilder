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

export interface ResumeData {
  picture: Record<string, unknown>;
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
  metadata: Record<string, unknown>;
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
