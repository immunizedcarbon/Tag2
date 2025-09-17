from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class GeminiConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None


class BundestagConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    default_filters: Optional[Dict[str, Any]] = None
    default_dataset: Optional[str] = None


class UIConfigUpdate(BaseModel):
    preferred_language: Optional[str] = None
    default_gemini_task: Optional[str] = None


class ConfigUpdate(BaseModel):
    gemini: Optional[GeminiConfigUpdate] = None
    bundestag: Optional[BundestagConfigUpdate] = None
    ui: Optional[UIConfigUpdate] = None


class GeminiTaskRequest(BaseModel):
    text: str = Field(..., description="Textinhalt, der von Gemini verarbeitet werden soll")
    task: str = Field(..., description="Aktion, die Gemini ausführen soll")
    options: Dict[str, Any] = Field(default_factory=dict)


class DatasetRequest(BaseModel):
    dataset: str = Field(..., description="Zieldatensatz der Bundestags-API, z. B. vorgang oder drucksache")
    params: Dict[str, Any] = Field(default_factory=dict)
