import type { RoleItem } from "../../types/resume";
import DatesField from "../fields/DatesField";
import RichTextField from "../fields/RichTextField";
import { newRole } from "../sectionFields";
import { IconButton, Icons, TextInput } from "../ui";

interface Props {
  roles: RoleItem[];
  onChange: (roles: RoleItem[]) => void;
}

/** Several positions at one employer (Reactive Resume's `experience.roles`). */
export default function RolesEditor({ roles, onChange }: Props) {
  const patch = (id: string, change: Partial<RoleItem>) => onChange(roles.map((r) => (r.id === id ? { ...r, ...change } : r)));

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">Rollen bei diesem Arbeitgeber</span>
      <div className="space-y-2">
        {roles.map((role) => (
          <div key={role.id} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex items-end gap-2">
              <TextInput className="flex-1" label="Position" value={role.position} onChange={(e) => patch(role.id, { position: e.target.value })} />
              <IconButton title="Rolle löschen" onClick={() => onChange(roles.filter((r) => r.id !== role.id))}>
                <Icons.Trash />
              </IconButton>
            </div>
            <DatesField label="Zeitraum" value={role.dates} onChange={(dates) => patch(role.id, { dates })} />
            <RichTextField label="Beschreibung" value={role.description} onChange={(description) => patch(role.id, { description })} />
          </div>
        ))}
        <button type="button" onClick={() => onChange([...roles, newRole()])} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
          <Icons.Plus className="h-3.5 w-3.5" /> Rolle hinzufügen
        </button>
      </div>
    </div>
  );
}
