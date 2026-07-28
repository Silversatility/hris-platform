from django.conf import settings
from django.db import models


class Branch(models.Model):
    """A physical dealership location. Independent of Department -- an
    employee's department (what they do) and branch (where they work) are
    orthogonal, so both can vary independently."""

    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    address = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Employee(models.Model):
    class EmploymentType(models.TextChoices):
        FULL_TIME = "full_time", "Full-time"
        PART_TIME = "part_time", "Part-time"
        CONTRACT = "contract", "Contract"
        INTERN = "intern", "Intern"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ON_LEAVE = "on_leave", "On leave"
        TERMINATED = "terminated", "Terminated"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employee"
    )
    employee_id = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, related_name="employees"
    )
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="employees")
    manager = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="direct_reports"
    )
    job_title = models.CharField(max_length=100)
    employment_type = models.CharField(max_length=20, choices=EmploymentType.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    hire_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    personal_email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=30, blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=30, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_account_holder_name = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ["employee_id"]

    def __str__(self):
        return f"{self.employee_id} - {self.user.email}"

    def get_all_report_ids(self):
        """
        IDs of every employee reporting to this one, directly or through the
        chain of command (a report's report, and so on) -- not just direct
        reports. Used to let any manager above someone in the org chart
        approve their leave, not only their immediate manager.
        """
        report_ids = set()
        frontier = {self.id}
        while frontier:
            next_frontier = set(
                Employee.objects.filter(manager_id__in=frontier)
                .exclude(id__in=report_ids)
                .values_list("id", flat=True)
            )
            if not next_frontier:
                break
            report_ids |= next_frontier
            frontier = next_frontier
        return report_ids
