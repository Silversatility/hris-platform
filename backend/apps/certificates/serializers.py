from rest_framework import serializers

from .models import COERequest


def _display_name(employee):
    full_name = f"{employee.user.first_name} {employee.user.last_name}".strip()
    return full_name or employee.user.email


class COERequestSerializer(serializers.ModelSerializer):
    employee_display_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source="employee.employee_id", read_only=True)
    employee_job_title = serializers.CharField(source="employee.job_title", read_only=True)
    employee_department = serializers.CharField(source="employee.department.name", read_only=True)
    employee_branch = serializers.CharField(source="employee.branch.name", read_only=True)
    employee_employment_type = serializers.CharField(
        source="employee.get_employment_type_display", read_only=True
    )
    employee_status = serializers.CharField(source="employee.status", read_only=True)
    employee_hire_date = serializers.DateField(source="employee.hire_date", read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = COERequest
        fields = [
            "id",
            "employee",
            "employee_display_name",
            "employee_code",
            "employee_job_title",
            "employee_department",
            "employee_branch",
            "employee_employment_type",
            "employee_status",
            "employee_hire_date",
            "purpose",
            "status",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "employee",
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
