from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_PROMPTS: dict[str, str] = {
    "de": "Hallo, schön, dass Sie da sind. Wir beginnen jetzt mit dem Interview.",
    "en": "Hello, thanks for joining. Let's start with the interview.",
}


class Settings(BaseSettings):
    DASHBOARD_URL: str = "http://localhost:3000"
    WORKER_ENROLLMENT_TOKEN: str = "dev-worker-enrollment-token"
    WORKER_TOKEN: str = ""
    WORKER_NAME: str = "shoutout-worker"
    WHISPER_MODELS: str = "tiny"
    HUGGINGFACE_TOKEN: str = ""
    HF_HOME: str = "/var/cache/shoutout-worker"
    DIARIZATION_MODEL: str = "pyannote/speaker-diarization-community-1"
    CONCURRENCY: int = 1
    HEARTBEAT_INTERVAL_SECONDS: int = 20
    CLAIM_TIMEOUT_SECONDS: int = 25
    LOG_LEVEL: str = "INFO"
    FINISHED_FILE_FORMAT: str = ".txt"
    ZIP_NOT_DEFINED_USER_INPUT: str = "auto"
    # Whisper decoding. The library defaults (condition_on_previous_text=True,
    # temperature fallback up to 1.0, no silence guard) are prone to hallucinations,
    # repetition loops and unpunctuated lowercase output, especially with large-v3.
    WHISPER_CONDITION_ON_PREVIOUS_TEXT: bool = False
    WHISPER_TEMPERATURES: str = "0.0,0.2,0.4,0.6"
    WHISPER_HALLUCINATION_SILENCE_THRESHOLD: float = 2.0
    # Optional prompt override; empty uses a short, well punctuated prompt per language
    # so Whisper keeps punctuation and capitalisation. Set to "none" to disable.
    WHISPER_INITIAL_PROMPT: str = ""

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @property
    def temperatures(self) -> tuple[float, ...]:
        values = [float(item) for item in self.WHISPER_TEMPERATURES.split(",") if item.strip()]
        return tuple(values) or (0.0,)

    def initial_prompt(self, language: str | None) -> str | None:
        configured = self.WHISPER_INITIAL_PROMPT.strip()
        if configured.lower() == "none":
            return None
        if configured:
            return configured
        return DEFAULT_PROMPTS.get(language or "")

    @property
    def models(self) -> list[str]:
        return [item.strip() for item in self.WHISPER_MODELS.split(",") if item.strip()]


ConfigEntry = Settings(_env_file=".env", _env_file_encoding="utf-8")
