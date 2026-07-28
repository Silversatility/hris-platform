"""
Thin wrapper around PayMongo's Batch Transfer API (POST /v2/batch_transfers),
used to disburse agent commissions to their PH bank account via InstaPay.

This requires a source_account already registered and verified for this
merchant on the PayMongo dashboard -- transfers will fail with a
"Source Account Not Found" style error until that's set up. Response field
names below are based on PayMongo's public docs, which don't show a full
example payload for this endpoint; if their actual response shape differs,
PayMongoError.response_body will show exactly what came back.
"""

import requests
from django.conf import settings

PAYMONGO_API_BASE = "https://api.paymongo.com/v2"


class PayMongoError(Exception):
    def __init__(self, message, response_body=None):
        super().__init__(message)
        self.response_body = response_body


def create_transfer(
    *,
    reference_number,
    destination_number,
    destination_name,
    destination_bic,
    destination_bank_name,
    amount,
    description="",
    provider="instapay",
):
    if not settings.PAYMONGO_SECRET_KEY:
        raise PayMongoError("PAYMONGO_SECRET_KEY is not configured.")
    if not settings.PAYMONGO_SOURCE_ACCOUNT_NUMBER:
        raise PayMongoError("PAYMONGO_SOURCE_ACCOUNT_NUMBER is not configured.")

    transfer = {
        "source_account": {
            "number": settings.PAYMONGO_SOURCE_ACCOUNT_NUMBER,
            "name": settings.PAYMONGO_SOURCE_ACCOUNT_NAME,
            "bic": settings.PAYMONGO_SOURCE_ACCOUNT_BIC,
            "bank_name": settings.PAYMONGO_SOURCE_ACCOUNT_BANK_NAME,
        },
        "destination_account": {
            "number": destination_number,
            "name": destination_name,
            "bic": destination_bic,
            "bank_name": destination_bank_name,
        },
        # PayMongo amounts are in centavos (100 = PHP 1.00), consistent with
        # their other APIs (e.g. Payment Intents).
        "amount": amount,
        "currency": "PHP",
        "provider": provider,
        "reference_number": reference_number,
        "description": description,
    }

    response = requests.post(
        f"{PAYMONGO_API_BASE}/batch_transfers",
        auth=(settings.PAYMONGO_SECRET_KEY, ""),
        json={"transfers": [transfer]},
        timeout=15,
    )

    if response.status_code >= 400:
        try:
            body = response.json()
            errors = body.get("errors") or []
            message = errors[0].get("detail") if errors else "PayMongo transfer failed."
        except ValueError:
            body = response.text
            message = "PayMongo transfer failed."
        raise PayMongoError(message, response_body=body)

    return response.json()


def extract_transfer_reference(result):
    """Best-effort pull of an id/reference out of the batch transfer response."""
    try:
        transfers = result["data"]["attributes"]["transfers"]
        return transfers[0].get("id", "")
    except (KeyError, IndexError, TypeError):
        pass
    try:
        return result["data"]["id"]
    except (KeyError, TypeError):
        return ""
