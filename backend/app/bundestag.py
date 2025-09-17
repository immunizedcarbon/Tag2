from __future__ import annotations

from typing import Any, Dict

import httpx

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
