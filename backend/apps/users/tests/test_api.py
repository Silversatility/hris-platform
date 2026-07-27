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


def test_can_update_own_name_and_contact_info():
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

    response = client.patch(
        reverse("me"),
        {
            "first_name": "Jane",
            "last_name": "Doe",
            "phone_number": "+15550001111",
            "personal_email": "jane.personal@example.com",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Jane"
    assert data["last_name"] == "Doe"
    user.refresh_from_db()
    user.employee.refresh_from_db()
    assert user.employee.phone_number == "+15550001111"
    assert user.employee.personal_email == "jane.personal@example.com"


def test_can_update_own_bank_details():
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

    response = client.patch(
        reverse("me"),
        {
            "bank_name": "BDO",
            "bank_account_number": "001234567890",
            "bank_account_holder_name": "Jane Doe",
        },
    )

    assert response.status_code == 200
    user.employee.refresh_from_db()
    assert user.employee.bank_name == "BDO"
    assert user.employee.bank_account_number == "001234567890"
    assert user.employee.bank_account_holder_name == "Jane Doe"


def test_self_update_cannot_change_employment_fields():
    department = Department.objects.create(name="Engineering", code="ENG")
    user = User.objects.create_user(email="jane@example.com", password="s3cret-pass")
    employee = Employee.objects.create(
        user=user,
        employee_id="EMP-0001",
        department=department,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )
    client = APIClient()
    client.force_authenticate(user)

    response = client.patch(reverse("me"), {"job_title": "CEO", "salary": "999999.00"})

    assert response.status_code == 200
    employee.refresh_from_db()
    assert employee.job_title == "Software Engineer"
    assert employee.salary is None


def test_change_password_success():
    user = User.objects.create_user(email="jane@example.com", password="old-pass-123")
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(
        reverse("change-password"),
        {"old_password": "old-pass-123", "new_password": "brand-new-pass-456"},
    )

    assert response.status_code == 204
    user.refresh_from_db()
    assert user.check_password("brand-new-pass-456")


def test_change_password_rejects_wrong_old_password():
    user = User.objects.create_user(email="jane@example.com", password="old-pass-123")
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(
        reverse("change-password"),
        {"old_password": "wrong-password", "new_password": "brand-new-pass-456"},
    )

    assert response.status_code == 400
    user.refresh_from_db()
    assert user.check_password("old-pass-123")


def test_change_password_rejects_weak_new_password():
    user = User.objects.create_user(email="jane@example.com", password="old-pass-123")
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(
        reverse("change-password"),
        {"old_password": "old-pass-123", "new_password": "12345678"},
    )

    assert response.status_code == 400
