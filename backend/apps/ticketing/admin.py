from django.contrib import admin

from .models import Ticket, TicketComment


class TicketCommentInline(admin.TabularInline):
    model = TicketComment
    extra = 0
    readonly_fields = ["author", "created_at"]


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = [
        "ticket_number",
        "subject",
        "requester",
        "category",
        "priority",
        "status",
        "assigned_to",
    ]
    list_filter = ["status", "priority", "category"]
    search_fields = ["ticket_number", "subject", "requester__employee_id"]
    autocomplete_fields = ["requester", "assigned_to"]
    inlines = [TicketCommentInline]
