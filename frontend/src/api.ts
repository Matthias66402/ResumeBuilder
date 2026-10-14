import type { Resume, ResumeData, ResumeSummary } from "./types/resume";

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
  updateResume: (id: string, update: { name?: string; data?: ResumeData }) =>
    request<Resume>(`/resumes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }),
  deleteResume: (id: string) => request<void>(`/resumes/${id}`, { method: "DELETE" }),
  importResume: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Resume>("/resumes/import", { method: "POST", body: form });
  },
};
