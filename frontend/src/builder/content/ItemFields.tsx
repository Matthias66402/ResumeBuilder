import type { ItemWebsite, ResumeDates } from "../../types/resume";
import DatesField from "../fields/DatesField";
import KeywordsField from "../fields/KeywordsField";
import LevelField from "../fields/LevelField";
import RichTextField from "../fields/RichTextField";
import type { AnyItem, FieldDef } from "../sectionFields";
import { TextInput } from "../ui";
import RolesEditor from "./RolesEditor";

interface Props {
  fields: FieldDef[];
  item: AnyItem;
  onChange: (key: string, value: unknown) => void;
}

export default function ItemFields({ fields, item, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((field) => {
        const span = field.half ? "col-span-1" : "col-span-2";
        switch (field.type) {
          case "text":
            return (
              <TextInput key={field.key} className={span} label={field.label} value={item[field.key] ?? ""} onChange={(e) => onChange(field.key, e.target.value)} />
            );
          case "richtext":
            return (
              <div key={field.key} className={span}>
                <RichTextField label={field.label} value={item[field.key] ?? ""} onChange={(v) => onChange(field.key, v)} />
              </div>
            );
          case "dates":
            return (
              <div key={field.key} className={span}>
                <DatesField label={field.label} single={field.single} value={item.dates as ResumeDates} onChange={(v) => onChange("dates", v)} />
              </div>
            );
          case "keywords":
            return (
              <div key={field.key} className={span}>
                <KeywordsField label={field.label} value={item[field.key] ?? []} onChange={(v) => onChange(field.key, v)} />
              </div>
            );
          case "level":
            return (
              <div key={field.key} className={span}>
                <LevelField label={field.label} value={item[field.key] ?? 0} onChange={(v) => onChange(field.key, v)} />
              </div>
            );
          case "url": {
            const website = item.website as ItemWebsite;
            return (
              <div key={field.key} className="col-span-2 grid grid-cols-2 gap-3">
                <TextInput label="Website-URL" placeholder="https://" value={website.url} onChange={(e) => onChange("website", { ...website, url: e.target.value })} />
                <TextInput label="Link-Text" placeholder="optional" value={website.label} onChange={(e) => onChange("website", { ...website, label: e.target.value })} />
              </div>
            );
          }
          case "roles":
            return (
              <div key={field.key} className={span}>
                <RolesEditor roles={item.roles ?? []} onChange={(roles) => onChange("roles", roles)} />
              </div>
            );
        }
      })}
    </div>
  );
}
