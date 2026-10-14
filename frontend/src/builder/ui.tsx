import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function Label({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <Label label={label} className={className}>
      <input {...props} className={inputClass} />
    </Label>
  );
}

export function IconButton({
  title,
  active,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { title: string; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      {...props}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 ${
        active ? "bg-slate-200 text-slate-900" : ""
      } ${className}`}
    />
  );
}

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 px-4 py-4">
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// Small inline icons (stroke-based, 16px), so no icon library is needed.
const icon = (d: ReactNode) =>
  function Icon({ className = "h-4 w-4" }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        {d}
      </svg>
    );
  };

export const Icons = {
  Eye: icon(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>),
  EyeOff: icon(<><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6" /><path d="m2 2 20 20" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>),
  Trash: icon(<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>),
  Grip: icon(<><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>),
  ChevronDown: icon(<path d="m6 9 6 6 6-6" />),
  ChevronRight: icon(<path d="m9 6 6 6-6 6" />),
  Plus: icon(<><path d="M12 5v14" /><path d="M5 12h14" /></>),
  Undo: icon(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>),
  Redo: icon(<><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></>),
  ArrowLeft: icon(<><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>),
  Printer: icon(<><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></>),
  Code: icon(<><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></>),
  Bold: icon(<><path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" /></>),
  Italic: icon(<><path d="M19 4h-9" /><path d="M14 20H5" /><path d="M15 4 9 20" /></>),
  Underline: icon(<><path d="M6 4v6a6 6 0 0 0 12 0V4" /><path d="M4 20h16" /></>),
  List: icon(<><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>),
  ListOrdered: icon(<><path d="M10 6h11" /><path d="M10 12h11" /><path d="M10 18h11" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></>),
  Link: icon(<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>),
  X: icon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>),
};
