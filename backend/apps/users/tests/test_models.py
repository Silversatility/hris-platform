import pytest
from django.db import IntegrityError

from apps.users.models import User

pytestmark = pytest.mark.django_db


def test_create_user_normalizes_email_and_sets_password():
    user = User.objects.create_user(email="Jane@Example.com", password="s3cret-pass")

    assert user.email == "Jane@example.com"
    assert user.check_password("s3cret-pass")
    assert not user.is_staff
    assert not user.is_superuser


def test_create_user_requires_email():
    with pytest.raises(ValueError):
        User.objects.create_user(email="", password="s3cret-pass")


def test_create_superuser_sets_staff_and_superuser_flags():
    admin = User.objects.create_superuser(email="admin@example.com", password="s3cret-pass")

    assert admin.is_staff
    assert admin.is_superuser


def test_email_is_unique():
    User.objects.create_user(email="dup@example.com", password="s3cret-pass")

    with pytest.raises(IntegrityError):
        User.objects.create_user(email="dup@example.com", password="other-pass")


def test_str_returns_email():
    user = User.objects.create_user(email="jane@example.com", password="s3cret-pass")

    assert str(user) == "jane@example.com"
