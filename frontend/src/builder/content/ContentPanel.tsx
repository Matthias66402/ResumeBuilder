import { defaultTitle, SECTION_KEYS } from "../../templates/shared/labels";
import type { ResumeData } from "../../types/resume";
import SectionIconField from "../fields/SectionIconField";
import RichTextField from "../fields/RichTextField";
import { useBuilder } from "../store";
import { IconButton, Icons, PanelSection, TextInput, inputClass } from "../ui";
import CustomFieldsEditor from "./CustomFieldsEditor";
import PictureForm from "./PictureForm";
import SectionPanel from "./SectionPanel";

type BasicsKey = "name" | "headline" | "email" | "phone" | "location";

const BASICS: { key: BasicsKey; label: string; half?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "headline", label: "Headline / Berufsbezeichnung" },
  { key: "email", label: "E-Mail", half: true },
  { key: "phone", label: "Telefon", half: true },
  { key: "location", label: "Ort" },
];

function BasicsForm({ basics }: { basics: ResumeData["basics"] }) {
  const update = useBuilder((s) => s.update);
  return (
    <PanelSection title="Persönliche Daten">
      <PictureForm />
      <div className="grid grid-cols-2 gap-3">
        {BASICS.map(({ key, label, half }) => (
          <TextInput
            key={key}
            className={half ? "col-span-1" : "col-span-2"}
            label={label}
            value={basics[key]}
            onChange={(e) => update((d) => void (d.basics[key] = e.target.value), `basics:${key}`)}
          />
        ))}
        <TextInput label="Website" placeholder="https://" value={basics.website.url} onChange={(e) => update((d) => void (d.basics.website.url = e.target.value), "basics:website.url")} />
        <TextInput label="Link-Text" placeholder="optional" value={basics.website.label} onChange={(e) => update((d) => void (d.basics.website.label = e.target.value), "basics:website.label")} />
      </div>
      <CustomFieldsEditor />
    </PanelSection>
  );
}

function SummaryForm({ summary, locale }: { summary: ResumeData["summary"]; locale: string }) {
  const update = useBuilder((s) => s.update);
  return (
    <section className="border-b border-slate-200 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`text-xs font-semibold tracking-wide uppercase ${summary.hidden ? "text-slate-400" : "text-slate-500"}`}>Zusammenfassung</h3>
        <IconButton title={summary.hidden ? "Einblenden" : "Ausblenden"} onClick={() => update((d) => void (d.summary.hidden = !d.summary.hidden))}>
          {summary.hidden ? <Icons.EyeOff /> : <Icons.Eye />}
        </IconButton>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <SectionIconField value={summary.icon} setIcon={(d, icon) => void (d.summary.icon = icon)} />
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">Überschrift</span>
            <input value={summary.title} placeholder={defaultTitle("summary", locale)} onChange={(e) => update((d) => void (d.summary.title = e.target.value), "summary:title")} className={inputClass} />
          </label>
        </div>
        <RichTextField label="Text" value={summary.content} onChange={(v) => update((d) => void (d.summary.content = v), "summary:content")} />
      </div>
    </section>
  );
}

export default function ContentPanel() {
  const data = useBuilder((s) => s.data!);
  return (
    <div>
      <BasicsForm basics={data.basics} />
      <SummaryForm summary={data.summary} locale={data.metadata.page.locale} />
      <h3 className="px-4 pt-4 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Abschnitte</h3>
      {SECTION_KEYS.map((key) => (
        <SectionPanel key={key} sectionKey={key} />
      ))}
    </div>
  );
}
