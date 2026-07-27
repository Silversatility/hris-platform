from django.utils import timezone
from rest_framework import serializers

from apps.users.models import User

from .models import Department, Employee


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Department
        fields = ["id", "name", "code", "is_active", "employee_count"]


class EmployeeSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source="department.name", read_only=True)
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "user",
            "user_email",
            "full_name",
            "employee_id",
            "department",
            "department_name",
            "manager",
            "manager_name",
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
            "bank_name",
            "bank_account_number",
            "bank_account_holder_name",
        ]

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

    def get_manager_name(self, obj):
        if obj.manager is None:
            return None
        full_name = f"{obj.manager.user.first_name} {obj.manager.user.last_name}".strip()
        return full_name or obj.manager.user.email


def generate_employee_id():
    year = timezone.now().year
    prefix = f"EMP-{year}-"
    last = Employee.objects.filter(employee_id__startswith=prefix).order_by("-employee_id").first()
    next_number = int(last.employee_id.rsplit("-", 1)[-1]) + 1 if last else 1
    return f"{prefix}{next_number:03d}"


class EmployeeWriteSerializer(serializers.ModelSerializer):
    """
    Create/update serializer. On create, also creates the linked User —
    there's no separate user-management flow, so onboarding an employee
    means creating their login at the same time.
    """

    email = serializers.EmailField(write_only=True, required=False)
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    employee_id = serializers.CharField(required=False)

    class Meta:
        model = Employee
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "password",
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
            "bank_name",
            "bank_account_number",
            "bank_account_holder_name",
        ]

    def validate_email(self, value):
        queryset = User.objects.filter(email=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.user_id)
        if queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if self.instance is None:
            if not attrs.get("email"):
                raise serializers.ValidationError({"email": "This field is required."})
            if not attrs.get("password"):
                raise serializers.ValidationError({"password": "This field is required."})
        return attrs

    def create(self, validated_data):
        email = validated_data.pop("email")
        first_name = validated_data.pop("first_name", "")
        last_name = validated_data.pop("last_name", "")
        password = validated_data.pop("password")
        if not validated_data.get("employee_id"):
            validated_data["employee_id"] = generate_employee_id()

        user = User.objects.create_user(
            email=email, password=password, first_name=first_name, last_name=last_name
        )
        return Employee.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        email = validated_data.pop("email", None)
        first_name = validated_data.pop("first_name", None)
        last_name = validated_data.pop("last_name", None)
        validated_data.pop("password", None)

        user_fields = []
        if email is not None:
            instance.user.email = email
            user_fields.append("email")
        if first_name is not None:
            instance.user.first_name = first_name
            user_fields.append("first_name")
        if last_name is not None:
            instance.user.last_name = last_name
            user_fields.append("last_name")
        if user_fields:
            instance.user.save(update_fields=user_fields)

        return super().update(instance, validated_data)

    def to_representation(self, instance):
        return EmployeeSerializer(instance, context=self.context).data
