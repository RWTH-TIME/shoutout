from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Default ENV-Vars
    DATABASE_HOST: str = "localhost"
    DATABASE_NAME: str = "postgres"
    DATABASE_USER: str = "admin"
    DATABASE_PASSWORD: str = "admin"
    DATABASE_PORT: int = 5433

    RABBITMQ_HOST: str = "localhost"
    RABBITMQ_USER: str = "rabbit"
    RABBITMQ_PASSWORD: str = "rabbit"
    RABBITMQ_QUEUE: str = "jobs"

    MINIO_JOB_BUCKET: str = "shoutout-job-bucket"
    MINIO_SECRET_KEY: str = "shoutoutdevuser"
    MINIO_ACCESS_KEY: str = "shoutoutdevuser"
    MINIO_URL: str = "http://localhost:9000"

    TMP_FILE_DIR: str = "tmp_downloads/"
    UPLOAD_FILE_TARGET_DIR: str = "finished-files/"
    DOWNLOAD_FILE_DIR: str = "to-transcribe/"

    WHISPER_MODEL: str = "large-v3"
    FINISHED_FILE_FORMAT: str = ".txt"
    ZIP_NOT_DEFINED_USER_INPUT: str = "auto"

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        case_sensitive=True
    )


ConfigEntry = Settings(_env_file=".env", _env_file_encoding="utf-8")
