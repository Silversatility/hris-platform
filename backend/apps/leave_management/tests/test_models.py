from datetime import date
from decimal import Decimal

import pytest

from apps.employees.models import Department, Employee
from apps.leave_management.models import LeaveBalance, LeaveRequest, LeaveType
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


@pytest.fixture
def leave_type():
    return LeaveType.objects.create(name="Vacation", code="VAC", default_annual_days=15)


def test_days_requested_is_computed_on_save(employee, leave_type):
    leave_request = LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )

    assert leave_request.days_requested == Decimal("5")
    assert leave_request.status == LeaveRequest.Status.PENDING


def test_leave_balance_remaining_days(employee, leave_type):
    balance = LeaveBalance.objects.create(
        employee=employee,
        leave_type=leave_type,
        year=2026,
        allocated_days=Decimal("15"),
        used_days=Decimal("4"),
    )

    assert balance.remaining_days == Decimal("11")
