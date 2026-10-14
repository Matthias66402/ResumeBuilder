import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { ResumeData } from "../types/resume";
import { getTemplate } from "./index";
import { paginate, sheetsKey } from "./paginate";
import { SheetContext, type Sheet } from "./shared/sheet";
import "./templates.css";

const PX_PER_MM = 96 / 25.4;

export const PAGE_SIZES = {
  a4: { width: "210mm", height: "297mm", heightPx: 297 * PX_PER_MM, css: "A4" },
  letter: { width: "8.5in", height: "11in", heightPx: 11 * 96, css: "letter" },
  "free-form": { width: "210mm", height: "auto", heightPx: Infinity, css: "A4" },
} as const;

/** Maps metadata (design, typography, page, layout) onto CSS variables used by templates.css. */
function cssVariables(data: ResumeData): CSSProperties {
  const { design, typography, page, layout } = data.metadata;
  return {
    "--rb-primary": design.colors.primary,
    "--rb-text": design.colors.text,
    "--rb-bg": design.colors.background,
    "--rb-font-body": `"${typography.body.fontFamily}", serif`,
    "--rb-font-heading": `"${typography.heading.fontFamily}", serif`,
    "--rb-size-body": `${typography.body.fontSize}pt`,
    "--rb-size-heading": `${typography.heading.fontSize}pt`,
    "--rb-lh-body": typography.body.lineHeight,
    "--rb-lh-heading": typography.heading.lineHeight,
    "--rb-weight-heading": typography.heading.fontWeights.at(-1) ?? "600",
    "--rb-margin-x": `${page.marginX}pt`,
    "--rb-margin-y": `${page.marginY}pt`,
    "--rb-gap-x": `${page.gapX}pt`,
    "--rb-gap-y": `${page.gapY}pt`,
    "--rb-sidebar-width": `${layout.sidebarWidth}%`,
    "--rb-link-decoration": page.hideLinkUnderline ? "none" : "underline",
    // Lapras and Pikachu round their cards like the picture (capped as in Reactive Resume).
    "--rb-card-radius": `${Math.min(data.picture.borderRadius, 30)}pt`,
  } as CSSProperties;
}

/** Each layout page unsplit: used for measuring, for free-form pages and before the first measurement. */
const unsplit = (data: ResumeData): Sheet[] =>
  data.metadata.layout.pages.map((_, pageIndex) => ({ pageIndex, showHeader: pageIndex === 0, entries: null }));

/** Re-measure when web fonts finish loading, since they change text heights. */
function useFontsLoaded() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    document.fonts.ready.then(bump);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  return tick;
}

export default function ResumePreview({ data, zoom = 1 }: { data: ResumeData; zoom?: number }) {
  const { Component, id, bleed } = getTemplate(data.metadata.template);
  const size = PAGE_SIZES[data.metadata.page.format] ?? PAGE_SIZES.a4;
  const paginated = Number.isFinite(size.heightPx);
  const vars = cssVariables(data);
  const measureRoot = useRef<HTMLDivElement>(null);
  const [sheets, setSheets] = useState<Sheet[]>(() => unsplit(data));
  const fontsLoaded = useFontsLoaded();

  // Runs before paint, so the split sheets replace the unsplit render without flicker.
  useLayoutEffect(() => {
    const next = paginated
      ? [...(measureRoot.current?.querySelectorAll<HTMLElement>(".rb-sheet") ?? [])].flatMap((el, pageIndex) =>
          paginate(el, pageIndex, size.heightPx),
        )
      : unsplit(data);
    setSheets((prev) => (sheetsKey(prev) === sheetsKey(next) ? prev : next));
  }, [data, paginated, size.heightPx, fontsLoaded]);

  const sheet = (s: Sheet, key: string | number, height: string) => (
    <article
      key={key}
      className={`rb-sheet rb-template-${id}${bleed ? " rb-sheet-bleed" : ""}`}
      style={{ ...vars, width: size.width, height: paginated ? height : undefined }}
      lang={data.metadata.page.locale}
    >
      <SheetContext.Provider value={s}>
        <Component data={data} page={data.metadata.layout.pages[s.pageIndex]} />
      </SheetContext.Provider>
    </article>
  );

  // Sheets can be stale for one render after layout pages are removed.
  const visible = sheets.filter((s) => s.pageIndex < data.metadata.layout.pages.length);

  return (
    <>
      {/* Printed page size from metadata.page.format; the sheets bring their own margins. */}
      <style>{`@page { size: ${size.css}; margin: 0; }`}</style>
      {paginated && (
        <div ref={measureRoot} className="rb-measure" aria-hidden>
          {unsplit(data).map((s) => sheet(s, s.pageIndex, "auto"))}
        </div>
      )}
      <div className="rb-print-root" style={{ zoom }}>
        {visible.map((s, i) => (
          <div key={i} className="rb-sheet-wrap">
            {sheet(s, i, size.height)}
            {visible.length > 1 && (
              <p className="rb-sheet-label">
                Seite {i + 1} von {visible.length}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
