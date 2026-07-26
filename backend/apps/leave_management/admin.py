from django.contrib import admin

from .models import LeaveBalance, LeaveRequest, LeaveType


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "is_paid", "default_annual_days"]
    search_fields = ["name", "code"]


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ["employee", "leave_type", "year", "allocated_days", "used_days"]
    list_filter = ["leave_type", "year"]
    search_fields = ["employee__employee_id", "employee__user__email"]
    autocomplete_fields = ["employee"]


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "leave_type",
        "start_date",
        "end_date",
        "days_requested",
        "status",
    ]
    list_filter = ["status", "leave_type"]
    search_fields = ["employee__employee_id", "employee__user__email"]
    autocomplete_fields = ["employee", "reviewed_by"]
