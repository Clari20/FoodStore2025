from decimal import Decimal

from app.core.config import settings
from app.modules.pagos.service import PaymentService


class FakePreferenceClient:
    def __init__(self):
        self.created_data = None

    def create(self, data):
        self.created_data = data
        return {
            "status": 201,
            "response": {
                "id": "pref-123",
                "init_point": "https://mercadopago.test/checkout",
            },
        }


class FakePaymentClient:
    def get(self, payment_id):
        return {
            "status": 200,
            "response": {
                "id": payment_id,
                "status": "approved",
                "status_detail": "accredited",
                "merchant_order_id": 9001,
            },
        }


class FakeSdk:
    def __init__(self):
        self.preference_client = FakePreferenceClient()
        self.payment_client = FakePaymentClient()

    def preference(self):
        return self.preference_client

    def payment(self):
        return self.payment_client


def test_crear_preferencia_mp_envia_datos_del_pedido(monkeypatch):
    sdk = FakeSdk()
    service = PaymentService(uow=None)
    monkeypatch.setattr(service, "_get_sdk", lambda: sdk)
    monkeypatch.setattr(settings, "MP_WEBHOOK_URL", "https://api.test/pagos/webhook")

    result = service._crear_preferencia_mp(
        monto=Decimal("1250.50"),
        titulo="Pedido #77",
        pedido_id=77,
        back_urls={
            "success": "https://app.test/success",
            "failure": "https://app.test/failure",
            "pending": "https://app.test/pending",
        },
    )

    created_data = sdk.preference_client.created_data
    assert result["preference_id"] == "pref-123"
    assert result["init_point"] == "https://mercadopago.test/checkout"
    assert created_data["external_reference"] == "77"
    assert created_data["notification_url"] == "https://api.test/pagos/webhook"
    assert created_data["items"][0]["unit_price"] == 1250.50


def test_consultar_pago_mp_normaliza_respuesta():
    sdk = FakeSdk()
    service = PaymentService(uow=None)
    service._get_sdk = lambda: sdk

    result = service._consultar_pago_mp(123456)

    assert result == {
        "mp_payment_id": 123456,
        "mp_status": "approved",
        "mp_status_detail": "accredited",
        "mp_merchant_order_id": 9001,
    }
