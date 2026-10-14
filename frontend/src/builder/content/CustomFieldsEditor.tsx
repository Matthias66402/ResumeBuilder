import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ResumeData } from "../../types/resume";
import { restrictToVerticalAxis } from "../dnd";
import IconPicker from "../fields/IconPicker";
import { useBuilder } from "../store";
import { IconButton, Icons, inputClass } from "../ui";

type CustomField = ResumeData["basics"]["customFields"][number];

function FieldRow({ field }: { field: CustomField }) {
  const update = useBuilder((s) => s.update);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  // Writes go through the store (undo, autosave); typing in one input coalesces into one undo step.
  const set = (key: "icon" | "text" | "link", value: string) =>
    update((d) => {
      const target = d.basics.customFields.find((f) => f.id === field.id);
      if (target) target[key] = value;
    }, key === "icon" ? undefined : `custom:${field.id}:${key}`);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-1.5 gap-y-1 rounded-md bg-white ${isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
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
      <IconPicker value={field.icon} onChange={(icon) => set("icon", icon)} />
      <input value={field.text} placeholder="Text, z. B. Geburtsdatum" aria-label="Text" onChange={(e) => set("text", e.target.value)} className={inputClass} />
      <IconButton
        title="Feld löschen"
        className="hover:text-red-600"
        onClick={() => update((d) => void (d.basics.customFields = d.basics.customFields.filter((f) => f.id !== field.id)))}
      >
        <Icons.Trash />
      </IconButton>
      <input value={field.link} placeholder="Link (optional)" aria-label="Link" onChange={(e) => set("link", e.target.value)} className={`${inputClass} col-start-3`} />
    </div>
  );
}

/** Extra contact lines (Reactive Resume's `basics.customFields`): icon, text and optional link. */
export default function CustomFieldsEditor() {
  const fields = useBuilder((s) => s.data!.basics.customFields);
  const update = useBuilder((s) => s.update);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    update((d) => {
      const list = d.basics.customFields;
      d.basics.customFields = arrayMove(list, list.findIndex((f) => f.id === active.id), list.findIndex((f) => f.id === over.id));
    });
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">Weitere Kontaktfelder</span>
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5">
            {fields.map((field) => (
              <FieldRow key={field.id} field={field} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={() => update((d) => void d.basics.customFields.push({ id: crypto.randomUUID(), icon: "", text: "", link: "" }))}
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
      >
        <Icons.Plus className="h-3.5 w-3.5" /> Kontaktfeld hinzufügen
      </button>
    </div>
  );
}
