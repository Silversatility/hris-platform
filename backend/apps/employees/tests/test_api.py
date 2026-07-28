import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.employees.models import Branch, Department, Employee
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
def employee(department, branch, regular_user):
    return Employee.objects.create(
        user=regular_user,
        employee_id="EMP-0001",
        department=department,
        branch=branch,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )


@pytest.fixture
def other_employee(department, branch, other_user):
    return Employee.objects.create(
        user=other_user,
        employee_id="EMP-0002",
        department=department,
        branch=branch,
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


def test_regular_user_cannot_create_employee(regular_user, department, branch):
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.post(
        reverse("employee-list"),
        {
            "email": "newhire@example.com",
            "password": "s3cret-pass",
            "department": department.id,
            "branch": branch.id,
            "job_title": "Designer",
            "employment_type": Employee.EmploymentType.FULL_TIME,
            "hire_date": "2026-01-15",
        },
    )

    assert response.status_code == 403


def test_staff_can_create_employee_and_it_creates_a_user(staff_user, department, branch):
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
            "branch": branch.id,
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


def test_create_employee_requires_password(staff_user, department, branch):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("employee-list"),
        {
            "email": "newhire@example.com",
            "department": department.id,
            "branch": branch.id,
            "job_title": "Designer",
            "employment_type": Employee.EmploymentType.FULL_TIME,
            "hire_date": "2026-01-15",
        },
    )

    assert response.status_code == 400


def test_create_employee_rejects_duplicate_email(staff_user, department, branch, regular_user):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("employee-list"),
        {
            "email": regular_user.email,
            "password": "s3cret-pass",
            "department": department.id,
            "branch": branch.id,
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


def test_staff_can_set_employee_bank_details(staff_user, employee):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.patch(
        reverse("employee-detail", args=[employee.id]),
        {
            "bank_name": "BPI",
            "bank_account_number": "009988776655",
            "bank_account_holder_name": "Jane Santos",
        },
    )

    assert response.status_code == 200
    employee.refresh_from_db()
    assert employee.bank_name == "BPI"
    assert employee.bank_account_number == "009988776655"
    assert employee.bank_account_holder_name == "Jane Santos"


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
    assert response.json()["employee_count"] == 0


def test_department_list_includes_employee_count(staff_user, department, employee, other_employee):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.get(reverse("department-list"))

    results = {row["code"]: row for row in response.json()["results"]}
    assert results["ENG"]["employee_count"] == 2


def test_staff_can_update_department(staff_user, department):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.patch(
        reverse("department-detail", args=[department.id]), {"is_active": False}
    )

    assert response.status_code == 200
    department.refresh_from_db()
    assert department.is_active is False


def test_staff_can_delete_empty_department(staff_user):
    department = Department.objects.create(name="Sales", code="SLS")
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.delete(reverse("department-detail", args=[department.id]))

    assert response.status_code == 204
    assert not Department.objects.filter(id=department.id).exists()


def test_cannot_delete_department_with_employees(staff_user, department, employee):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.delete(reverse("department-detail", args=[department.id]))

    assert response.status_code == 400
    assert Department.objects.filter(id=department.id).exists()
    assert "still has employees" in response.json()[0]


def test_non_staff_cannot_create_branch(regular_user):
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.post(reverse("branch-list"), {"name": "Branch 2", "code": "BR2"})

    assert response.status_code == 403


def test_staff_can_create_branch(staff_user):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("branch-list"),
        {"name": "Branch 2", "code": "BR2", "address": "123 Second St."},
    )

    assert response.status_code == 201
    assert response.json()["code"] == "BR2"


def test_branch_list_includes_employee_count(staff_user, branch, employee, other_employee):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.get(reverse("branch-list"))

    results = {row["code"]: row for row in response.json()["results"]}
    assert results["MAIN"]["employee_count"] == 2


def test_staff_can_update_branch(staff_user, branch):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.patch(reverse("branch-detail", args=[branch.id]), {"is_active": False})

    assert response.status_code == 200
    branch.refresh_from_db()
    assert branch.is_active is False


def test_staff_can_delete_empty_branch(staff_user):
    extra_branch = Branch.objects.create(name="Branch 2", code="BR2")
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.delete(reverse("branch-detail", args=[extra_branch.id]))

    assert response.status_code == 204
    assert not Branch.objects.filter(id=extra_branch.id).exists()


def test_cannot_delete_branch_with_employees(staff_user, branch, employee):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.delete(reverse("branch-detail", args=[branch.id]))

    assert response.status_code == 400
    assert Branch.objects.filter(id=branch.id).exists()
    assert "still has employees" in response.json()[0]


def test_employee_list_can_filter_by_branch(staff_user, employee, other_employee):
    other_branch = Branch.objects.create(name="Branch 2", code="BR2")
    other_employee.branch = other_branch
    other_employee.save(update_fields=["branch"])
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.get(reverse("employee-list"), {"branch": other_branch.id})

    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["id"] == other_employee.id
