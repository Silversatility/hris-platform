from django.db import models

from apps.employees.models import Branch, Department, Employee


class JobPosting(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"
        FILLED = "filled", "Filled"

    title = models.CharField(max_length=150)
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, related_name="job_postings"
    )
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="job_postings")
    employment_type = models.CharField(
        max_length=20, choices=Employee.EmploymentType.choices
    )
    description = models.TextField()
    requirements = models.TextField(blank=True)
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
