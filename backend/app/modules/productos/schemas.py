"""Schemas de Productos e Ingredientes con validaciones Pydantic."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Annotated
from decimal import Decimal
from datetime import datetime





# ── Productos ────────────────────────────────────────────────────────────────
class ProductoCategoriaCreate(BaseModel):
    categoria_id: int
    es_principal: bool = False


class ProductoIngredienteCreate(BaseModel):
    ingrediente_id: int
    cantidad: Decimal = Field(gt=0)
    unidad_medida_id: int
    es_removible: bool = False


class ProductoCreate(BaseModel):
    """Schema de entrada para crear un producto con relaciones N:N."""
    nombre: Annotated[str, Field(min_length=2, max_length=200, description="Nombre del producto")]
    descripcion: Optional[str] = Field(default=None, max_length=1000)
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    imagenes: List[str] = Field(default=[], description="Lista de URLs de imágenes (1 a 3 fotos)")
    precio_base: Annotated[Decimal, Field(gt=0, description="Precio base del producto (>0)")]
    stock_cantidad: Annotated[int, Field(ge=0, description="Cantidad en stock (>=0)")] = 0
    disponible: bool = True
    activo: Optional[bool] = True
    unidad_venta_id: Optional[int] = Field(default=None, description="ID de la unidad de medida de venta")
    margen_ganancia: Decimal = Field(default=0.0, description="Margen de ganancia (ej: 1.0 para 100%)")
    categorias: List[ProductoCategoriaCreate] = Field(default=[], description="Categorías asociadas (N:N)")
    ingredientes: List[ProductoIngredienteCreate] = Field(default=[], description="Ingredientes asociados (N:N)")

    @field_validator("precio_base")
    @classmethod
    def precio_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El precio debe ser mayor a 0")
        return v

    @field_validator("stock_cantidad")
    @classmethod
    def stock_no_negativo(cls, v: int) -> int:
        if v < 0:
            raise ValueError("El stock no puede ser negativo")
        return v


class ProductoUpdate(BaseModel):
    """Schema de entrada para actualizar un producto."""
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=1000)
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    imagenes: Optional[List[str]] = None
    precio_base: Optional[Decimal] = Field(default=None, gt=0)
    stock_cantidad: Optional[int] = Field(default=None, ge=0)
    disponible: Optional[bool] = None
    activo: Optional[bool] = None
    unidad_venta_id: Optional[int] = None
    margen_ganancia: Optional[Decimal] = None
    categorias: Optional[List[ProductoCategoriaCreate]] = None
    ingredientes: Optional[List[ProductoIngredienteCreate]] = None

class ProductoStockUpdate(BaseModel):
    stock_cantidad: int = Field(ge=0)

class ProductoDisponibilidadUpdate(BaseModel):
    disponible: bool

class CategoriaSimple(BaseModel):
    """Categoría simplificada para incluir en detalle de producto."""
    id: int
    nombre: str
    model_config = {"from_attributes": True}


class ProductoCategoriaDetail(BaseModel):
    categoria: CategoriaSimple
    es_principal: bool
    model_config = {"from_attributes": True}


class IngredienteSimple(BaseModel):
    """Ingrediente simplificado para incluir en detalle de producto."""
    id: int
    nombre: str
    es_alergeno: bool
    precio_costo: Decimal
    model_config = {"from_attributes": True}


class UnidadMedidaSimple(BaseModel):
    id: int
    nombre: str
    simbolo: str
    tipo: str
    factor_conversion: float
    model_config = {"from_attributes": True}


class ProductoIngredienteDetail(BaseModel):
    ingrediente: IngredienteSimple
    cantidad: Decimal
    unidad_medida: UnidadMedidaSimple
    es_removible: bool
    model_config = {"from_attributes": True}


class ProductoRead(BaseModel):
    """Schema de salida de producto — response_model para listados."""
    id: int
    nombre: str
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    imagenes: List[str] = Field(default=[])
    precio_base: Decimal
    costo_total: Decimal = Field(default=0.0)
    stock_cantidad: int
    stock_disponible: int = Field(default=0)
    margen_ganancia: Decimal = Field(default=0.0)
    precio_sugerido: Decimal = Field(default=0.0)
    disponible: bool
    unidad_venta: Optional[UnidadMedidaSimple] = None
    categorias: List[ProductoCategoriaDetail] = []
    ingredientes: List[ProductoIngredienteDetail] = []
    created_at: datetime
    updated_at: datetime
    active_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class ProductoDetail(ProductoRead):
    """Schema de salida para el detalle de producto con relaciones."""
    pass


class PaginatedResponse(BaseModel):
    """Respuesta paginada genérica para listados."""
    items: List[ProductoRead]
    total: int
    page: int
    per_page: int
    pages: int
