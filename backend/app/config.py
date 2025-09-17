from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"
CONFIG_PATH = CONFIG_DIR / "app_config.json"


class GeminiSettings(BaseModel):
    api_key: Optional[str] = None
    model: str = "gemini-2.5-pro"
    system_prompt: str = (
        "Du bist ein hilfreicher Assistent, der Informationen aus Bundestagsunterlagen "
        "präzise zusammenfasst. Liefere strukturierte, verständliche Antworten auf Deutsch "
        "und weise auf fehlende Informationen hin."
    )
    temperature: float = 0.3


class BundestagSettings(BaseModel):
    api_key: Optional[str] = None
    base_url: str = "https://search.dip.bundestag.de/api/v1"
    default_filters: Dict[str, Any] = Field(
        default_factory=lambda: {
            "f.wahlperiode": [],
            "f.vorgangstyp": [],
            "f.titel": "",
        }
    )
    default_dataset: str = "vorgang"


class UISettings(BaseModel):
    preferred_language: str = "de"
    default_gemini_task: str = "summary"


class Settings(BaseModel):
    gemini: GeminiSettings = Field(default_factory=GeminiSettings)
    bundestag: BundestagSettings = Field(default_factory=BundestagSettings)
    ui: UISettings = Field(default_factory=UISettings)


def load_settings() -> Settings:
    if not CONFIG_PATH.exists():
        return Settings()
    data = CONFIG_PATH.read_text(encoding="utf-8")
    if not data.strip():
        return Settings()
    try:
        payload = Settings.model_validate_json(data)
    except Exception as exc:  # pragma: no cover - defensive
        raise ValueError("Konfigurationsdatei konnte nicht gelesen werden") from exc
    return payload


def save_settings(settings: Settings) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(settings.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")


def update_settings(partial: Dict[str, Any]) -> Settings:
    current = load_settings()
    updated_data = current.model_dump()
    for namespace, values in partial.items():
        if namespace not in updated_data:
            updated_data[namespace] = values
            continue
        if isinstance(values, dict) and isinstance(updated_data[namespace], dict):
            updated_data[namespace].update(values)
        else:
            updated_data[namespace] = values
    new_settings = Settings.model_validate(updated_data)
    save_settings(new_settings)
    return new_settings
