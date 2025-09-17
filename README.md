# Tag2 – Forschungswerkzeug für das Bundestag-DIP & Gemini

Tag2 bündelt eine schnelle Suche im Dokumentations- und Informationssystem des Deutschen Bundestags (DIP) mit einem Gemini-Arbeitsplatz für KI-gestützte Auswertungen. Die Anwendung läuft komplett lokal und eignet sich damit für vertrauliche Recherchen sowie explorative Analysen mit eigenen Vorgaben.

## Inhaltsübersicht
1. [Überblick](#überblick)
2. [Funktionshighlights](#funktionshighlights)
3. [Technischer Aufbau](#technischer-aufbau)
4. [Systemvoraussetzungen](#systemvoraussetzungen)
5. [Schnellstart auf Kubuntu 24.04](#schnellstart-auf-kubuntu-2404)
   1. [Alles-in-einem-Befehl](#alles-in-einem-befehl)
   2. [Start bei späteren Sitzungen](#start-bei-späteren-sitzungen)
6. [Konfiguration & API-Schlüssel](#konfiguration--api-schlüssel)
7. [Arbeiten mit der Oberfläche](#arbeiten-mit-der-oberfläche)
8. [Nützliche Befehle für Entwicklung & Tests](#nützliche-befehle-für-entwicklung--tests)
9. [Troubleshooting](#troubleshooting)
10. [Lizenzhinweis](#lizenzhinweis)

## Überblick
Das Backend fungiert als sicherer Proxy zwischen dem lokalen Browser, der öffentlichen DIP-API und Googles Gemini-Modellen. Gleichzeitig liefert das React-Frontend komfortable Filter, Detailansichten und einen Chat-ähnlichen Arbeitsplatz für die Weiterverarbeitung von Dokumentinhalten. Sämtliche Kommunikation bleibt innerhalb Ihrer Maschine; lediglich externe API-Aufrufe verlassen das System.

## Funktionshighlights
- **Mehrstufige Recherche**: Kombinierbare Filter (Wahlperioden, Vorgangstypen, Initiatoren, Freitext, Personensuche) erleichtern das Auffinden relevanter Vorgänge. Treffer lassen sich direkt in Detailansichten öffnen und weiterreichen.【F:frontend/src/components/BundestagSearch.jsx†L19-L331】
- **Kontextsensitive Detailkarten**: Abstracts, Initiativen, verlinkte Quellen (PDF/XML) und Metadaten werden klar strukturiert angezeigt. Inhalte lassen sich per Mausklick an den Gemini-Tab übergeben.【F:frontend/src/components/BundestagSearch.jsx†L184-L309】
- **Gemini-Workspace**: Vorgefertigte Aufgaben (Zusammenfassung, Kernaussagen, Übersetzung) und frei definierbare Prompts stehen bereit; Temperatur, Sprache und Stil können angepasst werden.【F:frontend/src/components/GeminiWorkspace.jsx†L1-L304】
- **Konfigurationspanel mit Zugriffsschutz**: API-Schlüssel werden maskiert gespeichert, solange beide Schlüssel fehlen, bleiben Suche und Gemini-Tab gesperrt. Einstellungen decken Standardfilter, UI-Voreinstellungen und Gemini-Defaults ab.【F:frontend/src/App.jsx†L8-L116】【F:frontend/src/components/SettingsPanel.jsx†L1-L360】【F:backend/app/config.py†L10-L86】
- **Stabile API-Vermittlung**: Asynchrone Requests zur DIP-API, validierte Konfigurationen und Fehlerbehandlung sorgen für zuverlässige Antworten; Gemini-Aufgaben werden sauber über das Backend geroutet.【F:backend/app/main.py†L10-L154】【F:backend/app/bundestag.py†L1-L199】【F:backend/app/gemini.py†L1-L87】

## Technischer Aufbau
```
Tag2/
├── backend/      FastAPI-Anwendung mit DIP-Proxy, Gemini-Connector & Konfiguration
├── frontend/     Vite + React + Material UI Oberfläche
└── scripts/      Hilfsskripte für Setup und kombinierten Dev-Server
```
- `backend/app/main.py` stellt REST-Endpunkte bereit (Gesundheitscheck, Konfiguration, DIP-Suche, Gemini-Aufgaben) und kümmert sich um CORS.【F:backend/app/main.py†L10-L154】
- `backend/app/config.py` legt das Schema für gespeicherte Einstellungen fest und verwaltet `backend/config/app_config.json`.【F:backend/app/config.py†L10-L86】
- `frontend/src` enthält React-Komponenten, Zustand (Zustand Store) und API-Client. Die Kommunikation mit dem Backend erfolgt über `frontend/src/api/client.js` mit einer konfigurierbaren Basis-URL.【F:frontend/src/api/client.js†L1-L16】
- `scripts/bootstrap.sh` richtet Python-Venv, Pip-Abhängigkeiten und das Node.js-Frontend ein. `scripts/devserver.py` startet Backend & Frontend gemeinsam und beendet beide Prozesse sauber.【F:scripts/bootstrap.sh†L1-L68】【F:scripts/devserver.py†L1-L126】

## Systemvoraussetzungen
- Kubuntu 24.04 (oder eine vergleichbare Ubuntu-Distribution) mit sudo-Rechten
- Python 3.12 inklusive `python3-venv`
- Node.js 20.x und npm
- Git und curl
- Einen Google-Gemini-API-Schlüssel (Pflicht für KI-Funktionen) sowie optional einen DIP-API-Schlüssel für höhere Rate Limits

## Schnellstart auf Kubuntu 24.04
### Alles-in-einem-Befehl
Der folgende Einzeiler erledigt auf einer frischen Kubuntu-Installation sämtliche Schritte: Paketinstallation, Repository-Klon, Abhängigkeits-Setup und Start beider Server. Kopieren, einfügen, Enter – anschließend läuft Tag2, bis Sie mit `Strg+C` abbrechen.

```bash
bash -c 'set -euo pipefail; cd "$HOME"; sudo apt-get update; sudo apt-get install -y git curl python3 python3-venv python3-pip; if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; sudo apt-get install -y nodejs; fi; if [ ! -d "$HOME/Tag2" ]; then git clone https://github.com/immunizedcarbon/Tag2.git "$HOME/Tag2"; else cd "$HOME/Tag2" && git pull; fi; cd "$HOME/Tag2"; ./scripts/bootstrap.sh; source .venv/bin/activate; python scripts/devserver.py'
```

> Hinweis: Während des Ablaufs werden sudo-Berechtigungen benötigt (für Paketinstallationen bzw. NodeSource-Setup). Der Prozess endet erst, wenn Sie den Dev-Server mit `Strg+C` stoppen.

### Start bei späteren Sitzungen
Nach erfolgreichem Setup genügen diese drei Befehle, um Backend und Frontend erneut zu starten:

```bash
cd ~/Tag2
source .venv/bin/activate
python scripts/devserver.py
```

## Konfiguration & API-Schlüssel
- Beim ersten Start erzeugt das Backend automatisch `backend/config/app_config.json`. In dieser Datei werden Gemini-, Bundestag- und UI-Einstellungen persistiert.【F:backend/app/config.py†L10-L86】
- API-Schlüssel können direkt über den Tab **Einstellungen** gepflegt werden. Das Backend speichert sie maskiert und gibt in Responses nur verkürzte Vorschauen zurück.【F:backend/app/main.py†L36-L57】【F:frontend/src/components/SettingsPanel.jsx†L1-L360】
- Solange kein Gemini- und DIP-Schlüssel vorliegt, bleiben Recherche- und Gemini-Bereich gesperrt; die UI blendet einen entsprechenden Hinweis ein.【F:frontend/src/App.jsx†L8-L116】
- Standardfilter (Wahlperioden, Vorgangstypen, Initiativen), bevorzugte Sprache und Gemini-Vorgaben lassen sich jederzeit anpassen. Änderungen werden via `POST /api/config` gespeichert.【F:backend/app/main.py†L59-L102】

## Arbeiten mit der Oberfläche
1. **DIP-Tab öffnen** – Wählen Sie Datensatz (Vorgänge, Drucksachen, Plenarprotokolle etc.) und setzen Sie Filter über Dropdowns, Autocomplete-Felder oder Freitext. Ergebnisse erscheinen mit Badges, Abstracts und Quellenlinks.【F:frontend/src/components/BundestagSearch.jsx†L52-L331】
2. **Dokumente an Gemini übergeben** – Über den Button „Für Gemini übernehmen“ wird der ausgewählte Text direkt in den Gemini-Arbeitsbereich übertragen, inklusive Titel und Metadaten.【F:frontend/src/components/BundestagSearch.jsx†L258-L309】
3. **Gemini-Aufgaben durchführen** – Wählen Sie eine vordefinierte Aufgabe oder formulieren Sie eigene Anweisungen, variieren Sie Temperatur und Stil, vergleichen Sie Antwortvarianten und kopieren Sie Ergebnisse in die Zwischenablage.【F:frontend/src/components/GeminiWorkspace.jsx†L1-L304】
4. **Einstellungen pflegen** – Hinterlegen Sie Schlüssel, Standardfilter und Oberflächenoptionen. Speichern löst einen Backend-Aufruf aus; erfolgreiche Aktualisierungen werden bestätigt.【F:frontend/src/components/SettingsPanel.jsx†L40-L344】【F:backend/app/main.py†L59-L102】

## Nützliche Befehle für Entwicklung & Tests
- Backend im Hot-Reload-Modus: `cd backend && uvicorn app.main:app --reload --port 8000`
- Backend-Healthcheck: `curl http://localhost:8000/api/health`
- Frontend im Dev-Modus (ohne Kombiskript): `cd frontend && npm run dev`
- Frontend-Build prüfen: `cd frontend && npm run build`
- Frontend-Linting: `cd frontend && npm run lint`

## Troubleshooting
- **Virtuelle Umgebung fehlt**: Prüfen Sie, ob `.venv/bin/activate` existiert und vor dem Starten aktiviert wurde. Führen Sie ggf. `./scripts/bootstrap.sh` erneut aus.
- **DIP-Requests schlagen fehl**: Kontrollieren Sie Netzwerkzugang und den hinterlegten DIP-API-Schlüssel. Das Backend gibt Fehlertexte aus der DIP-API direkt weiter, die UI zeigt sie als Meldung an.【F:backend/app/main.py†L104-L154】
- **Gemini-Aufgaben werden abgelehnt**: Stellen Sie sicher, dass der Gemini-Schlüssel korrekt ist und ein nicht-leerer Text übermittelt wird; leere Texte führen zu HTTP 400.【F:backend/app/main.py†L126-L154】
- **Node.js zu alt**: Der Einzeiler installiert bei Bedarf Node.js 20 über NodeSource. Alternativ können Sie `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -` und anschließend `sudo apt-get install -y nodejs` manuell ausführen.

## Lizenzhinweis
Tag2 wird als Beispielprojekt für private Recherchen bereitgestellt. Nutzen und erweitern Sie es entsprechend Ihrer Anforderungen.
