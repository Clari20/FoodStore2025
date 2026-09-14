"""
Food Store — Modelos del dominio Categorías.
Entidad: Categoria
Relaciones: 1:N (Categoria self-ref)
"""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


# ── Categoria ────────────────────────────────────────────────────────────────

class Categoria(SQLModel, table=True):
    """Categoría jerárquica con FK autoreferencial (1:N self-ref)."""
    __tablename__ = "categorias"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    padre_id: Optional[int] = Field(default=None, foreign_key="categorias.id")
    imagen_url: Optional[str] = Field(default=None)

    # Auditoría
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active_at: Optional[datetime] = Field(default=None)
    deleted_at: Optional[datetime] = Field(default=None)
