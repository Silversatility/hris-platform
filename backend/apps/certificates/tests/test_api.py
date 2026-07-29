import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.certificates.models import COERequest
from apps.employees.models import Department, Employee
from apps.notifications.models import Notification
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def department():
    return Department.objects.create(name="Engineering", code="ENG")


@pytest.fixture
def staff_user():
    return User.objects.create_user(email="hr@example.com", password="s3cret-pass", is_staff=True)


@pytest.fixture
def staff_employee(department, branch, staff_user):
    return Employee.objects.create(
        user=staff_user,
        employee_id="EMP-0001",
        department=department,
        branch=branch,
        job_title="HR Manager",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2020-01-01",
    )


@pytest.fixture
def employee(department, branch):
    user = User.objects.create_user(email="jane@example.com", password="s3cret-pass")
    return Employee.objects.create(
        user=user,
        employee_id="EMP-0002",
        department=department,
        branch=branch,
        job_title="Software Engineer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )


@pytest.fixture
def other_employee(department, branch):
    user = User.objects.create_user(email="bob@example.com", password="s3cret-pass")
    return Employee.objects.create(
        user=user,
        employee_id="EMP-0003",
        department=department,
        branch=branch,
        job_title="Designer",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-15",
    )


def test_employee_can_create_own_coe_request(employee, staff_employee):
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(
        reverse("coerequest-list"), {"purpose": "For a loan application"}
    )

    assert response.status_code == 201
    assert response.json()["employee"] == employee.id
    assert response.json()["status"] == "pending"
    assert Notification.objects.filter(recipient=staff_employee.user).exists()


def test_request_includes_employee_details(employee, staff_employee):
    client = APIClient()
    client.force_authenticate(employee.user)
    client.post(reverse("coerequest-list"), {"purpose": "For a loan application"})

    response = client.get(reverse("coerequest-list"))
    result = response.json()["results"][0]

    assert result["employee_display_name"] == "jane@example.com"
    assert result["employee_code"] == "EMP-0002"
    assert result["employee_job_title"] == "Software Engineer"
    assert result["employee_department"] == "Engineering"


def test_employee_cannot_see_others_requests(employee, other_employee):
    COERequest.objects.create(employee=other_employee, purpose="Visa application")
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.get(reverse("coerequest-list"))

    assert response.json()["count"] == 0


def test_staff_sees_all_requests(employee, other_employee, staff_employee):
    COERequest.objects.create(employee=employee, purpose="Loan")
    COERequest.objects.create(employee=other_employee, purpose="Visa")
    client = APIClient()
    client.force_authenticate(staff_employee.user)

    response = client.get(reverse("coerequest-list"))

    assert response.json()["count"] == 2


def test_regular_employee_cannot_approve(employee, other_employee):
    coe_request = COERequest.objects.create(employee=other_employee, purpose="Visa")
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(reverse("coerequest-approve", args=[coe_request.id]))

    assert response.status_code in (403, 404)
    coe_request.refresh_from_db()
    assert coe_request.status == COERequest.Status.PENDING


def test_staff_can_approve_and_employee_is_notified(employee, staff_employee):
    coe_request = COERequest.objects.create(employee=employee, purpose="Loan")
    client = APIClient()
    client.force_authenticate(staff_employee.user)

    response = client.post(reverse("coerequest-approve", args=[coe_request.id]))

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert response.json()["reviewed_by_name"] == "hr@example.com"
    assert Notification.objects.filter(
        recipient=employee.user, message__icontains="approved"
    ).exists()


def test_staff_can_reject_and_employee_is_notified(employee, staff_employee):
    coe_request = COERequest.objects.create(employee=employee, purpose="Loan")
    client = APIClient()
    client.force_authenticate(staff_employee.user)

    response = client.post(reverse("coerequest-reject", args=[coe_request.id]))

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert Notification.objects.filter(
        recipient=employee.user, message__icontains="rejected"
    ).exists()


def test_cannot_approve_already_approved_request(employee, staff_employee):
    coe_request = COERequest.objects.create(
        employee=employee, purpose="Loan", status=COERequest.Status.APPROVED
    )
    client = APIClient()
    client.force_authenticate(staff_employee.user)

    response = client.post(reverse("coerequest-approve", args=[coe_request.id]))

    assert response.status_code == 400


def test_employee_can_cancel_own_pending_request(employee):
    coe_request = COERequest.objects.create(employee=employee, purpose="Loan")
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(reverse("coerequest-cancel", args=[coe_request.id]))

    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


def test_employee_cannot_cancel_others_request(employee, other_employee):
    coe_request = COERequest.objects.create(employee=other_employee, purpose="Loan")
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(reverse("coerequest-cancel", args=[coe_request.id]))

    assert response.status_code in (403, 404)
