import { useEffect, useState } from "react";
import { YEAR_MONTH_RE } from "../../lib/dates";
import type { ResumeDates } from "../../types/resume";
import { inputClass } from "../ui";

interface Props {
  label: string;
  value: ResumeDates;
  single?: boolean;
  onChange: (dates: ResumeDates) => void;
}

/** "2022" or "2022-03"; also accepts "03/2022" or "3.2022" as typed in German resumes. */
function parseYearMonth(text: string): string | null | undefined {
  const t = text.trim();
  if (!t) return null;
  if (YEAR_MONTH_RE.test(t)) return t;
  const m = t.match(/^(\d{1,2})[./-](\d{4})$/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return `${m[2]}-${m[1].padStart(2, "0")}`;
  return undefined; // invalid
}

function YearMonthInput({ label, value, onCommit }: { label: string; value: string | null; onCommit: (v: string | null) => void }) {
  const [text, setText] = useState(value ?? "");
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setText(value ?? ""), [value]);

  const commit = (t: string) => {
    const parsed = parseYearMonth(t);
    setInvalid(parsed === undefined);
    if (parsed !== undefined && parsed !== value) onCommit(parsed);
  };

  return (
    <label className="block flex-1">
      <span className="mb-1 block text-[11px] text-slate-500">{label}</span>
      <input
        value={text}
        placeholder="JJJJ-MM"
        onChange={(e) => {
          setText(e.target.value);
          // Commit as soon as the value is complete; partial input waits for blur.
          if (parseYearMonth(e.target.value) !== undefined) commit(e.target.value);
        }}
        onBlur={(e) => commit(e.target.value)}
        className={`${inputClass} ${invalid ? "border-red-400" : ""}`}
      />
    </label>
  );
}

export default function DatesField({ label, value, single, onChange }: Props) {
  // Editing the dates replaces any unread original text (`raw`), as in Reactive Resume.
  const set = (patch: Partial<ResumeDates>) => {
    const { raw: _raw, ...rest } = value;
    onChange({ ...rest, ...patch });
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {value.raw !== undefined && (
        <p className="mb-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
          Originaltext: „{value.raw}“ – wird gedruckt, bis du ein Datum eingibst.
        </p>
      )}
      <div className="flex items-end gap-2">
        <YearMonthInput label={single ? "Datum" : "Von"} value={value.start} onCommit={(start) => set({ start })} />
        {!single && (
          <>
            <YearMonthInput label="Bis" value={value.present ? null : value.end} onCommit={(end) => set({ end, present: false })} />
            <label className="flex shrink-0 items-center gap-1.5 pb-2 text-xs text-slate-600">
              <input type="checkbox" checked={value.present} onChange={(e) => set({ present: e.target.checked, end: e.target.checked ? null : value.end })} />
              bis heute
            </label>
          </>
        )}
      </div>
    </div>
  );
}
