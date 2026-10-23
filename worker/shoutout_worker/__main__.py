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
    extract_or_copy,
    pack_results,
    upload_result,
)
from shoutout_worker.transcription import TranscriptionManager


def _extract_from_filename(filename: str) -> tuple[str, int | None, str | None]:
    name_data = filename.split(".")[0]
    data = name_data.split("_")
    while len(data) < 3:
        data.append(ConfigEntry.ZIP_NOT_DEFINED_USER_INPUT)
    participants = None if data[1] == ConfigEntry.ZIP_NOT_DEFINED_USER_INPUT else int(data[1])
    language = None if data[2] == ConfigEntry.ZIP_NOT_DEFINED_USER_INPUT else data[2]
    return filename, participants, language


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
        audio_file = str(job["audioFile"])
        participants = job.get("participants") or 0
        language = job.get("language")

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
                source = workdir / audio_file
                download_input(claim["inputUrl"], source)
                files = extract_or_copy(source, workdir)

                for filename in files:
                    file_participants = participants
                    file_language = language
                    if len(files) > 1:
                        filename, file_participants, file_language = _extract_from_filename(
                            filename
                        )
                    logging.info("%s %s diarization started", job_name, filename)
                    self.transcription.diarize(
                        workdir,
                        filename,
                        file_participants or 0,
                    )
                    logging.info("%s %s transcription started", job_name, filename)
                    self.transcription.transcribe(
                        workdir,
                        filename,
                        file_language,
                        model,
                    )

                result = pack_results(
                    workdir,
                    Path(audio_file).stem,
                    files,
                    job_name,
                )
                upload_result(claim["resultUrl"], result)

            self.client.complete(job_id)
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
            token = self.client.register(
                ConfigEntry.WORKER_NAME,
                ConfigEntry.models,
                self.info(),
            )
            logging.info("Registered worker, token prefix %s...", token[:12])
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
