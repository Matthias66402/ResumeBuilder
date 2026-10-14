import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import ResumePreview from "../templates/ResumePreview";
import type { Resume } from "../types/resume";

declare global {
  interface Window {
    __RESUME_READY__?: boolean;
  }
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * Bare, paginated resume for the server-side PDF export: headless Chromium opens this page
 * (backend/app/services/pdf_render.py) and prints it once `window.__RESUME_READY__` is set.
 */
export default function PrintView() {
  const { id } = useParams<{ id: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) api.getResume(id).then(setResume).catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!resume) return;
    let cancelled = false;
    (async () => {
      // Fonts and pictures change sizes, and pagination re-measures after they load; wait for all of it.
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
      await nextFrame();
      await nextFrame();
      if (!cancelled) window.__RESUME_READY__ = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [resume]);

  if (error) return <p className="p-10 text-red-700">{error}</p>;
  if (!resume) return null;
  return (
    <div className="bg-white">
      <ResumePreview data={resume.data} />
    </div>
  );
}
