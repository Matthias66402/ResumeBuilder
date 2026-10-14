import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth";

interface NavAction {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}

interface Props {
  /** Extra sidebar actions of the current page (e.g. "PDF importieren"). */
  actions?: NavAction[];
  children: ReactNode;
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!user) return null;
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white uppercase">
          {user.email[0]}
        </span>
        <span className="hidden max-w-48 truncate text-sm text-slate-700 sm:block">{user.email}</span>
        <i className="ph ph-caret-down text-slate-500" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-60 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <p className="truncate border-b border-slate-100 px-4 py-2 text-xs text-slate-500">Angemeldet als {user.email}</p>
          <button type="button" onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50">
            <i className="ph ph-sign-out" aria-hidden /> Abmelden
          </button>
        </div>
      )}
    </div>
  );
}

const navClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

/** Signed-in layout: header with the user menu, navigation sidebar (a drawer on small screens), content. */
export default function AppShell({ actions = [], children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Hauptnavigation">
      <NavLink
        to="/"
        end
        onClick={() => setMenuOpen(false)}
        className={({ isActive }) => `${navClass} ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
      >
        <i className="ph ph-files text-lg" aria-hidden /> Lebensläufe
      </NavLink>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          disabled={action.disabled}
          onClick={() => {
            setMenuOpen(false);
            action.onClick();
          }}
          className={`${navClass} text-slate-600 hover:bg-slate-100 disabled:opacity-50`}
        >
          <i className={`ph ph-${action.icon} text-lg`} aria-hidden /> {action.label}
        </button>
      ))}
      <div className="mt-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        Basiert auf{" "}
        <a href="https://github.com/reactive-resume/reactive-resume" target="_blank" rel="noreferrer" className="font-medium text-slate-700 hover:underline">
          Reactive Resume
        </a>{" "}
        (MIT)
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menü"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <i className={`ph ${menuOpen ? "ph-x" : "ph-list"} text-xl`} aria-hidden />
        </button>
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <i className="ph ph-read-cv-logo text-xl" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">ResumeBuilder</span>
        </NavLink>
        <div className="ml-auto">
          <UserMenu />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>
        {menuOpen && (
          <>
            <div className="absolute inset-0 z-20 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white shadow-xl lg:hidden">{sidebar}</aside>
          </>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
