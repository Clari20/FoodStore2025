"""Routers de Productos e Ingredientes. CRUD con Annotated, Query, Path y response_model."""
from fastapi import APIRouter, Path, Query, status, Depends
from typing import Optional, List, Annotated
from app.core.deps import require_role
from app.core.uow import UnitOfWork
from app.modules.productos import service
from pydantic import BaseModel
from app.modules.productos.schemas import (
    ProductoCreate,
    ProductoUpdate,
    ProductoRead,
    ProductoDetail,
    PaginatedResponse,
    UnidadMedidaSimple,
    ProductoStockUpdate,
    ProductoDisponibilidadUpdate,
)

router = APIRouter(prefix="/api/v1/productos", tags=["Productos"])

# ── Unidades de Medida ────────────────────────────────────────────────────────

@router.get("/unidades-medida", response_model=List[UnidadMedidaSimple])
def list_unidades_medida():
    """Obtiene el catálogo de unidades de medida (kg, L, etc.)."""
    with UnitOfWork() as uow:
        return service.get_unidades_medida(uow)

# ── Ingredientes Públicos ─────────────────────────────────────────────────────

class IngredientePublico(BaseModel):
    id: int
    nombre: str
    es_alergeno: bool

@router.get("/ingredientes-public", response_model=List[IngredientePublico])
def list_ingredientes_public():
    """Obtiene una lista pública de ingredientes (solo ID, nombre y alérgeno)."""
    with UnitOfWork() as uow:
        return uow.ingredientes.get_all()

# ── Productos ────────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedResponse)
def list_productos(
    page: Annotated[int, Query(ge=1, description="Número de página")] = 1,
    per_page: Annotated[int, Query(ge=1, le=100, description="Cantidad por página")] = 20,
    categoria: Annotated[Optional[int], Query(description="Filtrar por categoría")] = None,
    search: Annotated[Optional[str], Query(max_length=100, description="Búsqueda por nombre/desc")] = None,
    disponible: Annotated[Optional[bool], Query(description="Filtrar por disponibilidad")] = None,
    estado: Annotated[str, Query(pattern="^(activo|inactivo|todos)$")] = "activo",
    sort_by: Annotated[str, Query(pattern="^(nombre|precio_base|stock_cantidad|created_at|updated_at)$")] = "nombre",
    sort_order: Annotated[str, Query(pattern="^(asc|desc)$")] = "asc",
    created_from: Annotated[Optional[str], Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
    created_to: Annotated[Optional[str], Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
    updated_from: Annotated[Optional[str], Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
    updated_to: Annotated[Optional[str], Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
    starts_with: Annotated[Optional[str], Query(max_length=1)] = None,
):
    """Catálogo de productos con filtros avanzados, ordenamiento y paginación."""
    with UnitOfWork() as uow:
        return service.list_productos(
            uow=uow,
            page=page,
            per_page=per_page,
            categoria_id=categoria,
            search=search,
            disponible=disponible,
            estado=estado,
            sort_by=sort_by,
            sort_order=sort_order,
            created_from=created_from,
            created_to=created_to,
            updated_from=updated_from,
            updated_to=updated_to,
            starts_with=starts_with
        )


@router.get(
    "/{prod_id}",
    response_model=ProductoDetail,
    responses={404: {"description": "Producto no encontrado"}},
)
def get_producto(
    prod_id: Annotated[int, Path(ge=1, description="ID del producto")],
):
    """Detalle de un producto con sus categorías e ingredientes relacionados."""
    with UnitOfWork() as uow:
        return service.get_producto_detail(uow, prod_id)


@router.post(
    "",
    response_model=ProductoRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))]
)
def create_producto(data: ProductoCreate):
    """Crear un nuevo producto con categorías e ingredientes asociados."""
    with UnitOfWork() as uow:
        prod = service.create_producto(uow, data)
        return service.get_producto_detail(uow, prod.id)


@router.put(
    "/{prod_id}",
    response_model=ProductoRead,
    responses={404: {"description": "Producto no encontrado"}},
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))]
)
def update_producto(
    prod_id: Annotated[int, Path(ge=1, description="ID del producto")],
    data: ProductoUpdate,
):
    """Actualizar un producto. Si se envían categoria_ids o ingrediente_ids, se sincronizan."""
    with UnitOfWork() as uow:
        prod = service.update_producto(uow, prod_id, data)
        return service.get_producto_detail(uow, prod_id)

@router.patch(
    "/{prod_id}/stock",
    response_model=ProductoRead,
    responses={404: {"description": "Producto no encontrado"}},
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))],
)
def actualizar_stock_producto(
    prod_id: Annotated[int, Path(ge=1, description="ID del producto")],
    data: ProductoStockUpdate,
):
    """Actualizar solo el stock fisico de un producto. Permitido para ADMIN y COCINA_STOCK."""
    with UnitOfWork() as uow:
        prod = service.update_stock_producto(uow, prod_id, data.stock_cantidad)
        return service.get_producto_detail(uow, prod_id)

@router.patch(
    "/{prod_id}/disponibilidad",
    response_model=ProductoRead,
    responses={404: {"description": "Producto no encontrado"}},
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))],
)
def actualizar_disponibilidad_producto(
    prod_id: Annotated[int, Path(ge=1, description="ID del producto")],
    data: ProductoDisponibilidadUpdate,
):
    """Activar o desactivar la disponibilidad comercial de un producto."""
    with UnitOfWork() as uow:
        prod = service.update_disponibilidad_producto(uow, prod_id, data.disponible)
        return service.get_producto_detail(uow, prod_id)

@router.patch(
    "/{prod_id}/baja",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"description": "Producto no encontrado"}},
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))]
)
def dar_de_baja_producto(
    prod_id: Annotated[int, Path(ge=1, description="ID del producto")],
):
    """Dar de baja un producto (reversible). Visible en filtro 'inactivo'."""
    with UnitOfWork() as uow:
        service.dar_de_baja_producto(uow, prod_id)


@router.patch(
    "/{prod_id}/restore",
    status_code=status.HTTP_200_OK,
    responses={404: {"description": "Producto no encontrado"}},
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))]
)
def restore_producto(
    prod_id: Annotated[int, Path(ge=1, description="ID del producto")],
):
    """Restaurar un producto dado de baja."""
    with UnitOfWork() as uow:
        service.restore_producto(uow, prod_id)


@router.delete(
    "/{prod_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"description": "Producto no encontrado"}},
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))]
)
def eliminar_producto(
    prod_id: Annotated[int, Path(ge=1, description="ID del producto")],
):
    """Eliminación lógica de un producto. Irreversible e invisible para el usuario."""
    with UnitOfWork() as uow:
        service.eliminar_producto(uow, prod_id)
