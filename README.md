# Bundestag Explorer & Gemini Studio

Eine moderne, lokal betreibbare Webanwendung zum Durchstöbern der Bundestags-DIP-API und zur KI-gestützten Auswertung ausgewählter Dokumente mit Gemini 2.5 Pro.

## Funktionsüberblick

- **State-of-the-Art UI** auf Basis von React, Material UI und React Query.
- **Interaktive Filtersuche** für verschiedene DIP-Datensätze (Vorgänge, Drucksachen, Plenarprotokolle, Aktivitäten, Volltexte).
- **Cursor-basiertes Nachladen** weiterer Ergebnisse sowie Darstellung wichtiger Metadaten und Quellenlinks (PDF/XML).
- **Gemini-Arbeitsbereich** mit konfigurierbaren Aufgaben (Zusammenfassung, Stichpunkte, Kernaussagen, Übersetzungen oder freie Instruktionen).
- **Konfigurationsverwaltung** direkt in der UI (API-Keys, System-Prompt, Standardfilter, Sprache und Standardaktion).
- **Persistente Speicherung** der Einstellungen in einer lokalen JSON-Konfigurationsdatei.

## Projektstruktur

```
backend/          FastAPI-Anwendung (API-Proxy, Konfiguration, Gemini-Connector)
frontend/         React-Frontend (Vite, Material UI)
```

## Voraussetzungen

- Node.js ≥ 20
- Python ≥ 3.11

## Installation & Entwicklung

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Die Konfiguration wird unter `backend/config/app_config.json` gespeichert und beim ersten Start mit Standardwerten angelegt.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Der Vite-Dev-Server läuft standardmäßig auf `http://localhost:5173` und erwartet das Backend auf `http://localhost:8000`.

### Produktion / Build

```bash
cd frontend
npm run build
```

Das Backend kann mit `uvicorn` oder einem beliebigen ASGI-Server betrieben werden. Für den produktiven Einsatz empfiehlt sich z. B. `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## Konfiguration

Alle Einstellungen lassen sich im Reiter **„Einstellungen“** der UI vornehmen:

- **API-Keys** für das DIP und Gemini (werden lokal gespeichert und in der Oberfläche maskiert angezeigt).
- **Gemini-Systemprompt, Modell, Temperatur**.
- **Standard-Filter** für die Bundstagsuche (Titel, Wahlperioden, Vorgangstypen).
- **UI-Voreinstellungen** wie bevorzugte Sprache und Standardaktion für den Gemini-Reiter.

Die Werte werden in `backend/config/app_config.json` gesichert und beim Neustart wiederverwendet.

## Sicherheitshinweis

Diese Anwendung ist für den privaten Gebrauch gedacht. Die API-Keys werden lokal gespeichert und sollten nicht in Versionskontrolle hochgeladen oder öffentlich geteilt werden.

## Tests / Qualitätssicherung

- Linting & Build (Frontend): `npm run build`
- Backend (manuelle Tests): Die FastAPI-Endpunkte stellen JSON-Responses bereit und lassen sich über `/api/docs` inspizieren, sobald das Backend läuft.

## Lizenz

Dieses Projekt ist als Beispielimplementation zu verstehen. Verwende und erweitere es nach Bedarf für deinen privaten Workflow.
