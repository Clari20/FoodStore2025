"""Schemas Pydantic para autenticación."""
from pydantic import BaseModel, EmailStr, Field
from app.modules.direcciones.schemas import DireccionCreate


class LoginRequest(BaseModel):
    """Request body para login."""
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    """Datos requeridos para registrar un usuario."""
    nombre: str = Field(min_length=1, max_length=80)
    apellido: str = Field(min_length=1, max_length=80)
    email: EmailStr
    celular: str = Field(default="", max_length=20)
    password: str = Field(min_length=8)
    
    # Datos de dirección anidados
    direccion: DireccionCreate

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):

    """Vista pública del usuario — excluye password_hash."""
    id: int
    nombre: str
    apellido: str
    email: str
    celular: str
    roles: list[str] = []

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    """Respuesta pública del login/refresh. Los tokens van solo en cookies."""
    expires_in: int
    user: UserPublic


class TokenResponse(BaseModel):
    """Respuesta interna del service (access + refresh)."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserUpdateMe(BaseModel):
    """Datos permitidos para actualizar el propio perfil."""
    nombre: str = Field(min_length=1, max_length=80)
    apellido: str = Field(min_length=1, max_length=80)
    celular: str = Field(default="", max_length=20)
