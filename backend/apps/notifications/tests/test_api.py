import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.notifications.models import Notification, notify
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(email="jane@example.com", password="s3cret-pass")


@pytest.fixture
def other_user():
    return User.objects.create_user(email="bob@example.com", password="s3cret-pass")


def test_user_only_sees_own_notifications(user, other_user):
    notify(user, "For jane")
    notify(other_user, "For bob")
    client = APIClient()
    client.force_authenticate(user)

    response = client.get(reverse("notification-list"))

    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["message"] == "For jane"


def test_unread_count(user):
    notify(user, "One")
    notify(user, "Two")
    read = notify(user, "Three")
    read.is_read = True
    read.save(update_fields=["is_read"])
    client = APIClient()
    client.force_authenticate(user)

    response = client.get(reverse("notification-unread-count"))

    assert response.status_code == 200
    assert response.json()["unread_count"] == 2


def test_mark_read(user):
    notification = notify(user, "Hello")
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(reverse("notification-mark-read", args=[notification.id]))

    assert response.status_code == 200
    notification.refresh_from_db()
    assert notification.is_read is True


def test_mark_all_read(user):
    notify(user, "One")
    notify(user, "Two")
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(reverse("notification-mark-all-read"))

    assert response.status_code == 200
    assert Notification.objects.filter(recipient=user, is_read=False).count() == 0


def test_user_cannot_mark_others_notification_read(user, other_user):
    notification = notify(other_user, "Not yours")
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(reverse("notification-mark-read", args=[notification.id]))

    assert response.status_code == 404


def test_anonymous_cannot_list_notifications():
    client = APIClient()

    response = client.get(reverse("notification-list"))

    assert response.status_code == 401
