import type { ItemWebsite, ResumeDates } from "../../types/resume";
import { hexToRgba, rgbaToHex } from "../../lib/color";
import DatesField from "../fields/DatesField";
import IconPicker from "../fields/IconPicker";
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
              <div key={field.key} className="col-span-2 flex items-end gap-3">
                {field.withIcon && (
                  <div>
                    <span className="mb-1 block text-xs font-medium text-slate-600">Icon</span>
                    <IconPicker value={item.linkIcon ?? ""} onChange={(v) => onChange("linkIcon", v)} title="Icon für den Link wählen" />
                  </div>
                )}
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                  <TextInput label="Website-URL" placeholder="https://" value={website.url} onChange={(e) => onChange("website", { ...website, url: e.target.value })} />
                  <TextInput label="Link-Text" placeholder="optional" value={website.label} onChange={(e) => onChange("website", { ...website, label: e.target.value })} />
                </div>
              </div>
            );
          }
          case "icon":
            return (
              <div key={field.key} className="col-span-2 flex items-end gap-3">
                <div>
                  <span className="mb-1 block text-xs font-medium text-slate-600">{field.label}</span>
                  <IconPicker value={item.icon ?? ""} onChange={(v) => onChange("icon", v)} />
                </div>
                <label className="flex items-center gap-2 pb-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={!!item.iconColor}
                    onChange={(e) => onChange("iconColor", e.target.checked ? "rgba(0, 0, 0, 1)" : "")}
                  />
                  eigene Farbe
                </label>
                {!!item.iconColor && (
                  <input
                    type="color"
                    value={rgbaToHex(item.iconColor)}
                    onChange={(e) => onChange("iconColor", hexToRgba(e.target.value))}
                    className="mb-0.5 h-7 w-12 cursor-pointer rounded border border-slate-300"
                  />
                )}
              </div>
            );
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
