# ResumeBuilder

Abgespeckter Nachbau von [Reactive Resume](https://github.com/reactive-resume/reactive-resume): PDF-Lebensläufe importieren, per LLM (Groq) strukturieren und im Reactive-Resume-Datenformat (JSONB) in PostgreSQL speichern, bearbeiten, gestalten und als PDF exportieren.

## Grundlage

ResumeBuilder basiert auf **Reactive Resume** von Amruth Pillai, einem freien Open-Source-Lebenslauf-Editor:

- **Quelle:** https://github.com/reactive-resume/reactive-resume (Website: https://rxresu.me)
- **Stand der Vorlage:** Version 6.0.2, Commit `4034b720c` (12.10.2026)
- **Lizenz:** MIT, Copyright (c) 2026 Amruth Pillai, siehe [Lizenzhinweise](#lizenzhinweise)

Der Code ist eine eigenständige Neuentwicklung mit FastAPI und React, Reactive Resume selbst nutzt TypeScript mit Hono, TanStack und Drizzle. Übernommen bzw. nachgebildet wurden:

| Aus Reactive Resume | Hier |
|---|---|
| Datenschema `packages/schema/src/resume/data.ts` und `default.ts` | `backend/app/schemas/resume.py`, `frontend/src/types/resume.ts` (JSON bleibt kompatibel) |
| Parser-Prompt `packages/ai/src/prompts/parser-system.md` und Bereinigung `packages/ai/src/resume/sanitize.ts` | `backend/app/services/prompts/parser_system.md`, `backend/app/services/sanitize.py` |
| Builder-Aufbau, Autosave und Undo (`apps/web/src/features/resume/`) | `frontend/src/builder/` |
| Gestaltung der 17 Templates (`packages/pdf/src/templates/`) | `frontend/src/templates/` als HTML/CSS statt react-pdf |
| Icon-Set [Phosphor Icons](https://phosphoricons.com) (MIT) | `@phosphor-icons/web`, `@phosphor-icons/core` |

## Starten (Docker)

```bash
cp .env.example .env   # GROQ_API_KEY eintragen
docker compose up --build
```

App: http://localhost:8000 · API-Doku: http://localhost:8000/docs · Postgres: `localhost:5434` (User/DB `resumebuilder`).

## Entwicklung ohne App-Container

```bash
docker compose up -d db
cd backend && pip install -r requirements-dev.txt
playwright install chromium                                # einmalig, für den PDF-Download
alembic upgrade head && uvicorn app.main:app --reload    # :8000
cd frontend && npm install && npm run dev                 # :5180, proxied /api → :8000
```

Tests: `cd backend && pytest`

Damit der PDF-Download lokal funktioniert, muss Chromium die Druckseite über Vite laden: `PDF_RENDER_BASE_URL=http://localhost:5180` in die `.env` eintragen.

## Ablauf des Imports

1. `POST /api/resumes/import` (multipart `file`) – Upload wird auf PDF und Größe geprüft.
2. `services/pdf_text.py` extrahiert den Text mit PyMuPDF (Scans ohne Textlayer → 422).
3. `services/parser.py` schickt den Text an Groq (`GROQ_MODEL`, Strict Structured Output mit `schemas/extraction.py`, Fallback JSON-Mode).
4. `services/sanitize.py` baut daraus `ResumeData` (`schemas/resume.py`, Spiegel von Reactive Resumes `data.ts`): IDs, Defaults, strukturierte Daten + Datums-Text.
5. Gespeichert in `resumes.data` (JSONB), Rohtext in `resumes.raw_text`.

## Builder (Bearbeiten & Styling)

Ein Klick auf einen Lebenslauf öffnet `/resumes/:id`, aufgebaut nach dem Vorbild des Reactive-Resume-Builders:

- **Links – Inhalte** (`frontend/src/builder/content/`): Persönliche Daten, Zusammenfassung und alle 12 Abschnitte. Einträge lassen sich per Drag & Drop sortieren, ausblenden, hinzufügen und löschen; Beschreibungen werden mit TipTap bearbeitet. Die Felder pro Abschnitt kommen aus `builder/sectionFields.ts`.
- **Mitte – Vorschau** (`frontend/src/templates/`): HTML-Versionen aller 17 RR-Templates. Sie bestehen aus gemeinsamen Bausteinen (`templates/index.tsx`: Kopfbereich, eine Spalte oder Haupt- und Seitenspalte) und je einem CSS-Block in `templates.css`. Gestylt wird über CSS-Variablen aus `metadata`. Lange Lebensläufe werden automatisch auf mehrere Blätter verteilt (`templates/paginate.ts`). „PDF drucken“ nutzt den Druckdialog des Browsers.
- **Rechts – Design** (`frontend/src/builder/design/`): Template, Layout (Abschnitte zwischen Haupt- und Seitenspalte ziehen, Seiten, Breite der Seitenspalte), Typografie, Farben, Seite.
- **State** (`builder/store.ts`): Zustand + immer mit Undo/Redo (Strg+Z / Strg+Y). Gespeichert wird automatisch per `PUT /api/resumes/{id}`, jeweils das komplette `data`.
- **Profilbild**: Wird im Browser auf höchstens 1024 px verkleinert und mit `POST /api/resumes/{id}/picture` hochgeladen. Gespeichert wird es in der Postgres-Tabelle `uploads`, ausgeliefert über `/api/uploads/{id}`. Im Lebenslauf selbst steht nur die URL (`picture.url`), wie bei Reactive Resume.
- **PDF-Download**: `GET /api/resumes/{id}/pdf`. Playwright/Chromium öffnet dafür die Druckseite `/resumes/{id}/print` (`frontend/src/pages/PrintView.tsx`), die dieselbe paginierte Vorschau rendert, und speichert sie als PDF (`backend/app/services/pdf_render.py`). Vor dem Download speichert der Builder alle offenen Änderungen.
- **Icons**: Phosphor-Icons wie bei Reactive Resume, eingebunden als Icon-Schrift (`@phosphor-icons/web`). Damit wird jeder gespeicherte Icon-Name dargestellt.
  - **Wo:** Kontaktangaben bekommen feste Icons. Abschnitte, Profile, Kenntnisse und Interessen haben ein frei wählbares Icon (`icon`-Feld); Profile übernehmen das Logo ihres Netzwerks automatisch.
  - **Picker:** Der Icon-Picker durchsucht den Phosphor-Katalog (`@phosphor-icons/core`). Der Katalog wird erst beim Öffnen geladen.
  - **Schalter:** Unter Design → Seite (`metadata.page.hideIcons` / `hideSectionIcons`).

## Konten und Login

- **Anmeldung:** E-Mail und Passwort, offene Registrierung unter `/login`.
- **Passwörter:** Gespeichert als Argon2-Hash.
- **Sitzung:** Ein zufälliges Token im httpOnly-Cookie `rb_session` (SameSite=Lax, 30 Tage). In der Tabelle `sessions` liegt nur sein SHA-256, Abmelden löscht die Sitzung auch auf dem Server. Hinter HTTPS `COOKIE_SECURE=true` setzen.
- **Zugriff:** Jeder Lebenslauf gehört einem Konto (`resumes.user_id`). Fremde Lebensläufe und Bilder liefern 404, als gäbe es sie nicht.
- **PDF-Export:** Chromium übernimmt das Sitzungs-Cookie des Anfragenden, damit auch die Druckseite geschützt bleibt.
- **Bestand:** Lebensläufe aus der Zeit vor den Konten gehören keinem Konto. Das **erste** registrierte Konto übernimmt sie.

## Lizenzhinweise

Teile von ResumeBuilder sind von Reactive Resume abgeleitet (siehe [Grundlage](#grundlage)), das unter folgender Lizenz steht:

```
MIT License

Copyright (c) 2026 Amruth Pillai

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
