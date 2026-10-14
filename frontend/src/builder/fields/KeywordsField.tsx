import { useState } from "react";
import { Icons } from "../ui";

interface Props {
  label: string;
  value: string[];
  onChange: (keywords: string[]) => void;
}

export default function KeywordsField({ label, value, onChange }: Props) {
  const [text, setText] = useState("");

  const add = () => {
    const words = text.split(",").map((w) => w.trim()).filter((w) => w && !value.includes(w));
    if (words.length) onChange([...value, ...words]);
    setText("");
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        {value.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pr-1 pl-2 text-xs">
            {k}
            <button type="button" title={`${k} entfernen`} onClick={() => onChange(value.filter((v) => v !== k))} className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200">
              <Icons.X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          placeholder={value.length ? "" : "Eingeben, Enter oder Komma"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
          className="min-w-24 flex-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}
