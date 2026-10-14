import { hexToRgba, rgbaToHex } from "../../lib/color";
import { TEMPLATES, type TemplateInfo } from "../../templates";
import type { DateFormat, Metadata } from "../../types/resume";
import { useBuilder } from "../store";
import { inputClass, Label, PanelSection, Slider } from "../ui";
import LayoutEditor from "./LayoutEditor";

// Must match the Google Fonts <link> in index.html.
export const FONTS = [
  "IBM Plex Serif",
  "IBM Plex Sans",
  "Merriweather",
  "Playfair Display",
  "Inter",
  "Lato",
  "Open Sans",
  "Roboto",
  "Source Sans 3",
];

// A few of Reactive Resume's color presets.
const PRESETS = ["rgba(220, 38, 38, 1)", "rgba(234, 88, 12, 1)", "rgba(202, 138, 4, 1)", "rgba(22, 163, 74, 1)", "rgba(13, 148, 136, 1)", "rgba(37, 99, 235, 1)", "rgba(79, 70, 229, 1)", "rgba(147, 51, 234, 1)", "rgba(219, 39, 119, 1)", "rgba(71, 85, 105, 1)", "rgba(0, 0, 0, 1)"];

function useMetadata() {
  const metadata = useBuilder((s) => s.data!.metadata);
  const update = useBuilder((s) => s.update);
  const set = (fn: (m: Metadata) => void, key?: string) => update((d) => fn(d.metadata as Metadata), key);
  return [metadata, set] as const;
}

function TemplatePicker() {
  const [metadata, set] = useMetadata();
  return (
    <PanelSection title="Template">
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.description}
            onClick={() => set((m) => void (m.template = t.id))}
            className={`rounded-lg border-2 p-1.5 text-left ${metadata.template === t.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-400"}`}
          >
            <TemplateThumb thumb={t.thumb} />
            <p className="mt-1 truncate text-xs font-medium">{t.name}</p>
          </button>
        ))}
      </div>
    </PanelSection>
  );
}

/** Schematic page drawn from the template's layout traits (columns, sidebar fill, header style). */
function TemplateThumb({ thumb }: { thumb: TemplateInfo["thumb"] }) {
  const lines = (n: number, light = false) =>
    Array.from({ length: n }, (_, i) => (
      <div key={i} className={`h-1 rounded ${light ? "bg-white/70" : "bg-slate-300"}`} style={{ width: `${100 - ((i * 17) % 35)}%` }} />
    ));
  const heading = (light = false) => <div className={`h-1 w-2/5 rounded ${light ? "bg-white" : "bg-blue-400"}`} />;
  const block = (light = false) => (
    <div className="flex flex-col gap-0.5">
      {heading(light)}
      {lines(2, light)}
    </div>
  );
  const header = (
    <div
      className={`flex flex-col gap-0.5 ${thumb.header === "centered" ? "items-center" : ""} ${
        thumb.header === "band" ? "-mx-1.5 -mt-1.5 bg-blue-400 px-1.5 py-1" : thumb.header === "box" ? "rounded-sm bg-blue-400 p-1" : ""
      }`}
    >
      <div className={`h-1.5 w-1/2 rounded ${thumb.header === "band" || thumb.header === "box" ? "bg-white" : "bg-slate-500"}`} />
      <div className={`h-1 w-1/3 rounded ${thumb.header === "band" || thumb.header === "box" ? "bg-white/70" : "bg-slate-300"}`} />
    </div>
  );

  if (thumb.columns === 1) {
    return (
      <div className="flex aspect-[210/297] flex-col gap-1.5 overflow-hidden rounded border border-slate-200 bg-white p-1.5">
        {header}
        {block()}
        {block()}
        {block()}
      </div>
    );
  }

  const solid = thumb.sidebar === "solid";
  const sidebarBg = solid ? "bg-blue-400" : thumb.sidebar === "tint" ? "bg-blue-100" : "";
  const headerInSidebar = thumb.sidebar === "tint" && thumb.header !== "band";
  const sidebar = (
    <div className={`flex w-[35%] flex-col gap-1.5 p-1 ${sidebarBg}`}>
      {headerInSidebar && header}
      {block(solid)}
      {block(solid)}
    </div>
  );
  const main = (
    <div className="flex flex-1 flex-col gap-1.5 p-1">
      {!headerInSidebar && thumb.header !== "band" && thumb.header !== "centered" && header}
      {block()}
      {block()}
      {block()}
    </div>
  );
  return (
    <div className="flex aspect-[210/297] flex-col overflow-hidden rounded border border-slate-200 bg-white">
      {(thumb.header === "band" || thumb.header === "centered") && <div className="p-1.5 pb-0">{header}</div>}
      <div className={`flex flex-1 ${thumb.side === "right" ? "flex-row-reverse" : ""}`}>
        {sidebar}
        {main}
      </div>
    </div>
  );
}

function TypographyPanel() {
  const [metadata, set] = useMetadata();
  return (
    <PanelSection title="Typografie">
      {(["heading", "body"] as const).map((part) => {
        const t = metadata.typography[part];
        return (
          <div key={part} className="space-y-2">
            <Label label={part === "body" ? "Fließtext" : "Überschriften"}>
              <select value={t.fontFamily} onChange={(e) => set((m) => void (m.typography[part].fontFamily = e.target.value))} className={inputClass} style={{ fontFamily: t.fontFamily }}>
                {!FONTS.includes(t.fontFamily) && <option value={t.fontFamily}>{t.fontFamily}</option>}
                {FONTS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Slider label="Größe" unit=" pt" min={6} max={24} step={0.5} value={t.fontSize} onChange={(v) => set((m) => void (m.typography[part].fontSize = v), `typo:${part}:size`)} />
              <Slider label="Zeilenhöhe" min={0.8} max={2.5} step={0.05} value={t.lineHeight} onChange={(v) => set((m) => void (m.typography[part].lineHeight = v), `typo:${part}:lh`)} />
            </div>
          </div>
        );
      })}
    </PanelSection>
  );
}

function ColorPanel() {
  const [metadata, set] = useMetadata();
  const colors = metadata.design.colors;
  const picker = (key: keyof typeof colors, label: string) => (
    <label className="flex items-center justify-between text-sm">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input type="color" value={rgbaToHex(colors[key])} onChange={(e) => set((m) => void (m.design.colors[key] = hexToRgba(e.target.value)), `color:${key}`)} className="h-7 w-12 cursor-pointer rounded border border-slate-300" />
    </label>
  );
  return (
    <PanelSection title="Farben">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            title={rgbaToHex(c)}
            onClick={() => set((m) => void (m.design.colors.primary = c))}
            className={`h-6 w-6 rounded-full ring-offset-2 ${colors.primary === c ? "ring-2 ring-slate-900" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>
      {picker("primary", "Akzentfarbe")}
      {picker("text", "Textfarbe")}
      {picker("background", "Hintergrund")}
    </PanelSection>
  );
}

function PagePanel() {
  const [metadata, set] = useMetadata();
  const page = metadata.page;
  return (
    <PanelSection title="Seite">
      <div className="grid grid-cols-2 gap-3">
        <Label label="Format">
          <select value={page.format} onChange={(e) => set((m) => void (m.page.format = e.target.value as Metadata["page"]["format"]))} className={inputClass}>
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
            <option value="free-form">Freie Länge</option>
          </select>
        </Label>
        <Label label="Sprache">
          <select value={page.locale} onChange={(e) => set((m) => void (m.page.locale = e.target.value))} className={inputClass}>
            {!["de-DE", "en-US", "en-GB"].includes(page.locale) && <option value={page.locale}>{page.locale}</option>}
            <option value="de-DE">Deutsch</option>
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
          </select>
        </Label>
        <Label label="Datumsformat" className="col-span-2">
          <select value={page.dateFormat} onChange={(e) => set((m) => void (m.page.dateFormat = e.target.value as DateFormat))} className={inputClass}>
            <option value="short">Kurz (Mär. 2022)</option>
            <option value="long">Lang (März 2022)</option>
            <option value="numeric">Numerisch (03/2022)</option>
            <option value="iso">ISO (2022-03)</option>
          </select>
        </Label>
        <Slider label="Rand horizontal" unit=" pt" min={0} max={60} value={page.marginX} onChange={(v) => set((m) => void (m.page.marginX = v), "page:marginX")} />
        <Slider label="Rand vertikal" unit=" pt" min={0} max={60} value={page.marginY} onChange={(v) => set((m) => void (m.page.marginY = v), "page:marginY")} />
        <Slider label="Abstand horizontal" unit=" pt" min={0} max={20} value={page.gapX} onChange={(v) => set((m) => void (m.page.gapX = v), "page:gapX")} />
        <Slider label="Abstand vertikal" unit=" pt" min={0} max={20} value={page.gapY} onChange={(v) => set((m) => void (m.page.gapY = v), "page:gapY")} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={page.hideLinkUnderline} onChange={(e) => set((m) => void (m.page.hideLinkUnderline = e.target.checked))} />
        Links nicht unterstreichen
      </label>
    </PanelSection>
  );
}

export default function DesignPanel() {
  return (
    <div>
      <TemplatePicker />
      <LayoutEditor />
      <TypographyPanel />
      <ColorPanel />
      <PagePanel />
    </div>
  );
}
