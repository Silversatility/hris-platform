import pytest

from apps.employees.models import Department
from apps.recruitment.models import JobPosting

pytestmark = pytest.mark.django_db


@pytest.fixture
def department():
    return Department.objects.create(name="Engineering", code="ENG")


def make_posting(department, branch, **overrides):
    defaults = {
        "title": "Backend Engineer",
        "department": department,
        "branch": branch,
        "employment_type": JobPosting.EmploymentType.REGULAR,
        "description": "<p>Build things.</p>",
    }
    defaults.update(overrides)
    return JobPosting.objects.create(**defaults)


def test_defaults_to_open(department, branch):
    posting = make_posting(department, branch)

    assert posting.status == JobPosting.Status.OPEN


def test_defaults_to_onsite_work_setup(department, branch):
    posting = make_posting(department, branch)

    assert posting.work_setup == JobPosting.WorkSetup.ONSITE


def test_str_includes_title_and_status(department, branch):
    posting = make_posting(department, branch)

    assert str(posting) == "Backend Engineer (open)"
