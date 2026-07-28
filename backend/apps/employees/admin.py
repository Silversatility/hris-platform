from django.contrib import admin

from .models import Branch, Department, Employee


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "is_active"]
    search_fields = ["name", "code"]


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "address", "is_active"]
    search_fields = ["name", "code"]


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = [
        "employee_id",
        "user",
        "department",
        "branch",
        "job_title",
        "status",
        "hire_date",
    ]
    list_filter = ["status", "employment_type", "department", "branch"]
    search_fields = ["employee_id", "user__email", "job_title"]
    autocomplete_fields = ["user", "manager"]
