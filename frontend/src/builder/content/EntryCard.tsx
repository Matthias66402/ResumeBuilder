import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AnyItem, SectionConfig } from "../sectionFields";
import { IconButton, Icons } from "../ui";
import ItemFields from "./ItemFields";

interface Props {
  item: AnyItem;
  config: SectionConfig;
  open: boolean;
  onToggleOpen: () => void;
  onChange: (key: string, value: unknown) => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}

export default function EntryCard({ item, config, open, onToggleOpen, onChange, onToggleHidden, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const title = config.title(item);
  const subtitle = config.subtitle(item);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-lg border bg-white ${isDragging ? "relative z-10 border-blue-400 shadow-lg" : "border-slate-200"} ${item.hidden ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          title="Ziehen zum Sortieren"
          className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
        >
          <Icons.Grip />
        </button>
        <button type="button" onClick={onToggleOpen} className="min-w-0 flex-1 text-left">
          <p className={`truncate text-sm font-medium ${title ? "" : "text-slate-400 italic"}`}>{title || "Neuer Eintrag"}</p>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </button>
        <IconButton title={item.hidden ? "Eintrag einblenden" : "Eintrag ausblenden"} onClick={onToggleHidden}>
          {item.hidden ? <Icons.EyeOff /> : <Icons.Eye />}
        </IconButton>
        <IconButton title="Eintrag löschen" onClick={onDelete} className="hover:text-red-600">
          <Icons.Trash />
        </IconButton>
        <IconButton title={open ? "Zuklappen" : "Bearbeiten"} onClick={onToggleOpen}>
          {open ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
        </IconButton>
      </div>
      {open && (
        <div className="border-t border-slate-100 px-3 pt-3 pb-3">
          {!String(item[config.required] ?? "").trim() && (
            <p className="mb-2 text-xs text-amber-700">Ohne „{config.fields.find((f) => f.key === config.required)?.label}“ wird der Eintrag nicht gedruckt.</p>
          )}
          <ItemFields fields={config.fields} item={item} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
