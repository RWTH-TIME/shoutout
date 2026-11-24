# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Service accounts** — `SHOUTOUT_SERVICE_ACCOUNTS_FILE` provisions long-lived `so_svc_` API keys that are not tied to a person. Jobs can send `X-Shoutout-On-Behalf-Of`, and `GET /api/v1/usage` reports audio seconds per service account and person.
- **Browser meeting recorder** — capture tab, window, or entire-screen audio plus your microphone from the PWA, create a live `RECORDING` job, upload chunks continuously, then queue transcription on stop
- **Installable PWA** — web app manifest, icons, and a minimal service worker with IndexedDB buffering for crash/offline recovery of unfinished recordings
- **Recording Playwright e2e suite** — lifecycle, source variants, recovery, error handling, and API contract tests under `dashboard/e2e`

### Fixed

- **False “interrupted” recovery dialog** while a recording is still live in the same or another tab (Web Lock ownership + single RecoveryPrompt under the recording provider)
- **Stop & transcribe hanging forever** when `/recording/chunks` returned a permanent error (typed non-retryable upload errors and bounded drain)
- **400 Bad Request on `/recording/chunks`** mapped permanent “not recording” to **409** with `JOB_NOT_RECORDING`; validation errors stay 400; finish is idempotent when already queued
- **Window / screen share without system audio** falls back to microphone instead of failing hard

## [2.0.0] - 2026-10-29

### Added

- 📊 **Speaker statistics** — at-a-glance stats for each speaker
- 🏷️ **Speaker labeling** — name speakers directly instead of “Speaker 1, 2, 3”
- 🔗 **Sharing modes** — keep jobs private, share with signed-in users, or make them public
- ✨ **Better UI/UX** — clearer layout and smoother day-to-day use
- 🤖 **API + MCP tool** — connect shoutout directly to AI assistants
- 📧 **Email notifications** — get notified when your results are ready
- 📄 **Ready PDF export** — formatted PDFs ready to share
- 📁 **Optimized multi-file upload** — upload several files more easily and reliably
- ⚡ **Better performance & speaker diarization** — faster runs and more accurate speaker detection

### Was ist neu? (DE)

- 📊 **Speaker Statistics** – Statistiken zu den einzelnen Sprecherinnen auf einen Blick
- 🏷️ **Speaker Labeling** – Sprecherinnen direkt benennen statt „Speaker 1, 2, 3“
- 🔗 **Sharing-Modi** – Jobs privat halten, mit angemeldeten Nutzerinnen teilen oder öffentlich machen
- ✨ **Besseres UI/UX** – übersichtlicher und angenehmer in der Bedienung
- 🤖 **API + MCP-Tool** – Shoutout lässt sich jetzt direkt an KI-Assistenten anbinden
- 📧 **E-Mail-Benachrichtigung** – ihr bekommt Bescheid, sobald eure Ergebnisse fertig sind
- 📄 **Ready-PDF-Export** – fertig formatierte PDFs zum direkten Weitergeben
- 📁 **Optimierter Multi-File-Upload** – mehrere Dateien einfacher und zuverlässiger hochladen
- ⚡ **Bessere Performance & Speaker Diarization** – schneller und deutlich genauer bei der Sprechererkennung

[2.0.0]: https://github.com/RWTH-TIME/shoutout/releases/tag/v2.0.0
