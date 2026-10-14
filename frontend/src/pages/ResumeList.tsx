import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import UploadDropzone from "../components/UploadDropzone";
import type { ResumeSummary } from "../types/resume";

export default function ResumeList() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listResumes()
      .then(setResumes)
      .catch((e: Error) => setError(e.message));
  }, []);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const resume = await api.importResume(file);
      navigate(`/resumes/${resume.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (resume: ResumeSummary) => {
    if (!window.confirm(`„${resume.name}“ löschen?`)) return;
    try {
      await api.deleteResume(resume.id);
      setResumes((list) => list?.filter((r) => r.id !== resume.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">ResumeBuilder</h1>

      <UploadDropzone busy={busy} onFile={upload} />
      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <h2 className="mt-10 mb-3 text-lg font-semibold">Lebensläufe</h2>
      {resumes === null ? (
        <p className="text-slate-500">Lade …</p>
      ) : resumes.length === 0 ? (
        <p className="text-slate-500">Noch keine Lebensläufe importiert.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {resumes.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <Link to={`/resumes/${r.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium text-blue-700 hover:underline">{r.name}</p>
                <p className="truncate text-sm text-slate-500">
                  {r.source_filename} · {new Date(r.created_at).toLocaleString("de-DE")}
                </p>
              </Link>
              <button
                onClick={() => remove(r)}
                className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
