/**
 * HTML ports of three Reactive Resume templates (packages/pdf/src/templates/{onyx,azurill,bronzor}).
 * Each renders one page of `metadata.layout.pages`; colors, fonts and spacing come from CSS variables.
 */
import type { ReactNode } from "react";
import type { PageLayout, ResumeData } from "../types/resume";
import { Contact, Section } from "./shared/Section";
import { useSheet } from "./shared/sheet";

/** `data-col` marks the flowing columns the paginator measures and splits across sheets. */
export interface TemplateProps {
  data: ResumeData;
  page: PageLayout;
}

function Header({ data, className = "" }: { data: ResumeData; className?: string }) {
  if (!useSheet().showHeader) return null;
  return (
    <header className={`rb-header ${className}`}>
      <h1 className="rb-name">{data.basics.name}</h1>
      {data.basics.headline && <p className="rb-headline">{data.basics.headline}</p>}
      <Contact data={data} />
    </header>
  );
}

/** Onyx: single column, primary-colored header rule; sidebar sections follow the main ones. */
function Onyx({ data, page }: TemplateProps) {
  return (
    <div className="rb-onyx">
      <Header data={data} />
      <div className="rb-stack" data-col="main">
        {[...page.main, ...page.sidebar].map((id) => (
          <Section key={id} data={data} id={id} />
        ))}
      </div>
    </div>
  );
}

/** Azurill: centered header, sidebar column on the left. */
function Azurill({ data, page }: TemplateProps) {
  const main = page.main.map((id) => <Section key={id} data={data} id={id} />);
  const sidebar = page.sidebar.map((id) => <Section key={id} data={data} id={id} compact />);
  return (
    <div className="rb-azurill">
      <Header data={data} className="rb-center" />
      {page.fullWidth ? (
        <div className="rb-stack" data-col="main">
          {main}
          {sidebar}
        </div>
      ) : (
        <div className="rb-columns">
          <aside className="rb-sidebar rb-stack" data-col="sidebar">{sidebar}</aside>
          <main className="rb-main rb-stack" data-col="main">{main}</main>
        </div>
      )}
    </div>
  );
}

/** Bronzor: single column with section headings in a narrow label column. */
function Bronzor({ data, page }: TemplateProps) {
  const row = (heading: string | null, body: ReactNode) => (
    <div className="rb-row">
      <h2 className="rb-heading">{heading}</h2>
      <div>{body}</div>
    </div>
  );
  return (
    <div className="rb-bronzor">
      <Header data={data} />
      <div className="rb-stack" data-col="main">
        {[...page.main, ...page.sidebar].map((id) => (
          <Section key={id} data={data} id={id} render={row} />
        ))}
      </div>
    </div>
  );
}

export const TEMPLATES = [
  { id: "onyx", name: "Onyx", description: "Einspaltig, farbige Kopfzeile", Component: Onyx },
  { id: "azurill", name: "Azurill", description: "Zweispaltig, Seitenspalte links", Component: Azurill },
  { id: "bronzor", name: "Bronzor", description: "Einspaltig, Überschriften links", Component: Bronzor },
] as const;

/** Reactive Resume has more templates; unknown ids fall back to Onyx (its schema default). */
export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
