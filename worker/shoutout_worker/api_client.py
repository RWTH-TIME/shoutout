from __future__ import annotations

import logging
from typing import Any

import httpx

from shoutout_worker.config import ConfigEntry


class DashboardClient:
    def __init__(self) -> None:
        self._base = ConfigEntry.DASHBOARD_URL.rstrip("/")
        self._token = ConfigEntry.WORKER_TOKEN
        self._client = httpx.Client(timeout=60.0)

    def _headers(self, token: str | None = None) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token or self._token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def register(self, name: str, models: list[str], info: dict[str, Any]) -> str:
        response = self._client.post(
            f"{self._base}/api/worker/register",
            headers=self._headers(ConfigEntry.WORKER_ENROLLMENT_TOKEN),
            json={"name": name, "models": models, "info": info},
        )
        response.raise_for_status()
        payload = response.json()
        self._token = payload["token"]
        return self._token

    def claim(self, models: list[str], info: dict[str, Any]) -> dict[str, Any] | None:
        response = self._client.post(
            f"{self._base}/api/worker/jobs/claim",
            headers=self._headers(),
            json={"models": models, "info": info},
            timeout=ConfigEntry.CLAIM_TIMEOUT_SECONDS + 5,
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("job"):
            return None
        return payload

    def heartbeat(self, job_id: int) -> None:
        response = self._client.post(
            f"{self._base}/api/worker/jobs/{job_id}/heartbeat",
            headers=self._headers(),
            json={},
        )
        if response.status_code >= 400:
            logging.warning("Heartbeat failed for job %s: %s", job_id, response.text)

    def complete(self, job_id: int) -> None:
        response = self._client.post(
            f"{self._base}/api/worker/jobs/{job_id}/complete",
            headers=self._headers(),
            json={},
        )
        response.raise_for_status()

    def fail(self, job_id: int, error: str) -> None:
        response = self._client.post(
            f"{self._base}/api/worker/jobs/{job_id}/fail",
            headers=self._headers(),
            json={"error": error},
        )
        response.raise_for_status()
