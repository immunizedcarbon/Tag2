from __future__ import annotations

from typing import Any, Dict, List, Set, Tuple

import httpx

from datetime import datetime, timedelta

from .config import load_settings


class BundestagClient:
    def __init__(self) -> None:
        settings = load_settings().bundestag
        self.base_url = settings.base_url.rstrip("/")
        self.api_key = settings.api_key

    async def _request(self, endpoint: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
        query_params: Dict[str, Any] = {"format": "json"}
        if params:
            query_params.update({k: v for k, v in params.items() if v not in (None, "")})

        headers: Dict[str, str] = {}
        if self.api_key:
            headers["Authorization"] = f"ApiKey {self.api_key}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/{endpoint.lstrip('/')}", params=query_params, headers=headers)
            response.raise_for_status()
            return response.json()

    async def list_documents(self, dataset: str, params: Dict[str, Any]) -> Dict[str, Any]:
        return await self._request(dataset, params)

    async def get_document(self, dataset: str, document_id: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
        endpoint = f"{dataset}/{document_id}"
        return await self._request(endpoint, params)


async def fetch_dataset(dataset: str, params: Dict[str, Any]) -> Dict[str, Any]:
    client = BundestagClient()
    return await client.list_documents(dataset, params)


async def fetch_document(dataset: str, document_id: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    client = BundestagClient()
    return await client.get_document(dataset, document_id, params)


_METADATA_CACHE: Tuple[datetime, Dict[str, Any]] | None = None
_METADATA_TTL = timedelta(hours=6)


async def _collect_vorgang_metadata(client: BundestagClient) -> Dict[str, Set[Any]]:
    cursor: str | None = None
    seen_cursor: str | None = None
    iterations = 0
    wahlperioden: Set[int] = set()
    vorgangstypen: Set[str] = set()
    initiativen: Set[str] = set()

    while iterations < 12:
        params: Dict[str, Any] = {}
        if cursor:
            params["cursor"] = cursor
        data = await client.list_documents("vorgang", params)
        documents = data.get("documents", [])
        for document in documents:
            wp = document.get("wahlperiode")
            if isinstance(wp, list):
                for entry in wp:
                    if isinstance(entry, int):
                        wahlperioden.add(entry)
                    elif isinstance(entry, str) and entry.isdigit():
                        wahlperioden.add(int(entry))
            elif isinstance(wp, int):
                wahlperioden.add(wp)
            elif isinstance(wp, str) and wp.isdigit():
                wahlperioden.add(int(wp))

            vt = document.get("vorgangstyp")
            if isinstance(vt, str) and vt.strip():
                vorgangstypen.add(vt.strip())

            initiative_values = document.get("initiative")
            if isinstance(initiative_values, list):
                for initiative in initiative_values:
                    if isinstance(initiative, str) and initiative.strip():
                        initiativen.add(initiative.strip())

        next_cursor = data.get("cursor")
        if not next_cursor or next_cursor == seen_cursor:
            break
        seen_cursor = cursor
        cursor = next_cursor
        iterations += 1

        if len(wahlperioden) >= 25 and len(vorgangstypen) >= 150 and len(initiativen) >= 300:
            break

    return {
        "wahlperioden": wahlperioden,
        "vorgangstypen": vorgangstypen,
        "initiativen": initiativen,
    }


async def _collect_drucksache_metadata(client: BundestagClient) -> Set[str]:
    cursor: str | None = None
    seen_cursor: str | None = None
    drucksachetypen: Set[str] = set()
    iterations = 0

    while iterations < 6:
        params: Dict[str, Any] = {}
        if cursor:
            params["cursor"] = cursor
        data = await client.list_documents("drucksache", params)
        for document in data.get("documents", []):
            typ = document.get("drucksachetyp")
            if isinstance(typ, str) and typ.strip():
                drucksachetypen.add(typ.strip())

        next_cursor = data.get("cursor")
        if not next_cursor or next_cursor == seen_cursor:
            break
        seen_cursor = cursor
        cursor = next_cursor
        iterations += 1

        if len(drucksachetypen) >= 80:
            break

    return drucksachetypen


async def fetch_metadata_options() -> Dict[str, Any]:
    global _METADATA_CACHE
    now = datetime.utcnow()
    if _METADATA_CACHE and now - _METADATA_CACHE[0] < _METADATA_TTL:
        return _METADATA_CACHE[1]

    client = BundestagClient()
    vorgang_metadata = await _collect_vorgang_metadata(client)
    drucksachetypen = await _collect_drucksache_metadata(client)

    payload: Dict[str, Any] = {
        "wahlperioden": sorted(vorgang_metadata["wahlperioden"]),
        "vorgangstypen": sorted(vorgang_metadata["vorgangstypen"]),
        "initiativen": sorted(vorgang_metadata["initiativen"]),
        "drucksachetypen": sorted(drucksachetypen),
        "dokumentarten": ["Drucksache", "Plenarprotokoll"],
        "zuordnungen": ["BT", "BR", "BV", "EK"],
    }

    _METADATA_CACHE = (now, payload)
    return payload


async def search_persons(query: str, cursor: str | None = None) -> Dict[str, Any]:
    client = BundestagClient()
    params: Dict[str, Any] = {}
    if query.strip():
        params["f.person"] = [query.strip()]
    if cursor:
        params["cursor"] = cursor

    data = await client.list_documents("person", params)
    options: List[Dict[str, Any]] = []
    for document in data.get("documents", []):
        entry = {
            "id": document.get("id"),
            "title": document.get("titel") or " ".join(
                filter(None, [document.get("vorname"), document.get("nachname")])
            ).strip(),
            "fraktion": document.get("fraktion"),
            "funktion": document.get("funktion"),
            "wahlperioden": document.get("wahlperiode", []),
        }
        options.append(entry)

    return {
        "options": options,
        "cursor": data.get("cursor"),
        "numFound": data.get("numFound"),
    }
