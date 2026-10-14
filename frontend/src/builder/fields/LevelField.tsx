interface Props {
  label: string;
  value: number;
  onChange: (level: number) => void;
}

/** 0–5; 0 hides the level in the resume, as in Reactive Resume. */
export default function LevelField({ label, value, onChange }: Props) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            title={`Stufe ${n}`}
            onClick={() => onChange(n === value ? 0 : n)}
            className={`h-5 w-5 rounded-full border-2 ${n <= value ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white hover:border-blue-400"}`}
          />
        ))}
        <span className="ml-2 text-xs text-slate-500">{value === 0 ? "ausgeblendet" : `${value}/5`}</span>
      </div>
    </div>
  );
}
