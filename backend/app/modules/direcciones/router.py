from typing import Annotated

from fastapi import APIRouter, Depends, Path, status

from app.core.deps import get_current_user
from app.core.uow import UnitOfWork, get_uow
from app.modules.direcciones.schemas import (
    DireccionCreate,
    DireccionUpdate,
    DireccionResponse,
)
from app.modules.direcciones.service import DireccionService
from app.modules.usuarios.model import Usuario


router = APIRouter(prefix="/api/v1/direcciones", tags=["Direcciones"])


@router.get("", response_model=list[DireccionResponse])
def listar_direcciones(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return DireccionService(uow).listar(current_user)


@router.post("", response_model=DireccionResponse, status_code=status.HTTP_201_CREATED)
def crear_direccion(
    data: DireccionCreate,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return DireccionService(uow).crear(data, current_user)


@router.get("/{direccion_id}", response_model=DireccionResponse)
def obtener_direccion(
    direccion_id: Annotated[int, Path(ge=1)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return DireccionService(uow).obtener(direccion_id, current_user)


@router.put("/{direccion_id}", response_model=DireccionResponse)
def actualizar_direccion(
    direccion_id: Annotated[int, Path(ge=1)],
    data: DireccionUpdate,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return DireccionService(uow).actualizar(direccion_id, data, current_user)


@router.delete("/{direccion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_direccion(
    direccion_id: Annotated[int, Path(ge=1)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    DireccionService(uow).eliminar(direccion_id, current_user)


@router.patch("/{direccion_id}/principal", response_model=DireccionResponse)
def marcar_principal(
    direccion_id: Annotated[int, Path(ge=1)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return DireccionService(uow).marcar_principal(direccion_id, current_user)