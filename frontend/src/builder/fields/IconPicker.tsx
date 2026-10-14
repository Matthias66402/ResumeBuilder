import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../../templates/shared/Icon";
import { inputClass } from "../ui";

interface CatalogIcon {
  name: string;
  tags: string[];
}

// The Phosphor catalog (~3000 icons with search tags) loads on first open only.
let catalog: Promise<CatalogIcon[]> | null = null;
const loadCatalog = () =>
  (catalog ??= import("@phosphor-icons/core").then(({ icons }) =>
    icons.map(({ name, tags }): CatalogIcon => ({ name, tags: [...tags] })),
  ));

const MAX_RESULTS = 120;

interface Props {
  value: string;
  onChange: (icon: string) => void;
  title?: string;
}

/** Searchable Phosphor icon picker (Reactive Resume: apps/web/src/components/input/icon-picker.tsx). */
export default function IconPicker({ value, onChange, title = "Icon wählen" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [icons, setIcons] = useState<CatalogIcon[]>([]);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void loadCatalog().then(setIcons);
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? icons.filter((i) => i.name.includes(q) || i.tags.some((t) => t.toLowerCase().includes(q))) : icons;
    return matches.slice(0, MAX_RESULTS);
  }, [icons, query]);

  const pick = (icon: string) => {
    onChange(icon);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        title={value ? `${title} (${value})` : title}
        aria-label={title}
        onClick={() => setOpen(!open)}
        className={`flex h-8 w-8 items-center justify-center rounded-md border text-base ${open ? "border-blue-500" : "border-slate-300 hover:border-slate-400"} bg-white`}
      >
        {value ? <Icon name={value} color="#334155" /> : <span className="text-xs text-slate-400">–</span>}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen (englisch, z. B. code, book)" className={inputClass} />
          <div className="mt-2 grid max-h-56 grid-cols-8 gap-1 overflow-y-auto">
            <button type="button" title="Kein Icon" onClick={() => pick("")} className="flex h-8 items-center justify-center rounded text-xs text-slate-500 hover:bg-slate-100">
              –
            </button>
            {results.map((icon) => (
              <button
                key={icon.name}
                type="button"
                title={icon.name}
                onClick={() => pick(icon.name)}
                className={`flex h-8 items-center justify-center rounded text-lg hover:bg-slate-100 ${icon.name === value ? "bg-blue-100" : ""}`}
              >
                <Icon name={icon.name} color="#334155" />
              </button>
            ))}
          </div>
          {icons.length === 0 && <p className="py-2 text-center text-xs text-slate-500">Lade Icons …</p>}
          {icons.length > 0 && results.length === 0 && <p className="py-2 text-center text-xs text-slate-500">Keine Treffer</p>}
        </div>
      )}
    </div>
  );
}
