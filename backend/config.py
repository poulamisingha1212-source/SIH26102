import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_env_file(path: Path) -> None:
    """Minimal .env loader — KEY=VALUE lines, no new dependency.
    Existing process env vars always win (setdefault)."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


_load_env_file(BASE_DIR / ".env")


def _cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS")
    if not configured:
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    return [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]


def _clean_db_name(val: str | None) -> str:
    if not val:
        return "mplads_sentinel"
    # Strip spaces, single/double quotes, and trailing/leading invalid chars
    cleaned = val.strip().strip('"').strip("'").replace(" ", "")
    # Remove any character not allowed in Mongo database names: /\. "$*<>:|?
    for char in ['/', '\\', '.', ' ', '"', '$', '*', '<', '>', ':', '|', '?']:
        cleaned = cleaned.replace(char, '')
    return cleaned if cleaned else "mplads_sentinel"


class Settings:
    PROJECT_NAME: str = "MPLADS AI Sentinel"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").strip().lower()

    # MongoDB: the only persistence layer
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017" if os.getenv("ENVIRONMENT", "development").strip().lower() in ("development", "test") else "").strip().strip('"').strip("'")
    MONGO_DB_NAME: str = _clean_db_name(os.getenv("MONGO_DB_NAME"))

    DATA_DIR: Path = BASE_DIR / "data"
    MODEL_DIR: Path = BASE_DIR / "model"
    # Bundled long-format sample feed, used only by tests / offline replays
    RAW_SAMPLE_PATH: Path = BASE_DIR / "data" / "mplads_raw_sample.csv"

    # Security & Authentication
    JWT_SECRET: str = os.getenv("JWT_SECRET", "mplads-sentinel-jwt-secret-key-32-chars-min!" if os.getenv("ENVIRONMENT", "development").strip().lower() in ("development", "test") else "").strip()
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Demo admin credentials (only used to seed initial account in development)
    DEMO_ADMIN_USER: str = os.getenv("DEMO_ADMIN_USER", "admin").strip()
    DEMO_ADMIN_PASSWORD: str = os.getenv("DEMO_ADMIN_PASSWORD", "Admin@MPLADS2026!" if os.getenv("ENVIRONMENT", "development").strip().lower() in ("development", "test") else "").strip()

    # Rate limiting & bounds
    RATE_LIMIT_LOGIN_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_LOGIN_PER_MINUTE", "5"))
    RATE_LIMIT_PUBLIC_REVIEW_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PUBLIC_REVIEW_PER_MINUTE", "10"))
    MAX_EXPORT_ROWS: int = int(os.getenv("MAX_EXPORT_ROWS", "10000"))

    # Serverless platforms freeze the process between requests, so the
    # in-process scheduler and the startup live-sync thread must not run.
    IS_SERVERLESS: bool = os.getenv("VERCEL") == "1" or os.getenv("IS_SERVERLESS") == "1"

    # Auto-seed on startup: disabled by default in production. Only enabled if explicitly requested or in dev.
    AUTO_SEED: bool = os.getenv("AUTO_SEED", "1" if os.getenv("ENVIRONMENT", "development").strip().lower() in ("development", "test") else "0").lower() in {"1", "true", "yes"}

    # Ingest bundled sample CSV: disabled in production by default
    SEED_FROM_SAMPLE: bool = os.getenv("SEED_FROM_SAMPLE", "1" if os.getenv("ENVIRONMENT", "development").strip().lower() in ("development", "test") else "0").lower() in {"1", "true", "yes"}

    # Vercel Cron authenticates with `Authorization: Bearer $CRON_SECRET`
    # (the env var of this exact name). Also accepted as X-Cron-Secret.
    CRON_SECRET: str = os.getenv("CRON_SECRET", "")
    
    CORS_ORIGINS: list[str] = _cors_origins()
    
    # Live MPLADS dashboard API (mplads.mospi.gov.in /digigov) — the only
    # ingestion source. Houses: rajya_sabha | lok_sabha | lok_sabha_17 |
    # lok_sabha_18 | both. rajya_sabha keeps scheduled syncs fast; "both"
    # pulls the ~90 MB Lok Sabha payloads.
    MPLADS_BASE_URL: str = os.getenv("MPLADS_BASE_URL", "https://mplads.mospi.gov.in")
    MPLADS_LIVE_HOUSE: str = os.getenv("MPLADS_LIVE_HOUSE", "rajya_sabha,lok_sabha_18")
    MPLADS_LIVE_TIMEOUT: int = int(os.getenv("MPLADS_LIVE_TIMEOUT", "300"))

    def __init__(self):
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").strip().lower()
        self.MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017" if self.ENVIRONMENT in ("development", "test") else "").strip().strip('"').strip("'")
        self.MONGO_DB_NAME: str = _clean_db_name(os.getenv("MONGO_DB_NAME"))
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", "mplads-sentinel-jwt-secret-key-32-chars-min!" if self.ENVIRONMENT in ("development", "test") else "").strip()
        self.DEMO_ADMIN_USER: str = os.getenv("DEMO_ADMIN_USER", "admin").strip()
        self.DEMO_ADMIN_PASSWORD: str = os.getenv("DEMO_ADMIN_PASSWORD", "Admin@MPLADS2026!" if self.ENVIRONMENT in ("development", "test") else "").strip()
        self.AUTO_SEED: bool = os.getenv("AUTO_SEED", "1" if self.ENVIRONMENT in ("development", "test") else "0").lower() in {"1", "true", "yes"}
        self.SEED_FROM_SAMPLE: bool = os.getenv("SEED_FROM_SAMPLE", "1" if self.ENVIRONMENT in ("development", "test") else "0").lower() in {"1", "true", "yes"}
        self.CRON_SECRET: str = os.getenv("CRON_SECRET", "")
        self.CORS_ORIGINS: list[str] = _cors_origins()
        self.validate()

    def validate(self):
        """Fail fast in production if required secrets or database URIs are missing or using dev defaults."""
        if self.ENVIRONMENT == "production":
            dev_default_jwt = "mplads-sentinel-jwt-secret-key-32-chars-min!"
            if not self.JWT_SECRET or self.JWT_SECRET == dev_default_jwt:
                raise ValueError(
                    "CRITICAL SECURITY ERROR: In production (ENVIRONMENT=production), JWT_SECRET "
                    "must be explicitly set to a unique, cryptographically strong secret."
                )
            if not self.MONGODB_URI or self.MONGODB_URI.startswith("mongodb://localhost") or self.MONGODB_URI.startswith("mongodb://127.0.0.1"):
                raise ValueError(
                    "CRITICAL CONFIGURATION ERROR: In production (ENVIRONMENT=production), MONGODB_URI "
                    "must be explicitly set to a production database (e.g. MongoDB Atlas cluster), not localhost."
                )
            dev_default_pwd = "Admin@MPLADS2026!"
            if self.DEMO_ADMIN_PASSWORD == dev_default_pwd:
                raise ValueError(
                    "CRITICAL SECURITY ERROR: In production (ENVIRONMENT=production), default "
                    "DEMO_ADMIN_PASSWORD is not allowed. Provide a secure unique password or unset DEMO_ADMIN_PASSWORD."
                )


settings = Settings()

