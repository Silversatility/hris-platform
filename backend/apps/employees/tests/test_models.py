import pytest
from django.db import IntegrityError

from apps.employees.models import Department, Employee
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def department():
    return Department.objects.create(name="Engineering", code="ENG")


@pytest.fixture
def user():
    return User.objects.create_user(email="jane@example.com", password="s3cret-pass")


def test_create_employee(department, branch, user):
    employee = Employee.objects.create(
        user=user,
        employee_id="EMP-0001",
        department=department,
        branch=branch,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )

    assert employee.status == Employee.Status.ACTIVE
    assert str(employee) == "EMP-0001 - jane@example.com"


def test_employee_manager_self_reference(department, branch, user):
    manager_user = User.objects.create_user(email="manager@example.com", password="s3cret-pass")
    manager = Employee.objects.create(
        user=manager_user,
        employee_id="EMP-0001",
        department=department,
        branch=branch,
        job_title="Engineering Manager",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2020-01-01",
    )
    report = Employee.objects.create(
        user=user,
        employee_id="EMP-0002",
        department=department,
        branch=branch,
        manager=manager,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )

    assert report.manager == manager
    assert manager.direct_reports.get() == report


def test_employee_id_is_unique(department, branch, user):
    Employee.objects.create(
        user=user,
        employee_id="EMP-0001",
        department=department,
        branch=branch,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )
    other_user = User.objects.create_user(email="other@example.com", password="s3cret-pass")

    with pytest.raises(IntegrityError):
        Employee.objects.create(
            user=other_user,
            employee_id="EMP-0001",
            department=department,
            branch=branch,
            job_title="Designer",
            employment_type=Employee.EmploymentType.FULL_TIME,
            hire_date="2026-01-15",
        )
