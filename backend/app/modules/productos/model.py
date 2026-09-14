"""
Food Store — Modelos del dominio Catálogo de Productos.
Entidades: Producto, Ingrediente, ProductoCategoria, ProductoIngrediente.
Relaciones: N:N (Producto-Categoria, Producto-Ingrediente).
"""

from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from app.modules.categorias.model import Categoria  # noqa: F401

if TYPE_CHECKING:
    from app.modules.ingredientes.model import Ingrediente


# ── UnidadMedida ─────────────────────────────────────────────────────────────

class UnidadMedida(SQLModel, table=True):
    """Catálogo de unidades de medida (kg, g, L, u, etc.)."""
    __tablename__ = "unidades_medida"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=50, unique=True)
    simbolo: str = Field(max_length=10, unique=True)
    tipo: str = Field(max_length=20)
    factor_conversion: float = Field(default=1.0)
    
    # Auditoría
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Producto ─────────────────────────────────────────────────────────────────

class Producto(SQLModel, table=True):
    """Producto del catálogo. Precio DECIMAL, stock INTEGER, soft delete."""
    __tablename__ = "productos"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=1000)
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    imagenes: List[str] = Field(default=[], sa_column=Column(JSONB))
    precio_base: Decimal = Field(
        sa_column=Column(Numeric(10, 2), nullable=False),
    )
    stock_cantidad: int = Field(default=0, ge=0)
    disponible: bool = Field(default=True)
    unidad_venta_id: Optional[int] = Field(default=None, foreign_key="unidades_medida.id")
    margen_ganancia: Decimal = Field(
        sa_column=Column(Numeric(10, 2), nullable=False, default=0.0)
    )

    # Auditoría
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active_at: Optional[datetime] = Field(default=None)        # Baja: cuando se setea, el producto está "dado de baja" (reversible)
    deleted_at: Optional[datetime] = Field(default=None)       # Eliminación lógica: irreversible, invisible para el usuario

    # Relaciones
    unidad_venta: Optional["UnidadMedida"] = Relationship()
    categorias: List["ProductoCategoria"] = Relationship(
        back_populates="producto",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    ingredientes: List["ProductoIngrediente"] = Relationship(
        back_populates="producto",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )





# ── ProductoCategoria (pivot N:M) ────────────────────────────────────────────

class ProductoCategoria(SQLModel, table=True):
    """Tabla pivot entre Producto y Categoria. Relación N:N."""
    __tablename__ = "producto_categorias"

    producto_id: int = Field(foreign_key="productos.id", primary_key=True)
    categoria_id: int = Field(foreign_key="categorias.id", primary_key=True)
    es_principal: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relaciones
    producto: Optional["Producto"] = Relationship(back_populates="categorias")
    categoria: Optional["Categoria"] = Relationship()


# ── ProductoIngrediente (pivot N:M) ──────────────────────────────────────────

class ProductoIngrediente(SQLModel, table=True):
    """Tabla pivot entre Producto e Ingrediente. es_removible habilita personalización."""
    __tablename__ = "producto_ingredientes"

    producto_id: int = Field(foreign_key="productos.id", primary_key=True)
    ingrediente_id: int = Field(foreign_key="ingredientes.id", primary_key=True)
    
    cantidad: Decimal = Field(
        sa_column=Column(Numeric(10, 3), nullable=False)
    )
    unidad_medida_id: int = Field(foreign_key="unidades_medida.id")
    es_removible: bool = Field(default=False)

    # Relaciones con back_populates
    producto: Optional["Producto"] = Relationship(back_populates="ingredientes")
    ingrediente: Optional["Ingrediente"] = Relationship()
    unidad_medida: Optional["UnidadMedida"] = Relationship()
