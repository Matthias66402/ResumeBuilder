# ResumeBuilder

Abgespeckter Klon von [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume): PDF-Lebensläufe importieren, per LLM (Groq) strukturieren und im Reactive-Resume-Datenformat (JSONB) in PostgreSQL speichern.

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
alembic upgrade head && uvicorn app.main:app --reload    # :8000
cd frontend && npm install && npm run dev                 # :5180, proxied /api → :8000
```

Tests: `cd backend && pytest`

## Ablauf des Imports

1. `POST /api/resumes/import` (multipart `file`) – Upload wird auf PDF und Größe geprüft.
2. `services/pdf_text.py` extrahiert den Text mit PyMuPDF (Scans ohne Textlayer → 422).
3. `services/parser.py` schickt den Text an Groq (`GROQ_MODEL`, Strict Structured Output mit `schemas/extraction.py`, Fallback JSON-Mode).
4. `services/sanitize.py` baut daraus `ResumeData` (`schemas/resume.py`, Spiegel von Reactive Resumes `data.ts`): IDs, Defaults, strukturierte Daten + Datums-Text.
5. Gespeichert in `resumes.data` (JSONB), Rohtext in `resumes.raw_text`.
