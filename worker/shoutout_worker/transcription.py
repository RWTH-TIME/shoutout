from __future__ import annotations

import logging
import subprocess
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import whisper

warnings.filterwarnings(
    "ignore",
    message=r"TensorFloat-32 \(TF32\) has been disabled",
)
warnings.filterwarnings(
    "ignore",
    message=r"std\(\): degrees of freedom is <= 0",
)
warnings.filterwarnings(
    "ignore",
    message=r"\s*torchcodec is not installed correctly",
)

from pyannote.audio import Pipeline  # noqa: E402
from pyannote.core import Annotation  # noqa: E402

from shoutout_worker.config import ConfigEntry  # noqa: E402
from shoutout_worker.diarization_postprocess import (  # noqa: E402
    aggregate_section,
    create_section_table,
    remove_overlaps,
)


class TranscriptionManager:
    def __init__(self) -> None:
        self._device: torch.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )
        self._diarization: Pipeline | None = self._load_diarization()
        self._whisper_model_name: str | None = None
        self._whisper = None

    @property
    def diarization_available(self) -> bool:
        return self._diarization is not None

    def _load_diarization(self) -> Pipeline | None:
        model: str = ConfigEntry.DIARIZATION_MODEL
        token: str | None = ConfigEntry.HUGGINGFACE_TOKEN.strip() or None
        try:
            pipeline: Pipeline | None = Pipeline.from_pretrained(model, token=token)
        except Exception:
            logging.exception(
                "Could not load %s (HUGGINGFACE_TOKEN %s); "
                "falling back to single-speaker transcripts",
                model,
                "set" if token else "unset",
            )
            return None
        if pipeline is None:
            logging.error(
                "Could not load %s; accept its conditions on Hugging Face "
                "and set HUGGINGFACE_TOKEN",
                model,
            )
            return None
        pipeline.to(self._device)
        logging.info("Loaded %s on %s", model, self._device)
        return pipeline

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

    def _ensure_wav(self, workdir: Path, filename: str) -> Path:
        source = workdir / filename
        stem = source.stem
        wav_path = workdir / f"{stem}.wav"
        if source.suffix.lower() != ".wav":
            self._to_wav_mono_16k(source, wav_path)
        elif not wav_path.exists():
            wav_path.write_bytes(source.read_bytes())
        return wav_path

    def _write_single_speaker_rttm(self, wav_path: Path, rttm_path: Path) -> None:
        duration = float(len(self._load_audio(wav_path))) / 16000.0
        line = (
            f"SPEAKER {wav_path.stem} 1 0.000 {duration:.3f} "
            f"<NA> <NA> SPEAKER_00 <NA> <NA>\n"
        )
        rttm_path.write_text(line, encoding="utf-8")

    def _select_annotation(self, output: object) -> Annotation:
        exclusive = getattr(output, "exclusive_speaker_diarization", None)
        if isinstance(exclusive, Annotation) and exclusive.labels():
            return exclusive
        return getattr(output, "speaker_diarization", output)

    def diarize(self, workdir: Path, filename: str, num_speaker: int) -> Path:
        wav_path = self._ensure_wav(workdir, filename)
        rttm_path = workdir / f"{wav_path.stem}_diarized.rttm"

        if self._diarization is None:
            logging.warning("%s: diarization pipeline unavailable, using SPEAKER_00 only", filename)
            self._write_single_speaker_rttm(wav_path, rttm_path)
            return rttm_path

        waveform: torch.Tensor = torch.from_numpy(self._load_audio(wav_path)).unsqueeze(0)
        num_speakers: int | None = int(num_speaker) if int(num_speaker) > 0 else None
        output = self._diarization(
            {"waveform": waveform, "sample_rate": 16000, "uri": wav_path.stem},
            num_speakers=num_speakers,
        )
        annotation: Annotation = self._select_annotation(output)
        logging.info(
            "%s: diarization found %d speaker(s)",
            filename,
            len(annotation.labels()),
        )
        with rttm_path.open("w", encoding="utf-8") as handle:
            annotation.write_rttm(handle)
        return rttm_path

    def transcribe(
        self,
        workdir: Path,
        filename: str,
        language: str | None,
        model_name: str,
    ) -> tuple[Path, list[dict], float]:
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
        duration_seconds = float(len(audio)) / float(sample_rate)

        parts: list[str] = []
        segments: list[dict] = []
        for row in sections.itertuples(index=False):
            start = max(row.Start - 0.2, 0.0)
            end = row.End + 0.1
            start_idx = int(start * sample_rate)
            end_idx = int(end * sample_rate)
            chunk = audio[start_idx:end_idx]
            result = self._whisper.transcribe(chunk, language=language or None)
            text = str(result["text"]).strip()
            stamp = time.strftime("%H:%M:%S", time.gmtime(row.Start))
            parts.append(f"{row.Speaker} {stamp}\n{text}\n\n")
            segments.append(
                {
                    "speaker": str(row.Speaker),
                    "start": float(row.Start),
                    "end": float(row.End),
                    "text": text,
                }
            )

        output = workdir / f"{stem}{ConfigEntry.FINISHED_FILE_FORMAT}"
        output.write_text("".join(parts), encoding="utf-8")

        if self._device.type == "cuda":
            torch.cuda.empty_cache()
        return output, segments, duration_seconds
