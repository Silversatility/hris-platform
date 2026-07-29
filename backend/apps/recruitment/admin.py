from django.contrib import admin

from .models import JobPosting


@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "department",
        "branch",
        "work_setup",
        "employment_type",
        "available_slots",
        "status",
        "closing_date",
    ]
    list_filter = ["status", "work_setup", "employment_type", "department", "branch"]
    search_fields = ["title"]
    autocomplete_fields = ["department", "branch", "posted_by"]
