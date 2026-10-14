import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import ResumeDetail from "./pages/ResumeDetail";
import ResumeList from "./pages/ResumeList";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ResumeList />} />
        <Route path="/resumes/:id" element={<ResumeDetail />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
