"""
Modelos del dominio Pedidos.

Entidades: EstadoPedido, FormaPago, Pedido, DetallePedido, HistorialEstadoPedido.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import Column, Numeric, SmallInteger, Text
from sqlalchemy.dialects.postgresql import ARRAY, INTEGER
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.modules.usuarios.model import Usuario
    from app.modules.usuarios.direccion_model import DireccionEntrega
    from app.modules.productos.model import Producto

class EstadoPedido(SQLModel, table=True):
    """Catálogo de estados del pedido. PK semántica (seed obligatorio)."""
    __tablename__ = "estados_pedido"
 
    codigo: str = Field(primary_key=True, max_length=20)
    descripcion: str = Field(max_length=80)
    orden: int = Field()
    es_terminal: bool = Field(default=False)

    pedidos: List["Pedido"] = Relationship(back_populates="estado")

class FormaPago(SQLModel, table=True):
    """Catálogo de formas de pago. PK semántica (seed obligatorio)."""
    __tablename__ = "formas_pago"
 
    codigo: str = Field(primary_key=True, max_length=20)
    descripcion: str = Field(max_length=80)
    habilitado: bool = Field(default=True)
 
    pedidos: List["Pedido"] = Relationship(back_populates="forma_pago")

class Pedido(SQLModel, table=True):
    """Cabecera del pedido. Snapshot monetario inmutable desde creación."""
    __tablename__ = "pedidos"
 
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id")
    direccion_id: Optional[int] = Field(default=None, foreign_key="direcciones_entrega.id")
    estado_codigo: str = Field(foreign_key="estados_pedido.codigo", max_length=20)
    forma_pago_codigo: str = Field(foreign_key="formas_pago.codigo", max_length=20)
 
    # Snapshot monetario
    subtotal: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    descuento: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False, server_default="0.00"))
    costo_envio: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False, server_default="50.00"))
    total: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
 
    notas: Optional[str] = Field(default=None, sa_column=Column(Text))
 
    # Auditoría
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = Field(default=None)
 
    # Relaciones
    estado: Optional["EstadoPedido"] = Relationship(back_populates="pedidos")
    forma_pago: Optional["FormaPago"] = Relationship(back_populates="pedidos")
    direccion: Optional["DireccionEntrega"] = Relationship()
    detalles: List["DetallePedido"] = Relationship(back_populates="pedido")
    historial: List["HistorialEstadoPedido"] = Relationship(back_populates="pedido")


class DetallePedido(SQLModel, table=True):
    """Línea de detalle inmutable (Snapshot Pattern). Sin updated_at por diseño."""
    __tablename__ = "detalles_pedido"
 
    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedidos.id")
    producto_id: int = Field(foreign_key="productos.id")
    cantidad: int = Field(sa_column=Column(SmallInteger, nullable=False))
 
    # Snapshot — valores al momento de la compra, nunca se modifican
    nombre_snapshot: str = Field(max_length=200)
    precio_snapshot: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    subtotal_snap: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
 
    # IDs de ingredientes removidos por el cliente
    personalizacion: Optional[List[int]] = Field(
        default=None,
        sa_column=Column(ARRAY(INTEGER), nullable=True)
    )
 
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pedido: Optional["Pedido"] = Relationship(back_populates="detalles")

class HistorialEstadoPedido(SQLModel, table=True):
    """Audit trail append-only de transiciones de estado. Solo INSERT, nunca UPDATE/DELETE."""
    __tablename__ = "historial_estados_pedido"
 
    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedidos.id")
    estado_desde: Optional[str] = Field(default=None, foreign_key="estados_pedido.codigo", max_length=20)
    estado_hacia: str = Field(foreign_key="estados_pedido.codigo", max_length=20)
    usuario_id: Optional[int] = Field(default=None, foreign_key="usuarios.id")
    motivo: Optional[str] = Field(default=None, sa_column=Column(Text))
 
    # Solo created_at — es append-only
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
 
    pedido: Optional["Pedido"] = Relationship(back_populates="historial")