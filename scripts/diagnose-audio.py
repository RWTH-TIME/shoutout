"""Local phase profiling; does not contact the dashboard or send notifications.

Run with PYTHONPATH=worker and the worker requirements installed:
  python scripts/diagnose-audio.py ../testfile.m4a --token-file ../huggingface.token
Add --transcribe --model large to include Whisper. Results stay in .cache/diagnosis.
"""
import argparse
import importlib.metadata
import json
import logging
import os
from pathlib import Path
import shutil
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("audio", type=Path)
parser.add_argument("--token-file", type=Path)
parser.add_argument("--output", type=Path, default=Path(".cache/diagnosis"))
parser.add_argument("--participants", type=int, default=0)
parser.add_argument("--transcribe", action="store_true")
parser.add_argument("--model", default="large")
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("HF_HOME", str(args.output.resolve() / "hf"))
os.environ.setdefault("MPLCONFIGDIR", str(args.output.resolve() / "matplotlib"))
os.environ.setdefault("PYANNOTE_METRICS_ENABLED", "0")
if args.token_file:
    os.environ["HUGGINGFACE_TOKEN"] = args.token_file.read_text(encoding="utf-8-sig").strip()

import pandas as pd
from shoutout_worker.transcription import TranscriptionManager
from shoutout_worker.diarization_postprocess import remove_overlaps, aggregate_section, create_section_table

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
started = time.perf_counter()
manager = TranscriptionManager()
if not manager.diarization_available:
    raise SystemExit("Diarization model unavailable; refusing a misleading single-speaker benchmark.")
stats = {
    "model_load_seconds": time.perf_counter() - started,
    "device": str(manager._device),
    "torch_version": importlib.metadata.version("torch"),
    "pyannote_version": importlib.metadata.version("pyannote.audio"),
}
source = args.output / args.audio.name
if not source.exists():
    shutil.copyfile(args.audio, source)
started = time.perf_counter()
rttm = manager.diarize(args.output, source.name, args.participants)
stats["decode_and_diarize_seconds"] = time.perf_counter() - started
names = ["Object", "Filename", "Number", "Start", "Duration", "NA", "NA1", "Speaker", "NA2", "NA3"]
df = pd.read_csv(rttm, sep=r"\s+", header=None, names=names)
df["End"] = df.Start + df.Duration
started = time.perf_counter()
cleaned = remove_overlaps(df[df.Duration > 0.8])
sections = create_section_table(aggregate_section(cleaned[cleaned.Duration > 0.8]))
stats.update(
    postprocess_seconds=time.perf_counter()-started,
    turns=len(df),
    sections=len(sections),
    section_audio_seconds=float((sections.End - sections.Start).sum()),
)
sections.to_csv(args.output / "sections.csv", index=False)
if args.transcribe:
    started = time.perf_counter()
    _, segments, duration = manager.transcribe(args.output, source.name, None, args.model)
    stats.update(transcription_seconds=time.perf_counter()-started, duration_seconds=duration, segments=len(segments))
(args.output / "timings.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
print(json.dumps(stats, indent=2))
