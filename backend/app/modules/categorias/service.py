"""Servicio de Categorías. Lógica de negocio para CRUD jerárquico."""

from datetime import datetime, timezone
from fastapi import HTTPException, status
from app.core.uow import UnitOfWork
from app.modules.categorias.model import Categoria
from app.modules.categorias.schemas import CategoriaCreate, CategoriaUpdate, CategoriaTree
from typing import List


def create_categoria(uow: UnitOfWork, data: CategoriaCreate) -> Categoria:
    """Crea una categoría. Valida padre si se especifica."""
    if data.padre_id:
        parent = uow.categorias.get_by_id(data.padre_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Categoría padre no encontrada")

    cat = Categoria(**data.model_dump())
    return uow.categorias.add(cat)


def list_categorias_tree(uow: UnitOfWork, estado: str = "activo") -> List[CategoriaTree]:
    """Retorna el árbol de categorías armado en memoria."""
    all_cats = uow.categorias.get_tree(estado=estado)

    # Construir árbol en memoria
    cat_map = {c.id: CategoriaTree.model_validate(c) for c in all_cats}
    roots = []
    for cat in cat_map.values():
        original = next(c for c in all_cats if c.id == cat.id)
        if original.padre_id and original.padre_id in cat_map:
            cat_map[original.padre_id].subcategorias.append(cat)
        else:
            roots.append(cat)
    return roots


def list_categorias_flat(uow: UnitOfWork) -> List[Categoria]:
    """Retorna todas las categorías como lista plana (para selects en frontend)."""
    return uow.categorias.get_tree()


def list_categorias_paginated(
    uow: UnitOfWork,
    page: int = 1,
    per_page: int = 10,
    search: str | None = None,
    estado: str = "activo",
    sort_by: str = "nombre",
    sort_order: str = "asc",
    created_from: str | None = None,
    created_to: str | None = None,
    updated_from: str | None = None,
    updated_to: str | None = None,
    starts_with: str | None = None,
):
    """Listado paginado de categorías con filtros avanzados."""
    from datetime import datetime
    
    # Parse dates
    d_created_from = datetime.strptime(created_from, "%Y-%m-%d").date() if created_from else None
    d_created_to = datetime.strptime(created_to, "%Y-%m-%d").date() if created_to else None
    d_updated_from = datetime.strptime(updated_from, "%Y-%m-%d").date() if updated_from else None
    d_updated_to = datetime.strptime(updated_to, "%Y-%m-%d").date() if updated_to else None

    return uow.categorias.get_paginated(
        page=page,
        per_page=per_page,
        search=search,
        estado=estado,
        sort_by=sort_by,
        sort_order=sort_order,
        created_from=d_created_from,
        created_to=d_created_to,
        updated_from=d_updated_from,
        updated_to=d_updated_to,
        starts_with=starts_with
    )


def get_categoria(uow: UnitOfWork, cat_id: int) -> Categoria:
    """Obtiene una categoría por ID."""
    cat = uow.categorias.get_by_id(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return cat


def update_categoria(uow: UnitOfWork, cat_id: int, data: CategoriaUpdate) -> Categoria:
    """Actualiza una categoría. RN: no puede ser padre de sí misma."""
    cat = uow.categorias.get_by_id(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    # RN: No puede ser padre de sí misma
    if data.padre_id == cat_id:
        raise HTTPException(status_code=400, detail="Una categoría no puede ser padre de sí misma")

    # Manejo de estado (activo/inactivo) con cascada
    estado_cambiado = False
    nuevo_estado_activo = None
    if data.activo is True and cat.active_at is not None:
        cat.active_at = None
        estado_cambiado = True
        nuevo_estado_activo = True
    elif data.activo is False and cat.active_at is None:
        cat.active_at = datetime.now(timezone.utc)
        estado_cambiado = True
        nuevo_estado_activo = False

    update_data = data.model_dump(exclude_unset=True, exclude={"activo"})
    for key, value in update_data.items():
        setattr(cat, key, value)

    updated_cat = uow.categorias.update(cat)

    if estado_cambiado:
        descendant_ids = uow.categorias.get_descendant_ids(cat_id)
        for desc_id in descendant_ids:
            desc_cat = uow.categorias.get_by_id(desc_id)
            if desc_cat:
                if nuevo_estado_activo and desc_cat.active_at is not None:
                    uow.categorias.restaurar(desc_cat)
                elif not nuevo_estado_activo and desc_cat.active_at is None:
                    uow.categorias.dar_de_baja(desc_cat)

    return updated_cat


def dar_de_baja_categoria(uow: UnitOfWork, cat_id: int):
    """Baja (reversible) de categoría con cascada a subcategorías."""
    cat = uow.categorias.get_by_id(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    uow.categorias.dar_de_baja(cat)

    # Cascada: dar de baja todas las subcategorías descendientes
    descendant_ids = uow.categorias.get_descendant_ids(cat_id)
    for desc_id in descendant_ids:
        desc_cat = uow.categorias.get_by_id(desc_id)
        if desc_cat and desc_cat.active_at is None:
            uow.categorias.dar_de_baja(desc_cat)


def delete_categoria(uow: UnitOfWork, cat_id: int):
    """Eliminación lógica (irreversible) de categoría. RN: no eliminar si tiene productos activos."""
    cat = uow.categorias.get_by_id(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    has_products = uow.categorias.has_active_products(cat_id)
    if has_products:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar: la categoría tiene productos activos asociados",
        )

    uow.categorias.eliminar(cat)


def restore_categoria(uow: UnitOfWork, cat_id: int):
    """Restaura una categoría y todas sus subcategorías."""
    cat = uow.categorias.get_by_id(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    uow.categorias.restaurar(cat)

    # Cascada: restaurar todas las subcategorías descendientes
    descendant_ids = uow.categorias.get_descendant_ids(cat_id)
    for desc_id in descendant_ids:
        desc_cat = uow.categorias.get_by_id(desc_id)
        if desc_cat and desc_cat.active_at is not None:
            uow.categorias.restaurar(desc_cat)
