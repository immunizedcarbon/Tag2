#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
VENV_PATH="$ROOT_DIR/.venv"

info() { echo -e "\033[1;34m[i]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
error() { echo -e "\033[1;31m[x]\033[0m $*"; }

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    return 1
  fi
}

ensure_package() {
  local pkg="$1"
  if dpkg -s "$pkg" >/dev/null 2>&1; then
    return 0
  fi
  info "Installiere Paket $pkg (benötigt sudo)"
  sudo apt-get update
  sudo apt-get install -y "$pkg"
}

info "Starte Bootstrap für Tag2"

# Prüfe Python und venv-Unterstützung
if ! command -v python3 >/dev/null 2>&1; then
  error "python3 nicht gefunden. Bitte installiere Python 3.12 oder neuer."
  exit 1
fi

if ! python3 -m venv --help >/dev/null 2>&1; then
  warn "python3-venv ist nicht installiert – wird nachinstalliert."
  ensure_package "python3.12-venv"
  ensure_package "python3-pip"
fi

# Stelle Node.js >= 20 sicher
if require_command node; then
  NODE_VERSION="$(node -v | sed 's/v//')"
  NODE_MAJOR="${NODE_VERSION%%.*}"
else
  NODE_MAJOR=0
fi

if [[ "$NODE_MAJOR" -lt 20 ]]; then
  warn "Node.js 20.x wird benötigt. NodeSource-Repository wird eingebunden (sudo erforderlich)."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  info "Node.js $(node -v) erfüllt die Anforderungen."
fi

# Virtuelle Umgebung vorbereiten
if [[ ! -d "$VENV_PATH" ]]; then
  info "Erstelle virtuelle Python-Umgebung in $VENV_PATH"
  python3 -m venv "$VENV_PATH"
else
  info "Virtuelle Umgebung bereits vorhanden."
fi

# Aktivieren und Abhängigkeiten installieren
# shellcheck source=/dev/null
source "$VENV_PATH/bin/activate"

info "Aktualisiere pip"
pip install --upgrade pip

info "Installiere Backend-Abhängigkeiten"
pip install -r "$ROOT_DIR/backend/requirements.txt"

info "Installiere Frontend-Abhängigkeiten"
(cd "$ROOT_DIR/frontend" && npm install)

info "Bootstrap abgeschlossen. Aktiviere zukünftig die Umgebung mit: source $VENV_PATH/bin/activate"
