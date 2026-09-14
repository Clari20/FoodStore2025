"""Schemas de Categorías con validaciones."""
from pydantic import BaseModel, Field
from typing import Optional, List, Annotated
from datetime import datetime


class CategoriaCreate(BaseModel):
    """Schema de entrada para crear una categoría."""
    nombre: Annotated[str, Field(min_length=2, max_length=100, description="Nombre de la categoría")]
    descripcion: Optional[str] = Field(default=None, max_length=500)
    padre_id: Optional[int] = Field(default=None, description="ID de la categoría padre (jerárquica)")
    imagen_url: Optional[str] = Field(default=None, description="URL de la imagen en Cloudinary")


class CategoriaUpdate(BaseModel):
    """Schema de entrada para actualizar una categoría. Todos los campos opcionales."""
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    padre_id: Optional[int] = None
    imagen_url: Optional[str] = None
    activo: Optional[bool] = None


class CategoriaRead(BaseModel):
    """Schema de salida."""
    id: int
    nombre: str
    descripcion: Optional[str] = None
    padre_id: Optional[int] = None
    imagen_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    active_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class CategoriaTree(CategoriaRead):
    """Categoría con subcategorías anidadas para vista jerárquica."""
    subcategorias: List["CategoriaTree"] = []


class PaginatedResponse(BaseModel):
    """Respuesta paginada genérica para listados."""
    items: List[CategoriaRead]
    total: int
    page: int
    per_page: int
    pages: int
