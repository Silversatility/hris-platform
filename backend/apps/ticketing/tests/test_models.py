from datetime import timedelta

import pytest
from django.utils import timezone

from apps.employees.models import Department, Employee
from apps.ticketing.models import Ticket
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


def test_sla_due_at_set_on_create_from_priority(employee):
    before = timezone.now()
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001",
        requester=employee,
        subject="Laptop broken",
        priority=Ticket.Priority.URGENT,
    )

    expected_min = before + timedelta(hours=4)
    expected_max = timezone.now() + timedelta(hours=4)
    assert expected_min <= ticket.sla_due_at <= expected_max


def test_is_overdue_true_when_past_due_and_open(employee):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0002",
        requester=employee,
        subject="Laptop broken",
        priority=Ticket.Priority.LOW,
    )
    ticket.sla_due_at = timezone.now() - timedelta(hours=1)
    ticket.save(update_fields=["sla_due_at"])

    assert ticket.is_overdue is True


def test_is_overdue_false_once_resolved(employee):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0003",
        requester=employee,
        subject="Laptop broken",
        priority=Ticket.Priority.LOW,
        status=Ticket.Status.RESOLVED,
    )
    ticket.sla_due_at = timezone.now() - timedelta(hours=1)
    ticket.save(update_fields=["sla_due_at"])

    assert ticket.is_overdue is False
