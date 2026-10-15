import type { Resume, ResumeData, ResumeSummary } from "./types/resume";

export interface User {
  id: string;
  email: string;
}

/** Fired when the session is missing or expired; the AuthProvider then shows the sign-in page. */
export const UNAUTHORIZED_EVENT = "rb:unauthorized";

/** FastAPI errors: a string, or for validation errors a list of {msg}. */
function errorMessage(body: { detail?: unknown } | null, status: number): string {
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => String(d?.msg ?? "").replace(/^Value error, /, "")).join(" ");
  return `Fehler ${status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (res.status === 401 && !path.startsWith("/auth/")) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorMessage(body, res.status));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  me: () => request<User>("/auth/me"),
  login: (email: string, password: string) => request<User>("/auth/login", json({ email, password })),
  register: (email: string, password: string) => request<User>("/auth/register", json({ email, password })),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  listResumes: () => request<ResumeSummary[]>("/resumes"),
  getResume: (id: string) => request<Resume>(`/resumes/${id}`),
  updateResume: (id: string, update: { name?: string; data?: ResumeData }) =>
    request<Resume>(`/resumes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }),
  deleteResume: (id: string) => request<void>(`/resumes/${id}`, { method: "DELETE" }),
  duplicateResume: (id: string) => request<Resume>(`/resumes/${id}/duplicate`, { method: "POST" }),
  uploadPicture: (resumeId: string, file: Blob) => {
    const form = new FormData();
    form.append("file", file, "picture");
    return request<{ url: string }>(`/resumes/${resumeId}/picture`, { method: "POST", body: form });
  },
  downloadPdf: async (resumeId: string): Promise<Blob> => {
    const res = await fetch(`/api/resumes/${resumeId}/pdf`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(errorMessage(body, res.status));
    }
    return res.blob();
  },
  importResume: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Resume>("/resumes/import", { method: "POST", body: form });
  },
};
