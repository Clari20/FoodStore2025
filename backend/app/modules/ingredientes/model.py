"""
Modelo SQLModel para Ingrediente.

Migrado de SQLAlchemy Column() a SQLModel Field().
Mismos campos, misma tabla, sintaxis más limpia.
"""

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from decimal import Decimal

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Numeric

if TYPE_CHECKING:
    from app.modules.productos.model import UnidadMedida


class Ingrediente(SQLModel, table=True):
    """Entidad Ingrediente (Insumo) con stock, costo y soft-delete."""
    __tablename__ = "ingredientes"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = Field(default=None)
    es_alergeno: bool = Field(default=False)
    es_producto_terminado: bool = Field(default=False)
    
    # Campos UML (Insumo)
    precio_costo: Decimal = Field(
        sa_column=Column(Numeric(10, 2), nullable=False, default=0.0)
    )
    stock_actual: Decimal = Field(
        sa_column=Column(Numeric(10, 3), nullable=False, default=0.0)
    )
    stock_minimo: Decimal = Field(
        sa_column=Column(Numeric(10, 3), nullable=False, default=0.0)
    )
    
    # Relación con Unidad de Medida
    unidad_medida_id: Optional[int] = Field(default=None, foreign_key="unidades_medida.id")

    # Auditoría
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    active_at: Optional[datetime] = Field(default=None)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relaciones
    unidad_medida: Optional["UnidadMedida"] = Relationship()

