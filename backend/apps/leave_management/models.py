from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.employees.models import Employee


class LeaveType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_paid = models.BooleanField(default=True)
    default_annual_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class LeaveBalance(models.Model):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_balances"
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name="balances")
    year = models.PositiveIntegerField()
    allocated_days = models.DecimalField(max_digits=5, decimal_places=1)
    used_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    class Meta:
        ordering = ["-year", "leave_type__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "leave_type", "year"], name="unique_balance_per_year"
            )
        ]

    def __str__(self):
        return f"{self.employee.employee_id} - {self.leave_type.name} ({self.year})"

    @property
    def remaining_days(self):
        return self.allocated_days - self.used_days


class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_requests"
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name="requests")
    start_date = models.DateField()
    end_date = models.DateField()
    days_requested = models.DecimalField(max_digits=5, decimal_places=1, editable=False)
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    reviewed_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_leave_requests",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.employee.employee_id} {self.leave_type.code} "
            f"{self.start_date}..{self.end_date} ({self.status})"
        )

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            self.days_requested = Decimal((self.end_date - self.start_date).days + 1)
        super().save(*args, **kwargs)

    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError("end_date must be on or after start_date.")
