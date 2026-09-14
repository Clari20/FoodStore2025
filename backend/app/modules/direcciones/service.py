from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.uow import UnitOfWork
from app.modules.direcciones.schemas import DireccionCreate, DireccionUpdate
from app.modules.usuarios.direccion_model import DireccionEntrega
from app.modules.usuarios.model import Usuario


class DireccionService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def listar(self, usuario: Usuario) -> list[DireccionEntrega]:
        with self.uow:
            return self.uow.direcciones.get_by_usuario(usuario.id)

    def obtener(self, direccion_id: int, usuario: Usuario) -> DireccionEntrega:
        with self.uow:
            direccion = self.uow.direcciones.get_by_id_for_user(direccion_id, usuario.id)
            if not direccion:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada",
                )
            return direccion

    def crear(self, data: DireccionCreate, usuario: Usuario) -> DireccionEntrega:
        with self.uow:
            if data.es_principal:
                self.uow.direcciones.unset_principal_for_user(usuario.id)

            existentes = self.uow.direcciones.get_by_usuario(usuario.id)
            es_principal = data.es_principal or len(existentes) == 0

            direccion = DireccionEntrega(
                usuario_id=usuario.id,
                alias=data.alias,
                linea1=data.linea1,
                linea2=data.linea2,
                ciudad=data.ciudad,
                provincia=data.provincia,
                codigo_postal=data.codigo_postal,

                es_principal=es_principal,
            )

            if es_principal:
                self.uow.direcciones.unset_principal_for_user(usuario.id)

            return self.uow.direcciones.add(direccion)

    def actualizar(self, direccion_id: int, data: DireccionUpdate, usuario: Usuario) -> DireccionEntrega:
        with self.uow:
            direccion = self.uow.direcciones.get_by_id_for_user(direccion_id, usuario.id)
            if not direccion:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada",
                )

            update_data = data.model_dump(exclude_unset=True)

            if update_data.get("es_principal") is True:
                self.uow.direcciones.unset_principal_for_user(usuario.id)

            for key, value in update_data.items():
                setattr(direccion, key, value)

            direccion.updated_at = datetime.now(timezone.utc)

            return self.uow.direcciones.update(direccion)

    def eliminar(self, direccion_id: int, usuario: Usuario) -> None:
        with self.uow:
            direccion = self.uow.direcciones.get_by_id_for_user(direccion_id, usuario.id)
            if not direccion:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada",
                )

            self.uow.direcciones.soft_delete(direccion)

    def marcar_principal(self, direccion_id: int, usuario: Usuario) -> DireccionEntrega:
        with self.uow:
            direccion = self.uow.direcciones.get_by_id_for_user(direccion_id, usuario.id)
            if not direccion:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada",
                )

            self.uow.direcciones.unset_principal_for_user(usuario.id)

            direccion.es_principal = True
            direccion.updated_at = datetime.now(timezone.utc)

            return self.uow.direcciones.update(direccion)