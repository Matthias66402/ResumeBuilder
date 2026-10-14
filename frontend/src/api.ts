import type { Resume, ResumeSummary } from "./types/resume";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Fehler ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  listResumes: () => request<ResumeSummary[]>("/resumes"),
  getResume: (id: string) => request<Resume>(`/resumes/${id}`),
  deleteResume: (id: string) => request<void>(`/resumes/${id}`, { method: "DELETE" }),
  importResume: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Resume>("/resumes/import", { method: "POST", body: form });
  },
};
