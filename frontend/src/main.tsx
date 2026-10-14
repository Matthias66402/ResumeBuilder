import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import ResumeList from "./pages/ResumeList";

// The builder pulls in TipTap and dnd-kit; load it only when a resume is opened.
const Builder = lazy(() => import("./pages/Builder"));
const PrintView = lazy(() => import("./pages/PrintView"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ResumeList />} />
        <Route path="/resumes/:id/print" element={<Suspense><PrintView /></Suspense>} />
        <Route path="/resumes/:id" element={<Suspense fallback={<main className="p-10 text-slate-500">Lade …</main>}><Builder /></Suspense>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
