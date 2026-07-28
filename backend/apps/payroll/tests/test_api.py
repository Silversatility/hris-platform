from decimal import Decimal
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.employees.models import Department, Employee
from apps.payroll.models import CommissionPayout, PayRun, Payslip, Sale, SalesAgent
from apps.payroll.paymongo_client import PayMongoError
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def staff_user():
    return User.objects.create_user(email="hr@example.com", password="s3cret-pass", is_staff=True)


@pytest.fixture
def department():
    return Department.objects.create(name="Engineering", code="ENG")


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
        salary=Decimal("30000.00"),
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
        salary=Decimal("25000.00"),
    )


@pytest.fixture
def agent():
    return SalesAgent.objects.create(
        agent_id="AGT-0001",
        first_name="Carlo",
        last_name="Reyes",
        default_commission_rate=Decimal("5.00"),
        date_joined="2024-01-01",
    )


@pytest.fixture
def pay_run():
    return PayRun.objects.create(
        start_date="2026-08-01", end_date="2026-08-15", pay_date="2026-08-20"
    )


def test_non_staff_cannot_list_sales_agents(employee):
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.get(reverse("sales-agent-list"))

    assert response.status_code == 403


def test_staff_can_create_sales_agent(staff_user):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("sales-agent-list"),
        {
            "agent_id": "AGT-0001",
            "first_name": "Carlo",
            "last_name": "Reyes",
            "default_commission_rate": "5.00",
            "date_joined": "2024-01-01",
        },
    )

    assert response.status_code == 201


def test_agent_id_auto_generated_when_blank(staff_user):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("sales-agent-list"),
        {
            "first_name": "Nina",
            "last_name": "Lopez",
            "default_commission_rate": "5.00",
            "date_joined": "2024-01-01",
        },
    )

    assert response.status_code == 201
    assert response.json()["agent_id"].startswith("AGT-")


def test_sale_defaults_commission_rate_from_agent(staff_user, agent):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("sale-list"),
        {
            "agent": agent.id,
            "sale_date": "2026-08-05",
            "vehicle_description": "2024 Honda City",
            "sale_amount": "700000.00",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["commission_rate"] == "5.00"
    assert data["commission_amount"] == "35000.00"


def test_generate_creates_payslips_and_commission_payouts(
    staff_user, employee, other_employee, agent, pay_run
):
    other_employee.salary = None
    other_employee.save(update_fields=["salary"])
    Sale.objects.create(
        agent=agent,
        sale_date="2026-08-05",
        vehicle_description="2024 Honda City",
        sale_amount=Decimal("700000.00"),
        commission_rate=Decimal("5.00"),
    )
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(reverse("pay-run-generate", args=[pay_run.id]))

    assert response.status_code == 200
    assert response.json()["payslips_created"] == 1
    assert response.json()["commission_payouts_touched"] == 1
    payslip = Payslip.objects.get(pay_run=pay_run, employee=employee)
    assert payslip.base_salary == employee.salary
    assert payslip.gross_pay == employee.salary
    assert not Payslip.objects.filter(pay_run=pay_run, employee=other_employee).exists()
    payout = CommissionPayout.objects.get(pay_run=pay_run, agent=agent)
    assert payout.total_commission == Decimal("35000.00")


def test_generate_is_safe_to_rerun(staff_user, employee, agent, pay_run):
    Sale.objects.create(
        agent=agent,
        sale_date="2026-08-05",
        vehicle_description="2024 Honda City",
        sale_amount=Decimal("700000.00"),
        commission_rate=Decimal("5.00"),
    )
    client = APIClient()
    client.force_authenticate(staff_user)

    client.post(reverse("pay-run-generate", args=[pay_run.id]))
    response = client.post(reverse("pay-run-generate", args=[pay_run.id]))

    assert response.status_code == 200
    assert response.json()["payslips_created"] == 0
    assert Payslip.objects.filter(pay_run=pay_run, employee=employee).count() == 1
    payout = CommissionPayout.objects.get(pay_run=pay_run, agent=agent)
    assert payout.line_items.count() == 1


def test_generate_picks_up_new_sale_on_rerun(staff_user, employee, agent, pay_run):
    client = APIClient()
    client.force_authenticate(staff_user)
    client.post(reverse("pay-run-generate", args=[pay_run.id]))

    Sale.objects.create(
        agent=agent,
        sale_date="2026-08-06",
        vehicle_description="2024 Ford Ranger",
        sale_amount=Decimal("1200000.00"),
        commission_rate=Decimal("5.00"),
    )
    client.post(reverse("pay-run-generate", args=[pay_run.id]))

    payout = CommissionPayout.objects.get(pay_run=pay_run, agent=agent)
    assert payout.line_items.count() == 1
    assert payout.total_commission == Decimal("60000.00")


def test_cannot_generate_for_completed_pay_run(staff_user, pay_run):
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(reverse("pay-run-generate", args=[pay_run.id]))

    assert response.status_code == 400


def test_complete_locks_the_pay_run(staff_user, pay_run):
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(reverse("pay-run-complete", args=[pay_run.id]))

    assert response.status_code == 200
    pay_run.refresh_from_db()
    assert pay_run.status == PayRun.Status.COMPLETED


def test_cannot_modify_line_items_on_completed_pay_run(staff_user, employee, pay_run):
    payslip = Payslip.objects.create(
        pay_run=pay_run, employee=employee, base_salary=employee.salary
    )
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("payslip-line-item-list"),
        {
            "payslip": payslip.id,
            "item_type": "deduction",
            "label": "Late penalty",
            "amount": "100.00",
        },
    )

    assert response.status_code == 400


def test_employee_can_view_own_payslip_only(employee, other_employee, pay_run):
    Payslip.objects.create(pay_run=pay_run, employee=employee, base_salary=employee.salary)
    Payslip.objects.create(
        pay_run=pay_run, employee=other_employee, base_salary=Decimal("25000.00")
    )
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.get(reverse("payslip-list"))

    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["employee_code"] == "EMP-0001"


def test_employee_cannot_retrieve_others_payslip(employee, other_employee, pay_run):
    other_payslip = Payslip.objects.create(
        pay_run=pay_run, employee=other_employee, base_salary=Decimal("25000.00")
    )
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.get(reverse("payslip-detail", args=[other_payslip.id]))

    assert response.status_code == 404


def test_employee_cannot_create_sales_agent(employee):
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(
        reverse("sales-agent-list"),
        {
            "agent_id": "AGT-9999",
            "first_name": "Someone",
            "last_name": "Else",
            "default_commission_rate": "5.00",
            "date_joined": "2024-01-01",
        },
    )

    assert response.status_code == 403


def test_staff_can_mark_payslip_paid_after_completion(staff_user, employee, pay_run):
    payslip = Payslip.objects.create(
        pay_run=pay_run, employee=employee, base_salary=employee.salary
    )
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("payslip-mark-paid", args=[payslip.id]),
        {"payment_method": "bank_transfer", "payment_reference": "INSTAPAY-12345"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_paid"] is True
    assert data["payment_method"] == "bank_transfer"
    assert data["payment_reference"] == "INSTAPAY-12345"
    assert data["paid_at"] is not None


def test_cannot_mark_payslip_paid_before_pay_run_completed(staff_user, employee, pay_run):
    payslip = Payslip.objects.create(
        pay_run=pay_run, employee=employee, base_salary=employee.salary
    )
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("payslip-mark-paid", args=[payslip.id]), {"payment_method": "cash"}
    )

    assert response.status_code == 400
    payslip.refresh_from_db()
    assert payslip.is_paid is False


def test_cannot_mark_payslip_paid_twice(staff_user, employee, pay_run):
    payslip = Payslip.objects.create(
        pay_run=pay_run, employee=employee, base_salary=employee.salary
    )
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(staff_user)
    client.post(reverse("payslip-mark-paid", args=[payslip.id]), {"payment_method": "cash"})

    response = client.post(
        reverse("payslip-mark-paid", args=[payslip.id]), {"payment_method": "cash"}
    )

    assert response.status_code == 400


def test_employee_cannot_mark_own_payslip_paid(employee, pay_run):
    payslip = Payslip.objects.create(
        pay_run=pay_run, employee=employee, base_salary=employee.salary
    )
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(
        reverse("payslip-mark-paid", args=[payslip.id]), {"payment_method": "cash"}
    )

    assert response.status_code == 403
    payslip.refresh_from_db()
    assert payslip.is_paid is False


def test_staff_can_mark_commission_payout_paid(staff_user, agent, pay_run):
    payout = CommissionPayout.objects.create(pay_run=pay_run, agent=agent)
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(
        reverse("commission-payout-mark-paid", args=[payout.id]),
        {"payment_method": "gcash", "payment_reference": "GC-98765"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_paid"] is True
    assert data["payment_method"] == "gcash"


def _give_agent_bank_details(agent):
    agent.bank_name = "BDO Unibank"
    agent.bank_bic = "BNORPHMM"
    agent.bank_account_number = "0012345678"
    agent.bank_account_holder_name = "Carlo Reyes"
    agent.save(
        update_fields=["bank_name", "bank_bic", "bank_account_number", "bank_account_holder_name"]
    )


def test_pay_via_paymongo_requires_agent_bank_details(staff_user, agent, pay_run):
    payout = CommissionPayout.objects.create(pay_run=pay_run, agent=agent)
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(reverse("commission-payout-pay-via-paymongo", args=[payout.id]))

    assert response.status_code == 400
    assert "bank" in str(response.json()).lower()


def test_pay_via_paymongo_requires_completed_pay_run(staff_user, agent, pay_run):
    _give_agent_bank_details(agent)
    payout = CommissionPayout.objects.create(pay_run=pay_run, agent=agent)
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(reverse("commission-payout-pay-via-paymongo", args=[payout.id]))

    assert response.status_code == 400
    assert "completed" in str(response.json()).lower()


def test_pay_via_paymongo_success(staff_user, agent, pay_run):
    _give_agent_bank_details(agent)
    payout = CommissionPayout.objects.create(pay_run=pay_run, agent=agent)
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(staff_user)

    fake_response = {
        "data": {"attributes": {"transfers": [{"id": "batch_xfer_abc123", "status": "pending"}]}}
    }
    with patch(
        "apps.payroll.views.paymongo_client.create_transfer",
        return_value=fake_response,
    ) as mock_create:
        response = client.post(reverse("commission-payout-pay-via-paymongo", args=[payout.id]))

    assert response.status_code == 200
    data = response.json()
    assert data["is_paid"] is True
    assert data["payment_method"] == "bank_transfer"
    assert data["payment_reference"] == "batch_xfer_abc123"
    mock_create.assert_called_once()
    call_kwargs = mock_create.call_args.kwargs
    assert call_kwargs["destination_bic"] == "BNORPHMM"
    assert call_kwargs["destination_number"] == "0012345678"
    assert call_kwargs["destination_name"] == "Carlo Reyes"
    assert call_kwargs["destination_bank_name"] == "BDO Unibank"

    payout.refresh_from_db()
    assert payout.is_paid is True
    assert payout.payment_reference == "batch_xfer_abc123"


def test_pay_via_paymongo_surfaces_paymongo_error(staff_user, agent, pay_run):
    _give_agent_bank_details(agent)
    payout = CommissionPayout.objects.create(pay_run=pay_run, agent=agent)
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(staff_user)

    with patch(
        "apps.payroll.views.paymongo_client.create_transfer",
        side_effect=PayMongoError("Source Account Not Found."),
    ):
        response = client.post(reverse("commission-payout-pay-via-paymongo", args=[payout.id]))

    assert response.status_code == 400
    assert "Source Account Not Found" in str(response.json())

    payout.refresh_from_db()
    assert payout.is_paid is False


def test_pay_via_paymongo_cannot_pay_twice(staff_user, agent, pay_run):
    _give_agent_bank_details(agent)
    payout = CommissionPayout.objects.create(pay_run=pay_run, agent=agent, is_paid=True)
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(staff_user)

    response = client.post(reverse("commission-payout-pay-via-paymongo", args=[payout.id]))

    assert response.status_code == 400
    assert "already" in str(response.json()).lower()


def test_non_staff_cannot_pay_via_paymongo(employee, agent, pay_run):
    _give_agent_bank_details(agent)
    payout = CommissionPayout.objects.create(pay_run=pay_run, agent=agent)
    pay_run.status = PayRun.Status.COMPLETED
    pay_run.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(employee.user)

    response = client.post(reverse("commission-payout-pay-via-paymongo", args=[payout.id]))

    assert response.status_code == 403
