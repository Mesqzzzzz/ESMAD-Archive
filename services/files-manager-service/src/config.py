from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PORT: int = 3004
    SERVICE_NAME: str = "files-manager-service"

    DATABASE_URL: str
    JWT_SECRET: str = Field(default="supersecretkey")

    S3_ENDPOINT_INTERNAL: str = Field(default="http://minio:9000")
    S3_PUBLIC_ENDPOINT: str | None = Field(default=None)

    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_BUCKET: str
    S3_REGION: str = "us-east-1"

    PRESIGNED_EXPIRES_SECONDS: int = 900

    # ✅ faltavam estes dois
    MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50MB default
    ALLOWED_CONTENT_TYPES: str = "application/pdf,application/zip,application/x-zip-compressed"

settings = Settings()
