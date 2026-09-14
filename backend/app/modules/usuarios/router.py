"""Router de Usuarios — listado para administradores."""

from typing import Annotated, Optional
from datetime import datetime, timezone
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import select

from app.core.deps import get_current_user, require_role
from app.core.uow import UnitOfWork, get_uow
from app.modules.usuarios.model import Usuario
from app.modules.usuarios.rol_model import Rol, UsuarioRol
from app.modules.direcciones.schemas import DireccionResponse
from app.modules.pedidos.schemas import PedidoResponse

router = APIRouter(prefix="/api/v1/usuarios", tags=["Usuarios"])


class UsuarioAdminResponse(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: str
    celular: str
    roles: list[str] = []
    created_at: datetime
    deleted_at: Optional[datetime] = None

class UsuarioUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    celular: Optional[str] = None


class UsuarioRolesRequest(BaseModel):
    roles: list[str]


class RolResponse(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None


class PaginatedUsuarios(BaseModel):
    items: list[UsuarioAdminResponse]
    total: int
    page: int
    per_page: int
    pages: int


class UsuarioDetalleResponse(BaseModel):
    """Respuesta detallada de un usuario con pedidos y direcciones."""
    usuario: UsuarioAdminResponse
    direcciones: list[DireccionResponse] = []
    pedidos: list[PedidoResponse] = []

@router.get(
    "",
    response_model=PaginatedUsuarios,
    dependencies=[Depends(require_role(["ADMIN"]))],
)
def listar_usuarios(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    rol: Optional[str] = Query(None),
    estado: str = Query("activo", pattern="^(activo|inactivo|todos)$"),
):
    """Lista usuarios con paginación, filtro por rol y estado. Solo ADMIN."""
    with uow:
        query = select(Usuario)

        if estado == "activo":
            query = query.where(Usuario.deleted_at.is_(None))
        elif estado == "inactivo":
            query = query.where(Usuario.deleted_at.isnot(None))

        if search:
            like = f"%{search}%"
            query = query.where(
                (Usuario.nombre.ilike(like))
                | (Usuario.apellido.ilike(like))
                | (Usuario.email.ilike(like))
            )

        if rol:
            query = query.join(
                UsuarioRol,
                Usuario.id == UsuarioRol.usuario_id,
            ).where(UsuarioRol.rol_codigo == rol)

        total = len(uow.session.exec(query).all())
        pages = math.ceil(total / per_page) if total > 0 else 1
        offset = (page - 1) * per_page

        usuarios = uow.session.exec(
            query.order_by(Usuario.created_at.desc())
            .offset(offset)
            .limit(per_page)
        ).all()

        items = []
        for u in usuarios:
            roles = uow.usuario_roles.get_roles_activos(u.id)
            items.append(
                UsuarioAdminResponse(
                    id=u.id,
                    nombre=u.nombre,
                    apellido=u.apellido,
                    email=u.email,
                    celular=u.celular,
                    roles=roles,
                    created_at=u.created_at,
                    deleted_at=u.deleted_at,
                )
            )

        return PaginatedUsuarios(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

@router.get(
    "/roles",
    response_model=list[RolResponse],
    dependencies=[Depends(require_role(["ADMIN"]))],
)
def listar_roles(uow: Annotated[UnitOfWork, Depends(get_uow)]):
    """Lista roles disponibles para asignar a usuarios."""
    with uow:
        roles = uow.session.exec(select(Rol).order_by(Rol.codigo)).all()
        return [
            RolResponse(
                codigo=r.codigo,
                nombre=r.nombre,
                descripcion=r.descripcion,
            )
            for r in roles
        ]
    
@router.put(
    "/{usuario_id}",
    response_model=UsuarioAdminResponse,
    dependencies=[Depends(require_role(["ADMIN"]))],
)
def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdateRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    """Actualiza datos básicos del usuario. No modifica email ni password."""
    with uow:
        user = uow.session.get(Usuario, usuario_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(user, key, value)

        user.updated_at = datetime.now(timezone.utc)
        uow.usuarios.update(user)

        roles = uow.usuario_roles.get_roles_activos(user.id)

        return UsuarioAdminResponse(
            id=user.id,
            nombre=user.nombre,
            apellido=user.apellido,
            email=user.email,
            celular=user.celular,
            roles=roles,
            created_at=user.created_at,
            deleted_at=user.deleted_at,
        )
    
@router.put(
    "/{usuario_id}/roles",
    response_model=UsuarioAdminResponse,
    dependencies=[Depends(require_role(["ADMIN"]))],
)
def actualizar_roles_usuario(
    usuario_id: int,
    data: UsuarioRolesRequest,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    """Reemplaza los roles de un usuario."""
    roles_validos = {"ADMIN", "CAJERO", "COCINA_STOCK", "CLIENT"}

    if not data.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario debe tener al menos un rol",
        )

    invalidos = [r for r in data.roles if r not in roles_validos]
    if invalidos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Roles inválidos: {invalidos}",
        )

    with uow:
        user = uow.session.get(Usuario, usuario_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        roles_actuales = uow.usuario_roles.get_roles_activos(usuario_id)

        for rol_actual in roles_actuales:
            if rol_actual not in data.roles:
                uow.usuario_roles.revocar_rol(usuario_id, rol_actual)

        for nuevo_rol in data.roles:
            if nuevo_rol not in roles_actuales:
                uow.usuario_roles.asignar_rol(
                    usuario_id=usuario_id,
                    rol_codigo=nuevo_rol,
                    asignado_por_id=current_user.id,
                )

        roles = uow.usuario_roles.get_roles_activos(user.id)

        return UsuarioAdminResponse(
            id=user.id,
            nombre=user.nombre,
            apellido=user.apellido,
            email=user.email,
            celular=user.celular,
            roles=roles,
            created_at=user.created_at,
            deleted_at=user.deleted_at,
        )
    
@router.delete(
    "/{usuario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["ADMIN"]))],
)
def desactivar_usuario(
    usuario_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    """Soft delete del usuario."""
    if usuario_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No podés desactivar tu propio usuario",
        )

    with uow:
        user = uow.session.get(Usuario, usuario_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        user.deleted_at = datetime.now(timezone.utc)
        user.updated_at = datetime.now(timezone.utc)

        uow.usuarios.update(user)
        uow.refresh_tokens.revocar_todos(usuario_id)

@router.patch(
    "/{usuario_id}/restore",
    response_model=UsuarioAdminResponse,
    dependencies=[Depends(require_role(["ADMIN"]))],
)
def restaurar_usuario(
    usuario_id: int,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    """Restaura un usuario desactivado."""
    with uow:
        user = uow.session.get(Usuario, usuario_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        user.deleted_at = None
        user.updated_at = datetime.now(timezone.utc)

        uow.usuarios.update(user)

        roles = uow.usuario_roles.get_roles_activos(user.id)

        return UsuarioAdminResponse(
            id=user.id,
            nombre=user.nombre,
            apellido=user.apellido,
            email=user.email,
            celular=user.celular,
            roles=roles,
            created_at=user.created_at,
            deleted_at=user.deleted_at,
        )


@router.get(
    "/{usuario_id}/detalle",
    response_model=UsuarioDetalleResponse,
    dependencies=[Depends(require_role(["ADMIN"]))],
)
def detalle_usuario(
    usuario_id: int,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    """Devuelve datos completos del usuario: info + direcciones + pedidos. Solo ADMIN."""
    with uow:
        user = uow.session.get(Usuario, usuario_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        roles = uow.usuario_roles.get_roles_activos(user.id)
        direcciones = uow.direcciones.get_by_usuario(user.id)
        pedidos_data = uow.pedidos.get_paginated(usuario_id=user.id, per_page=100)

        return UsuarioDetalleResponse(
            usuario=UsuarioAdminResponse(
                id=user.id,
                nombre=user.nombre,
                apellido=user.apellido,
                email=user.email,
                celular=user.celular,
                roles=roles,
                created_at=user.created_at,
                deleted_at=user.deleted_at,
            ),
            direcciones=direcciones,
            pedidos=pedidos_data["items"],
        )
