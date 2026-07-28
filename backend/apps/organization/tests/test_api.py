import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from apps.organization.models import SiteSettings
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def staff_user():
    return User.objects.create_user(email="hr@example.com", password="s3cret-pass", is_staff=True)


@pytest.fixture
def regular_user():
    return User.objects.create_user(email="jane@example.com", password="s3cret-pass")


def tiny_png():
    buffer = io.BytesIO()
    Image.new("RGBA", (1, 1)).save(buffer, format="PNG")
    return SimpleUploadedFile("logo.png", buffer.getvalue(), content_type="image/png")


def test_get_returns_empty_logo_by_default():
    client = APIClient()
    client.force_authenticate(User.objects.create_user(email="a@example.com", password="pw"))

    response = client.get(reverse("site-settings"))

    assert response.status_code == 200
    assert response.data["logo"] is None


def test_non_staff_cannot_upload_logo(regular_user):
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.patch(
        reverse("site-settings"),
        {"logo": tiny_png()},
        format="multipart",
    )

    assert response.status_code == 403


def test_staff_can_upload_logo(staff_user):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.patch(
        reverse("site-settings"),
        {"logo": tiny_png()},
        format="multipart",
    )

    assert response.status_code == 200
    assert response.data["logo"]
    assert SiteSettings.load().logo.name


def test_staff_can_remove_logo(staff_user):
    client = APIClient()
    client.force_authenticate(staff_user)
    client.patch(reverse("site-settings"), {"logo": tiny_png()}, format="multipart")

    response = client.delete(reverse("site-settings"))

    assert response.status_code == 200
    assert response.data["logo"] is None
    assert not SiteSettings.load().logo
