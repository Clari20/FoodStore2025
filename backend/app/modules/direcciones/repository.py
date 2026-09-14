from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core.base_repository import BaseRepository
from app.modules.usuarios.direccion_model import DireccionEntrega


class DireccionEntregaRepository(BaseRepository[DireccionEntrega]):
    def __init__(self, session: Session):
        super().__init__(DireccionEntrega, session)

    def get_by_usuario(self, usuario_id: int) -> list[DireccionEntrega]:
        return list(
            self.session.exec(
                select(DireccionEntrega)
                .where(
                    DireccionEntrega.usuario_id == usuario_id,
                    DireccionEntrega.deleted_at.is_(None),
                )
                .order_by(DireccionEntrega.es_principal.desc(), DireccionEntrega.created_at.desc())
            ).all()
        )

    def get_by_id_for_user(self, direccion_id: int, usuario_id: int) -> DireccionEntrega | None:
        return self.session.exec(
            select(DireccionEntrega).where(
                DireccionEntrega.id == direccion_id,
                DireccionEntrega.usuario_id == usuario_id,
                DireccionEntrega.deleted_at.is_(None),
            )
        ).first()

    def unset_principal_for_user(self, usuario_id: int) -> None:
        direcciones = self.session.exec(
            select(DireccionEntrega).where(
                DireccionEntrega.usuario_id == usuario_id,
                DireccionEntrega.deleted_at.is_(None),
                DireccionEntrega.es_principal == True,
            )
        ).all()

        for direccion in direcciones:
            direccion.es_principal = False
            direccion.updated_at = datetime.now(timezone.utc)
            self.session.add(direccion)

        self.session.flush()

    def soft_delete(self, direccion: DireccionEntrega) -> DireccionEntrega:
        direccion.deleted_at = datetime.now(timezone.utc)
        direccion.updated_at = datetime.now(timezone.utc)
        self.session.add(direccion)
        self.session.flush()
        self.session.refresh(direccion)
        return direccion