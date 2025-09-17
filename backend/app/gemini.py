from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Any, Dict

from google import genai
from google.genai import types

from .config import load_settings


TASK_PROMPTS = {
    "summary": "Erstelle eine kurze, gut strukturierte Zusammenfassung in {language}.",
    "bullet_points": "Fasse die wichtigsten Inhalte in prägnanten Stichpunkten in {language} zusammen.",
    "key_points": "Liste die zentralen Kernaussagen, Entscheidungen und offenen Fragen in {language} auf.",
    "translation": "Übersetze den folgenden Inhalt präzise in {language}.",
}


@lru_cache
def _gemini_client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


def _prepare_prompt(task: str, text: str, options: Dict[str, Any]) -> str:
    language = options.get("language") or load_settings().ui.preferred_language
    custom_instruction = options.get("custom_instruction")
    if task == "custom" and custom_instruction:
        instruction = custom_instruction
    else:
        instruction_template = TASK_PROMPTS.get(task, TASK_PROMPTS["summary"])
        instruction = instruction_template.format(language=language)

    context_details = options.get("context")
    if context_details:
        instruction += f"\nBerücksichtige zusätzlich: {context_details}"

    length = options.get("length")
    if length:
        instruction += f"\nZiel-Länge: {length}."

    tone = options.get("tone")
    if tone:
        instruction += f"\nTonfall: {tone}."

    return f"{instruction}\n\nText:\n{text}".strip()


def _run_generate(*, task: str, text: str, options: Dict[str, Any]) -> Dict[str, Any]:
    settings = load_settings().gemini
    if not settings.api_key:
        raise RuntimeError("Es ist kein Gemini API-Key hinterlegt.")
    prompt = _prepare_prompt(task, text, options)
    config = types.GenerateContentConfig(
        system_instruction=settings.system_prompt,
        temperature=options.get("temperature", settings.temperature),
    )
    response = _gemini_client(settings.api_key).models.generate_content(
        model=settings.model,
        contents=prompt,
        config=config,
    )
    return {
        "text": response.text,
        "candidates": [cand.text for cand in response.candidates or [] if getattr(cand, "text", None)],
    }


async def generate_with_gemini(task: str, text: str, options: Dict[str, Any]) -> Dict[str, Any]:
    return await asyncio.to_thread(_run_generate, task=task, text=text, options=options)
