import pytest


@pytest.fixture
def branch(db):
    from apps.employees.models import Branch

    return Branch.objects.create(name="Main Branch", code="MAIN")
