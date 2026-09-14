import pytest
from pydantic import ValidationError

from app.modules.pedidos.schemas import AvanzarEstadoRequest
from app.modules.pedidos.service import EVENTOS_WS, FSM_TRANSITIONS, ROLE_TRANSITIONS


def test_cancelacion_de_pedido_requiere_motivo():
    with pytest.raises(ValidationError):
        AvanzarEstadoRequest(estado_hacia="CANCELADO")


def test_cancelacion_de_pedido_acepta_motivo():
    request = AvanzarEstadoRequest(
        estado_hacia="CANCELADO",
        motivo="Cliente solicito cancelar",
    )

    assert request.estado_hacia == "CANCELADO"
    assert request.motivo == "Cliente solicito cancelar"


def test_fsm_permite_transiciones_operativas_actuales():
    assert FSM_TRANSITIONS["PENDIENTE"] == ["CONFIRMADO", "CANCELADO"]
    assert "EN_PREP" in FSM_TRANSITIONS["CONFIRMADO"]
    assert "ENTREGADO" in FSM_TRANSITIONS["EN_CAMINO"]


def test_roles_operativos_tienen_transiciones_acotadas():
    assert ROLE_TRANSITIONS["ADMIN"] is FSM_TRANSITIONS
    assert ROLE_TRANSITIONS["CAJERO"]["PENDIENTE"] == ["CONFIRMADO", "CANCELADO"]
    assert ROLE_TRANSITIONS["COCINA_STOCK"]["CONFIRMADO"] == ["EN_PREP"]


def test_eventos_ws_cubren_estados_de_pedido():
    for estado in ("PENDIENTE", "CONFIRMADO", "EN_PREP", "LISTO", "EN_CAMINO", "ENTREGADO", "CANCELADO"):
        assert estado in EVENTOS_WS
