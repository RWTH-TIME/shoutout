from __future__ import annotations

import logging
import subprocess
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import whisper
from pyannote.audio import Pipeline

from shoutout_worker.config import ConfigEntry
from shoutout_worker.diarization_postprocess import (
    aggregate_section,
    create_section_table,
    remove_overlaps,
)


class TranscriptionManager:
    def __init__(self) -> None:
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        token = ConfigEntry.HUGGINGFACE_TOKEN or None
        self._diarization = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            token=token,
        )
        if self._device.type == "cuda":
            self._diarization = self._diarization.to(self._device)
        self._whisper_model_name: str | None = None
        self._whisper = None

    def ensure_whisper(self, model_name: str) -> None:
        if self._whisper is not None and self._whisper_model_name == model_name:
            return
        logging.info("Loading whisper model %s", model_name)
        self._whisper = whisper.load_model(model_name, device=str(self._device))
        self._whisper_model_name = model_name

    def _to_wav_mono_16k(self, source: Path, target: Path) -> None:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(source),
                "-ac",
                "1",
                "-ar",
                "16000",
                str(target),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    def _load_audio(self, wav_path: Path) -> np.ndarray:
        audio = whisper.load_audio(str(wav_path))
        return audio.astype(np.float32)

    def diarize(self, workdir: Path, filename: str, num_speaker: int) -> Path:
        source = workdir / filename
        stem = source.stem
        wav_path = workdir / f"{stem}.wav"
        if source.suffix.lower() != ".wav":
            self._to_wav_mono_16k(source, wav_path)
        elif not wav_path.exists():
            wav_path.write_bytes(source.read_bytes())

        waveform = torch.from_numpy(self._load_audio(wav_path)).unsqueeze(0)
        num_speakers = int(num_speaker) if int(num_speaker) > 0 else None
        diarization = self._diarization(
            {"waveform": waveform, "sample_rate": 16000},
            num_speakers=num_speakers,
        )
        rttm_path = workdir / f"{stem}_diarized.rttm"
        with rttm_path.open("w", encoding="utf-8") as handle:
            diarization.write_rttm(handle)
        return rttm_path

    def transcribe(
        self,
        workdir: Path,
        filename: str,
        language: str | None,
        model_name: str,
    ) -> Path:
        self.ensure_whisper(model_name)
        assert self._whisper is not None

        stem = Path(filename).stem
        wav_path = workdir / f"{stem}.wav"
        rttm_path = workdir / f"{stem}_diarized.rttm"
        df = pd.read_csv(
            rttm_path,
            sep=" ",
            header=None,
            names=[
                "Object",
                "Filename",
                "Number",
                "Start",
                "Duration",
                "NA",
                "NA1",
                "Speaker",
                "NA2",
                "NA3",
            ],
        )
        df["End"] = df.Start + df.Duration
        filtered = df[df.Duration > 0.8].copy()
        cleaned = remove_overlaps(filtered)
        sections = create_section_table(aggregate_section(cleaned[cleaned.Duration > 0.8]))
        audio = self._load_audio(wav_path)
        sample_rate = 16000

        parts: list[str] = []
        for row in sections.itertuples(index=False):
            start = max(row.Start - 0.2, 0.0)
            end = row.End + 0.1
            start_idx = int(start * sample_rate)
            end_idx = int(end * sample_rate)
            chunk = audio[start_idx:end_idx]
            result = self._whisper.transcribe(chunk, language=language or None)
            stamp = time.strftime("%H:%M:%S", time.gmtime(row.Start))
            parts.append(f"{row.Speaker} {stamp}\n{result['text']}\n\n")

        output = workdir / f"{stem}{ConfigEntry.FINISHED_FILE_FORMAT}"
        output.write_text("".join(parts), encoding="utf-8")

        if self._device.type == "cuda":
            torch.cuda.empty_cache()
        return output
