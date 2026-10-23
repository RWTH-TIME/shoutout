from __future__ import annotations

import logging
import signal
import tempfile
import threading
import traceback
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import torch

from shoutout_worker.api_client import DashboardClient
from shoutout_worker.config import ConfigEntry
from shoutout_worker.storage import (
    download_input,
    pack_results,
    upload_bytes,
    upload_result,
    write_transcript_json,
)
from shoutout_worker.transcription import TranscriptionManager


class WorkerRuntime:
    def __init__(self) -> None:
        self.client = DashboardClient()
        self.transcription = TranscriptionManager()
        self._stop = threading.Event()
        self._current_job_id: int | None = None
        self._lock = threading.Lock()

    def info(self) -> dict:
        return {
            "cuda": torch.cuda.is_available(),
            "device": str(self.transcription._device),
            "loadedWhisper": self.transcription._whisper_model_name,
            "models": ConfigEntry.models,
        }

    def stop(self, *_args) -> None:
        logging.info("Shutdown requested")
        self._stop.set()

    def _heartbeat_loop(self, job_id: int, stop_event: threading.Event) -> None:
        while not stop_event.wait(ConfigEntry.HEARTBEAT_INTERVAL_SECONDS):
            try:
                self.client.heartbeat(job_id)
            except Exception as error:
                logging.warning("Heartbeat error: %s", error)

    def process_claim(self, claim: dict) -> None:
        job = claim["job"]
        job_id = int(job["id"])
        job_name = str(job["name"])
        model = str(job["model"])
        files = claim.get("files") or []
        zip_upload_url = claim["zipUploadUrl"]

        with self._lock:
            self._current_job_id = job_id

        stop_heartbeat = threading.Event()
        heartbeat = threading.Thread(
            target=self._heartbeat_loop,
            args=(job_id, stop_heartbeat),
            daemon=True,
        )
        heartbeat.start()

        try:
            with tempfile.TemporaryDirectory(prefix=f"shoutout-{job_id}-") as tmp:
                workdir = Path(tmp)
                packed_files: list[tuple[str, str]] = []
                file_results: list[dict] = []

                for index, file_claim in enumerate(files):
                    file_id = str(file_claim["id"])
                    original_name = str(file_claim.get("originalName") or f"file-{index}")
                    participants = file_claim.get("participants") or 0
                    language = file_claim.get("language")
                    extension = Path(original_name).suffix or ".wav"
                    local_name = f"{file_id}{extension}"
                    source = workdir / local_name
                    download_input(file_claim["inputUrl"], source)

                    logging.info("%s %s diarization started", job_name, original_name)
                    self.transcription.diarize(
                        workdir,
                        local_name,
                        participants or 0,
                    )
                    logging.info("%s %s transcription started", job_name, original_name)
                    text_path, segments, duration = self.transcription.transcribe(
                        workdir,
                        local_name,
                        language,
                        model,
                    )
                    json_path = workdir / f"{Path(local_name).stem}.json"
                    write_transcript_json(json_path, segments)

                    upload_result(
                        file_claim["textUploadUrl"],
                        text_path,
                        "text/plain; charset=utf-8",
                    )
                    upload_bytes(
                        file_claim["jsonUploadUrl"],
                        json_path.read_bytes(),
                        "application/json",
                    )

                    packed_files.append((original_name, Path(local_name).stem))
                    file_results.append(
                        {
                            "id": file_id,
                            "durationSeconds": duration,
                        }
                    )

                result = pack_results(workdir, packed_files)
                upload_result(zip_upload_url, result, "application/zip")

            self.client.complete(job_id, file_results)
            logging.info("%s finished", job_name)
        except Exception as error:
            logging.error("%s failed: %s", job_name, error)
            logging.error(traceback.format_exc())
            try:
                self.client.fail(job_id, str(error))
            except Exception as fail_error:
                logging.error("Failed to report failure: %s", fail_error)
        finally:
            stop_heartbeat.set()
            heartbeat.join(timeout=2)
            with self._lock:
                self._current_job_id = None

    def run(self) -> None:
        if not ConfigEntry.WORKER_TOKEN:
            while not self._stop.is_set():
                try:
                    token = self.client.register(
                        ConfigEntry.WORKER_NAME,
                        ConfigEntry.models,
                        self.info(),
                    )
                    logging.info("Registered worker, token prefix %s...", token[:12])
                    break
                except Exception as error:
                    logging.error("Register failed: %s", error)
                    self._stop.wait(5)
            if self._stop.is_set():
                return
        else:
            logging.info("Using existing WORKER_TOKEN")

        with ThreadPoolExecutor(max_workers=ConfigEntry.CONCURRENCY) as pool:
            while not self._stop.is_set():
                try:
                    claim = self.client.claim(ConfigEntry.models, self.info())
                except Exception as error:
                    logging.error("Claim failed: %s", error)
                    self._stop.wait(5)
                    continue

                if claim is None:
                    continue
                pool.submit(self.process_claim, claim)


def main() -> None:
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=ConfigEntry.LOG_LEVEL,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    runtime = WorkerRuntime()
    signal.signal(signal.SIGTERM, runtime.stop)
    signal.signal(signal.SIGINT, runtime.stop)
    runtime.run()


if __name__ == "__main__":
    main()
