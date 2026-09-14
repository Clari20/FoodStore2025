"""
Modelo SQLModel para RefreshToken.

Dominio 1: Identidad & Acceso.

Almacena hash SHA-256 del refresh token (nunca el token plano).
Reglas:
  - Validación: expires_at > now() AND revoked_at IS NULL
  - Logout: revoked_at = now()
  - Limpieza periódica: DELETE WHERE expires_at < now()
"""

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.modules.usuarios.model import Usuario


class RefreshToken(SQLModel, table=True):
    """Token de refresh — se guarda el hash, NO el token plano."""
    __tablename__ = "refresh_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id")

    # SHA-256 del token — 64 caracteres hex
    token_hash: str = Field(max_length=64, unique=True)

    expires_at: datetime = Field()
    revoked_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    usuario: Optional["Usuario"] = Relationship(back_populates="refresh_tokens")
