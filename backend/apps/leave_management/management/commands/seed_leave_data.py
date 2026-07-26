from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee
from apps.leave_management.models import LeaveBalance, LeaveRequest, LeaveType

LEAVE_TYPES = [
    {"name": "Vacation", "code": "VAC", "is_paid": True, "default_annual_days": 15},
    {"name": "Sick", "code": "SICK", "is_paid": True, "default_annual_days": 10},
    {"name": "Unpaid", "code": "UNPAID", "is_paid": False, "default_annual_days": 0},
]


class Command(BaseCommand):
    help = (
        "Seeds leave types, allocates a current-year balance to every existing "
        "employee, and creates a sample pending leave request for employees "
        "who have a manager (so the approve/reject workflow can be demoed)."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        year = timezone.now().year

        leave_types = {}
        for data in LEAVE_TYPES:
            leave_type, created = LeaveType.objects.get_or_create(
                code=data["code"],
                defaults={
                    "name": data["name"],
                    "is_paid": data["is_paid"],
                    "default_annual_days": data["default_annual_days"],
                },
            )
            leave_types[data["code"]] = leave_type
            self.stdout.write(f"{'Created' if created else 'Exists'} leave type: {leave_type}")

        employees = list(Employee.objects.all())
        if not employees:
            self.stdout.write(
                self.style.WARNING(
                    "No employees found. Run seed_demo_data first to create some."
                )
            )
            return

        for employee in employees:
            for leave_type in leave_types.values():
                balance, created = LeaveBalance.objects.get_or_create(
                    employee=employee,
                    leave_type=leave_type,
                    year=year,
                    defaults={"allocated_days": leave_type.default_annual_days},
                )
                action = "Created" if created else "Exists"
                self.stdout.write(f"{action} balance: {balance}")

        demo_start = timezone.now().date() + timedelta(days=14)
        demo_end = demo_start + timedelta(days=2)
        vacation = leave_types["VAC"]
        sample_count = 0
        for employee in employees:
            if employee.manager_id is None:
                continue
            if LeaveRequest.objects.filter(employee=employee).exists():
                continue
            LeaveRequest.objects.create(
                employee=employee,
                leave_type=vacation,
                start_date=demo_start,
                end_date=demo_end,
                reason="Sample request seeded for local development.",
            )
            sample_count += 1
            self.stdout.write(f"Created sample pending leave request for {employee.employee_id}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Seeded {len(leave_types)} leave types, balances for "
                f"{len(employees)} employees, and {sample_count} sample requests."
            )
        )
