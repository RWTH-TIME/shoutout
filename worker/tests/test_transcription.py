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


def test_existing_chunk_selection_is_preserved(manager, tmp_path):
    (tmp_path / "audio_diarized.rttm").write_text(
        "SPEAKER audio 1 10.000 0.300 <NA> <NA> A <NA> <NA>\n"
        "SPEAKER audio 1 20.000 1.000 <NA> <NA> B <NA> <NA>\n"
    )
    output, segments, duration = manager.transcribe(tmp_path, "audio.m4a", "de", "large")
    assert len(segments) == 1
    assert [s["start"] for s in segments] == [0]
    chunks = [call.args[0] for call in manager._whisper.transcribe.call_args_list]
    assert len(chunks[0]) == int(21.1 * 16000)
    assert duration == 30
    assert output.exists()


def test_empty_diarization_does_not_call_whisper(manager, tmp_path):
    (tmp_path / "audio_diarized.rttm").write_text("")
    output, segments, _ = manager.transcribe(tmp_path, "audio.m4a", None, "large")
    assert not segments
    assert output.read_text() == ""
    manager._whisper.transcribe.assert_not_called()


def test_diarization_progress_hook_and_rttm_output(manager, tmp_path):
    sys.modules["torch"].from_numpy = lambda _: types.SimpleNamespace(unsqueeze=lambda _: "waveform")
    manager._ensure_wav = lambda *_: tmp_path / "audio.wav"
    annotation = Mock()
    annotation.labels.return_value = ["A"]
    annotation.write_rttm.side_effect = lambda handle: handle.write("RTTM\n")
    manager._select_annotation = lambda output: output

    def pipeline(audio, *, num_speakers, hook):
        assert num_speakers == 2
        assert audio["sample_rate"] == 16000
        hook("segmentation", None, total=10, completed=0, file=audio)
        hook("segmentation", None, total=10, completed=10, file=audio)
        hook("embeddings", None, file=audio)
        return annotation

    manager._diarization = pipeline
    result = manager.diarize(tmp_path, "audio.m4a", 2)
    assert result.read_text() == "RTTM\n"
