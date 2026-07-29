import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.employees.models import Department, Employee
from apps.recruitment.models import JobPosting
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
def regular_user():
    return User.objects.create_user(email="jane@example.com", password="s3cret-pass")


def job_posting_payload(department, branch):
    return {
        "title": "Backend Engineer",
        "department": department.id,
        "branch": branch.id,
        "work_setup": JobPosting.WorkSetup.REMOTE,
        "employment_type": JobPosting.EmploymentType.REGULAR,
        "available_slots": 2,
        "min_salary": "19000",
        "max_salary": "25000",
        "description": "<p>Build and maintain our backend services.</p>",
    }


def create_posting(department, branch, **overrides):
    defaults = {
        "title": "Backend Engineer",
        "department": department,
        "branch": branch,
        "work_setup": JobPosting.WorkSetup.REMOTE,
        "employment_type": JobPosting.EmploymentType.REGULAR,
        "available_slots": 1,
        "min_salary": "19000",
        "max_salary": "25000",
        "description": "<p>Build things.</p>",
    }
    defaults.update(overrides)
    return JobPosting.objects.create(**defaults)


def test_anyone_authenticated_can_list_job_postings(regular_user, department, branch):
    create_posting(department, branch)
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.get(reverse("jobposting-list"))

    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_non_staff_cannot_create_job_posting(regular_user, department, branch):
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.post(reverse("jobposting-list"), job_posting_payload(department, branch))

    assert response.status_code == 403


def test_staff_can_create_job_posting(staff_employee, department, branch):
    client = APIClient()
    client.force_authenticate(staff_employee.user)

    response = client.post(reverse("jobposting-list"), job_posting_payload(department, branch))

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Backend Engineer"
    assert body["status"] == "open"
    assert body["work_setup_display"] == "Work From Home"
    assert body["employment_type_display"] == "Regular"
    assert body["available_slots"] == 2
    assert body["department_name"] == "Engineering"
    assert body["branch_name"] == branch.name
    assert body["posted_by_name"] == "hr@example.com"


def test_max_salary_must_be_at_least_min_salary(staff_employee, department, branch):
    client = APIClient()
    client.force_authenticate(staff_employee.user)
    payload = job_posting_payload(department, branch)
    payload["min_salary"] = "30000"
    payload["max_salary"] = "25000"

    response = client.post(reverse("jobposting-list"), payload)

    assert response.status_code == 400


def test_staff_can_update_job_posting_status(staff_employee, department, branch):
    posting = create_posting(department, branch)
    client = APIClient()
    client.force_authenticate(staff_employee.user)

    response = client.patch(
        reverse("jobposting-detail", args=[posting.id]), {"status": "filled"}
    )

    assert response.status_code == 200
    posting.refresh_from_db()
    assert posting.status == JobPosting.Status.FILLED


def test_non_staff_cannot_update_job_posting(regular_user, department, branch):
    posting = create_posting(department, branch)
    client = APIClient()
    client.force_authenticate(regular_user)

    response = client.patch(
        reverse("jobposting-detail", args=[posting.id]), {"status": "filled"}
    )

    assert response.status_code == 403


def test_staff_can_delete_job_posting(staff_employee, department, branch):
    posting = create_posting(department, branch)
    client = APIClient()
    client.force_authenticate(staff_employee.user)

    response = client.delete(reverse("jobposting-detail", args=[posting.id]))

    assert response.status_code == 204
    assert not JobPosting.objects.filter(id=posting.id).exists()


def test_list_can_filter_by_status(staff_employee, department, branch):
    create_posting(department, branch, title="Open Role", status=JobPosting.Status.OPEN)
    create_posting(department, branch, title="Filled Role", status=JobPosting.Status.FILLED)
    client = APIClient()
    client.force_authenticate(staff_employee.user)

    response = client.get(reverse("jobposting-list"), {"status": "open"})

    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["title"] == "Open Role"
