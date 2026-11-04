"""Exercise scheduling without model downloads, network requests or a GPU."""
import importlib
import sys
import threading
import types
from unittest.mock import Mock

import pytest


@pytest.mark.parametrize("concurrency", [1, 2, 3])
def test_worker_does_not_claim_into_an_unbounded_queue(monkeypatch, concurrency):
    transcription = types.ModuleType("shoutout_worker.transcription")
    transcription.TranscriptionManager = Mock
    monkeypatch.setitem(sys.modules, "shoutout_worker.transcription", transcription)
    monkeypatch.setitem(sys.modules, "torch", types.ModuleType("torch"))
    sys.modules.pop("shoutout_worker.__main__", None)
    module = importlib.import_module("shoutout_worker.__main__")
    monkeypatch.setattr(module.ConfigEntry, "WORKER_TOKEN", "test")
    monkeypatch.setattr(module.ConfigEntry, "CONCURRENCY", concurrency)
    runtime = module.WorkerRuntime()
    runtime.info = lambda: {}
    started, release, unexpected_claim = threading.Event(), threading.Event(), threading.Event()
    calls = []
    next_started = threading.Event()

    def claim(*args):
        calls.append(1)
        if len(calls) > concurrency:
            unexpected_claim.set()
        return {"job": {"id": len(calls)}}

    def process(claim):
        if claim["job"]["id"] > concurrency:
            next_started.set()
            runtime.stop()
            return
        if claim["job"]["id"] == concurrency:
            started.set()
        release.wait(5)

    runtime.client.claim = claim
    runtime.process_claim = process
    thread = threading.Thread(target=runtime.run)
    thread.start()
    try:
        assert started.wait(3)
        assert not unexpected_claim.wait(0.2)
        assert len(calls) == concurrency
        release.set()
        assert next_started.wait(3), "Worker did not reuse a completed slot"
    finally:
        runtime.stop()
        release.set()
        thread.join(3)
    assert not thread.is_alive()


@pytest.mark.parametrize("concurrency", [0, -1])
def test_invalid_concurrency_is_rejected(concurrency):
    from pydantic import ValidationError
    from shoutout_worker.config import Settings

    with pytest.raises(ValidationError):
        Settings(_env_file=None, CONCURRENCY=concurrency)
