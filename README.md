# Tag2 – Bundestag Explorer & Gemini Studio

Eine lokal betreibbare Forschungsoberfläche für das Dokumentations- und Informationssystem des Deutschen Bundestags (DIP) mit integriertem Gemini-Arbeitsbereich. Tag2 bündelt die Recherche in DIP-Datensätzen, Metadatenansichten und die KI-gestützte Nachbearbeitung ausgewählter Dokumente in einer einzigen Webanwendung.

> Repository: https://github.com/immunizedcarbon/Tag2

## Inhaltsverzeichnis
- [Überblick](#überblick)
- [Funktionen](#funktionen)
- [Systemarchitektur](#systemarchitektur)
- [Voraussetzungen](#voraussetzungen)
- [Schnellstart (Kubuntu 24.04)](#schnellstart-kubuntu-2404)
  - [Einmalige Installation](#einmalige-installation)
  - [Anwendung starten (nach Installation)](#anwendung-starten-nach-installation)
- [Konfiguration und API-Schlüssel](#konfiguration-und-api-schlüssel)
- [Arbeiten mit der Oberfläche](#arbeiten-mit-der-oberfläche)
- [Entwicklung & Tests](#entwicklung--tests)
- [Produktiver Betrieb](#produktiver-betrieb)
- [Troubleshooting](#troubleshooting)
- [Lizenz](#lizenz)

## Überblick
Tag2 kombiniert einen FastAPI-gestützten Backend-Proxy für die Bundestag-DIP-API mit einem modernen React-Frontend. Die Anwendung ermöglicht das Filtern und Durchsuchen verschiedener DIP-Datensätze, das Anzeigen relevanter Metadaten sowie das direkte Weiterreichen von Textinhalten an den Gemini-Assistenten für Zusammenfassungen, Übersetzungen oder eigene Anweisungen.【F:frontend/src/components/BundestagSearch.jsx†L1-L210】【F:frontend/src/components/GeminiWorkspace.jsx†L1-L205】

## Funktionen
- **Intuitive Filtersuche** für Vorgänge, Drucksachen, Plenarprotokolle, Aktivitäten und Volltexte inklusive Cursor-basiertem Nachladen weiterer Treffer.【F:frontend/src/components/BundestagSearch.jsx†L21-L220】
- **Detailansichten mit Kontext** wie Wahlperiode, Abstract, Initiativen, PDF/XML-Quellenlinks sowie direkter Übergabe ausgewählter Inhalte an den Gemini-Assistenten.【F:frontend/src/components/BundestagSearch.jsx†L120-L309】
- **Gemini-Arbeitsbereich** mit vordefinierten Aufgaben (Zusammenfassung, Stichpunkte, Kernaussagen, Übersetzung) oder frei definierbaren Prompts inklusive Temperature-Regler, Kontextfeldern und Ergebnisverwaltung.【F:frontend/src/components/GeminiWorkspace.jsx†L1-L205】【F:frontend/src/components/GeminiWorkspace.jsx†L205-L304】
- **Konfigurations-UI** zum Hinterlegen von API-Keys, Standardfiltern, bevorzugter Sprache und Gemini-Standardeinstellungen; Werte werden lokal in einer JSON-Datei persistiert.【F:frontend/src/components/SettingsPanel.jsx†L1-L220】【F:backend/app/config.py†L10-L86】
- **Sichere API-Vermittlung**: Das Backend kapselt Zugriffe auf die DIP-API und das Gemini-Modell, maskiert Schlüssel in Responses und stellt Health-, Such- und Analyse-Endpunkte bereit.【F:backend/app/main.py†L10-L104】【F:backend/app/main.py†L106-L154】

## Systemarchitektur
```
Tag2/
├── backend/      FastAPI-Anwendung (DIP-Proxy, Konfiguration, Gemini-Connector)
└── frontend/     Vite + React + Material UI Oberfläche
```
- Das Backend lädt und speichert Einstellungen in `backend/config/app_config.json`, ruft DIP-Endpunkte asynchron über `httpx` auf und leitet Gemini-Anfragen über das Google `google-genai` SDK weiter.【F:backend/app/bundestag.py†L1-L53】【F:backend/app/gemini.py†L1-L87】【F:backend/app/config.py†L10-L86】
- Das Frontend nutzt React Query für Datenabfragen, Zustand via Zustand-Store und Material UI für Layout und Komponenten.【F:frontend/src/App.jsx†L1-L106】【F:frontend/src/store/appStore.js†L1-L13】

## Voraussetzungen
- Kubuntu 24.04 (oder vergleichbar) mit sudo-Rechten
- Python 3.12 inkl. `python3-venv`
- Node.js 20.x und npm
- Git, curl

> Tipp: Ein Google Gemini API-Key ist zwingend erforderlich, um den KI-Teil zu nutzen. Ein DIP-API-Key erhöht Rate Limits, ist aber optional.

## Schnellstart (Kubuntu 24.04)
### Einmalige Installation
Führe die folgenden Befehle nacheinander in einem Terminal aus. Die Blöcke sind so aufgebaut, dass sie direkt kopiert werden können.

```bash
# Systempakete aktualisieren und Grundvoraussetzungen installieren
sudo apt update
sudo apt install -y git curl python3.12-venv python3-pip

# Node.js 20.x einrichten (Nodesource-Repository)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Repository klonen
cd ~
git clone https://github.com/immunizedcarbon/Tag2.git
cd Tag2

# Python-Umgebung aufsetzen und Backend-Abhängigkeiten installieren
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Frontend-Abhängigkeiten installieren
cd frontend
npm install
cd ..
```

> Hinweis: Die Python-Umgebung bleibt aktiv, solange das Terminal geöffnet ist. Für neue Sessions musst du sie erneut mit `source .venv/bin/activate` laden.

### Anwendung starten (nach Installation)
1. **Backend in Terminal 1:**
   ```bash
   cd ~/Tag2
   source .venv/bin/activate
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```
   Der FastAPI-Server läuft anschließend unter `http://localhost:8000` (OpenAPI unter `http://localhost:8000/api/docs`).【F:backend/app/main.py†L12-L104】

2. **Frontend in Terminal 2:**
   ```bash
   cd ~/Tag2/frontend
   npm run dev -- --host
   ```
   Öffne danach `http://localhost:5173` im Browser. Die UI verbindet sich automatisch mit dem Backend (`VITE_API_BASE_URL` fällt standardmäßig auf `http://localhost:8000/api`).【F:frontend/src/api/client.js†L1-L16】

## Konfiguration und API-Schlüssel
- Beim ersten Backend-Start wird `backend/config/app_config.json` mit Standardwerten erzeugt. Die Datei enthält Gemini-, Bundestag- und UI-Einstellungen.【F:backend/app/config.py†L10-L86】
- API-Schlüssel kannst du entweder direkt in der Datei eintragen oder komfortabel im Reiter **Einstellungen** der Oberfläche hinterlegen. Gespeicherte Schlüssel werden maskiert angezeigt und lokal persistiert.【F:frontend/src/components/SettingsPanel.jsx†L1-L220】
- Gemini-Optionen umfassen Modell, System-Prompt und Temperatur. Für die DIP-Suche lassen sich Basis-URL, Standard-Datensatz und Default-Filter definieren.【F:frontend/src/components/SettingsPanel.jsx†L54-L179】

## Arbeiten mit der Oberfläche
1. **DIP-Daten durchsuchen:** Wähle oben den Tab „DIP-Daten“, setze Filter für Titel, Wahlperioden, Vorgangstypen, Deskriptoren, Initiativen oder Datum und starte die Suche. Ergebnisse enthalten Metadaten, Badge-Übersichten, Aktualisierungszeitpunkte und Links zu PDF/XML-Quellen.【F:frontend/src/components/BundestagSearch.jsx†L44-L309】
2. **Dokumente für Gemini übernehmen:** Über den Button „Für Gemini übernehmen“ wird der Volltext oder Abstract in den KI-Tab übergeben und kann dort weiterverarbeitet werden.【F:frontend/src/components/BundestagSearch.jsx†L258-L309】
3. **Gemini-Assistent nutzen:** Wähle Aufgabe, Sprache, Tonfall, Länge und optional zusätzlichen Kontext. Starte die Analyse, kopiere Ergebnisse in die Zwischenablage oder wechsle zwischen Kandidatenvarianten.【F:frontend/src/components/GeminiWorkspace.jsx†L19-L304】
4. **Einstellungen verwalten:** Hinterlege API-Schlüssel, stelle Standardfilter ein und definiere UI-Voreinstellungen im Tab „Einstellungen“. Änderungen werden über den Speichern-Button ans Backend übertragen.【F:frontend/src/components/SettingsPanel.jsx†L1-L220】

## Entwicklung & Tests
- **Backend-Livebetrieb:** `uvicorn app.main:app --reload --port 8000`
- **Backend-Healthcheck:** `http GET http://localhost:8000/api/health` (oder Browser)
- **Frontend-Entwicklung:** `npm run dev`
- **Frontend-Buildprüfung:** `npm run build`
- **Linting (Frontend):** `npm run lint`

## Produktiver Betrieb
- Erzeuge ein optimiertes Frontend-Bundle mit `npm run build` und hoste den generierten Output aus `frontend/dist` hinter einem Webserver deiner Wahl.【F:frontend/package.json†L7-L21】
- Starte das Backend ohne Reloading z. B. mit `uvicorn app.main:app --host 0.0.0.0 --port 8000` hinter einem Reverse Proxy.【F:backend/app/main.py†L12-L104】
- Setze in produktiven Umgebungen die Variable `VITE_API_BASE_URL`, falls Frontend und Backend unter unterschiedlichen Hosts/Ports laufen (z. B. `.env.local` mit `VITE_API_BASE_URL=https://example.org/api`).【F:frontend/src/api/client.js†L1-L16】

## Troubleshooting
- **`ModuleNotFoundError` beim Backend-Start:** Stelle sicher, dass die virtuelle Umgebung aktiv ist (`source .venv/bin/activate`) und die Abhängigkeiten installiert wurden.
- **`npm` findet kein passendes Node.js:** Prüfe mit `node -v`, dass Version ≥ 20 installiert ist. Bei Bedarf die NodeSource-Schritte erneut ausführen.
- **DIP-Anfragen schlagen fehl:** Kontrolliere Netzwerkzugriff und (falls vorhanden) deinen DIP-API-Key. Fehlerdetails erscheinen als Meldung in der UI, da das Backend Fehlertexte weiterreicht.【F:backend/app/main.py†L106-L154】
- **Gemini-Tasks werden abgelehnt:** Überprüfe, ob ein gültiger Gemini API-Key hinterlegt wurde und ob der Task-Text nicht leer ist (leere Texte werden mit HTTP 400 abgewiesen).【F:backend/app/main.py†L130-L154】

## Lizenz
Dieses Projekt ist als Beispielimplementierung für private Arbeitsabläufe gedacht. Nutze und erweitere es nach deinen Anforderungen.
