"""Router de Categorías. CRUD completo con response_model y status codes."""
from fastapi import APIRouter, Path, Query, status, Depends
from typing import List, Annotated, Optional
from app.core.deps import require_role
from app.core.uow import UnitOfWork
from app.modules.categorias import service
from app.modules.categorias.schemas import (
    CategoriaCreate, CategoriaUpdate, CategoriaRead, CategoriaTree, PaginatedResponse
)

router = APIRouter(prefix="/api/v1/categorias", tags=["Categorías"])


@router.get("", response_model=List[CategoriaTree])
def list_categorias_tree(
    estado: Annotated[str, Query(pattern="^(activo|inactivo|todos)$")] = "activo"
):
    """Listar categorías en formato árbol jerárquico. Público."""
    with UnitOfWork() as uow:
        return service.list_categorias_tree(uow, estado)


@router.get("/list", response_model=PaginatedResponse)
def list_categorias_paginated(
    page: Annotated[int, Query(ge=1, description="Número de página")] = 1,
    per_page: Annotated[int, Query(ge=1, le=100, description="Cantidad por página")] = 20,
    search: Annotated[Optional[str], Query(max_length=100, description="Búsqueda por nombre/desc")] = None,
    estado: Annotated[str, Query(pattern="^(activo|inactivo|todos)$")] = "activo",
    sort_by: Annotated[str, Query(pattern="^(nombre|created_at|updated_at)$")] = "nombre",
    sort_order: Annotated[str, Query(pattern="^(asc|desc)$")] = "asc",
    created_from: Annotated[Optional[str], Query(pattern="^\d{4}-\d{2}-\d{2}$")] = None,
    created_to: Annotated[Optional[str], Query(pattern="^\d{4}-\d{2}-\d{2}$")] = None,
    updated_from: Annotated[Optional[str], Query(pattern="^\d{4}-\d{2}-\d{2}$")] = None,
    updated_to: Annotated[Optional[str], Query(pattern="^\d{4}-\d{2}-\d{2}$")] = None,
    starts_with: Annotated[Optional[str], Query(max_length=1)] = None,
):
    """Listado paginado de categorías con filtros avanzados."""
    with UnitOfWork() as uow:
        return service.list_categorias_paginated(
            uow, page, per_page, search, estado, sort_by, sort_order,
            created_from, created_to, updated_from, updated_to, starts_with
        )


@router.get("/flat", response_model=List[CategoriaRead])
def list_categorias_flat():
    """Listar categorías en formato plano (para selects de formularios)."""
    with UnitOfWork() as uow:
        cats = service.list_categorias_flat(uow)
        return [CategoriaRead.model_validate(c) for c in cats]


@router.get(
    "/{cat_id}",
    response_model=CategoriaRead,
    responses={404: {"description": "Categoría no encontrada"}},
)
def get_categoria(
    cat_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
):
    """Obtener una categoría por su ID."""
    with UnitOfWork() as uow:
        cat = service.get_categoria(uow, cat_id)
        return CategoriaRead.model_validate(cat)


@router.post(
    "",
    response_model=CategoriaRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["ADMIN"]))]
)
def create_categoria(data: CategoriaCreate):
    """Crear una nueva categoría."""
    with UnitOfWork() as uow:
        cat = service.create_categoria(uow, data)
        return CategoriaRead.model_validate(cat)


@router.put(
    "/{cat_id}",
    response_model=CategoriaRead,
    responses={404: {"description": "Categoría no encontrada"}},
    dependencies=[Depends(require_role(["ADMIN"]))]
)
def update_categoria(
    cat_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
    data: CategoriaUpdate,
):
    """Actualizar una categoría existente."""
    with UnitOfWork() as uow:
        cat = service.update_categoria(uow, cat_id, data)
        return CategoriaRead.model_validate(cat)


@router.delete(
    "/{cat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"description": "Categoría no encontrada"}},
    dependencies=[Depends(require_role(["ADMIN"]))]
)
def delete_categoria(
    cat_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
):
    """Eliminación lógica permanente de una categoría."""
    with UnitOfWork() as uow:
        service.delete_categoria(uow, cat_id)


@router.patch(
    "/{cat_id}/baja",
    status_code=status.HTTP_200_OK,
    responses={404: {"description": "Categoría no encontrada"}},
    dependencies=[Depends(require_role(["ADMIN"]))]
)
def dar_de_baja_categoria(
    cat_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
):
    """Da de baja una categoría (cambia estado a inactivo)."""
    with UnitOfWork() as uow:
        service.dar_de_baja_categoria(uow, cat_id)


@router.patch(
    "/{cat_id}/restore",
    status_code=status.HTTP_200_OK,
    responses={404: {"description": "Categoría no encontrada"}},
    dependencies=[Depends(require_role(["ADMIN"]))]
)
def restore_categoria(
    cat_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
):
    """Restaurar una categoría dada de baja."""
    with UnitOfWork() as uow:
        service.restore_categoria(uow, cat_id)
