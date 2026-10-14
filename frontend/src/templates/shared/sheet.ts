import { createContext, useContext } from "react";

/**
 * What one printed sheet shows. A layout page that is too long is split into several sheets
 * (see paginate.ts); each sheet renders the same template with only its share of the entries.
 */
export interface Sheet {
  pageIndex: number;
  /** The header (name, contact) only appears on the first sheet of the first layout page. */
  showHeader: boolean;
  /** Entry keys ("<section>:<entry id>") on this sheet; null shows everything (measuring, free-form). */
  entries: Set<string> | null;
}

export const entryKey = (section: string, id: string) => `${section}:${id}`;

export const SheetContext = createContext<Sheet>({ pageIndex: 0, showHeader: true, entries: null });

export const useSheet = () => useContext(SheetContext);

export const isOnSheet = (sheet: Sheet, key: string) => sheet.entries === null || sheet.entries.has(key);
