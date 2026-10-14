import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";

const MIN_PASSWORD = 8;

export default function Login() {
  const { user, signIn } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Only paths inside the app, so a crafted ?next= can't send users to another site.
  const next = params.get("next");
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (user) return <Navigate to={target} replace />;

  const register = mode === "register";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (register && password.length < MIN_PASSWORD) {
      setError(`Das Passwort muss mindestens ${MIN_PASSWORD} Zeichen lang sein.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password, mode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">ResumeBuilder</h1>
          <p className="text-sm text-slate-500">{register ? "Neues Konto anlegen" : "Anmelden, um deine Lebensläufe zu bearbeiten"}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">E-Mail</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Passwort</span>
          <input
            type="password"
            required
            autoComplete={register ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {register && <span className="mt-1 block text-xs text-slate-500">Mindestens {MIN_PASSWORD} Zeichen</span>}
        </label>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-md bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-70">
          {busy ? "Bitte warten …" : register ? "Konto anlegen" : "Anmelden"}
        </button>
        <p className="text-center text-sm text-slate-600">
          {register ? "Schon ein Konto?" : "Noch kein Konto?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(register ? "login" : "register");
              setError(null);
            }}
            className="font-medium text-blue-700 hover:underline"
          >
            {register ? "Anmelden" : "Registrieren"}
          </button>
        </p>
      </form>
    </main>
  );
}
