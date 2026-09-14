import os
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool
from app.core.database import get_session
from app.rate_limit.rate_limit_middleware import RateLimitMiddleware
from app.core.security import hash_password
from app.main import app
from app.modules.usuarios.model import Usuario
from app.modules.usuarios.rol_model import Rol, UsuarioRol

os.environ.setdefault("ENVIRONMENT", "test")

@pytest.fixture(name="engine_test", scope="session")
def engine_test_fixture():
    # Usamos PostgreSQL igual que producción 
    from app.core.config import settings
    engine = create_engine(
        settings.DATABASE_URL,
        echo=False,
    )
    yield engine
    engine.dispose()

@pytest.fixture(name="session", scope="function")
def session_fixture(engine_test):
    SQLModel.metadata.create_all(engine_test)
    with Session(engine_test) as session:
        yield session
        session.rollback()

@pytest.fixture(name="client", scope="function")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override

    try:
        RateLimitMiddleware.reset_all_limiters()
    except Exception:
        pass

    _create_test_admin(session)

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()

def _create_test_admin(session: Session) -> None:
    # Crear rol ADMIN si no existe
    rol = session.exec(select(Rol).where(Rol.codigo == "ADMIN")).first()
    if not rol:
        session.add(Rol(codigo="ADMIN", nombre="Administrador", descripcion="Acceso total"))
        session.commit()

    # Crear usuario admin si no existe
    existing = session.exec(select(Usuario).where(Usuario.email == "admin@foodstore.com")).first()
    if existing:
        return

    admin = Usuario(
        nombre="Administrador",
        apellido="Test",
        email="admin@foodstore.com",
        password_hash=hash_password("admin"),
    )
    session.add(admin)
    session.flush()
    session.add(UsuarioRol(usuario_id=admin.id, rol_codigo="ADMIN"))
    session.commit()

@pytest.fixture(name="admin_auth_headers")
def admin_auth_headers_fixture(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@foodstore.com", "password": "admin"},
    )
    assert response.status_code == 200, f"Login admin falló: {response.text}"
    token = response.cookies.get("access_token")
    return {"Cookie": f"access_token={token}"}

@pytest.fixture(name="client_auth_headers")
def client_auth_headers_fixture(client: TestClient) -> dict:
    # Registrar usuario cliente
    client.post("/api/v1/auth/register", json={
        "nombre": "Cliente", "apellido": "Test",
        "email": "cliente@test.com", "password": "cliente123"
    })
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "cliente@test.com", "password": "cliente123"},
    )
    token = response.cookies.get("access_token")
    return {"Cookie": f"access_token={token}"}