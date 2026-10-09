"""The payment gateway (plan §10.3): an interface and its mock. No network call is made
and no card number exists anywhere: the guest picks one of two saved test cards."""

import uuid
from typing import Literal, Protocol

PaymentMethod = Literal["demo_card_ok", "demo_card_declined"]


class PaymentDeclined(Exception):
    pass


class PaymentGateway(Protocol):
    def charge(self, amount_minor: int, method: str) -> str:
        """Take the payment and return the gateway's reference, or raise PaymentDeclined."""
        ...


class MockGateway:
    """`demo_card_ok` always approves; `demo_card_declined` always declines."""

    def charge(self, amount_minor: int, method: str) -> str:
        if method != "demo_card_ok":
            raise PaymentDeclined(method)
        return f"mock_{uuid.uuid4().hex}"


def get_payment_gateway() -> PaymentGateway:
    return MockGateway()
