import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.employees.models import Department, Employee
from apps.users.models import User

pytestmark = pytest.mark.django_db


def test_me_requires_authentication():
    client = APIClient()

    response = client.get(reverse("me"))

    assert response.status_code == 401


def test_me_returns_user_without_employee():
    user = User.objects.create_user(
        email="admin@example.com", password="s3cret-pass", is_staff=True
    )
    client = APIClient()
    client.force_authenticate(user)

    response = client.get(reverse("me"))

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@example.com"
    assert data["is_staff"] is True
    assert data["employee"] is None


def test_me_returns_employee_summary_when_linked():
    department = Department.objects.create(name="Engineering", code="ENG")
    user = User.objects.create_user(email="jane@example.com", password="s3cret-pass")
    Employee.objects.create(
        user=user,
        employee_id="EMP-0001",
        department=department,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )
    client = APIClient()
    client.force_authenticate(user)

    response = client.get(reverse("me"))

    assert response.status_code == 200
    employee_data = response.json()["employee"]
    assert employee_data["employee_id"] == "EMP-0001"
    assert employee_data["department"] == "Engineering"


def test_logout_blacklists_refresh_token():
    user = User.objects.create_user(email="jane@example.com", password="s3cret-pass")
    refresh = RefreshToken.for_user(user)
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(reverse("logout"), {"refresh": str(refresh)})
    assert response.status_code == 205

    refresh_response = APIClient().post(
        reverse("token_refresh"), {"refresh": str(refresh)}
    )
    assert refresh_response.status_code == 401


def test_logout_requires_refresh_token():
    user = User.objects.create_user(email="jane@example.com", password="s3cret-pass")
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(reverse("logout"), {})

    assert response.status_code == 400
