import importlib.util
from pathlib import Path
import sys
import types
from unittest.mock import Mock

import numpy as np
import pytest


@pytest.fixture
def manager(monkeypatch):
    for name in ("torch", "whisper", "pyannote", "pyannote.audio", "pyannote.core"):
        monkeypatch.setitem(sys.modules, name, types.ModuleType(name))
    sys.modules["pyannote.audio"].Pipeline = Mock
    sys.modules["pyannote.core"].Annotation = Mock
    path = Path(__file__).parents[1] / "shoutout_worker/transcription.py"
    spec = importlib.util.spec_from_file_location("isolated_transcription", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    manager = object.__new__(module.TranscriptionManager)
    manager._device = types.SimpleNamespace(type="cpu")
    manager._whisper = Mock()
    manager._whisper.transcribe.return_value = {"text": "speech"}
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
        "segments": [{"text": " Hallo, wie geht es?"}],
    }
    (tmp_path / "audio_diarized.rttm").write_text(
        "SPEAKER audio 1 1.000 5.000 <NA> <NA> A <NA> <NA>\n"
    )
    _, segments, _ = manager.transcribe(tmp_path, "audio.m4a", "DE", "large")
    kwargs = manager._whisper.transcribe.call_args.kwargs
    assert kwargs["language"] == "de"
    assert kwargs["condition_on_previous_text"] is False
    assert max(kwargs["temperature"]) <= 0.6
    assert kwargs["hallucination_silence_threshold"] == 2.0
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
