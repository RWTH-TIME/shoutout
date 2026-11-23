import importlib.util
from pathlib import Path
import sys
import types
from unittest.mock import Mock

import numpy as np
import pytest


@pytest.fixture
def transcription_module(monkeypatch):
    for name in ("torch", "whisper", "pyannote", "pyannote.audio", "pyannote.core"):
        monkeypatch.setitem(sys.modules, name, types.ModuleType(name))
    sys.modules["pyannote.audio"].Pipeline = Mock
    sys.modules["pyannote.core"].Annotation = Mock
    path = Path(__file__).parents[1] / "shoutout_worker/transcription.py"
    spec = importlib.util.spec_from_file_location("isolated_transcription", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def manager(transcription_module):
    manager = object.__new__(transcription_module.TranscriptionManager)
    manager._device = types.SimpleNamespace(type="cpu")
    manager._whisper = Mock()
    manager._whisper.transcribe.return_value = {
        "text": "speech",
        "segments": [{"start": 0.0, "end": 5.0, "text": " speech"}],
    }
    manager.ensure_whisper = Mock()
    manager._load_audio = lambda _: np.zeros(30 * 16000, dtype=np.float32)
    return manager


def test_empty_diarization_does_not_call_whisper(manager, tmp_path):
    (tmp_path / "audio_diarized.rttm").write_text("")
    output, segments, _ = manager.transcribe(tmp_path, "audio.m4a", None, "large")
    assert not segments
    assert output.read_text() == ""
    manager._whisper.transcribe.assert_not_called()


def test_whisper_is_called_with_hallucination_guards(manager, tmp_path):
    manager._whisper.transcribe.return_value = {
        "text": "ignored",
        "segments": [{"start": 0.0, "end": 4.0, "text": " Hallo, wie geht es?"}],
    }
    (tmp_path / "audio_diarized.rttm").write_text(
        "SPEAKER audio 1 1.000 5.000 <NA> <NA> A <NA> <NA>\n"
    )
    _, segments, _ = manager.transcribe(tmp_path, "audio.m4a", "DE", "large")
    kwargs = manager._whisper.transcribe.call_args.kwargs
    assert kwargs["language"] == "de"
    assert kwargs["condition_on_previous_text"] is False
    assert max(kwargs["temperature"]) <= 0.6
    assert kwargs["hallucination_silence_threshold"] is None
    assert kwargs["word_timestamps"] is True
    assert kwargs["initial_prompt"]
    assert segments[0]["text"] == "Hallo, wie geht es?"


def test_join_segments_drops_non_speech_and_repetition_loops(manager):
    text = manager.transcribe.__globals__["join_segments"](
        [
            {"text": " And that's what we do. And that's what we do."
                     " And that's what we do. And that's what we do. Yeah."},
            {"text": " Thanks for watching!", "no_speech_prob": 0.9, "avg_logprob": -1.5},
            {"text": " Building trust."},
            {"text": " Building trust."},
        ]
    )
    assert text == "And that's what we do. And that's what we do. Yeah. Building trust."


def test_find_uncovered_spans_reports_gaps(transcription_module):
    turns = [(0.0, 20.0)]
    covered = [(0.0, 5.0), (12.0, 14.0)]
    gaps = transcription_module.find_uncovered_spans(turns, covered, min_gap=1.5)
    assert gaps == [(5.0, 12.0), (14.0, 20.0)]


def test_find_uncovered_spans_ignores_short_gaps(transcription_module):
    turns = [(0.0, 10.0)]
    covered = [(0.0, 4.5), (5.0, 10.0)]
    gaps = transcription_module.find_uncovered_spans(turns, covered, min_gap=1.5)
    assert gaps == []


def test_coverage_guard_retranscribes_uncovered_speech(manager, tmp_path):
    manager._load_audio = lambda _: np.zeros(25 * 16000, dtype=np.float32)
    calls: list[dict] = []

    def fake_transcribe(chunk, **kwargs):
        calls.append(kwargs)
        if len(calls) == 1:
            return {
                "segments": [{"start": 0.0, "end": 5.0, "text": " First part."}],
            }
        return {
            "segments": [{"start": 0.0, "end": 8.0, "text": " Recovered part."}],
        }

    manager._whisper.transcribe.side_effect = fake_transcribe
    (tmp_path / "audio_diarized.rttm").write_text(
        "SPEAKER audio 1 1.000 20.000 <NA> <NA> A <NA> <NA>\n"
    )
    _, segments, _ = manager.transcribe(tmp_path, "audio.m4a", "de", "large")
    assert len(calls) >= 2
    assert calls[-1].get("hallucination_silence_threshold") is None
    assert "First part." in segments[0]["text"]
    assert "Recovered part." in segments[0]["text"]
    assert segments[0]["text"].index("First part.") < segments[0]["text"].index(
        "Recovered part."
    )


def test_long_section_splits_and_carries_prompt(manager, tmp_path):
    manager._load_audio = lambda _: np.zeros(70 * 16000, dtype=np.float32)
    prompts: list[str | None] = []

    def fake_transcribe(chunk, **kwargs):
        prompts.append(kwargs.get("initial_prompt"))
        duration = len(chunk) / 16000.0
        return {
            "segments": [
                {
                    "start": 0.0,
                    "end": max(duration - 0.1, 0.5),
                    "text": f" Chunk{len(prompts)} text.",
                }
            ],
        }

    manager._whisper.transcribe.side_effect = fake_transcribe
    (tmp_path / "audio_diarized.rttm").write_text(
        "SPEAKER audio 1 0.000 65.000 <NA> <NA> A <NA> <NA>\n"
    )
    _, segments, _ = manager.transcribe(tmp_path, "audio.m4a", "de", "large")
    assert len(prompts) >= 3
    assert "Chunk1 text." in (prompts[1] or "")
    assert "Chunk1" in segments[0]["text"]
    assert "Chunk2" in segments[0]["text"]
