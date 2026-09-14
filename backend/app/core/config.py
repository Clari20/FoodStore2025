"""
Configuración centralizada leída desde variables de entorno.

Adopta el patrón de referencia: variables individuales de PostgreSQL
con @computed_field para construir DATABASE_URL automáticamente.
Los valores sensibles (SECRET_KEY, POSTGRES_PASSWORD) viven en .env.
"""

from typing import Optional
from pydantic import computed_field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ─── Base de datos (PostgreSQL) ───────────────────────────────────────────
    postgres_user:     str = "postgres"
    postgres_password: str = "food_store_dev"
    postgres_db:       str = "food_store_db"
    postgres_host:     str = "localhost"
    postgres_port:     int = 5433

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        """
        Construye la URL de conexión a PostgreSQL.
        Ejemplo: postgresql://postgres:food_store_dev@localhost:5433/food_store_db
        """
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ─── JWT ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM:  str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = False

    # ─── Mercado Pago ─────────────────────────────────────────────────────────
    MP_ACCESS_TOKEN:    Optional[str] = None
    MP_PUBLIC_KEY:      Optional[str] = None
    MP_WEBHOOK_URL:     Optional[str] = None
    NGROK_URL:          Optional[str] = None
    VITE_FRONTEND_URL:  str = "http://localhost:5173"

    # ─── Cloudinary ───────────────────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY:    Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

     # ─── Logging ──────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO" 
    
    model_config = {
        "env_file":          ".env",
        "env_file_encoding": "utf-8",
        "extra":             "ignore",
    }
    
    # ─── Rate Limiting ────────────────────────────────────────────────────────
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 60
    RATE_LIMIT_DEFAULT_BURST: int = 10
    RATE_LIMIT_AUTH_PER_MINUTE: int = 5
    RATE_LIMIT_AUTH_BURST: int = 3

    @computed_field
    @property
    def rate_limit_default_burst(self) -> int:
        return self.RATE_LIMIT_DEFAULT_BURST

    @computed_field
    @property
    def rate_limit_default_per_minute(self) -> int:
        return self.RATE_LIMIT_DEFAULT_PER_MINUTE

    @computed_field
    @property
    def rate_limit_auth_burst(self) -> int:
        return self.RATE_LIMIT_AUTH_BURST

    @computed_field
    @property
    def rate_limit_auth_per_minute(self) -> int:
        return self.RATE_LIMIT_AUTH_PER_MINUTE

# Instancia global — importar desde aquí en toda la app
settings = Settings()
