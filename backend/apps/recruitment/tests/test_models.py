import pytest

from apps.employees.models import Department, Employee
from apps.recruitment.models import JobPosting

pytestmark = pytest.mark.django_db


@pytest.fixture
def department():
    return Department.objects.create(name="Engineering", code="ENG")


def test_defaults_to_open(department, branch):
    posting = JobPosting.objects.create(
        title="Backend Engineer",
        department=department,
        branch=branch,
        employment_type=Employee.EmploymentType.FULL_TIME,
        description="Build things.",
    )

    assert posting.status == JobPosting.Status.OPEN


def test_str_includes_title_and_status(department, branch):
    posting = JobPosting.objects.create(
        title="Backend Engineer",
        department=department,
        branch=branch,
        employment_type=Employee.EmploymentType.FULL_TIME,
        description="Build things.",
    )

    assert str(posting) == "Backend Engineer (open)"
