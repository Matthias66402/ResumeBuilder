import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "../dnd";
import { useState } from "react";
import { networkIcon } from "../../lib/icons";
import { defaultTitle } from "../../templates/shared/labels";
import type { SectionKey } from "../../types/resume";
import SectionIconField from "../fields/SectionIconField";
import { SECTION_FIELDS, type AnyItem } from "../sectionFields";
import { useBuilder } from "../store";
import { IconButton, Icons, inputClass, Label } from "../ui";
import EntryCard from "./EntryCard";

export default function SectionPanel({ sectionKey }: { sectionKey: SectionKey }) {
  const section = useBuilder((s) => s.data!.sections[sectionKey]);
  const locale = useBuilder((s) => s.data!.metadata.page.locale);
  const skillsKeywordLayout = useBuilder((s) => s.data!.sections.skills.keywordLayout);
  const update = useBuilder((s) => s.update);
  const config = SECTION_FIELDS[sectionKey];
  const [expanded, setExpanded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const items = section.items as AnyItem[];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Every write goes through the store so it's undoable and autosaved.
  const editItems = (fn: (items: AnyItem[]) => void, key?: string) =>
    update((d) => fn(d.sections[sectionKey].items as AnyItem[]), key);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    editItems((list) => {
      const from = list.findIndex((i) => i.id === active.id);
      const to = list.findIndex((i) => i.id === over.id);
      list.splice(0, list.length, ...arrayMove(list, from, to));
    });
  };

  const addItem = () => {
    const id = crypto.randomUUID();
    editItems((list) => {
      list.push({ id, hidden: false, ...config.defaults() } as AnyItem);
    });
    setExpanded(true);
    setOpenId(id);
  };

  return (
    <section className="border-b border-slate-200">
      <div className="flex items-center gap-1 px-3 py-2">
        <IconButton title={expanded ? "Zuklappen" : "Aufklappen"} onClick={() => setExpanded(!expanded)}>
          {expanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
        </IconButton>
        <button type="button" onClick={() => setExpanded(!expanded)} className={`flex-1 text-left text-sm font-semibold ${section.hidden ? "text-slate-400" : ""}`}>
          {section.title.trim() || defaultTitle(sectionKey, locale)}
          <span className="ml-2 text-xs font-normal text-slate-400">{items.length}</span>
        </button>
        <IconButton
          title={section.hidden ? "Abschnitt einblenden" : "Abschnitt ausblenden"}
          onClick={() => update((d) => void (d.sections[sectionKey].hidden = !d.sections[sectionKey].hidden))}
        >
          {section.hidden ? <Icons.EyeOff /> : <Icons.Eye />}
        </IconButton>
        <IconButton title="Eintrag hinzufügen" onClick={addItem}>
          <Icons.Plus />
        </IconButton>
      </div>

      {expanded && (
        <div className="space-y-2 px-3 pb-3">
          <div className="flex items-start gap-2">
            <SectionIconField value={section.icon} setIcon={(d, icon) => void (d.sections[sectionKey].icon = icon)} />
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Überschrift</span>
              <input
                value={section.title}
                placeholder={defaultTitle(sectionKey, locale)}
                onChange={(e) => update((d) => void (d.sections[sectionKey].title = e.target.value), `${sectionKey}:title`)}
                className={inputClass}
              />
            </label>
          </div>
          {sectionKey === "skills" && (
            <Label label="Schlagwörter anzeigen">
              <select
                value={skillsKeywordLayout}
                onChange={(e) => update((d) => void (d.sections.skills.keywordLayout = e.target.value as "inline" | "list"))}
                className={inputClass}
              >
                <option value="inline">In einer Zeile, mit Kommas</option>
                <option value="list">Jedes in einer eigenen Zeile</option>
              </select>
            </Label>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <EntryCard
                  key={item.id}
                  item={item}
                  config={config}
                  open={openId === item.id}
                  onToggleOpen={() => setOpenId(openId === item.id ? null : item.id)}
                  onChange={(key, value) =>
                    editItems((list) => {
                      const target = list.find((i) => i.id === item.id);
                      if (!target) return;
                      // Profiles follow their network's logo until an icon is picked by hand.
                      if (sectionKey === "profiles" && key === "network" && (!target.icon || target.icon === networkIcon(target.network))) {
                        target.icon = networkIcon(String(value));
                      }
                      target[key] = value;
                    }, `${item.id}:${key}`)
                  }
                  onToggleHidden={() =>
                    editItems((list) => {
                      const target = list.find((i) => i.id === item.id);
                      if (target) target.hidden = !target.hidden;
                    })
                  }
                  onDelete={() =>
                    editItems((list) => {
                      const index = list.findIndex((i) => i.id === item.id);
                      if (index >= 0) list.splice(index, 1);
                    })
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={addItem}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-700"
          >
            <Icons.Plus /> Eintrag hinzufügen
          </button>
        </div>
      )}
    </section>
  );
}
