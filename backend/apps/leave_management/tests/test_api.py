from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.employees.models import Department, Employee
from apps.leave_management.models import LeaveBalance, LeaveRequest, LeaveType
from apps.notifications.models import Notification
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def department():
    return Department.objects.create(name="Engineering", code="ENG")


@pytest.fixture
def leave_type():
    return LeaveType.objects.create(name="Vacation", code="VAC", default_annual_days=15)


@pytest.fixture
def manager(department):
    user = User.objects.create_user(email="manager@example.com", password="s3cret-pass")
    return Employee.objects.create(
        user=user,
        employee_id="EMP-0001",
        department=department,
        job_title="Engineering Manager",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2020-01-01",
    )


@pytest.fixture
def employee(department, manager):
    user = User.objects.create_user(email="jane@example.com", password="s3cret-pass")
    return Employee.objects.create(
        user=user,
        employee_id="EMP-0002",
        department=department,
        manager=manager,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )


@pytest.fixture
def balance(employee, leave_type):
    return LeaveBalance.objects.create(
        employee=employee,
        leave_type=leave_type,
        year=2026,
        allocated_days=Decimal("15"),
    )


def test_employee_can_create_own_leave_request(employee, manager, leave_type):
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(
        reverse("leave-request-list"),
        {
            "leave_type": leave_type.id,
            "start_date": "2026-08-03",
            "end_date": "2026-08-07",
            "reason": "Family trip",
        },
    )

    assert response.status_code == 201
    assert response.json()["employee"] == employee.id
    assert response.json()["status"] == "pending"
    assert Notification.objects.filter(recipient=manager.user).exists()


def test_manager_can_approve_and_balance_is_deducted(employee, manager, leave_type, balance):
    leave_request = LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )
    client = APIClient()
    client.force_authenticate(manager.user)

    response = client.post(reverse("leave-request-approve", args=[leave_request.id]))

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    balance.refresh_from_db()
    assert balance.used_days == Decimal("5")
    assert Notification.objects.filter(
        recipient=employee.user, message__icontains="approved"
    ).exists()


def test_approve_fails_when_balance_insufficient(employee, manager, leave_type):
    LeaveBalance.objects.create(
        employee=employee, leave_type=leave_type, year=2026, allocated_days=Decimal("2")
    )
    leave_request = LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )
    client = APIClient()
    client.force_authenticate(manager.user)

    response = client.post(reverse("leave-request-approve", args=[leave_request.id]))

    assert response.status_code == 400
    leave_request.refresh_from_db()
    assert leave_request.status == LeaveRequest.Status.PENDING


def test_unrelated_employee_cannot_approve(department, employee, leave_type, balance):
    outsider_user = User.objects.create_user(email="outsider@example.com", password="s3cret-pass")
    Employee.objects.create(
        user=outsider_user,
        employee_id="EMP-0099",
        department=department,
        job_title="Designer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )
    leave_request = LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )
    client = APIClient()
    client.force_authenticate(outsider_user)

    response = client.post(reverse("leave-request-approve", args=[leave_request.id]))

    assert response.status_code in (403, 404)


def test_employee_can_cancel_own_pending_request(employee, leave_type):
    leave_request = LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(reverse("leave-request-cancel", args=[leave_request.id]))

    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


def test_list_includes_display_names(manager, employee, leave_type):
    LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )
    client = APIClient()
    client.force_authenticate(manager.user)

    response = client.get(reverse("leave-request-list"))

    result = response.json()["results"][0]
    assert result["employee_display_name"] == "jane@example.com"
    assert result["leave_type_name"] == "Vacation"
    assert result["reviewed_by_name"] is None


def test_approve_sets_reviewed_by_name(employee, manager, leave_type, balance):
    manager.user.first_name = "Mandy"
    manager.user.last_name = "Ager"
    manager.user.save()
    leave_request = LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )
    client = APIClient()
    client.force_authenticate(manager.user)

    response = client.post(reverse("leave-request-approve", args=[leave_request.id]))

    assert response.json()["reviewed_by_name"] == "Mandy Ager"


@pytest.fixture
def vp(department):
    user = User.objects.create_user(email="vp@example.com", password="s3cret-pass")
    return Employee.objects.create(
        user=user,
        employee_id="EMP-0000",
        department=department,
        job_title="VP of Engineering",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2018-01-01",
    )


def test_skip_level_manager_can_approve(employee, manager, vp, leave_type, balance):
    manager.manager = vp
    manager.save(update_fields=["manager"])
    leave_request = LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )
    client = APIClient()
    client.force_authenticate(vp.user)

    response = client.post(reverse("leave-request-approve", args=[leave_request.id]))

    assert response.status_code == 200
    assert response.json()["status"] == "approved"


def test_skip_level_manager_sees_request_in_list(employee, manager, vp, leave_type):
    manager.manager = vp
    manager.save(update_fields=["manager"])
    LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )
    client = APIClient()
    client.force_authenticate(vp.user)

    response = client.get(reverse("leave-request-list"))

    assert response.json()["count"] == 1


def test_manager_can_reject_and_employee_is_notified(employee, manager, leave_type):
    leave_request = LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=date(2026, 8, 3),
        end_date=date(2026, 8, 7),
    )
    client = APIClient()
    client.force_authenticate(manager.user)

    response = client.post(reverse("leave-request-reject", args=[leave_request.id]))

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert Notification.objects.filter(
        recipient=employee.user, message__icontains="rejected"
    ).exists()
