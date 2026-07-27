from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
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


class MeUpdateSerializer(serializers.Serializer):
    """
    Self-service profile edit. Deliberately narrow: only identity/contact
    fields an employee should be able to change about themselves.
    Employment fields (department, job title, salary, etc.) are HR-managed
    and go through the Employee CRUD endpoints instead.
    """

    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    personal_email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True)
    bank_name = serializers.CharField(required=False, allow_blank=True)
    bank_account_number = serializers.CharField(required=False, allow_blank=True)
    bank_account_holder_name = serializers.CharField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
        user_fields = [f for f in ("first_name", "last_name") if f in validated_data]
        for field in user_fields:
            setattr(instance, field, validated_data[field])
        if user_fields:
            instance.save(update_fields=user_fields)

        employee = getattr(instance, "employee", None)
        if employee is not None:
            employee_field_names = (
                "personal_email",
                "phone_number",
                "emergency_contact_name",
                "emergency_contact_phone",
                "bank_name",
                "bank_account_number",
                "bank_account_holder_name",
            )
            employee_fields = [f for f in employee_field_names if f in validated_data]
            for field in employee_fields:
                setattr(employee, field, validated_data[field])
            if employee_fields:
                employee.save(update_fields=employee_fields)

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate_new_password(self, value):
        try:
            validate_password(value, user=self.context["request"].user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return value
