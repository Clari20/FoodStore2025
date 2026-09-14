"""
Modelo SQLModel para DireccionEntrega.

Dominio 1: Identidad & Acceso.
Direcciones de entrega del usuario con soporte de geolocalización.
"""

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.modules.usuarios.model import Usuario


class DireccionEntrega(SQLModel, table=True):
    """Dirección de entrega de un usuario."""
    __tablename__ = "direcciones_entrega"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id")

    alias: str = Field(default="", max_length=50)
    linea1: str = Field(max_length=500)
    linea2: Optional[str] = Field(default=None, max_length=500)
    ciudad: str = Field(max_length=100)
    provincia: str = Field(default="", max_length=100)
    codigo_postal: str = Field(default="", max_length=10)
    es_principal: bool = Field(default=False)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    deleted_at: Optional[datetime] = Field(default=None)

    # ─── Relationships ────────────────────────────────────────────────────────
    usuario: Optional["Usuario"] = Relationship(back_populates="direcciones")
