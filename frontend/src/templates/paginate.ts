/**
 * Splits a layout page into printed sheets by measuring it.
 *
 * The page is rendered once in full length (off-screen, at real size). Every entry is a unit
 * (`data-entry`); a unit that would end below the sheet's content area moves to the next sheet,
 * together with its section heading when it's the section's first entry. Units never split, so a
 * single entry taller than a sheet still overflows. Columns (`data-col`) are split independently,
 * and the layout page takes as many sheets as its longest column needs.
 */
import type { Sheet } from "./shared/sheet";

export function paginate(sheetEl: HTMLElement, pageIndex: number, pageHeightPx: number): Sheet[] {
  // The page margin, not the sheet's padding: full-bleed templates have no sheet padding and inset their
  // columns by the margin themselves, on every sheet.
  const marginY = (parseFloat(getComputedStyle(sheetEl).getPropertyValue("--rb-margin-y")) * 96) / 72;
  const contentTop = sheetEl.getBoundingClientRect().top + marginY;
  const contentHeight = pageHeightPx - 2 * marginY;

  const sheets: Set<string>[] = [new Set()];

  for (const column of sheetEl.querySelectorAll<HTMLElement>("[data-col]")) {
    let index = 0;
    let start = 0;
    let emptySheet = true;
    for (const unit of column.querySelectorAll<HTMLElement>("[data-entry]")) {
      const section = unit.closest<HTMLElement>("[data-section]");
      const isFirstInSection = section?.querySelector("[data-entry]") === unit;
      const rect = unit.getBoundingClientRect();
      const top = (isFirstInSection && section ? section.getBoundingClientRect().top : rect.top) - contentTop;
      const bottom = rect.bottom - contentTop;

      if (!emptySheet && bottom - start > contentHeight) {
        index += 1;
        start = top;
        sheets[index] ??= new Set();
      }
      sheets[index].add(unit.dataset.entry!);
      emptySheet = false;
    }
  }

  return sheets.map((entries, i) => ({ pageIndex, showHeader: pageIndex === 0 && i === 0, entries }));
}

/** Stable key to skip state updates when a re-measure gives the same split. */
export const sheetsKey = (sheets: Sheet[]) =>
  sheets.map((s) => `${s.pageIndex}|${s.showHeader}|${s.entries ? [...s.entries].join(",") : "*"}`).join(";");
