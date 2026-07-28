from datetime import timedelta

from django.db import models
from django.utils import timezone

from apps.employees.models import Employee
from apps.users.models import User


class Ticket(models.Model):
    class Category(models.TextChoices):
        IT = "it", "IT"
        HR = "hr", "HR"
        FACILITIES = "facilities", "Facilities"
        PAYROLL = "payroll", "Payroll"
        OTHER = "other", "Other"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    # Hours until SLA breach, keyed by priority. Picked to be reasonable
    # defaults for a small team, not tied to any contractual SLA.
    SLA_HOURS = {
        Priority.URGENT: 4,
        Priority.HIGH: 24,
        Priority.MEDIUM: 72,
        Priority.LOW: 120,
    }

    ticket_number = models.CharField(max_length=20, unique=True)
    requester = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="tickets_filed")
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    subject = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True
    )
    assigned_to = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets_assigned",
    )
    sla_due_at = models.DateTimeField(editable=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.ticket_number} {self.subject} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.sla_due_at:
            self.sla_due_at = timezone.now() + timedelta(hours=self.SLA_HOURS[self.priority])
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        if self.status in (self.Status.RESOLVED, self.Status.CLOSED):
            return False
        return timezone.now() > self.sla_due_at


class TicketComment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ticket_comments")
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment on {self.ticket.ticket_number} by {self.author}"
