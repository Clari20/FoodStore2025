"""
Dependencias de autenticación y autorización para inyectar vía Depends().

Flujo de resolución:
    Request
      → oauth2_scheme extrae el Bearer token de la cookie HttpOnly
      → get_current_user abre un UoW, decodifica el JWT, carga el usuario
      → require_role([...]) verifica que algún rol del usuario esté permitido

Separación semántica de errores HTTP:
    401 = no autenticado (sin token / token inválido / expirado)
    403 = autenticado pero sin permisos (rol insuficiente)

Capa: Core (dependencias transversales)
Conoce a: UoW, Security, Model
"""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_access_token
from app.core.uow import UnitOfWork, get_uow
from app.modules.usuarios.model import Usuario



class OAuth2PasswordBearerWithCookie(OAuth2PasswordBearer):
    async def __call__(self, request: Request) -> str | None:
        # 1. Obtener el token EXCLUSIVAMENTE de la cookie (HttpOnly)
        token = request.cookies.get("access_token")
        
        # 2. El soporte para el header Authorization fue deshabilitado.
        # Las cookies HttpOnly no pueden ser leídas por JavaScript (mitigando ataques XSS).
                
        if not token:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No autenticado",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else:
                return None
        return token

# Define el esquema OAuth2 que extrae el token de la cookie
oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl="/api/v1/auth/login")


    
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
) -> Usuario:
    """Decodifica el JWT y retorna el Usuario correspondiente."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    with uow:
        user = uow.usuarios.get_by_id(int(user_id))

    if user is None:
        raise credentials_exception

    # Pega el rol principal del JWT en el objeto para que el service pueda leerlo
    roles_from_jwt: list[str] = payload.get("roles", [])
    primary_role = "ADMIN" if "ADMIN" in roles_from_jwt else (roles_from_jwt[0] if roles_from_jwt else "")
    object.__setattr__(user, "role", primary_role)

    return user


def require_role(allowed_roles: list[str]):
    """
    Factory de dependencias para control de acceso basado en roles (RBAC).

    Ahora los roles vienen del JWT payload como lista.
    Verifica que haya INTERSECCIÓN entre los roles del usuario y los permitidos.

    Uso:
        @router.get("/admin/...", dependencies=[Depends(require_role(["ADMIN"]))])
    """
    async def role_checker(
        token: Annotated[str, Depends(oauth2_scheme)],
        current_user: Annotated[Usuario, Depends(get_current_user)],
    ) -> Usuario:
        payload = decode_access_token(token)
        user_roles: list[str] = payload.get("roles", []) if payload else []

        # ¿Hay al menos un rol en común?
        if not any(r in user_roles for r in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permisos insuficientes. Tus roles son {user_roles}. "
                    f"Se requiere uno de: {allowed_roles}"
                ),
            )
        return current_user

    return role_checker
