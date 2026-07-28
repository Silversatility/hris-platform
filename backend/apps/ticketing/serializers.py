from django.utils import timezone
from rest_framework import serializers

from apps.employees.models import Employee

from .models import Ticket, TicketComment


def _display_name(employee):
    full_name = f"{employee.user.first_name} {employee.user.last_name}".strip()
    return full_name or employee.user.email


def generate_ticket_number():
    year = timezone.now().year
    prefix = f"TKT-{year}-"
    last = (
        Ticket.objects.filter(ticket_number__startswith=prefix).order_by("-ticket_number").first()
    )
    next_number = int(last.ticket_number.rsplit("-", 1)[-1]) + 1 if last else 1
    return f"{prefix}{next_number:04d}"


class TicketCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketComment
        fields = ["id", "ticket", "author", "author_name", "body", "created_at"]
        read_only_fields = ["author", "created_at"]

    def get_author_name(self, obj):
        full_name = obj.author.get_full_name()
        return full_name or obj.author.email


class TicketSerializer(serializers.ModelSerializer):
    requester_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    comments = TicketCommentSerializer(many=True, read_only=True)
    ticket_number = serializers.CharField(required=False)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "ticket_number",
            "requester",
            "requester_name",
            "category",
            "subject",
            "description",
            "priority",
            "status",
            "assigned_to",
            "assigned_to_name",
            "sla_due_at",
            "is_overdue",
            "resolved_at",
            "comments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "requester",
            "status",
            "assigned_to",
            "sla_due_at",
            "resolved_at",
            "created_at",
            "updated_at",
        ]

    def get_requester_name(self, obj):
        return _display_name(obj.requester)

    def get_assigned_to_name(self, obj):
        if obj.assigned_to is None:
            return None
        return _display_name(obj.assigned_to)

    def create(self, validated_data):
        if not validated_data.get("ticket_number"):
            validated_data["ticket_number"] = generate_ticket_number()
        return super().create(validated_data)


class AssignTicketSerializer(serializers.Serializer):
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())
