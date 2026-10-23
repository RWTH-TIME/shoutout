from __future__ import annotations

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


def extract_or_copy(source: Path, workdir: Path) -> list[str]:
    if source.suffix.lower() != ".zip":
        destination = workdir / source.name
        if source.resolve() != destination.resolve():
            destination.write_bytes(source.read_bytes())
        return [source.name]

    files: list[str] = []
    with zipfile.ZipFile(source, "r") as archive:
        for info in archive.infolist():
            if info.is_dir() or "/" in info.filename:
                continue
            safe_name = info.filename.replace(" ", "")
            archive.extract(info, workdir)
            extracted = workdir / info.filename
            renamed = workdir / safe_name
            if extracted != renamed:
                extracted.rename(renamed)
            files.append(safe_name)
    source.unlink(missing_ok=True)
    return files


def upload_result(url: str, source: Path) -> None:
    with source.open("rb") as handle:
        response = httpx.put(
            url,
            content=handle,
            headers={"Content-Type": "application/zip"},
            timeout=None,
        )
        response.raise_for_status()


def pack_results(workdir: Path, uuid_stem: str, files: list[str], job_name: str) -> Path:
    output = workdir / f"{uuid_stem}.zip"
    with zipfile.ZipFile(output, "w") as archive:
        for filename in files:
            stem = Path(filename).stem
            target_name = stem if len(files) > 1 else job_name
            source = workdir / f"{stem}.txt"
            archive.write(source, f"{target_name}.txt")
    return output
