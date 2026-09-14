"""Router de Ingredientes — endpoints CRUD con 8 filtros y paginación."""
from datetime import date
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
import io

from app.core.uow import UnitOfWork, get_uow
from app.core.deps import get_current_user, require_role
from app.modules.usuarios.model import Usuario
from app.modules.ingredientes.service import IngredienteService
from app.modules.ingredientes.schemas import (
    IngredienteCreate,
    IngredienteUpdate,
    IngredienteResponse,
    PaginatedIngredientes,
    ProductoAfectadoResponse,
)

router = APIRouter(
    prefix="/api/v1/ingredientes",
    tags=["Ingredientes"],
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))],
)


@router.get("", response_model=PaginatedIngredientes)
def list_ingredientes(
    page: int = Query(1, ge=1, description="Número de página"),
    per_page: int = Query(10, ge=1, le=1000, description="Items por página"),
    search: str | None = Query(None, description="Buscar por nombre"),
    estado: str = Query("activo", pattern="^(activo|inactivo|todos)$"),
    es_alergeno: bool | None = Query(None, description="Filtrar por alérgeno"),
    sort_by: str = Query("nombre", description="Ordenar por: nombre / created_at / updated_at"),
    sort_order: str = Query("asc", description="Orden: asc / desc"),
    created_from: date | None = Query(None, description="Fecha creación desde (YYYY-MM-DD)"),
    created_to: date | None = Query(None, description="Fecha creación hasta (YYYY-MM-DD)"),
    updated_from: date | None = Query(None, description="Fecha actualización desde (YYYY-MM-DD)"),
    updated_to: date | None = Query(None, description="Fecha actualización hasta (YYYY-MM-DD)"),
    starts_with: str | None = Query(None, max_length=1, description="Filtrar por letra inicial"),
    es_producto_terminado: bool | None = Query(None, description="Filtrar por tipo (insumo vs venta)"),
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista ingredientes activos con filtros y paginación. Eliminados nunca aparecen."""
    svc = IngredienteService(uow)
    return svc.list_paginated(
        page=page,
        per_page=per_page,
        search=search,
        estado=estado,
        es_alergeno=es_alergeno,
        sort_by=sort_by,
        sort_order=sort_order,
        created_from=created_from,
        created_to=created_to,
        updated_from=updated_from,
        updated_to=updated_to,
        starts_with=starts_with,
        es_producto_terminado=es_producto_terminado,
    )


@router.get("/export/csv")
def export_ingredientes_csv(
    search: str | None = Query(None, description="Buscar por nombre"),
    estado: str = Query("activo", pattern="^(activo|inactivo|todos)$"),
    es_alergeno: bool | None = Query(None, description="Filtrar por alérgeno"),
    sort_by: str = Query("nombre", description="Ordenar por: nombre / created_at / updated_at"),
    sort_order: str = Query("asc", description="Orden: asc / desc"),
    created_from: date | None = Query(None, description="Fecha creación desde (YYYY-MM-DD)"),
    created_to: date | None = Query(None, description="Fecha creación hasta (YYYY-MM-DD)"),
    updated_from: date | None = Query(None, description="Fecha actualización desde (YYYY-MM-DD)"),
    updated_to: date | None = Query(None, description="Fecha actualización hasta (YYYY-MM-DD)"),
    starts_with: str | None = Query(None, max_length=1, description="Filtrar por letra inicial"),
    es_producto_terminado: bool | None = Query(None, description="Filtrar por tipo (insumo vs venta)"),
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
):
    """Exporta los ingredientes activos filtrados a un archivo CSV."""
    svc = IngredienteService(uow)
    csv_content = svc.export_csv(
        search=search,
        estado=estado,
        es_alergeno=es_alergeno,
        sort_by=sort_by,
        sort_order=sort_order,
        created_from=created_from,
        created_to=created_to,
        updated_from=updated_from,
        updated_to=updated_to,
        starts_with=starts_with,
        es_producto_terminado=es_producto_terminado,
    )
    
    response = StreamingResponse(
        iter([csv_content]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=ingredientes.csv"
    return response


@router.post("", response_model=IngredienteResponse, status_code=201)
def create_ingrediente(
    data: IngredienteCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea un nuevo ingrediente."""
    svc = IngredienteService(uow)
    return svc.create(data)


@router.get("/{ingrediente_id}", response_model=IngredienteResponse)
def get_ingrediente(
    ingrediente_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene un ingrediente por ID."""
    svc = IngredienteService(uow)
    return svc.get_by_id(ingrediente_id)


@router.get("/{ingrediente_id}/productos-afectados", response_model=list[ProductoAfectadoResponse])
def get_productos_afectados(
    ingrediente_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
):
    """Devuelve la lista de productos que usan este ingrediente."""
    svc = IngredienteService(uow)
    return svc.get_productos_afectados(ingrediente_id)


@router.put("/{ingrediente_id}", response_model=IngredienteResponse)
def update_ingrediente(
    ingrediente_id: int,
    data: IngredienteUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
):
    """Actualiza un ingrediente."""
    svc = IngredienteService(uow)
    return svc.update(ingrediente_id, data)


@router.delete("/{ingrediente_id}", status_code=204)
def eliminar_ingrediente(
    ingrediente_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
):
    """Eliminación lógica de un ingrediente. Irreversible e invisible."""
    svc = IngredienteService(uow)
    svc.eliminar(ingrediente_id)


@router.patch("/{ingrediente_id}/baja", response_model=IngredienteResponse)
def dar_de_baja_ingrediente(
    ingrediente_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
):
    """Da de baja a un ingrediente (inactivo)."""
    svc = IngredienteService(uow)
    return svc.dar_de_baja(ingrediente_id)


@router.patch("/{ingrediente_id}/restore", response_model=IngredienteResponse)
def restaurar_ingrediente(
    ingrediente_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
):
    """Restaura un ingrediente dado de baja (activo)."""
    svc = IngredienteService(uow)
    return svc.restaurar(ingrediente_id)
