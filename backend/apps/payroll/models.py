from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.employees.models import Branch, Employee


class SalesAgent(models.Model):
    """
    Commission-based sales agent. Deliberately separate from Employee --
    agents aren't regular staff (no department, manager, salary, etc.),
    they're paid purely on commission from the cars they sell.
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    agent_id = models.CharField(max_length=20, unique=True)
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="agents")
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=30, blank=True)
    default_commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="Default commission rate, as a percentage."
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    date_joined = models.DateField()
    bank_name = models.CharField(max_length=150, blank=True)
    bank_bic = models.CharField(max_length=20, blank=True, help_text="Bank Identifier Code.")
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_account_holder_name = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ["agent_id"]

    def __str__(self):
        return f"{self.agent_id} - {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class Sale(models.Model):
    """A single car sale, generating commission for the agent who made it."""

    agent = models.ForeignKey(SalesAgent, on_delete=models.PROTECT, related_name="sales")
    sale_date = models.DateField()
    customer_name = models.CharField(max_length=150, blank=True)
    vehicle_description = models.CharField(max_length=200)
    sale_amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sale_date"]

    def __str__(self):
        return f"{self.agent.agent_id} - {self.vehicle_description} ({self.sale_date})"

    def save(self, *args, **kwargs):
        rate_fraction = self.commission_rate / Decimal("100")
        self.commission_amount = (self.sale_amount * rate_fraction).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)


class PaymentMethod(models.TextChoices):
    BANK_TRANSFER = "bank_transfer", "Bank Transfer"
    GCASH = "gcash", "GCash"
    MAYA = "maya", "Maya"
    CASH = "cash", "Cash"
    CHECK = "check", "Check"
    OTHER = "other", "Other"


class PaymentTrackingMixin(models.Model):
    """
    Payment is recorded manually -- HR pays via bank/GCash/etc. outside the
    system and logs it here. Bank details on SalesAgent are kept on file for
    HR's reference when doing that transfer, not for a live payout API.
    """

    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, blank=True)
    payment_reference = models.CharField(max_length=150, blank=True)

    class Meta:
        abstract = True


class PayRun(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        COMPLETED = "completed", "Completed"

    start_date = models.DateField()
    end_date = models.DateField()
    pay_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"Pay run {self.start_date}..{self.end_date} ({self.status})"

    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError("end_date must be on or after start_date.")


class Payslip(PaymentTrackingMixin, models.Model):
    """One employee's payslip for a pay run. Salary is snapshotted at
    generation time so later salary changes don't rewrite history."""

    pay_run = models.ForeignKey(PayRun, on_delete=models.CASCADE, related_name="payslips")
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payslips")
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-pay_run__start_date"]
        constraints = [
            models.UniqueConstraint(fields=["pay_run", "employee"], name="unique_payslip_per_run")
        ]

    def __str__(self):
        return f"Payslip {self.employee.employee_id} - {self.pay_run}"

    @property
    def gross_pay(self):
        return self.base_salary + sum(
            (item.amount for item in self.line_items.all() if item.item_type == "earning"),
            Decimal("0.00"),
        )

    @property
    def total_deductions(self):
        return sum(
            (item.amount for item in self.line_items.all() if item.item_type == "deduction"),
            Decimal("0.00"),
        )

    @property
    def net_pay(self):
        return self.gross_pay - self.total_deductions


class PayslipLineItem(models.Model):
    class ItemType(models.TextChoices):
        EARNING = "earning", "Earning"
        DEDUCTION = "deduction", "Deduction"

    payslip = models.ForeignKey(Payslip, on_delete=models.CASCADE, related_name="line_items")
    item_type = models.CharField(max_length=20, choices=ItemType.choices)
    label = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.label}: {self.amount}"


class CommissionPayout(PaymentTrackingMixin, models.Model):
    """One agent's commission payout for a pay run."""

    pay_run = models.ForeignKey(
        PayRun, on_delete=models.CASCADE, related_name="commission_payouts"
    )
    agent = models.ForeignKey(SalesAgent, on_delete=models.PROTECT, related_name="payouts")
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-pay_run__start_date"]
        constraints = [
            models.UniqueConstraint(fields=["pay_run", "agent"], name="unique_payout_per_run")
        ]

    def __str__(self):
        return f"Commission payout {self.agent.agent_id} - {self.pay_run}"

    @property
    def total_commission(self):
        return sum((item.amount for item in self.line_items.all()), Decimal("0.00"))


class CommissionLineItem(models.Model):
    """
    A single line in a commission payout. If `sale` is set, this line was
    auto-generated from that sale when the payout was created; if it's
    null, HR added it manually (bonus, correction, an off-system sale).
    """

    payout = models.ForeignKey(
        CommissionPayout, on_delete=models.CASCADE, related_name="line_items"
    )
    sale = models.ForeignKey(
        Sale, on_delete=models.SET_NULL, null=True, blank=True, related_name="commission_lines"
    )
    label = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.label}: {self.amount}"
