"""Schemas Pydantic para Ingrediente."""
from __future__ import annotations
from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, Field

class IngredienteCreate(BaseModel):
    """Schema para crear un ingrediente."""
    nombre: Annotated[str, Field(min_length=2, max_length=100, description="Nombre del ingrediente")]
    descripcion: str | None = Field(default=None, max_length=500, description="Descripción opcional")
    es_alergeno: bool = False
    es_producto_terminado: bool = False
    precio_costo: float = 0.0
    stock_actual: float = 0.0
    stock_minimo: float = 0.0
    unidad_medida_id: int | None = None


class IngredienteUpdate(BaseModel):
    """Schema para actualizar un ingrediente."""
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    descripcion: str | None = Field(default=None, max_length=500)
    es_alergeno: bool | None = None
    es_producto_terminado: bool | None = None
    activo: bool | None = None
    precio_costo: float | None = None
    stock_actual: float | None = None
    stock_minimo: float | None = None
    unidad_medida_id: int | None = None
    actualizar_precios_productos: bool = False
    productos_a_actualizar: list[int] | None = None

class ProductoAfectadoResponse(BaseModel):
    """Schema para devolver un producto afectado por cambio de costo."""
    id: int
    nombre: str
    precio_base_actual: float
    margen_ganancia: float
    cantidad_ingrediente: float
    unidad_ingrediente: str
    model_config = {"from_attributes": True}


class UnidadMedidaSimple(BaseModel):
    id: int
    nombre: str
    simbolo: str
    tipo: str
    factor_conversion: float
    model_config = {"from_attributes": True}

class IngredienteResponse(BaseModel):
    """Schema de respuesta de ingrediente."""
    id: int
    nombre: str
    descripcion: str | None = None
    es_alergeno: bool
    es_producto_terminado: bool
    precio_costo: float
    stock_actual: float
    stock_minimo: float
    unidad_medida_id: int | None = None
    unidad_medida: UnidadMedidaSimple | None = None
    created_at: datetime
    updated_at: datetime
    active_at: datetime | None = None
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


class PaginatedIngredientes(BaseModel):
    """Respuesta paginada de ingredientes."""
    items: list[IngredienteResponse]
    total: int
    page: int
    per_page: int
    pages: int
