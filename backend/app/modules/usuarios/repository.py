"""
Repositorio de Usuarios — acceso a BD.

Hereda de BaseRepository.
Agrega queries específicas de Usuario.
"""

from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core.base_repository import BaseRepository
from app.modules.usuarios.model import Usuario
from app.modules.usuarios.rol_model import Rol, UsuarioRol
from app.modules.usuarios.refresh_token_model import RefreshToken


class UsuarioRepository(BaseRepository[Usuario]):
    """Encapsula todas las queries de Usuario."""

    def __init__(self, session: Session):
        super().__init__(Usuario, session)

    def get_by_email(self, email: str) -> Usuario | None:
        """Busca un usuario activo por email."""
        return self.session.exec(
            select(Usuario).where(
                Usuario.email == email,
                Usuario.deleted_at.is_(None)
            )
        ).first()

    def get_by_id(self, entity_id: int) -> Usuario | None:
        """Sobrescribe get_by_id para asegurar que esté activo."""
        return self.session.exec(
            select(Usuario).where(
                Usuario.id == entity_id,
                Usuario.deleted_at.is_(None)
            )
        ).first()


class RolRepository(BaseRepository[Rol]):
    """Repositorio para el catálogo de Roles."""

    def __init__(self, session: Session):
        super().__init__(Rol, session)

    def get_by_codigo(self, codigo: str) -> Rol | None:
        """Busca un rol por su código semántico."""
        return self.session.exec(
            select(Rol).where(Rol.codigo == codigo)
        ).first()


class UsuarioRolRepository:
    """Repositorio para la tabla pivot UsuarioRol."""

    def __init__(self, session: Session):
        self.session = session

    def get_roles_activos(self, usuario_id: int) -> list[str]:
        """
        Retorna la lista de códigos de roles activos de un usuario.
        Filtra por roles no expirados.
        """
        now = datetime.now(timezone.utc)
        rows = self.session.exec(
            select(UsuarioRol.rol_codigo).where(
                UsuarioRol.usuario_id == usuario_id,
                # Rol no expirado: expires_at es NULL o es futuro
                (UsuarioRol.expires_at.is_(None)) | (UsuarioRol.expires_at > now),
            )
        ).all()
        return list(rows)

    def asignar_rol(
        self,
        usuario_id: int,
        rol_codigo: str,
        asignado_por_id: int | None = None,
        expires_at: datetime | None = None,
    ) -> UsuarioRol:
        """Asigna un rol a un usuario."""
        ur = UsuarioRol(
            usuario_id=usuario_id,
            rol_codigo=rol_codigo,
            asignado_por_id=asignado_por_id,
            expires_at=expires_at,
        )
        self.session.add(ur)
        self.session.flush()
        return ur

    def revocar_rol(self, usuario_id: int, rol_codigo: str) -> bool:
        """Revoca un rol de un usuario. Retorna True si existía."""
        ur = self.session.exec(
            select(UsuarioRol).where(
                UsuarioRol.usuario_id == usuario_id,
                UsuarioRol.rol_codigo == rol_codigo,
            )
        ).first()
        if ur:
            self.session.delete(ur)
            self.session.flush()
            return True
        return False


class RefreshTokenRepository:
    """Repositorio para RefreshToken."""

    def __init__(self, session: Session):
        self.session = session

    def crear(self, usuario_id: int, token_hash: str, expires_at: datetime) -> RefreshToken:
        """Guarda un nuevo refresh token hasheado."""
        rt = RefreshToken(
            usuario_id=usuario_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.session.add(rt)
        self.session.flush()
        return rt

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        """Busca un refresh token válido (no expirado, no revocado)."""
        now = datetime.now(timezone.utc)
        return self.session.exec(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.expires_at > now,
                RefreshToken.revoked_at.is_(None),
            )
        ).first()

    def revocar(self, token_hash: str) -> None:
        """Revoca un refresh token (logout)."""
        rt = self.session.exec(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        ).first()
        if rt:
            rt.revoked_at = datetime.now(timezone.utc)
            self.session.add(rt)
            self.session.flush()

    def revocar_todos(self, usuario_id: int) -> None:
        """Revoca TODOS los refresh tokens de un usuario (logout de todas las sesiones)."""
        now = datetime.now(timezone.utc)
        tokens = self.session.exec(
            select(RefreshToken).where(
                RefreshToken.usuario_id == usuario_id,
                RefreshToken.revoked_at.is_(None),
            )
        ).all()
        for rt in tokens:
            rt.revoked_at = now
            self.session.add(rt)
        self.session.flush()
