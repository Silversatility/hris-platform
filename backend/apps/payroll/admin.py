from django.contrib import admin

from .models import (
    CommissionLineItem,
    CommissionPayout,
    PayRun,
    Payslip,
    PayslipLineItem,
    Sale,
    SalesAgent,
)


@admin.register(SalesAgent)
class SalesAgentAdmin(admin.ModelAdmin):
    list_display = [
        "agent_id",
        "first_name",
        "last_name",
        "branch",
        "default_commission_rate",
        "status",
    ]
    list_filter = ["status", "branch"]
    search_fields = ["agent_id", "first_name", "last_name", "email"]


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = [
        "agent",
        "sale_date",
        "vehicle_description",
        "sale_amount",
        "commission_amount",
    ]
    list_filter = ["sale_date"]
    search_fields = ["vehicle_description", "customer_name", "agent__agent_id"]
    autocomplete_fields = ["agent"]


class PayslipLineItemInline(admin.TabularInline):
    model = PayslipLineItem
    extra = 0


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ["employee", "pay_run", "base_salary", "generated_at"]
    search_fields = ["employee__employee_id"]
    autocomplete_fields = ["employee"]
    inlines = [PayslipLineItemInline]


class CommissionLineItemInline(admin.TabularInline):
    model = CommissionLineItem
    extra = 0


@admin.register(CommissionPayout)
class CommissionPayoutAdmin(admin.ModelAdmin):
    list_display = ["agent", "pay_run", "generated_at"]
    search_fields = ["agent__agent_id"]
    autocomplete_fields = ["agent"]
    inlines = [CommissionLineItemInline]


@admin.register(PayRun)
class PayRunAdmin(admin.ModelAdmin):
    list_display = ["start_date", "end_date", "pay_date", "status"]
    list_filter = ["status"]
