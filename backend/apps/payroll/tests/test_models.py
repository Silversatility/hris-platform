from decimal import Decimal

import pytest

from apps.payroll.models import (
    CommissionLineItem,
    CommissionPayout,
    PayRun,
    Payslip,
    PayslipLineItem,
    Sale,
    SalesAgent,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def agent(branch):
    return SalesAgent.objects.create(
        agent_id="AGT-0001",
        branch=branch,
        first_name="Carlo",
        last_name="Reyes",
        default_commission_rate=Decimal("5.00"),
        date_joined="2024-01-01",
    )


def test_sale_computes_commission_amount_on_save(agent):
    sale = Sale.objects.create(
        agent=agent,
        sale_date="2026-08-01",
        vehicle_description="2024 Toyota Vios",
        sale_amount=Decimal("800000.00"),
        commission_rate=Decimal("5.00"),
    )

    assert sale.commission_amount == Decimal("40000.00")


@pytest.fixture
def pay_run():
    return PayRun.objects.create(
        start_date="2026-08-01", end_date="2026-08-15", pay_date="2026-08-20"
    )


def test_payslip_gross_deductions_net(pay_run, branch, django_user_model):
    from apps.employees.models import Department, Employee

    department = Department.objects.create(name="Sales Support", code="SS")
    user = django_user_model.objects.create_user(email="jane@example.com", password="pw")
    employee = Employee.objects.create(
        user=user,
        employee_id="EMP-0001",
        department=department,
        branch=branch,
        job_title="Support",
        employment_type=Employee.EmploymentType.FULL_TIME,
        hire_date="2026-01-01",
        salary=Decimal("30000.00"),
    )
    payslip = Payslip.objects.create(
        pay_run=pay_run, employee=employee, base_salary=employee.salary
    )
    PayslipLineItem.objects.create(
        payslip=payslip, item_type="earning", label="Bonus", amount=Decimal("2000.00")
    )
    PayslipLineItem.objects.create(
        payslip=payslip, item_type="deduction", label="Tax", amount=Decimal("3000.00")
    )

    assert payslip.gross_pay == Decimal("32000.00")
    assert payslip.total_deductions == Decimal("3000.00")
    assert payslip.net_pay == Decimal("29000.00")


def test_commission_payout_total_commission(pay_run, agent):
    sale = Sale.objects.create(
        agent=agent,
        sale_date="2026-08-05",
        vehicle_description="2024 Honda City",
        sale_amount=Decimal("700000.00"),
        commission_rate=Decimal("5.00"),
    )
    payout = CommissionPayout.objects.create(pay_run=pay_run, agent=agent)
    CommissionLineItem.objects.create(
        payout=payout, sale=sale, label="Commission - Honda City", amount=sale.commission_amount
    )
    CommissionLineItem.objects.create(
        payout=payout, sale=None, label="Bonus", amount=Decimal("500.00")
    )

    assert payout.total_commission == Decimal("35500.00")
