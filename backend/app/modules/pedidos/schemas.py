"""Schemas Pydantic para el modulo Pedidos"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class EstadoPedidoResponse(BaseModel):
    """Respuesta de un estado del pedido."""
    codigo: str
    descripcion: str
    orden: int
    es_terminal: bool

    model_config = {"from_attributes": True}


class FormaPagoResponse(BaseModel):
    """Respuesta de una forma de pago."""
    codigo: str
    descripcion: str
    habilitado: bool

    model_config = {"from_attributes": True}


class ItemPedidoRequest(BaseModel):
    """Un ítem del carrito que llega desde el frontend al crear un pedido."""
    producto_id: int = Field(ge=1, description="ID del producto")
    cantidad: int = Field(ge=1, description="Cantidad de unidades (mínimo 1)")
    personalizacion: Optional[List[int]] = Field(
        default=None,
        description="IDs de ingredientes a remover (solo removibles)"
    )


class DetallePedidoResponse(BaseModel):
    producto_id: int
    cantidad: int
    nombre_snapshot: str
    precio_snapshot: Decimal
    subtotal_snap: Decimal
    personalizacion: Optional[List[int]] = None
    created_at: datetime
 
    model_config = {"from_attributes": True}


class PedidoCreate(BaseModel):
    """Datos para crear un pedido desde el carrito."""
    items: List[ItemPedidoRequest] = Field(min_length=1)
    forma_pago_codigo: str = Field(max_length=20)
    direccion_id: Optional[int] = None
    notas: Optional[str] = None

class AvanzarEstadoRequest(BaseModel):
    """Datos para avanzar el estado de un pedido."""
    estado_hacia: str = Field(max_length=20)
    motivo: Optional[str] = None
 
    @model_validator(mode="after")
    def motivo_obligatorio_si_cancela(self) -> "AvanzarEstadoRequest":
        # RN-05: motivo obligatorio al cancelar
        if self.estado_hacia == "CANCELADO" and not self.motivo:
            raise ValueError("El motivo es obligatorio al cancelar un pedido")
        return self
 

class PedidoResponse(BaseModel):
    """
    Respuesta básica de un pedido (usada en listados).
    """
    id: int
    usuario_id: int
    direccion_id: Optional[int] = None
    estado_codigo: str
    forma_pago_codigo: str
    subtotal: Decimal
    descuento: Decimal
    costo_envio: Decimal
    total: Decimal
    notas: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
 
class PedidoDetail(PedidoResponse):
    """Respuesta detallada con ítems e historial completo."""
    detalles: List[DetallePedidoResponse] = []
    historial: List["HistorialEstadoResponse"] = []
    estado: Optional[EstadoPedidoResponse] = None
    forma_pago: Optional[FormaPagoResponse] = None
 
    model_config = {"from_attributes": True}
 
 
class HistorialEstadoResponse(BaseModel):
    id: int
    pedido_id: int
    estado_desde: Optional[str] = None
    estado_hacia: str
    usuario_id: Optional[int] = None
    motivo: Optional[str] = None
    created_at: datetime
 
    model_config = {"from_attributes": True}
 
 
class PaginatedPedidos(BaseModel):
    items: List[PedidoResponse]
    total: int
    page: int
    per_page: int
    pages: int