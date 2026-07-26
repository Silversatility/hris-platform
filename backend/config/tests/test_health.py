import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


def test_health_check_returns_ok(api_client):
    url = reverse("health-check")

    response = api_client.get(url)

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
