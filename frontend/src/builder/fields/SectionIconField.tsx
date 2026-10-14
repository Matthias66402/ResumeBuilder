import type { Draft } from "immer";
import type { ResumeData } from "../../types/resume";
import { useBuilder } from "../store";
import IconPicker from "./IconPicker";

interface Props {
  value: string;
  /** Writes the icon into the draft (section or summary). */
  setIcon: (draft: Draft<ResumeData>, icon: string) => void;
}

/**
 * Heading icon of a section. Section icons are hidden by default (`metadata.page.hideSectionIcons`,
 * as in Reactive Resume), so picking one also turns them on, in the same undo step.
 */
export default function SectionIconField({ value, setIcon }: Props) {
  const hidden = useBuilder((s) => s.data!.metadata.page.hideSectionIcons);
  const update = useBuilder((s) => s.update);

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">Icon</span>
      <IconPicker
        value={value}
        title="Icon der Überschrift"
        onChange={(icon) =>
          update((d) => {
            setIcon(d, icon);
            if (icon) d.metadata.page.hideSectionIcons = false;
          })
        }
      />
      {hidden && value && (
        <button
          type="button"
          title="Abschnitts-Icons sind ausgeblendet (Design → Seite)"
          onClick={() => update((d) => void (d.metadata.page.hideSectionIcons = false))}
          className="mt-0.5 block text-[10px] leading-tight text-amber-700 hover:underline"
        >
          ausgeblendet –<br />einblenden
        </button>
      )}
    </div>
  );
}
