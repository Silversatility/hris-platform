import pytest

from apps.certificates.models import COERequest
from apps.employees.models import Department, Employee
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def employee(branch):
    department = Department.objects.create(name="Engineering", code="ENG")
    user = User.objects.create_user(email="jane@example.com", password="s3cret-pass")
    return Employee.objects.create(
        user=user,
        employee_id="EMP-0001",
        department=department,
        branch=branch,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )


def test_defaults_to_pending(employee):
    coe_request = COERequest.objects.create(employee=employee)

    assert coe_request.status == COERequest.Status.PENDING


def test_str_includes_employee_id_and_status(employee):
    coe_request = COERequest.objects.create(employee=employee)

    assert str(coe_request) == "EMP-0001 COE request (pending)"
