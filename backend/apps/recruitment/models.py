from django.db import models

from apps.employees.models import Branch, Department, Employee


class JobPosting(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"
        FILLED = "filled", "Filled"

    class WorkSetup(models.TextChoices):
        ONSITE = "onsite", "On-site"
        REMOTE = "remote", "Work From Home"
        HYBRID = "hybrid", "Hybrid"

    class EmploymentType(models.TextChoices):
        REGULAR = "regular", "Regular"
        PROBATIONARY = "probationary", "Probationary"
        CONTRACTUAL = "contractual", "Contractual"
        PROJECT_BASED = "project_based", "Project-based"
        SEASONAL = "seasonal", "Seasonal"

    title = models.CharField(max_length=150)
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, related_name="job_postings"
    )
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="job_postings")
    work_setup = models.CharField(
        max_length=20, choices=WorkSetup.choices, default=WorkSetup.ONSITE
    )
    employment_type = models.CharField(max_length=20, choices=EmploymentType.choices)
    available_slots = models.PositiveIntegerField(default=1)
    min_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    max_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    description = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True
    )
    closing_date = models.DateField(null=True, blank=True)
    posted_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posted_job_postings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"
