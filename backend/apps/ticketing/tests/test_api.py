import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.employees.models import Department, Employee
from apps.notifications.models import Notification
from apps.ticketing.models import Ticket, TicketComment
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def department():
    return Department.objects.create(name="Engineering", code="ENG")


@pytest.fixture
def staff_user():
    return User.objects.create_user(email="hr@example.com", password="s3cret-pass", is_staff=True)


@pytest.fixture
def employee(department):
    user = User.objects.create_user(email="jane@example.com", password="s3cret-pass")
    return Employee.objects.create(
        user=user,
        employee_id="EMP-0001",
        department=department,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )


@pytest.fixture
def other_employee(department):
    user = User.objects.create_user(email="bob@example.com", password="s3cret-pass")
    return Employee.objects.create(
        user=user,
        employee_id="EMP-0002",
        department=department,
        job_title="Designer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )


def test_employee_can_create_ticket_and_staff_is_notified(employee, staff_user):
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(
        reverse("ticket-list"),
        {
            "category": "it",
            "subject": "Laptop won't turn on",
            "description": "Tried charging overnight, still dead.",
            "priority": "high",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["ticket_number"].startswith("TKT-")
    assert data["status"] == "open"
    assert data["requester"] == employee.id
    assert Notification.objects.filter(recipient=staff_user, message__icontains="ticket").exists()


def test_ticket_number_increments(employee):
    client = APIClient()
    client.force_authenticate(employee.user)

    first = client.post(
        reverse("ticket-list"), {"subject": "First issue", "priority": "low"}
    ).json()
    second = client.post(
        reverse("ticket-list"), {"subject": "Second issue", "priority": "low"}
    ).json()

    assert first["ticket_number"] != second["ticket_number"]


def test_non_staff_cannot_assign_ticket(employee, other_employee):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001", requester=employee, subject="Issue"
    )
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(
        reverse("ticket-assign", args=[ticket.id]), {"assigned_to": other_employee.id}
    )

    assert response.status_code == 403


def test_staff_can_assign_ticket_and_requester_is_notified(employee, other_employee, staff_user):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001", requester=employee, subject="Issue"
    )
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("ticket-assign", args=[ticket.id]), {"assigned_to": other_employee.id}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["assigned_to"] == other_employee.id
    assert data["status"] == "in_progress"
    assert Notification.objects.filter(
        recipient=employee.user, message__icontains="assigned"
    ).exists()


def test_staff_can_resolve_ticket_and_requester_is_notified(employee, staff_user):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001",
        requester=employee,
        subject="Issue",
        status=Ticket.Status.IN_PROGRESS,
    )
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(reverse("ticket-resolve", args=[ticket.id]))

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "resolved"
    assert data["resolved_at"] is not None
    assert Notification.objects.filter(
        recipient=employee.user, message__icontains="resolved"
    ).exists()


def test_cannot_resolve_already_resolved_ticket(employee, staff_user):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001",
        requester=employee,
        subject="Issue",
        status=Ticket.Status.RESOLVED,
    )
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(reverse("ticket-resolve", args=[ticket.id]))

    assert response.status_code == 400


def test_requester_can_close_resolved_ticket(employee):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001",
        requester=employee,
        subject="Issue",
        status=Ticket.Status.RESOLVED,
    )
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(reverse("ticket-close", args=[ticket.id]))

    assert response.status_code == 200
    assert response.json()["status"] == "closed"


def test_cannot_close_ticket_that_isnt_resolved(employee):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001", requester=employee, subject="Issue"
    )
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(reverse("ticket-close", args=[ticket.id]))

    assert response.status_code == 400


def test_requester_can_reopen_closed_ticket(employee):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001",
        requester=employee,
        subject="Issue",
        status=Ticket.Status.CLOSED,
    )
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(reverse("ticket-reopen", args=[ticket.id]))

    assert response.status_code == 200
    assert response.json()["status"] == "open"


def test_unrelated_employee_cannot_view_others_ticket(employee, other_employee):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001", requester=employee, subject="Issue"
    )
    client = APIClient()
    client.force_authenticate(other_employee.user)

    response = client.get(reverse("ticket-detail", args=[ticket.id]))

    assert response.status_code == 404


def test_assignee_can_view_ticket(employee, other_employee):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001",
        requester=employee,
        subject="Issue",
        assigned_to=other_employee,
    )
    client = APIClient()
    client.force_authenticate(other_employee.user)

    response = client.get(reverse("ticket-detail", args=[ticket.id]))

    assert response.status_code == 200


def test_participant_can_comment(employee, staff_user):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001", requester=employee, subject="Issue"
    )
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(
        reverse("ticket-comment-list"), {"ticket": ticket.id, "body": "Any update?"}
    )

    assert response.status_code == 201
    assert TicketComment.objects.filter(ticket=ticket, author=employee.user).exists()


def test_non_participant_cannot_comment(employee, other_employee):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001", requester=employee, subject="Issue"
    )
    client = APIClient()
    client.force_authenticate(other_employee.user)

    response = client.post(
        reverse("ticket-comment-list"), {"ticket": ticket.id, "body": "Butting in"}
    )

    assert response.status_code == 403


def test_staff_comment_notifies_requester(employee, staff_user):
    ticket = Ticket.objects.create(
        ticket_number="TKT-2026-0001", requester=employee, subject="Issue"
    )
    client = APIClient()
    client.force_authenticate(staff_user)

    client.post(reverse("ticket-comment-list"), {"ticket": ticket.id, "body": "Looking into it"})

    assert Notification.objects.filter(
        recipient=employee.user, message__icontains="comment"
    ).exists()
