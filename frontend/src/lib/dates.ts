import type { DateFormat, ResumeDates } from "../types/resume";

export const YEAR_MONTH_RE = /^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/;

const PRESENT: Record<string, string> = { de: "Heute", en: "Present", fr: "Présent", es: "Presente" };

export const language = (locale: string) => locale.split("-")[0]?.toLowerCase() ?? "en";

export const presentLabel = (locale: string) => PRESENT[language(locale)] ?? "Present";

function formatYearMonth(value: string, locale: string, format: DateFormat): string {
  const [year, month] = value.split("-");
  if (!month) return year;
  if (format === "iso") return value;
  if (format === "numeric") return `${month}/${year}`;
  const date = new Date(Number(year), Number(month) - 1, 1);
  try {
    return new Intl.DateTimeFormat(locale, { month: format, year: "numeric" }).format(date);
  } catch {
    return `${month}/${year}`;
  }
}

/** The printed date text ("Mar 2022 – Present"), as Reactive Resume writes it into `period` / `date`. */
export function formatDates(dates: ResumeDates, locale: string, format: DateFormat): string {
  if (dates.raw !== undefined) return dates.raw;
  const start = dates.start ? formatYearMonth(dates.start, locale, format) : "";
  const end = dates.present ? presentLabel(locale) : dates.end ? formatYearMonth(dates.end, locale, format) : "";
  return start && end ? `${start} – ${end}` : start || end;
}
