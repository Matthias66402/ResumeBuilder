import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { defaultTitle, SECTION_KEYS } from "../../templates/shared/labels";
import type { ResumeData, SectionKey } from "../../types/resume";
import { useBuilder } from "../store";
import { Icons, PanelSection } from "../ui";

const ALL_SECTIONS = ["summary", ...SECTION_KEYS] as const;
const UNUSED = "unused";

/** Container ids: "<page>:main", "<page>:sidebar" or "unused" (sections not on any page). */
type Containers = Record<string, string[]>;

function containersOf(data: ResumeData): Containers {
  const containers: Containers = {};
  const placed = new Set<string>();
  data.metadata.layout.pages.forEach((page, i) => {
    containers[`${i}:main`] = page.main;
    containers[`${i}:sidebar`] = page.sidebar;
    [...page.main, ...page.sidebar].forEach((id) => placed.add(id));
  });
  containers[UNUSED] = ALL_SECTIONS.filter((id) => !placed.has(id));
  return containers;
}

function useLabel() {
  const data = useBuilder((s) => s.data!);
  return (id: string) => {
    const key = id as SectionKey | "summary";
    const title = key === "summary" ? data.summary.title : data.sections[key as SectionKey]?.title;
    return title?.trim() || defaultTitle(key, data.metadata.page.locale) || id;
  };
}

function Chip({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab touch-none items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <Icons.Grip className="h-3 w-3 text-slate-400" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function Column({ id, title, items, label }: { id: string; title: string; items: string[]; label: (id: string) => string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[11px] font-medium text-slate-500">{title}</p>
      <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`min-h-12 space-y-1 rounded-md border border-dashed p-1.5 ${isOver ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50"}`}>
          {items.map((item) => (
            <Chip key={item} id={item} label={label(item)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function LayoutEditor() {
  const data = useBuilder((s) => s.data!);
  const update = useBuilder((s) => s.update);
  const label = useLabel();
  const [activeId, setActiveId] = useState<string | null>(null);
  const containers = containersOf(data);
  const { pages, sidebarWidth } = data.metadata.layout;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const containerOf = (id: string) => (id in containers ? id : Object.keys(containers).find((c) => containers[c].includes(id)));

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const id = String(active.id);
    const from = containerOf(id);
    const to = containerOf(String(over.id));
    if (!from || !to) return;

    const next = Object.fromEntries(Object.entries(containers).map(([k, v]) => [k, [...v]]));
    next[from].splice(next[from].indexOf(id), 1);
    // Dropped on a chip: take its place; dropped on the column itself: append.
    const overIndex = next[to].indexOf(String(over.id));
    next[to].splice(overIndex >= 0 ? overIndex : next[to].length, 0, id);

    update((d) => {
      d.metadata.layout.pages.forEach((page, i) => {
        page.main = next[`${i}:main`];
        page.sidebar = next[`${i}:sidebar`];
      });
    });
  };

  const removePage = (index: number) =>
    update((d) => {
      const [removed] = d.metadata.layout.pages.splice(index, 1);
      // Keep the sections: they move to the end of the previous page.
      const target = d.metadata.layout.pages[Math.max(0, index - 1)];
      target.main.push(...removed.main);
      target.sidebar.push(...removed.sidebar);
    });

  return (
    <PanelSection title="Layout">
      <p className="text-xs text-slate-500">Abschnitte zwischen Haupt- und Seitenspalte ziehen. Einspaltige Templates drucken die Seitenspalte unter der Hauptspalte.</p>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        {pages.map((page, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold">Seite {i + 1}</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" checked={page.fullWidth} onChange={(e) => update((d) => void (d.metadata.layout.pages[i].fullWidth = e.target.checked))} />
                  volle Breite
                </label>
                {pages.length > 1 && (
                  <button type="button" onClick={() => removePage(i)} className="text-xs text-red-600 hover:underline">
                    Entfernen
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Column id={`${i}:main`} title="Hauptspalte" items={containers[`${i}:main`]} label={label} />
              {!page.fullWidth && <Column id={`${i}:sidebar`} title="Seitenspalte" items={containers[`${i}:sidebar`]} label={label} />}
            </div>
            {page.fullWidth && page.sidebar.length > 0 && (
              <p className="mt-1 text-[11px] text-slate-500">Seitenspalte ({page.sidebar.length}) wird bei voller Breite unten angehängt.</p>
            )}
          </div>
        ))}
        <Column id={UNUSED} title="Nicht verwendet" items={containers[UNUSED]} label={label} />
        <DragOverlay>{activeId && <div className="rounded-md border border-blue-400 bg-white px-2 py-1 text-xs shadow-lg">{label(activeId)}</div>}</DragOverlay>
      </DndContext>
      <button
        type="button"
        onClick={() => update((d) => void d.metadata.layout.pages.push({ fullWidth: false, main: [], sidebar: [] }))}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
      >
        <Icons.Plus className="h-3.5 w-3.5" /> Seite hinzufügen
      </button>
      <label className="block">
        <span className="mb-1 flex justify-between text-xs font-medium text-slate-600">
          Breite der Seitenspalte <span>{sidebarWidth} %</span>
        </span>
        <input
          type="range"
          min={10}
          max={50}
          value={sidebarWidth}
          onChange={(e) => update((d) => void (d.metadata.layout.sidebarWidth = Number(e.target.value)), "layout:sidebarWidth")}
          className="w-full"
        />
      </label>
    </PanelSection>
  );
}
