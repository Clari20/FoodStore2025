"""
Modelo SQLModel para Usuario.

Dominio 1: Identidad & Acceso.
Campos según UML: nombre, apellido, email, celular, password_hash.
El rol se maneja via tabla pivot UsuarioRol (many-to-many).
"""

from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.modules.usuarios.rol_model import UsuarioRol
    from app.modules.usuarios.direccion_model import DireccionEntrega
    from app.modules.usuarios.refresh_token_model import RefreshToken


class Usuario(SQLModel, table=True):
    """Entidad Usuario con soft-delete."""
    __tablename__ = "usuarios"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=60)
    apellido: str = Field(default="", max_length=60)
    email: str = Field(max_length=254, unique=True)
    celular: str = Field(default="", max_length=20)
    password_hash: str = Field(max_length=60)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    deleted_at: Optional[datetime] = Field(default=None)

    # ─── Relationships ────────────────────────────────────────────────────────
    roles: List["UsuarioRol"] = Relationship(
        back_populates="usuario",
        sa_relationship_kwargs={"foreign_keys": "[UsuarioRol.usuario_id]"}
    )
    direcciones: List["DireccionEntrega"] = Relationship(back_populates="usuario")
    refresh_tokens: List["RefreshToken"] = Relationship(back_populates="usuario")
