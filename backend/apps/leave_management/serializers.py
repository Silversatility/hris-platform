from rest_framework import serializers

from .models import LeaveBalance, LeaveRequest, LeaveType


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ["id", "name", "code", "is_paid", "default_annual_days"]


class LeaveBalanceSerializer(serializers.ModelSerializer):
    remaining_days = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            "id",
            "employee",
            "leave_type",
            "leave_type_name",
            "year",
            "allocated_days",
            "used_days",
            "remaining_days",
        ]
        read_only_fields = ["used_days"]


def _display_name(employee):
    full_name = f"{employee.user.first_name} {employee.user.last_name}".strip()
    return full_name or employee.user.email


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_display_name = serializers.SerializerMethodField()
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "employee",
            "employee_display_name",
            "leave_type",
            "leave_type_name",
            "start_date",
            "end_date",
            "days_requested",
            "reason",
            "status",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "employee",
            "days_requested",
            "status",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]

    def get_employee_display_name(self, obj):
        return _display_name(obj.employee)

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by is None:
            return None
        return _display_name(obj.reviewed_by)

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError("end_date must be on or after start_date.")
        return attrs
