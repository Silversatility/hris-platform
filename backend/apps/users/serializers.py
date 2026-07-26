from rest_framework import serializers

from apps.employees.models import Employee


class EmployeeSummarySerializer(serializers.ModelSerializer):
    department = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "employee_id", "job_title", "department", "status"]


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    employee = serializers.SerializerMethodField()

    def get_employee(self, obj):
        employee = getattr(obj, "employee", None)
        if employee is None:
            return None
        return EmployeeSummarySerializer(employee).data
