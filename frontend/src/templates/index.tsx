/**
 * HTML ports of Reactive Resume's templates (reactive-resume/packages/pdf/src/templates/<name>/<Name>Page.tsx).
 *
 * Each template renders one layout page from shared building blocks: a header, one flowing column or
 * a main + sidebar pair. Colors, fonts and spacing come from CSS variables (ResumePreview.tsx); the
 * look of each template lives in templates.css under `.rb-template-<id>`.
 *
 * `data-col` marks the flowing columns the paginator measures and splits across sheets.
 */
import type { ComponentType, ReactNode } from "react";
import type { PageLayout, ResumeData } from "../types/resume";
import { Contact, Section } from "./shared/Section";
import { SheetContext, useSheet } from "./shared/sheet";

export interface TemplateProps {
  data: ResumeData;
  page: PageLayout;
}

// --- Building blocks ------------------------------------------------------------------------------

/** Profile picture with Reactive Resume's frame settings (size in pt, height from the aspect ratio). */
function Picture({ data }: { data: ResumeData }) {
  const p = data.picture;
  if (p.hidden || !p.url.trim()) return null;
  return (
    <img
      className="rb-picture"
      src={p.url}
      alt=""
      style={{
        width: `${p.size}pt`,
        height: `${p.size / p.aspectRatio}pt`,
        objectFit: p.fit,
        borderRadius: `${p.borderRadius}pt`,
        border: p.borderWidth ? `${p.borderWidth}pt solid ${p.borderColor}` : undefined,
        boxShadow: p.shadowWidth ? `0 0 ${p.shadowWidth}pt ${p.shadowColor}` : undefined,
        transform: p.rotation ? `rotate(${p.rotation}deg)` : undefined,
      }}
    />
  );
}

/** The picture on its own, e.g. at the top of a sidebar; only on the first sheet like the header. */
function SheetPicture({ data }: { data: ResumeData }) {
  if (!useSheet().showHeader || data.picture.hidden || !data.picture.url.trim()) return null;
  return (
    <div className="rb-sidebar-picture">
      <Picture data={data} />
    </div>
  );
}

type PicturePlacement = "left" | "right" | "top" | "none";

interface HeaderProps {
  data: ResumeData;
  picture?: PicturePlacement;
  contact?: "inline" | "list" | "grid";
  /** Ditgar uses "at" instead of the default envelope. */
  emailIcon?: string;
  /** Extra content inside the header text block (Leafish puts the summary there). */
  children?: ReactNode;
}

/** Name, headline and contact. Only on the first sheet; templates style it via `.rb-header`. */
function Header({ data, picture = "left", contact = "inline", emailIcon, children }: HeaderProps) {
  if (!useSheet().showHeader) return null;
  return (
    <header className={`rb-header rb-header-picture-${picture}`}>
      {picture !== "none" && <Picture data={data} />}
      <div className="rb-header-text">
        <div className="rb-identity">
          <h1 className="rb-name">{data.basics.name}</h1>
          {data.basics.headline && <p className="rb-headline">{data.basics.headline}</p>}
        </div>
        <Contact data={data} variant={contact} emailIcon={emailIcon} />
        {children}
      </div>
    </header>
  );
}

/** Content outside the measured columns (headers) always shows in full, whatever the sheet split. */
function Unsplit({ children }: { children: ReactNode }) {
  const sheet = useSheet();
  return <SheetContext.Provider value={{ ...sheet, entries: null }}>{children}</SheetContext.Provider>;
}

/** Summary without a heading, set apart at the top of the main column (Gengar, Ditgar, Smeargle). */
const featured = (_heading: ReactNode | null, body: ReactNode) => <div className="rb-featured">{body}</div>;

interface FlowProps {
  data: ResumeData;
  ids: string[];
  compact?: boolean;
  render?: (heading: ReactNode | null, body: ReactNode) => ReactNode;
}

const Sections = ({ data, ids, compact, render }: FlowProps) => (
  <>
    {ids.map((id) => (
      <Section key={id} data={data} id={id} compact={compact} render={render} />
    ))}
  </>
);

/** Moves the summary out of a column list when the template features it. */
const withoutSummary = (ids: string[], featureSummary: boolean) => (featureSummary ? ids.filter((id) => id !== "summary") : ids);

interface SingleColumnProps extends TemplateProps {
  header: ReactNode;
  render?: FlowProps["render"];
  featureSummary?: boolean;
}

/** One column: header, then the main sections followed by the sidebar sections (as Reactive Resume does). */
function SingleColumn({ data, page, header, render, featureSummary = false }: SingleColumnProps) {
  const feature = featureSummary && page.main.includes("summary");
  return (
    <div className="rb-root">
      {header}
      <div className="rb-stack rb-col" data-col="main">
        {feature && <Section data={data} id="summary" render={featured} />}
        <Sections data={data} ids={withoutSummary([...page.main, ...page.sidebar], feature)} render={render} />
      </div>
    </div>
  );
}

interface TwoColumnProps extends TemplateProps {
  side: "left" | "right";
  /** Rendered above both columns. */
  top?: ReactNode;
  /** Rendered at the top of the main column / the sidebar (header or picture, first sheet only). */
  mainTop?: ReactNode;
  sidebarTop?: ReactNode;
  featureSummary?: boolean;
}

/** Main column plus sidebar; a full-width layout page stacks them in one column. */
function TwoColumn({ data, page, side, top, mainTop, sidebarTop, featureSummary = false }: TwoColumnProps) {
  const feature = featureSummary && page.main.includes("summary");
  const main = withoutSummary(page.main, feature);
  const sidebar = withoutSummary(page.sidebar, feature);
  const featuredSummary = feature && <Section data={data} id="summary" render={featured} />;

  if (page.fullWidth) {
    return (
      <div className="rb-root">
        {top}
        <div className="rb-columns rb-columns-full">
          <div className="rb-col rb-main rb-stack" data-col="main">
            {sidebarTop}
            {mainTop}
            {featuredSummary}
            <Sections data={data} ids={[...main, ...sidebar]} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rb-root">
      {top}
      <div className={`rb-columns rb-sidebar-${side}`}>
        <aside className="rb-col rb-sidebar rb-stack" data-col="sidebar">
          {sidebarTop}
          <Sections data={data} ids={sidebar} compact />
        </aside>
        <main className="rb-col rb-main rb-stack" data-col="main">
          {mainTop}
          {featuredSummary}
          <Sections data={data} ids={main} />
        </main>
      </div>
    </div>
  );
}

// --- Templates ------------------------------------------------------------------------------------

/** Bronzor: section heading in a narrow label column. */
const labelRow = (heading: ReactNode | null, body: ReactNode) => (
  <div className="rb-row">
    <h2 className="rb-heading">{heading}</h2>
    <div>{body}</div>
  </div>
);

const Onyx = (p: TemplateProps) => <SingleColumn {...p} header={<Header data={p.data} picture="left" />} />;
const Bronzor = (p: TemplateProps) => <SingleColumn {...p} header={<Header data={p.data} picture="right" />} render={labelRow} />;
const Kakuna = (p: TemplateProps) => <SingleColumn {...p} header={<Header data={p.data} picture="top" />} />;
const Lapras = (p: TemplateProps) => <SingleColumn {...p} header={<Header data={p.data} picture="left" />} />;
const Meowth = (p: TemplateProps) => <SingleColumn {...p} header={<Header data={p.data} picture="left" />} />;
const Rhyhorn = (p: TemplateProps) => <SingleColumn {...p} header={<Header data={p.data} picture="left" />} />;
const Scizor = (p: TemplateProps) => <SingleColumn {...p} header={<Header data={p.data} picture="right" />} />;
const Porygon = (p: TemplateProps) => <SingleColumn {...p} header={<Header data={p.data} picture="right" contact="grid" />} />;
const Smeargle = (p: TemplateProps) => <SingleColumn {...p} header={<Header data={p.data} picture="right" />} featureSummary />;

const Azurill = (p: TemplateProps) => <TwoColumn {...p} side="left" top={<Header data={p.data} picture="top" />} />;
// Leafish shows the summary inside its header band instead of in a column.
const Leafish = (p: TemplateProps) => (
  <TwoColumn
    {...p}
    page={{ ...p.page, main: p.page.main.filter((id) => id !== "summary"), sidebar: p.page.sidebar.filter((id) => id !== "summary") }}
    side="right"
    top={
      <Unsplit>
        <Header data={p.data} picture="left">
          <Section data={p.data} id="summary" render={featured} />
        </Header>
      </Unsplit>
    }
  />
);
const Ditto = (p: TemplateProps) => <TwoColumn {...p} side="left" top={<Header data={p.data} picture="left" />} />;
const Chikorita = (p: TemplateProps) => (
  <TwoColumn {...p} side="right" mainTop={<Header data={p.data} picture="none" />} sidebarTop={<SheetPicture data={p.data} />} />
);
const Pikachu = (p: TemplateProps) => (
  <TwoColumn {...p} side="left" mainTop={<Header data={p.data} picture="none" />} sidebarTop={<SheetPicture data={p.data} />} />
);
const Glalie = (p: TemplateProps) => <TwoColumn {...p} side="left" sidebarTop={<Header data={p.data} picture="top" contact="list" />} />;
const Gengar = (p: TemplateProps) => (
  <TwoColumn {...p} side="left" sidebarTop={<Header data={p.data} picture="top" contact="list" />} featureSummary />
);
const Ditgar = (p: TemplateProps) => (
  <TwoColumn {...p} side="left" sidebarTop={<Header data={p.data} picture="top" contact="list" emailIcon="at" />} featureSummary />
);

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  Component: ComponentType<TemplateProps>;
  /** Full-bleed templates draw edge-to-edge color and inset their content by the page margin themselves. */
  bleed?: boolean;
  /** For the schematic thumbnail in the template picker. */
  thumb: { columns: 1 | 2; side?: "left" | "right"; sidebar?: "tint" | "solid"; header?: "band" | "box" | "centered" };
}

export const TEMPLATES: TemplateInfo[] = [
  { id: "onyx", name: "Onyx", description: "Einspaltig, Akzentlinie unter dem Kopf", Component: Onyx, thumb: { columns: 1 } },
  { id: "azurill", name: "Azurill", description: "Zweispaltig, Seitenspalte links, Kopf zentriert", Component: Azurill, thumb: { columns: 2, side: "left", header: "centered" } },
  { id: "bronzor", name: "Bronzor", description: "Einspaltig, Überschriften links", Component: Bronzor, thumb: { columns: 1 } },
  { id: "chikorita", name: "Chikorita", description: "Farbige Seitenspalte rechts", Component: Chikorita, bleed: true, thumb: { columns: 2, side: "right", sidebar: "solid" } },
  { id: "ditgar", name: "Ditgar", description: "Getönte Seitenspalte mit Kopfkasten, Akzentlinien", Component: Ditgar, bleed: true, thumb: { columns: 2, side: "left", sidebar: "tint", header: "box" } },
  { id: "ditto", name: "Ditto", description: "Farbiges Kopfband, Seitenspalte links", Component: Ditto, bleed: true, thumb: { columns: 2, side: "left", header: "band" } },
  { id: "gengar", name: "Gengar", description: "Getönte Seitenspalte mit Kopfkasten", Component: Gengar, bleed: true, thumb: { columns: 2, side: "left", sidebar: "tint", header: "box" } },
  { id: "glalie", name: "Glalie", description: "Getönte Seitenspalte, Kopf darin zentriert", Component: Glalie, bleed: true, thumb: { columns: 2, side: "left", sidebar: "tint", header: "centered" } },
  { id: "kakuna", name: "Kakuna", description: "Einspaltig, alles zentriert", Component: Kakuna, thumb: { columns: 1, header: "centered" } },
  { id: "lapras", name: "Lapras", description: "Abschnitte als umrandete Karten", Component: Lapras, thumb: { columns: 1, header: "box" } },
  { id: "leafish", name: "Leafish", description: "Getönte Kopfbänder, Seitenspalte rechts", Component: Leafish, bleed: true, thumb: { columns: 2, side: "right", header: "band" } },
  { id: "meowth", name: "Meowth", description: "Einspaltig, Überschriften in Großbuchstaben", Component: Meowth, thumb: { columns: 1 } },
  { id: "pikachu", name: "Pikachu", description: "Farbiger Kopfkasten, Bild in der Seitenspalte", Component: Pikachu, thumb: { columns: 2, side: "left", header: "box" } },
  { id: "porygon", name: "Porygon", description: "Raster mit Linien und Titelbalken", Component: Porygon, thumb: { columns: 1, header: "box" } },
  { id: "rhyhorn", name: "Rhyhorn", description: "Einspaltig, Kontakt mit Trennstrichen", Component: Rhyhorn, thumb: { columns: 1 } },
  { id: "scizor", name: "Scizor", description: "Einspaltig, Farbbalken oben, Trennlinien", Component: Scizor, thumb: { columns: 1, header: "band" } },
  { id: "smeargle", name: "Smeargle", description: "Editorial, kursive Überschriften, Vorspann", Component: Smeargle, thumb: { columns: 1 } },
];

/** Unknown ids (e.g. from a newer Reactive Resume) fall back to Onyx, its schema default. */
export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
