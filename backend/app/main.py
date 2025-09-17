from __future__ import annotations

from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .bundestag import fetch_dataset, fetch_document
from .gemini import generate_with_gemini
from .schemas import ConfigUpdate, DatasetRequest, GeminiTaskRequest

app = FastAPI(
    title="Bundestag Explorer",
    description="Private UI zur Recherche im DIP und zur Auswertung mit Gemini",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


def _mask_key(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 6:
        return "*" * len(value)
    return f"{value[:3]}***{value[-2:]}"


def _format_config(settings: config.Settings) -> Dict[str, Any]:
    payload = settings.model_dump()
    for entry in ("gemini", "bundestag"):
        api_key = payload[entry].get("api_key")
        payload[entry]["has_api_key"] = bool(api_key)
        payload[entry]["api_key_preview"] = _mask_key(api_key)
        payload[entry]["api_key"] = None
    return payload


@app.get("/api/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
async def get_config() -> Dict[str, Any]:
    settings = config.load_settings()
    return _format_config(settings)


@app.post("/api/config")
async def update_config(payload: ConfigUpdate) -> Dict[str, Any]:
    update_data: Dict[str, Any] = {}

    if payload.gemini is not None:
        gemini_data = {k: v for k, v in payload.gemini.model_dump().items() if v is not None}
        if "api_key" in gemini_data:
            if gemini_data["api_key"] == "":
                gemini_data["api_key"] = None
        if gemini_data:
            update_data["gemini"] = gemini_data

    if payload.bundestag is not None:
        bundestag_data = {k: v for k, v in payload.bundestag.model_dump().items() if v is not None}
        if "api_key" in bundestag_data and bundestag_data["api_key"] == "":
            bundestag_data["api_key"] = None
        if bundestag_data:
            update_data["bundestag"] = bundestag_data

    if payload.ui is not None:
        ui_data = {k: v for k, v in payload.ui.model_dump().items() if v is not None}
        if ui_data:
            update_data["ui"] = ui_data

    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Änderungen übermittelt.")

    settings = config.update_settings(update_data)
    return _format_config(settings)


@app.post("/api/bundestag/search")
async def bundestag_search(request: DatasetRequest) -> Dict[str, Any]:
    try:
        return await fetch_dataset(request.dataset, request.params)
    except Exception as exc:  # pragma: no cover - Laufzeit-Feedback für UI
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/bundestag/{dataset}/{document_id}")
async def bundestag_document(dataset: str, document_id: str) -> Dict[str, Any]:
    try:
        return await fetch_document(dataset, document_id, params={})
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/gemini")
async def gemini_task(request: GeminiTaskRequest) -> Dict[str, Any]:
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Kein Text zur Verarbeitung übermittelt.")
    try:
        return await generate_with_gemini(request.task, request.text, request.options)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=str(exc)) from exc
