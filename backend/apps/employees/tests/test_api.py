import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.employees.models import Department, Employee
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def department():
    return Department.objects.create(name="Engineering", code="ENG")


@pytest.fixture
def staff_user():
    return User.objects.create_user(email="hr@example.com", password="s3cret-pass", is_staff=True)


@pytest.fixture
def regular_user():
    return User.objects.create_user(email="jane@example.com", password="s3cret-pass")


@pytest.fixture
def other_user():
    return User.objects.create_user(email="bob@example.com", password="s3cret-pass")


@pytest.fixture
def employee(department, regular_user):
    return Employee.objects.create(
        user=regular_user,
        employee_id="EMP-0001",
        department=department,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )


@pytest.fixture
def other_employee(department, other_user):
    return Employee.objects.create(
        user=other_user,
        employee_id="EMP-0002",
        department=department,
        job_title="Designer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )


def test_list_requires_authentication():
    client = APIClient()

    response = client.get(reverse("employee-list"))

    assert response.status_code == 401


def test_regular_user_only_sees_own_employee(regular_user, employee, other_employee):
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.get(reverse("employee-list"))

    assert response.status_code == 200
    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["employee_id"] == "EMP-0001"


def test_staff_sees_all_employees(staff_user, employee, other_employee):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.get(reverse("employee-list"))

    assert response.status_code == 200
    assert response.json()["count"] == 2


def test_list_includes_department_and_manager_display_names(
    staff_user, department, employee, other_employee
):
    other_employee.manager = employee
    other_employee.save(update_fields=["manager"])
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.get(reverse("employee-list"))

    results = {row["employee_id"]: row for row in response.json()["results"]}
    assert results["EMP-0001"]["department_name"] == "Engineering"
    assert results["EMP-0001"]["manager_name"] is None
    assert results["EMP-0002"]["manager_name"] == employee.user.email


def test_regular_user_cannot_access_other_employee_detail(regular_user, other_employee):
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.get(reverse("employee-detail", args=[other_employee.id]))

    assert response.status_code == 404


def test_regular_user_cannot_create_employee(regular_user, department):
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.post(
        reverse("employee-list"),
        {
            "email": "newhire@example.com",
            "password": "s3cret-pass",
            "department": department.id,
            "job_title": "Designer",
            "employment_type": Employee.EmploymentType.FULL_TIME,
            "hire_date": "2026-01-15",
        },
    )

    assert response.status_code == 403


def test_staff_can_create_employee_and_it_creates_a_user(staff_user, department):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("employee-list"),
        {
            "email": "newhire@example.com",
            "first_name": "New",
            "last_name": "Hire",
            "password": "s3cret-pass",
            "department": department.id,
            "job_title": "Designer",
            "employment_type": Employee.EmploymentType.FULL_TIME,
            "hire_date": "2026-01-15",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["employee_id"].startswith("EMP-")
    assert data["user_email"] == "newhire@example.com"
    new_user = User.objects.get(email="newhire@example.com")
    assert new_user.check_password("s3cret-pass")


def test_create_employee_requires_password(staff_user, department):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("employee-list"),
        {
            "email": "newhire@example.com",
            "department": department.id,
            "job_title": "Designer",
            "employment_type": Employee.EmploymentType.FULL_TIME,
            "hire_date": "2026-01-15",
        },
    )

    assert response.status_code == 400


def test_create_employee_rejects_duplicate_email(staff_user, department, regular_user):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("employee-list"),
        {
            "email": regular_user.email,
            "password": "s3cret-pass",
            "department": department.id,
            "job_title": "Designer",
            "employment_type": Employee.EmploymentType.FULL_TIME,
            "hire_date": "2026-01-15",
        },
    )

    assert response.status_code == 400


def test_staff_can_update_employee(staff_user, employee):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.patch(
        reverse("employee-detail", args=[employee.id]), {"job_title": "Staff Engineer"}
    )

    assert response.status_code == 200
    employee.refresh_from_db()
    assert employee.job_title == "Staff Engineer"


def test_staff_can_delete_employee(staff_user, employee):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.delete(reverse("employee-detail", args=[employee.id]))

    assert response.status_code == 204
    assert not Employee.objects.filter(id=employee.id).exists()


def test_regular_user_can_read_departments(regular_user, department):
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.get(reverse("department-list"))

    assert response.status_code == 200


def test_regular_user_cannot_create_department(regular_user):
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.post(reverse("department-list"), {"name": "Sales", "code": "SLS"})

    assert response.status_code == 403


def test_staff_can_create_department(staff_user):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(reverse("department-list"), {"name": "Sales", "code": "SLS"})

    assert response.status_code == 201
