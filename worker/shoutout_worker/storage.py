from __future__ import annotations

import json
import zipfile
from pathlib import Path

import httpx


def download_input(url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with httpx.stream("GET", url, timeout=None) as response:
        response.raise_for_status()
        with target.open("wb") as handle:
            for chunk in response.iter_bytes():
                handle.write(chunk)


def upload_result(url: str, source: Path, content_type: str = "application/octet-stream") -> None:
    with source.open("rb") as handle:
        response = httpx.put(
            url,
            content=handle,
            headers={"Content-Type": content_type},
            timeout=None,
        )
        response.raise_for_status()


def upload_bytes(url: str, payload: bytes, content_type: str) -> None:
    response = httpx.put(
        url,
        content=payload,
        headers={"Content-Type": content_type},
        timeout=None,
    )
    response.raise_for_status()


def write_transcript_json(path: Path, segments: list[dict]) -> None:
    path.write_text(
        json.dumps({"segments": segments}, ensure_ascii=False),
        encoding="utf-8",
    )


def pack_results(
    workdir: Path,
    files: list[tuple[str, str]],
) -> Path:
    output = workdir / "result.zip"
    with zipfile.ZipFile(output, "w") as archive:
        for original_name, stem in files:
            source = workdir / f"{stem}.txt"
            base = Path(original_name).stem or stem
            archive.write(source, f"{base}.txt")
    return output
