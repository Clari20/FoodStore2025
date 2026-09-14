"""Servicio de autenticación."""
from app.modules.usuarios.direccion_model import DireccionEntrega
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, hash_token,
)
from app.core.uow import UnitOfWork
from app.modules.usuarios.model import Usuario
from app.modules.auth.schemas import LoginRequest, UserCreate, UserPublic, TokenResponse


def authenticate_user(uow: UnitOfWork, data: LoginRequest) -> TokenResponse:
    """Autentica usuario, genera access + refresh token."""
    with uow:
        user = uow.usuarios.get_by_email(data.email)

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Soft-delete = cuenta desactivada
        if user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cuenta de usuario desactivada",
            )

        # Obtener roles activos para meterlos en el JWT
        roles = uow.usuario_roles.get_roles_activos(user.id)

        # Access token con roles en el payload
        access_token = create_access_token(data={
            "sub": str(user.id),
            "roles": roles,
        })

        # Refresh token — se guarda el hash en BD
        refresh_token_plain = create_refresh_token()
        refresh_token_hash = hash_token(refresh_token_plain)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        uow.refresh_tokens.crear(
            usuario_id=user.id,
            token_hash=refresh_token_hash,
            expires_at=expires_at,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_plain,  # se envía al cliente UNA vez
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


def refresh_access_token(uow: UnitOfWork, refresh_token_plain: str) -> TokenResponse:
    """Renueva el access token usando un refresh token válido."""
    with uow:
        token_hash = hash_token(refresh_token_plain)
        rt = uow.refresh_tokens.get_by_hash(token_hash)

        if rt is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o expirado",
            )

        user = uow.usuarios.get_by_id(rt.usuario_id)
        if user is None or user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado o desactivado",
            )

        # Rotación: revocar el refresh token usado y crear uno nuevo
        uow.refresh_tokens.revocar(token_hash)

        roles = uow.usuario_roles.get_roles_activos(user.id)

        new_access = create_access_token(data={
            "sub": str(user.id),
            "roles": roles,
        })

        new_refresh_plain = create_refresh_token()
        new_refresh_hash = hash_token(new_refresh_plain)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        uow.refresh_tokens.crear(
            usuario_id=user.id,
            token_hash=new_refresh_hash,
            expires_at=expires_at,
        )

        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh_plain,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


def register_user(uow: UnitOfWork, data: UserCreate) -> UserPublic:
    """Registra un nuevo usuario con rol CLIENT y retorna la vista pública."""
    with uow:
        if uow.usuarios.get_by_email(data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El email ya está registrado",
            )

        user = Usuario(
            nombre=data.nombre,
            apellido=data.apellido,
            email=data.email,
            celular=data.celular,
            password_hash=hash_password(data.password),
        )
        uow.usuarios.add(user)
        uow.session.flush() # Flush para tener el ID

        # Guardar la dirección
        direccion_data = data.direccion.model_dump(exclude_unset=True)
        alias = direccion_data.get("alias")
        if not alias or not alias.strip():
            direccion_data["alias"] = "Casa"
        direccion_data["es_principal"] = True
        direccion = DireccionEntrega(
            usuario_id=user.id,
            **direccion_data
        )
        uow.direcciones.add(direccion)

        # Asignar rol CLIENT por defecto
        uow.usuario_roles.asignar_rol(
            usuario_id=user.id,
            rol_codigo="CLIENT",
        )

        roles = uow.usuario_roles.get_roles_activos(user.id)

        return UserPublic(
            id=user.id,
            nombre=user.nombre,
            apellido=user.apellido,
            email=user.email,
            celular=user.celular,
            roles=roles,
        )