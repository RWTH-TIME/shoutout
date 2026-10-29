from pydantic_settings import BaseSettings, SettingsConfigDict


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

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @property
    def models(self) -> list[str]:
        return [item.strip() for item in self.WHISPER_MODELS.split(",") if item.strip()]


ConfigEntry = Settings(_env_file=".env", _env_file_encoding="utf-8")
