from rest_framework import serializers

from .models import Department, Employee


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "code", "is_active"]


class EmployeeSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "user",
            "user_email",
            "full_name",
            "employee_id",
            "department",
            "manager",
            "job_title",
            "employment_type",
            "status",
            "hire_date",
            "termination_date",
            "salary",
            "personal_email",
            "phone_number",
            "emergency_contact_name",
            "emergency_contact_phone",
        ]

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
