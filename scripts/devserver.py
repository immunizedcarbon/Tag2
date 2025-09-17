#!/usr/bin/env python3
"""Starte Backend (uvicorn) und Frontend (Vite) in einem Prozess."""

from __future__ import annotations

import asyncio
import os
import signal
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


async def _stream_output(prefix: str, stream: asyncio.StreamReader) -> None:
    while True:
        line = await stream.readline()
        if not line:
            break
        text = line.decode(errors="replace").rstrip()
        print(f"[{prefix}] {text}")


async def _create_process(command: list[str], cwd: Path, name: str) -> asyncio.subprocess.Process:
    process = await asyncio.create_subprocess_exec(
        *command,
        cwd=str(cwd),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    assert process.stdout is not None
    asyncio.create_task(_stream_output(name, process.stdout))
    return process


async def main() -> int:
    backend_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--port",
        os.environ.get("TAG2_BACKEND_PORT", "8000"),
    ]
    frontend_cmd = [
        "npm",
        "run",
        "dev",
        "--",
        "--host",
        os.environ.get("TAG2_FRONTEND_HOST", "0.0.0.0"),
        "--port",
        os.environ.get("TAG2_FRONTEND_PORT", "5173"),
    ]

    backend_process = await _create_process(backend_cmd, BACKEND_DIR, "backend")
    frontend_process = await _create_process(frontend_cmd, FRONTEND_DIR, "frontend")

    shutdown_event = asyncio.Event()

    def _request_shutdown() -> None:
        shutdown_event.set()

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _request_shutdown)
        except NotImplementedError:  # pragma: no cover - Windows fallback
            signal.signal(sig, lambda *_: _request_shutdown())

    async def wait_for_exit() -> None:
        tasks = [asyncio.create_task(proc.wait()) for proc in (backend_process, frontend_process)]
        done, pending = await asyncio.wait(
            [*tasks, asyncio.create_task(shutdown_event.wait())],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()

        shutdown_event.set()
        await asyncio.gather(*tasks, return_exceptions=True)

    await wait_for_exit()

    for process, label in ((backend_process, "backend"), (frontend_process, "frontend")):
        if process.returncode is None:
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=5)
            except asyncio.TimeoutError:
                process.kill()
        if process.returncode not in (0, None):
            print(f"[{label}] Prozess beendet sich mit Status {process.returncode}")

    backend_code = backend_process.returncode or 0
    frontend_code = frontend_process.returncode or 0
    return backend_code or frontend_code


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
    except KeyboardInterrupt:  # pragma: no cover - CLI Komfort
        exit_code = 0
    sys.exit(exit_code)
