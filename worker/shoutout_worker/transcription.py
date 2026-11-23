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

SAMPLE_RATE = 16000
MAX_CHUNK_SECONDS = 30.0
MIN_UNCOVERED_GAP = 1.5
CHUNK_PAD_SECONDS = 0.2
PROMPT_TAIL_CHARS = 200


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
        started = time.perf_counter()
        output = self._diarization(
            {"waveform": waveform, "sample_rate": 16000, "uri": wav_path.stem},
            num_speakers=num_speakers,
        )
        annotation: Annotation = self._select_annotation(output)
        logging.info(
            "%s: diarization found %d speaker(s) in %.2fs",
            filename,
            len(annotation.labels()),
            time.perf_counter() - started,
        )
        with rttm_path.open("w", encoding="utf-8") as handle:
            annotation.write_rttm(handle)
        return rttm_path

    def _detect_language(self, audio: np.ndarray, sections: pd.DataFrame) -> str | None:
        """Detect the language once per file instead of once per speaker section.

        Whisper's per-call auto detection only looks at the first 30 s of each chunk, so
        short or silence-led sections regularly get a wrong language and come out as
        gibberish or as a translation.
        """
        assert self._whisper is not None
        window = 30 * SAMPLE_RATE
        longest = sections.assign(Length=sections.End - sections.Start).sort_values(
            "Length", ascending=False
        )
        scores: dict[str, float] = {}
        for row in longest.head(5).itertuples(index=False):
            start_idx = int(row.Start * SAMPLE_RATE)
            chunk = audio[start_idx : start_idx + window]
            if len(chunk) < SAMPLE_RATE:
                continue
            mel = whisper.log_mel_spectrogram(
                whisper.pad_or_trim(chunk), self._whisper.dims.n_mels
            ).to(self._whisper.device)
            _, probs = self._whisper.detect_language(mel)
            for code, prob in probs.items():
                scores[code] = scores.get(code, 0.0) + float(prob)
        if not scores:
            return None
        detected = max(scores, key=lambda code: scores[code])
        logging.info("Detected language %s for whole file", detected)
        return detected

    def _transcribe_chunk(
        self,
        chunk: np.ndarray,
        language: str | None,
        *,
        initial_prompt: str | None = None,
        disable_hallucination_guard: bool = False,
    ) -> tuple[str, list[dict]]:
        assert self._whisper is not None
        prompt = (
            initial_prompt
            if initial_prompt is not None
            else ConfigEntry.initial_prompt(language)
        )
        if disable_hallucination_guard:
            hall_threshold: float | None = None
        else:
            hall_threshold = ConfigEntry.WHISPER_HALLUCINATION_SILENCE_THRESHOLD or None
        result = self._whisper.transcribe(
            chunk,
            language=language,
            condition_on_previous_text=ConfigEntry.WHISPER_CONDITION_ON_PREVIOUS_TEXT,
            temperature=ConfigEntry.temperatures,
            compression_ratio_threshold=2.4,
            logprob_threshold=-1.0,
            no_speech_threshold=0.6,
            initial_prompt=prompt,
            word_timestamps=True,
            hallucination_silence_threshold=hall_threshold,
            fp16=self._device.type == "cuda",
        )
        raw_segments = list(result.get("segments") or [])
        if raw_segments:
            return join_segments(raw_segments), raw_segments
        return str(result.get("text", "")).strip(), []

    def _slice_audio(
        self, audio: np.ndarray, start: float, end: float
    ) -> tuple[np.ndarray, float]:
        audio_start = max(start - CHUNK_PAD_SECONDS, 0.0)
        audio_end = end + CHUNK_PAD_SECONDS
        start_idx = int(audio_start * SAMPLE_RATE)
        end_idx = int(audio_end * SAMPLE_RATE)
        return audio[start_idx:end_idx], audio_start

    def _transcribe_section(
        self,
        audio: np.ndarray,
        language: str | None,
        section_start: float,
        section_end: float,
        turns: list[tuple[float, float]],
    ) -> str:
        speech_turns = turns or [(section_start, section_end)]
        sub_spans = split_spans(speech_turns, MAX_CHUNK_SECONDS)
        pieces: list[tuple[float, str]] = []
        covered: list[tuple[float, float]] = []
        previous_text = ""

        for span_start, span_end in sub_spans:
            chunk, audio_start = self._slice_audio(audio, span_start, span_end)
            if not len(chunk):
                continue
            prompt = prompt_tail(previous_text) or ConfigEntry.initial_prompt(language)
            text, raw_segments = self._transcribe_chunk(
                chunk, language, initial_prompt=prompt
            )
            if text:
                pieces.append((span_start, text))
                previous_text = text
            span_coverage = coverage_from_segments(raw_segments, audio_start)
            if text and not span_coverage:
                span_coverage = [(span_start, span_end)]
            covered.extend(span_coverage)

        uncovered = find_uncovered_spans(speech_turns, covered, MIN_UNCOVERED_GAP)
        if uncovered:
            logging.info(
                "Recovering %d uncovered span(s) totaling %.1fs of diarized speech",
                len(uncovered),
                sum(end - start for start, end in uncovered),
            )
        for gap_start, gap_end in uncovered:
            chunk, _audio_start = self._slice_audio(audio, gap_start, gap_end)
            if not len(chunk):
                continue
            prompt = prompt_tail(previous_text) or ConfigEntry.initial_prompt(language)
            text, _raw = self._transcribe_chunk(
                chunk,
                language,
                initial_prompt=prompt,
                disable_hallucination_guard=True,
            )
            if text:
                pieces.append((gap_start, text))
                previous_text = text

        pieces.sort(key=lambda item: item[0])
        return " ".join(text for _start, text in pieces if text).strip()

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
        started = time.perf_counter()
        filtered = df[df.Duration > 0.8].copy()
        cleaned = remove_overlaps(filtered)
        turn_rows = cleaned[cleaned.Duration > 0.8]
        sections = create_section_table(aggregate_section(turn_rows))
        logging.info("%s: postprocessing %d turns into %d sections took %.3fs",
                     filename, len(df), len(sections), time.perf_counter() - started)
        audio = self._load_audio(wav_path)
        duration_seconds = float(len(audio)) / float(SAMPLE_RATE)

        language = (language or "").strip().lower() or None
        if language is None:
            language = self._detect_language(audio, sections)

        parts: list[str] = []
        segments: list[dict] = []
        started = time.perf_counter()
        for index, row in enumerate(sections.itertuples(index=False), 1):
            turns = turns_overlapping(
                turn_rows, float(row.Start), float(row.End), str(row.Speaker)
            )
            text = self._transcribe_section(
                audio, language, float(row.Start), float(row.End), turns
            )
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
            if index % 25 == 0 or index == len(sections):
                logging.info("%s: transcribed %d/%d sections in %.2fs",
                             filename, index, len(sections), time.perf_counter() - started)

        output = workdir / f"{stem}{ConfigEntry.FINISHED_FILE_FORMAT}"
        output.write_text("".join(parts), encoding="utf-8")

        if self._device.type == "cuda":
            torch.cuda.empty_cache()
        return output, segments, duration_seconds


def join_segments(segments: list[dict]) -> str:
    """Join Whisper segments, dropping obvious hallucinations.

    Removes segments Whisper itself flags as non-speech and collapses repetition
    loops ("And that's what we do. And that's what we do. ...").
    """
    texts: list[str] = []
    for segment in segments:
        text = str(segment.get("text", "")).strip()
        if not text:
            continue
        if (
            float(segment.get("no_speech_prob", 0.0)) > 0.6
            and float(segment.get("avg_logprob", 0.0)) < -1.0
        ):
            continue
        if texts and _normalise(text) == _normalise(texts[-1]):
            continue
        texts.append(_collapse_repeats(text))
    return " ".join(texts).strip()


def prompt_tail(text: str, max_chars: int = PROMPT_TAIL_CHARS) -> str | None:
    cleaned = text.strip()
    if not cleaned:
        return None
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[-max_chars:].lstrip()


def turns_overlapping(
    turns: pd.DataFrame,
    section_start: float,
    section_end: float,
    speaker: str,
) -> list[tuple[float, float]]:
    spans: list[tuple[float, float]] = []
    for row in turns.itertuples(index=False):
        if str(row.Speaker) != speaker:
            continue
        if float(row.End) <= section_start or float(row.Start) >= section_end:
            continue
        spans.append(
            (
                max(float(row.Start), section_start),
                min(float(row.End), section_end),
            )
        )
    return spans


def split_spans(
    spans: list[tuple[float, float]], max_seconds: float
) -> list[tuple[float, float]]:
    pieces: list[tuple[float, float]] = []
    for start, end in spans:
        cursor = start
        while end - cursor > max_seconds:
            pieces.append((cursor, cursor + max_seconds))
            cursor += max_seconds
        if end > cursor:
            pieces.append((cursor, end))
    return pieces


def coverage_from_segments(
    segments: list[dict], offset: float
) -> list[tuple[float, float]]:
    intervals: list[tuple[float, float]] = []
    for segment in segments:
        words = segment.get("words") or []
        word_intervals = [
            (offset + float(word["start"]), offset + float(word["end"]))
            for word in words
            if word.get("start") is not None and word.get("end") is not None
        ]
        if word_intervals:
            intervals.extend(word_intervals)
            continue
        if segment.get("start") is None or segment.get("end") is None:
            continue
        if not str(segment.get("text", "")).strip():
            continue
        intervals.append(
            (offset + float(segment["start"]), offset + float(segment["end"]))
        )
    return merge_intervals(intervals)


def merge_intervals(
    intervals: list[tuple[float, float]],
) -> list[tuple[float, float]]:
    if not intervals:
        return []
    ordered = sorted(intervals)
    merged: list[tuple[float, float]] = [ordered[0]]
    for start, end in ordered[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end + 0.05:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged


def find_uncovered_spans(
    turns: list[tuple[float, float]],
    covered: list[tuple[float, float]],
    min_gap: float = MIN_UNCOVERED_GAP,
) -> list[tuple[float, float]]:
    merged_covered = merge_intervals(covered)
    gaps: list[tuple[float, float]] = []
    for turn_start, turn_end in turns:
        gaps.extend(
            subtract_interval(turn_start, turn_end, merged_covered, min_gap)
        )
    return gaps


def subtract_interval(
    start: float,
    end: float,
    covered: list[tuple[float, float]],
    min_gap: float,
) -> list[tuple[float, float]]:
    gaps: list[tuple[float, float]] = []
    cursor = start
    for cov_start, cov_end in covered:
        if cov_end <= cursor:
            continue
        if cov_start >= end:
            break
        gap_end = min(cov_start, end)
        if gap_end - cursor >= min_gap:
            gaps.append((cursor, gap_end))
        cursor = max(cursor, cov_end)
        if cursor >= end:
            break
    if end - cursor >= min_gap:
        gaps.append((cursor, end))
    return gaps


def _normalise(text: str) -> str:
    return " ".join(text.lower().split()).strip(".,!?;: ")


def _collapse_repeats(text: str, max_repeats: int = 2) -> str:
    """Collapse a sentence that repeats itself more than ``max_repeats`` times in a row."""
    sentences = [part for part in _split_sentences(text) if part]
    kept: list[str] = []
    run = 0
    for sentence in sentences:
        if kept and _normalise(sentence) == _normalise(kept[-1]):
            run += 1
            if run >= max_repeats:
                continue
        else:
            run = 0
        kept.append(sentence)
    return " ".join(kept)


def _split_sentences(text: str) -> list[str]:
    parts: list[str] = []
    current = ""
    for char in text:
        current += char
        if char in ".!?":
            parts.append(current.strip())
            current = ""
    if current.strip():
        parts.append(current.strip())
    return parts
