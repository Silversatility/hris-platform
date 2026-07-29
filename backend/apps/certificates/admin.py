from django.contrib import admin

from .models import COERequest


@admin.register(COERequest)
class COERequestAdmin(admin.ModelAdmin):
    list_display = ["employee", "status", "purpose", "reviewed_by", "reviewed_at", "created_at"]
    list_filter = ["status"]
    search_fields = ["employee__employee_id", "purpose"]
    autocomplete_fields = ["employee", "reviewed_by"]
