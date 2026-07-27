"""
Thin wrapper around Xendit's Disbursements API (POST /disbursements).

Field names here were confirmed empirically against a live sandbox account
rather than from Xendit's public docs, which were inconsistent with actual
API behavior at the time this was written (2026-07). If Xendit changes
their schema, the error message surfaced by XenditError will show exactly
what their API is complaining about.
"""

import requests
from django.conf import settings

XENDIT_API_BASE = "https://api.xendit.co"


class XenditError(Exception):
    def __init__(self, message, response_body=None):
        super().__init__(message)
        self.response_body = response_body


def create_disbursement(
    *, reference_id, channel_code, account_name, account_number, amount, description
):
    if not settings.XENDIT_SECRET_KEY:
        raise XenditError("XENDIT_SECRET_KEY is not configured.")

    payload = {
        "reference_id": reference_id,
        "channel_code": channel_code,
        "account_name": account_name,
        "account_number": account_number,
        "amount": amount,
        "currency": "PHP",
        "description": description,
    }

    response = requests.post(
        f"{XENDIT_API_BASE}/disbursements",
        auth=(settings.XENDIT_SECRET_KEY, ""),
        json=payload,
        timeout=15,
    )

    if response.status_code >= 400:
        try:
            body = response.json()
            message = body.get("message", "Xendit disbursement failed.")
        except ValueError:
            body = response.text
            message = "Xendit disbursement failed."
        raise XenditError(message, response_body=body)

    return response.json()
