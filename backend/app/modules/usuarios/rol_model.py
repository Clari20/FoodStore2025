"""
Modelo SQLModel para Rol y UsuarioRol.

Dominio 1: Identidad & Acceso.

Rol: Catálogo con PK semántica (codigo = "ADMIN", "CLIENT", etc.)
UsuarioRol: Pivot many-to-many entre Usuario y Rol.
"""

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.modules.usuarios.model import Usuario


class Rol(SQLModel, table=True):
    """Catálogo de roles — PK semántica (no autoincremental)."""
    __tablename__ = "roles"

    codigo: str = Field(primary_key=True, max_length=20)
    nombre: str = Field(max_length=50, unique=True)
    descripcion: Optional[str] = Field(default=None)


class UsuarioRol(SQLModel, table=True):
    """Pivot many-to-many: un usuario puede tener múltiples roles."""
    __tablename__ = "usuario_rol"

    # PK compuesta
    usuario_id: int = Field(foreign_key="usuarios.id", primary_key=True)
    rol_codigo: str = Field(foreign_key="roles.codigo", primary_key=True, max_length=20)

    # Auditoría: quién asignó el rol
    asignado_por_id: Optional[int] = Field(default=None, foreign_key="usuarios.id")

    # Rol temporal — si es None, no expira
    expires_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    usuario: Optional["Usuario"] = Relationship(
        back_populates="roles",
        sa_relationship_kwargs={"foreign_keys": "[UsuarioRol.usuario_id]"},
    )
    rol: Optional[Rol] = Relationship()
