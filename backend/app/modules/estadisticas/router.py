from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user, require_role
from app.core.uow import UnitOfWork, get_uow
from app.modules.estadisticas.schemas import DashboardEstadisticas
from app.modules.estadisticas.service import EstadisticasService
from app.modules.usuarios.model import Usuario


router = APIRouter(prefix="/api/v1/estadisticas", tags=["Estadísticas"])


@router.get(
    "/dashboard",
    response_model=DashboardEstadisticas,
    dependencies=[Depends(require_role(["ADMIN", "SUPERADMIN"]))]
)
def obtener_dashboard_estadisticas(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    """
    Retorna los datos agregados para el dashboard (solo admins).
    """
    return EstadisticasService(uow).obtener_dashboard()
