import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "@phosphor-icons/web/regular";
import "./index.css";
import { AuthProvider, RequireAuth } from "./auth";
import Login from "./pages/Login";
import ResumeList from "./pages/ResumeList";

// The builder pulls in TipTap and dnd-kit; load it only when a resume is opened.
const Builder = lazy(() => import("./pages/Builder"));
const PrintView = lazy(() => import("./pages/PrintView"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><ResumeList /></RequireAuth>} />
          <Route path="/resumes/:id/print" element={<RequireAuth><Suspense><PrintView /></Suspense></RequireAuth>} />
          <Route
            path="/resumes/:id"
            element={<RequireAuth><Suspense fallback={<main className="p-10 text-slate-500">Lade …</main>}><Builder /></Suspense></RequireAuth>}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
